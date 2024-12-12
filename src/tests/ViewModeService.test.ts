import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Plugin, WorkspaceLeaf } from 'obsidian';
import { ViewModeService, ViewMode } from '../main';

describe('ViewModeService', () => {
    let plugin: Plugin;
    let viewModeService: ViewModeService;
    let mockWorkspace: any;

    beforeEach(() => {
        // Reset des mocks
        vi.clearAllMocks();
        
        // Setup du plugin et du service
        plugin = new Plugin();
        mockWorkspace = plugin.app.workspace;
        viewModeService = new ViewModeService(plugin);
    });

    describe('setView', () => {
        it('devrait créer une nouvelle vue en mode tab', async () => {
            const mockLeaf = new WorkspaceLeaf();
            mockWorkspace.getLeaf.mockReturnValue(mockLeaf);

            await viewModeService.setView('tab');

            expect(mockWorkspace.getLeaf).toHaveBeenCalledWith('split');
            expect(mockWorkspace.revealLeaf).toHaveBeenCalledWith(mockLeaf);
        });

        it('devrait créer une nouvelle vue en mode sidebar', async () => {
            const mockLeaf = new WorkspaceLeaf();
            mockWorkspace.getRightLeaf.mockReturnValue(mockLeaf);

            await viewModeService.setView('sidebar');

            expect(mockWorkspace.getRightLeaf).toHaveBeenCalledWith(true);
            expect(mockWorkspace.revealLeaf).toHaveBeenCalledWith(mockLeaf);
        });

        it('devrait créer un split horizontal en mode overlay', async () => {
            const mockActiveLeaf = new WorkspaceLeaf();
            const mockNewLeaf = new WorkspaceLeaf();
            mockWorkspace.activeLeaf = mockActiveLeaf;
            mockWorkspace.createLeafBySplit.mockReturnValue(mockNewLeaf);

            await viewModeService.setView('overlay');

            expect(mockWorkspace.createLeafBySplit).toHaveBeenCalledWith(
                mockActiveLeaf,
                'horizontal',
                true
            );
            expect(mockWorkspace.revealLeaf).toHaveBeenCalledWith(mockNewLeaf);
        });

        it('ne devrait pas créer de nouvelle vue si le même mode est sélectionné', async () => {
            const mockLeaf = new WorkspaceLeaf();
            mockWorkspace.getLeaf.mockReturnValue(mockLeaf);
            mockLeaf.view = { leaf: mockLeaf };  // Simuler une vue active

            // Première création
            await viewModeService.setView('tab');
            vi.clearAllMocks();

            // Deuxième appel avec le même mode
            await viewModeService.setView('tab');

            expect(mockWorkspace.getLeaf).not.toHaveBeenCalled();
            expect(mockWorkspace.revealLeaf).not.toHaveBeenCalled();
        });

        it('devrait fermer la vue existante avant d\'en créer une nouvelle', async () => {
            const mockLeaf = new WorkspaceLeaf();
            const spyDetach = vi.spyOn(mockLeaf, 'detach');
            mockWorkspace.getLeaf.mockReturnValue(mockLeaf);
            mockLeaf.view = { leaf: mockLeaf };  // Simuler une vue active

            // Créer une première vue
            await viewModeService.setView('tab');
            vi.clearAllMocks();
            spyDetach.mockClear();

            // Changer de mode
            const newMockLeaf = new WorkspaceLeaf();
            mockWorkspace.getRightLeaf.mockReturnValue(newMockLeaf);
            await viewModeService.setView('sidebar');

            expect(spyDetach).toHaveBeenCalled();
        });
    });

    describe('getActiveLeaf', () => {
        it('devrait retourner null si aucune vue n\'est active', () => {
            expect(viewModeService.getActiveLeaf()).toBeNull();
        });

        it('devrait retourner la leaf active après création d\'une vue', async () => {
            const mockLeaf = new WorkspaceLeaf();
            mockWorkspace.getLeaf.mockReturnValue(mockLeaf);

            await viewModeService.setView('tab');

            expect(viewModeService.getActiveLeaf()).toBe(mockLeaf);
        });
    });

    describe('closeCurrentView', () => {
        it('devrait fermer correctement une vue en mode tab', async () => {
            // Setup
            const mockLeaf = new WorkspaceLeaf();
            const spyDetach = vi.spyOn(mockLeaf, 'detach');
            mockWorkspace.getLeaf.mockReturnValue(mockLeaf);
            mockLeaf.view = { leaf: mockLeaf };

            // Créer une vue en mode tab
            await viewModeService.setView('tab');
            expect(viewModeService.getActiveLeaf()).toBe(mockLeaf);

            // Fermer la vue en changeant de mode (ce qui déclenche closeCurrentView)
            await viewModeService.setView('sidebar');

            // Vérifications
            expect(spyDetach).toHaveBeenCalled();
            expect(viewModeService.getActiveLeaf()).not.toBe(mockLeaf);
        });

        it('devrait fermer correctement une vue en mode sidebar', async () => {
            // Setup
            const mockLeaf = new WorkspaceLeaf();
            const spyDetach = vi.spyOn(mockLeaf, 'detach');
            mockWorkspace.getRightLeaf.mockReturnValue(mockLeaf);
            mockLeaf.view = { leaf: mockLeaf };

            // Créer une vue en mode sidebar
            await viewModeService.setView('sidebar');
            expect(viewModeService.getActiveLeaf()).toBe(mockLeaf);

            // Fermer la vue en changeant de mode
            await viewModeService.setView('tab');

            // Vérifications
            expect(spyDetach).toHaveBeenCalled();
            expect(viewModeService.getActiveLeaf()).not.toBe(mockLeaf);
        });

        it('devrait nettoyer correctement les références après la fermeture', async () => {
            // Setup
            const mockLeaf = new WorkspaceLeaf();
            mockWorkspace.getLeaf.mockReturnValue(mockLeaf);
            mockLeaf.view = { leaf: mockLeaf };

            // Créer une vue
            await viewModeService.setView('tab');

            // Fermer la vue
            await viewModeService.setView('sidebar');

            // Vérifier que toutes les références sont nettoyées
            expect(viewModeService.getActiveLeaf()).not.toBe(mockLeaf);
            const currentMode = (viewModeService as any).currentMode;
            const currentView = (viewModeService as any).currentView;
            expect(currentMode).toBe('sidebar');
            expect(currentView).not.toBe(mockLeaf.view);
        });

        it('ne devrait rien faire si aucune vue n\'est active', async () => {
            // Setup - s'assurer qu'aucune vue n'est active
            const mockLeaf = new WorkspaceLeaf();
            const spyDetach = vi.spyOn(mockLeaf, 'detach');

            // Tenter de fermer une vue inexistante
            await viewModeService.setView('tab');
            
            // Vérifier qu'aucune tentative de fermeture n'a été faite
            expect(spyDetach).not.toHaveBeenCalled();
        });

        it('devrait gérer plusieurs changements de mode consécutifs', async () => {
            // Setup
            const mockLeaf1 = new WorkspaceLeaf();
            const mockLeaf2 = new WorkspaceLeaf();
            const mockLeaf3 = new WorkspaceLeaf();
            
            const spyDetach1 = vi.spyOn(mockLeaf1, 'detach');
            const spyDetach2 = vi.spyOn(mockLeaf2, 'detach');
            const spyDetach3 = vi.spyOn(mockLeaf3, 'detach');

            mockWorkspace.getLeaf.mockReturnValue(mockLeaf1);
            mockWorkspace.getRightLeaf.mockReturnValue(mockLeaf2);
            mockWorkspace.createLeafBySplit.mockReturnValue(mockLeaf3);

            // Séquence de changements de mode
            await viewModeService.setView('tab');
            expect(viewModeService.getActiveLeaf()).toBe(mockLeaf1);

            await viewModeService.setView('sidebar');
            expect(spyDetach1).toHaveBeenCalled();
            expect(viewModeService.getActiveLeaf()).toBe(mockLeaf2);

            await viewModeService.setView('tab');
            expect(spyDetach2).toHaveBeenCalled();
            expect(viewModeService.getActiveLeaf()).toBe(mockLeaf1);
        });
    });
}); 
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Plugin, WorkspaceLeaf } from 'obsidian';
import { ViewModeService } from '../ViewModeService';
import { ViewMode } from '../types';

describe('ViewModeService', () => {
    let plugin: Plugin;
    let viewModeService: ViewModeService;
    let mockWorkspace: any;
    let activeLeaf: WorkspaceLeaf;

    beforeEach(() => {
        // Reset des mocks
        vi.clearAllMocks();
        
        // Création de la feuille active
        activeLeaf = new WorkspaceLeaf();
        
        // Setup du plugin et du service
        plugin = new Plugin();
        mockWorkspace = plugin.app.workspace;

        // Mock de getMostRecentLeaf
        mockWorkspace.getMostRecentLeaf = vi.fn().mockReturnValue(activeLeaf);
        
        viewModeService = new ViewModeService(plugin);
    });

    describe('setView', () => {
        it('devrait créer une nouvelle vue en mode tab', async () => {
            await viewModeService.setView('tab');
            const leaf = (plugin as any).getLeaves().get('split');
            
            expect(mockWorkspace.getLeaf).toHaveBeenCalledWith('split');
            expect(mockWorkspace.revealLeaf).toHaveBeenCalledWith(leaf);
            expect(leaf.view).toBeTruthy();
        });

        it('devrait créer une nouvelle vue en mode sidebar', async () => {
            await viewModeService.setView('sidebar');
            const leaf = (plugin as any).getLeaves().get('right');
            
            expect(mockWorkspace.getRightLeaf).toHaveBeenCalledWith(true);
            expect(mockWorkspace.revealLeaf).toHaveBeenCalledWith(leaf);
            expect(leaf.view).toBeTruthy();
        });

        it('devrait créer un split horizontal en mode overlay', async () => {
            // Mock de la vue active
            mockWorkspace.getActiveViewOfType.mockReturnValue({ leaf: activeLeaf });

            // Créer la vue overlay
            await viewModeService.setView('overlay');
            const overlayLeaf = (plugin as any).getLeaves().get('overlay');
            
            expect(mockWorkspace.getMostRecentLeaf).toHaveBeenCalled();
            expect(mockWorkspace.createLeafBySplit).toHaveBeenCalledWith(
                activeLeaf,
                'horizontal',
                true
            );
            expect(mockWorkspace.revealLeaf).toHaveBeenCalledWith(overlayLeaf);
            expect(overlayLeaf.view).toBeTruthy();
        });
    });

    describe('closeCurrentView', () => {
        it('devrait fermer correctement une vue en mode tab', async () => {
            // Créer une vue en mode tab
            await viewModeService.setView('tab');
            const tabLeaf = (plugin as any).getLeaves().get('split');
            expect(tabLeaf.view).toBeTruthy();

            // Créer une nouvelle vue en mode sidebar (ce qui fermera la vue tab)
            await viewModeService.setView('sidebar');
            expect(tabLeaf.view).toBeNull();
        });

        it('devrait fermer correctement une vue en mode sidebar', async () => {
            // Créer une vue en mode sidebar
            await viewModeService.setView('sidebar');
            const sidebarLeaf = (plugin as any).getLeaves().get('right');
            expect(sidebarLeaf.view).toBeTruthy();

            // Créer une nouvelle vue en mode tab (ce qui fermera la vue sidebar)
            await viewModeService.setView('tab');
            expect(sidebarLeaf.view).toBeNull();
        });

        it('devrait nettoyer correctement les références après la fermeture', async () => {
            // Créer et fermer une vue
            await viewModeService.setView('tab');
            const tabLeaf = (plugin as any).getLeaves().get('split');
            expect(tabLeaf.view).toBeTruthy();
            
            await viewModeService.setView('sidebar');
            const sidebarLeaf = (plugin as any).getLeaves().get('right');
            
            expect(tabLeaf.view).toBeNull();
            expect(viewModeService.getActiveLeaf()).toBe(sidebarLeaf);
        });

        it('devrait gérer plusieurs changements de mode consécutifs', async () => {
            // Séquence de changements
            await viewModeService.setView('tab');
            const tabLeaf = (plugin as any).getLeaves().get('split');
            expect(tabLeaf.view).toBeTruthy();

            await viewModeService.setView('sidebar');
            const sidebarLeaf = (plugin as any).getLeaves().get('right');
            expect(tabLeaf.view).toBeNull();
            expect(sidebarLeaf.view).toBeTruthy();

            await viewModeService.setView('tab');
            const newTabLeaf = (plugin as any).getLeaves().get('split');
            expect(sidebarLeaf.view).toBeNull();
            expect(newTabLeaf.view).toBeTruthy();
        });
    });
}); 
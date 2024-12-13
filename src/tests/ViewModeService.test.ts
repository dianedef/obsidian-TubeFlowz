import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Plugin, WorkspaceLeaf } from 'obsidian';
import { ViewModeService } from '../ViewModeService';
import { ViewMode } from '../types';
import { Settings } from '../Settings';
import '../tests/mocks/obsidian';

describe('ViewModeService', () => {
    let plugin: Plugin;
    let viewModeService: ViewModeService;
    let mockWorkspace: any;

    beforeEach(() => {
        vi.clearAllMocks();
        
        plugin = new Plugin();
        mockWorkspace = plugin.app.workspace;
        
        // Configuration des mocks
        const mockLeaf = new WorkspaceLeaf();
        mockWorkspace.getMostRecentLeaf.mockReturnValue(mockLeaf);
        mockWorkspace.getLeaf.mockReturnValue(mockLeaf);
        mockWorkspace.getRightLeaf.mockReturnValue(mockLeaf);
        mockWorkspace.createLeafBySplit.mockReturnValue(mockLeaf);
        
        // Initialisation des Settings
        Settings.initialize(plugin);
        
        viewModeService = new ViewModeService(plugin);
    });

    describe('setView', () => {
        it('devrait créer une nouvelle vue en mode tab', async () => {
            await viewModeService.setView('tab');
            expect(mockWorkspace.getLeaf).toHaveBeenCalledWith('split');
        });

        it('devrait créer une nouvelle vue en mode sidebar', async () => {
            await viewModeService.setView('sidebar');
            expect(mockWorkspace.getRightLeaf).toHaveBeenCalledWith(true);
        });

        it('devrait créer un split horizontal en mode overlay', async () => {
            const mockLeaf = new WorkspaceLeaf();
            mockWorkspace.getActiveViewOfType.mockReturnValue({ leaf: mockLeaf });

            await viewModeService.setView('overlay');
            expect(mockWorkspace.createLeafBySplit).toHaveBeenCalledWith(
                mockLeaf,
                'horizontal',
                true
            );
        });
    });
}); 
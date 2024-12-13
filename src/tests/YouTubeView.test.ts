import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkspaceLeaf, Plugin } from 'obsidian';
import { YouTubeView } from '../YouTubeView';
import { Settings } from '../Settings';
import '../tests/mocks/obsidian';
import '../tests/mocks/video';

describe('YouTubeView', () => {
    let leaf: WorkspaceLeaf;
    let view: YouTubeView;
    let plugin: Plugin;

    beforeEach(() => {
        vi.clearAllMocks();
        
        plugin = new Plugin();
        leaf = new WorkspaceLeaf();
        
        // Initialisation des Settings
        Settings.initialize(plugin);
        
        view = new YouTubeView(leaf, plugin);
    });

    it('devrait avoir le bon type de vue', () => {
        expect(view.getViewType()).toBe('youtube-player');
    });

    it('devrait avoir le bon texte d\'affichage', () => {
        expect(view.getDisplayText()).toBe('YouTube Player');
    });

    it('devrait initialiser correctement la vue au moment de l\'ouverture', async () => {
        await view.onOpen();
        const container = view.containerEl;

        expect(container.childNodes.length).toBeGreaterThan(0);

        const playerContainer = container.querySelector('.youtube-player-embed');
        expect(playerContainer).toBeTruthy();
        
        if (playerContainer) {
            expect(playerContainer.style.width).toBe('100%');
        }
    });
}); 
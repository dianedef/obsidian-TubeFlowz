import { describe, it, expect, beforeEach } from 'vitest';
import { WorkspaceLeaf, Plugin } from 'obsidian';
import { YouTubeView } from '../YouTubeView';

describe('YouTubeView', () => {
    let leaf: WorkspaceLeaf;
    let view: YouTubeView;
    let plugin: Plugin;

    beforeEach(() => {
        leaf = new WorkspaceLeaf();
        plugin = new Plugin();
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

        // Vérifie que le conteneur a été vidé
        expect(container.childNodes.length).toBeGreaterThan(0);

        // Vérifie la présence du titre
        const title = container.querySelector('h4');
        expect(title?.textContent).toBe('YouTube Player');

        // Vérifie la présence du conteneur du player
        const playerContainer = container.querySelector('.youtube-player-embed') as HTMLElement;
        expect(playerContainer).toBeTruthy();
        
        // Vérifie le style du conteneur
        expect(playerContainer.style.width).toBe('100%');
        expect(playerContainer.style.height).toBe('60vh');

        // Vérifie le texte par défaut
        const defaultText = playerContainer.querySelector('span');
        expect(defaultText?.textContent).toBe('Prêt à lire une vidéo YouTube');
    });
}); 
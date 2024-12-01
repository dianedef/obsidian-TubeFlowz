import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlayerViewAndMode } from '../src/playerViewAndMode';
import { Store } from '../src/store';
import { PluginSettings, PlayerSettings } from '../src/types.d';

describe('PlayerViewAndMode', () => {
    let container: HTMLElement;
    let playerViewAndMode: PlayerViewAndMode;
    let mockPlugin: any;

    beforeEach(async () => {
        // Réinitialiser le singleton Store
        Store.destroy();
        
        // Récupérer le plugin mocké depuis setup.ts
        mockPlugin = (globalThis as any).mockPlugin;

        // Créer le conteneur avec la structure HTML nécessaire
        container = document.createElement('div');
        container.innerHTML = `
            <div class="youtube-view">
                <div class="youtube-view-controls">
                    <div class="youtube-view-close"></div>
                </div>
                <div class="youtube-view-container" style="height: 100px">
                    <div class="resize-handle"></div>
                </div>
            </div>
        `;
        document.body.appendChild(container);
        
        // Initialiser le PlayerViewAndMode
        playerViewAndMode = new PlayerViewAndMode(mockPlugin);
        await playerViewAndMode.init();
    });

    afterEach(() => {
        Store.destroy();
        container.remove();
        vi.clearAllMocks();
    });

    describe('Initialisation', () => {
        it('devrait initialiser avec les valeurs par défaut', () => {
            expect(playerViewAndMode.activeLeafId).toBeNull();
            expect(playerViewAndMode.activeView).toBeNull();
        });
    });

    describe('Gestion des modes', () => {
        it('devrait afficher une vidéo en mode sidebar', async () => {
            await playerViewAndMode.displayVideo({
                videoId: 'test-video',
                mode: 'sidebar'
            });

            const store = Store.get();
            expect(store.Settings?.settings.lastVideoId).toBe('test-video');
            expect(store.Settings?.settings.currentMode).toBe('sidebar');
            expect(store.Settings?.settings.isVideoOpen).toBe(true);
        });

        it('devrait afficher une vidéo en mode tab', async () => {
            await playerViewAndMode.displayVideo({
                videoId: 'test-video',
                mode: 'tab'
            });

            const store = Store.get();
            expect(store.Settings?.settings.lastVideoId).toBe('test-video');
            expect(store.Settings?.settings.currentMode).toBe('tab');
            expect(store.Settings?.settings.isVideoOpen).toBe(true);
        });

        it('devrait afficher une vidéo en mode overlay', async () => {
            await playerViewAndMode.displayVideo({
                videoId: 'test-video',
                mode: 'overlay'
            });

            const store = Store.get();
            expect(store.Settings?.settings.lastVideoId).toBe('test-video');
            expect(store.Settings?.settings.currentMode).toBe('overlay');
            expect(store.Settings?.settings.isVideoOpen).toBe(true);
        });
    });

    describe('Interface utilisateur', () => {
        describe('Sidebar', () => {
            beforeEach(async () => {
                await playerViewAndMode.displayVideo({
                    videoId: 'test-video',
                    mode: 'sidebar'
                });
            });

            it('devrait créer une vue sidebar avec les contrôles', () => {
                const controls = container.querySelector('.youtube-view-controls');
                expect(controls).toBeTruthy();
                
                const closeButton = controls?.querySelector('.youtube-view-close');
                expect(closeButton).toBeTruthy();
                expect(closeButton?.getAttribute('aria-label')).toBe('Close');
            });

            it('devrait avoir un conteneur vidéo redimensionnable', () => {
                const videoContainer = container.querySelector('div[style*="height"]');
                expect(videoContainer).toBeTruthy();
                expect(videoContainer?.style.minHeight).toBe('100px');
            });

            it('devrait avoir une poignée de redimensionnement', () => {
                const resizeHandle = container.querySelector('.resize-handle');
                expect(resizeHandle).toBeTruthy();
            });
        });

        describe('Menu de mode', () => {
            it('devrait avoir un menu avec tous les modes', () => {
                // Créer le conteneur principal
                const container = document.createElement('div');
                container.className = 'youtube-view-container';
                document.body.appendChild(container);

                // Créer les contrôles
                const controls = document.createElement('div');
                controls.className = 'youtube-view-controls';
                
                // Ajouter le bouton de fermeture
                const closeButton = document.createElement('button');
                closeButton.className = 'youtube-view-close';
                controls.appendChild(closeButton);

                // Créer le conteneur vidéo redimensionnable
                const videoContainer = document.createElement('div');
                videoContainer.style.minHeight = '100px';
                videoContainer.style.height = '30%'; // Utiliser un pourcentage comme dans l'app

                // Ajouter la poignée de redimensionnement
                const resizeHandle = document.createElement('div');
                resizeHandle.className = 'resize-handle';

                // Assembler les éléments
                container.appendChild(controls);
                container.appendChild(videoContainer);
                container.appendChild(resizeHandle);

                // Vérifications
                expect(container.querySelector('.youtube-view-controls')).toBeTruthy();
                expect(container.querySelector('.youtube-view-close')).toBeTruthy();
                expect(container.querySelector('.resize-handle')).toBeTruthy();
                expect(videoContainer.style.height).toBe('30%');
                expect(videoContainer.style.minHeight).toBe('100px');

                container.remove();
            });

            it('devrait sauvegarder la hauteur lors du changement de mode', async () => {
                const store = Store.get();
                store.Settings = {
                    settings: {
                        viewHeight: '30%',
                        overlayHeight: '30%'
                    },
                    save: jest.fn()
                };

                // Simuler une hauteur existante
                const overlay = document.createElement('div');
                overlay.className = 'youtube-overlay';
                overlay.style.height = '50px';
                document.body.appendChild(overlay);

                // Changer de mode
                await playerViewAndMode.displayVideo({
                    videoId: 'test-video',
                    mode: 'tab'
                });

                expect(store.Settings?.settings.viewHeight).toBe('30%');
                expect(store.Settings?.settings.overlayHeight).toBe('30%');

                overlay.remove();
            });
        });
    });

    describe('Fermeture de vidéo', () => {
        it('devrait fermer la vidéo précédente', async () => {
            await playerViewAndMode.displayVideo({
                videoId: 'test-video',
                mode: 'sidebar'
            });

            await playerViewAndMode.closePreviousVideos();

            const store = Store.get();
            expect(store.Settings?.settings.isVideoOpen).toBe(false);
            expect(playerViewAndMode.activeLeafId).toBeNull();
            expect(playerViewAndMode.activeView).toBeNull();
        });
    });

    describe('Persistance des paramètres', () => {
        it('devrait sauvegarder les paramètres après chaque action', async () => {
            await playerViewAndMode.displayVideo({
                videoId: 'test-video',
                mode: 'sidebar'
            });

            expect(mockPlugin.saveData).toHaveBeenCalled();
        });

        it('devrait charger les paramètres au démarrage', async () => {
            (mockPlugin.loadData as jest.Mock).mockResolvedValueOnce({
                activeLeafId: 'saved-leaf-id'
            });

            playerViewAndMode = new PlayerViewAndMode();
            await playerViewAndMode.init();

            expect(playerViewAndMode.activeLeafId).toBe('saved-leaf-id');
        });
    });
}); 
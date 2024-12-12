import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Menu, Plugin } from 'obsidian';
import YouTubePlugin from '../main';

describe('YouTubePlugin', () => {
    let plugin: YouTubePlugin;
    let mockRibbonIcon: HTMLElement;
    let mockMenu: Menu;

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Setup du plugin
        plugin = new YouTubePlugin();
        
        // Mock du ribbon icon
        mockRibbonIcon = document.createElement('div');
        vi.spyOn(plugin, 'addRibbonIcon').mockImplementation((icon, title, callback) => {
            mockRibbonIcon.addEventListener('mouseenter', (e) => {
                callback(e);
            });
            return mockRibbonIcon;
        });

        // Mock du menu
        mockMenu = new Menu();
        vi.spyOn(Menu.prototype, 'addItem').mockReturnThis();
        vi.spyOn(Menu.prototype, 'showAtPosition').mockReturnThis();
        vi.spyOn(Menu.prototype, 'hide').mockReturnThis();
    });

    describe('Menu', () => {
        it('devrait créer le menu au survol de l\'icône', async () => {
            // Simule le chargement du plugin
            await plugin.onload();
            
            // Vérifie que l'icône a été ajoutée
            expect(plugin.addRibbonIcon).toHaveBeenCalledWith(
                'youtube',
                'YouTube Reader',
                expect.any(Function)
            );

            // Simule le survol de l'icône
            mockRibbonIcon.dispatchEvent(new MouseEvent('mouseenter'));

            // Vérifie que le menu a été créé avec les trois options
            expect(Menu.prototype.addItem).toHaveBeenCalledTimes(3);
        });

        it('devrait fermer le menu quand la souris quitte la zone', async () => {
            // Simule le chargement du plugin
            await plugin.onload();

            // Simule le survol de l'icône pour créer le menu
            mockRibbonIcon.dispatchEvent(new MouseEvent('mouseenter'));

            // Simule le départ de la souris
            mockRibbonIcon.dispatchEvent(new MouseEvent('mouseleave', {
                bubbles: true,
                relatedTarget: document.body
            }));

            // Vérifie que le menu a été caché
            expect(Menu.prototype.hide).toHaveBeenCalled();
        });

        it('devrait garder le menu ouvert si la souris passe de l\'icône au menu', async () => {
            // Simule le chargement du plugin
            await plugin.onload();

            // Simule le survol de l'icône pour créer le menu
            mockRibbonIcon.dispatchEvent(new MouseEvent('mouseenter'));

            // Simule le passage de la souris au menu
            mockRibbonIcon.dispatchEvent(new MouseEvent('mouseleave', {
                bubbles: true,
                relatedTarget: mockMenu.dom
            }));

            // Vérifie que le menu n'a pas été caché
            expect(Menu.prototype.hide).not.toHaveBeenCalled();
        });
    });

    describe('Plugin Lifecycle', () => {
        it('devrait nettoyer les vues à la désactivation', async () => {
            await plugin.onunload();
            expect(plugin.app.workspace.detachLeavesOfType)
                .toHaveBeenCalledWith('youtube-player');
        });
    });
}); 
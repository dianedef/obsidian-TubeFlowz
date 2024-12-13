import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Menu, Plugin } from 'obsidian';
import YouTubePlugin from '../main';
import { Settings } from '../Settings';
import '../tests/mocks/obsidian';

describe('YouTubePlugin', () => {
    let plugin: YouTubePlugin;
    let mockRibbonIcon: HTMLElement;
    let mockMenu: Menu;

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Setup du plugin
        plugin = new YouTubePlugin();
        
        // Initialisation des Settings
        Settings.initialize(plugin);
        
        // Mock du ribbon icon
        mockRibbonIcon = document.createElement('div');
        vi.spyOn(Plugin.prototype, 'addRibbonIcon').mockImplementation((icon, title, callback) => {
            mockRibbonIcon.addEventListener('mouseenter', (e) => {
                callback(e);
            });
            return mockRibbonIcon;
        });

        // Mock du menu
        mockMenu = new Menu();
        vi.spyOn(Menu.prototype, 'addItem').mockReturnThis();
        vi.spyOn(Menu.prototype, 'showAtMouseEvent').mockReturnThis();
        vi.spyOn(Menu.prototype, 'hide').mockReturnThis();
    });

    describe('Menu', () => {
        it('devrait créer le menu au survol de l\'icône', async () => {
            // Simule le chargement du plugin
            await plugin.onload();
            
            // Vérifie que l'icône a été ajoutée
            expect(Plugin.prototype.addRibbonIcon).toHaveBeenCalledWith(
                'youtube',
                'YouTube Reader',
                expect.any(Function)
            );

            // Simule le survol de l'icône
            mockRibbonIcon.dispatchEvent(new MouseEvent('mouseenter'));

            // Vérifie que le menu a été créé avec les options
            expect(Menu.prototype.addItem).toHaveBeenCalled();
        });
    });
}); 
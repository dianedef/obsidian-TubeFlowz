import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VideoPlayer } from '../src/videoPlayer';
import { Store } from '../src/store';
import { PluginSettings, PlayerSettings } from '../src/types.d';
import { Plugin } from 'obsidian';

describe('VideoPlayer', () => {
   let container: HTMLElement;
   let store: Store;
   let settings: PluginSettings;
   let player: VideoPlayer;
   let mockPlugin: Plugin;

   beforeEach(async () => {
      // Réinitialiser le singleton Store
      Store.destroy();
      
      // Récupérer le plugin mocké depuis setup.ts
      mockPlugin = (globalThis as any).mockPlugin;

      // Créer le conteneur avec la structure HTML nécessaire
      container = document.createElement('div');
      container.innerHTML = `
         <div class="video-container">
               <video class="video-js"></video>
         </div>
      `;
      document.body.appendChild(container);
      
      // Initialiser le store et les settings
      store = await Store.init(mockPlugin);
      settings = {
         settings: (mockPlugin as any).settings,
         save: async () => {
            await mockPlugin.saveData((mockPlugin as any).settings);
         }
      };
      
      // Créer l'instance du VideoPlayer avec les settings
      player = new VideoPlayer(settings);
      
      // Initialiser le player avec un ID vidéo de test
      await player.initializePlayer('test-video-id', container.querySelector('.video-container')!);
   });

   afterEach(() => {
      if (player) {
         player.dispose();
      }
      container.remove();
      Store.destroy();
      vi.clearAllMocks();
   });

   describe('Initialisation', () => {
      it('devrait créer une instance de VideoPlayer', () => {
         expect(player).toBeInstanceOf(VideoPlayer);
         expect(window.videojs).toHaveBeenCalled();
      });

      it('devrait initialiser VideoJS avec les bonnes options', () => {
         expect(window.videojs).toHaveBeenCalledWith(
            expect.any(HTMLElement),
            expect.objectContaining({
               language: expect.any(String),
               languages: expect.any(Object),
               youtube: expect.objectContaining({
                  iv_load_policy: 3,
                  modestbranding: 1,
                  controls: 0,
                  ytControls: 0,
                  playsinline: 1,
                  disablekb: 1,
                  enablejsapi: 1
               })
            })
         );
      });

      it('devrait détecter la langue d\'Obsidian', () => {
         document.documentElement.lang = 'fr';
         const newPlayer = new VideoPlayer(settings);
         expect(newPlayer.currentLanguage).toBe('fr');

         document.documentElement.lang = 'en';
         const newPlayer2 = new VideoPlayer(settings);
         expect(newPlayer2.currentLanguage).toBe('en');
      });

      it('devrait créer un lecteur de secours si VideoJS n\'est pas disponible', async () => {
         // Simuler VideoJS non disponible
         window.videojs = undefined;
         
         const fallbackContainer = document.createElement('div');
         const fallbackPlayer = await player.createFallbackPlayer('test-video', fallbackContainer);
         
         expect(fallbackPlayer.className).toBe('fallback-player-container');
         const iframe = fallbackPlayer.querySelector('iframe');
         expect(iframe).toBeTruthy();
         expect(iframe?.src).toContain('youtube.com/embed/test-video');
      });
   });

   describe('Configuration du player', () => {
      it('devrait configurer les options YouTube correctement', () => {
         const config = player.getPlayerConfig('test-video');
         
         expect(config.youtube).toEqual(expect.objectContaining({
               iv_load_policy: 3,
               modestbranding: 1,
               controls: 0,
               ytControls: 0,
               playsinline: 1,
               disablekb: 1,
               enablejsapi: 1
         }));
      });

      it('devrait gérer les recommandations YouTube selon les paramètres', () => {
         settings.settings.showYoutubeRecommendations = true;
         const config = player.getPlayerConfig('test-video');
         expect(config.youtube.rel).toBe(1);
         expect(config.youtube.endscreen).toBe(1);

         settings.settings.showYoutubeRecommendations = false;
         const config2 = player.getPlayerConfig('test-video');
         expect(config2.youtube.rel).toBe(0);
         expect(config2.youtube.endscreen).toBe(0);
      });

      it('devrait configurer les traductions selon la langue', () => {
         document.documentElement.lang = 'fr';
         const config = player.getPlayerConfig('test-video');
         
         expect(config.languages.fr).toEqual(expect.objectContaining({
               "Play": "Lecture",
               "Pause": "Pause",
               "Mute": "Muet",
               "Unmute": "Son"
         }));
      });
   });

   describe('Contrôles de lecture', () => {
      it('devrait jouer la vidéo', () => {
         if (player.player) {
            player.player.play();
            expect((globalThis as any).mockPlayer.play).toHaveBeenCalled();
         }
      });

      it('devrait mettre en pause la vidéo', () => {
         if (player.player) {
            player.player.pause();
            expect((globalThis as any).mockPlayer.pause).toHaveBeenCalled();
         }
      });

      it('devrait changer la vitesse de lecture', () => {
         player.updatePlaybackRateButton(2);
         expect((globalThis as any).mockPlayer.playbackRate).toHaveBeenCalledWith(2);
      });

      it('devrait changer le volume', () => {
         const event = new Event('volumechange');
         (globalThis as any).mockPlayer.volume.mockReturnValue(0.5);
         (globalThis as any).mockPlayer.dispatchEvent(event);
         expect((globalThis as any).mockPlayer.volume).toHaveBeenCalled();
      });

      it('devrait sauvegarder les préférences de lecture', () => {
         // Simuler un changement de volume
         const volumeEvent = new Event('volumechange');
         (globalThis as any).mockPlayer.volume.mockReturnValue(0.7);
         (globalThis as any).mockPlayer.dispatchEvent(volumeEvent);
         
         expect(settings.settings.volume).toBe(0.7);
         expect(mockPlugin.saveData).toHaveBeenCalled();

         // Simuler un changement de vitesse
         const rateEvent = new Event('ratechange');
         (globalThis as any).mockPlayer.playbackRate.mockReturnValue(1.5);
         (globalThis as any).mockPlayer.dispatchEvent(rateEvent);
         
         expect(settings.settings.playbackRate).toBe(1.5);
         expect(mockPlugin.saveData).toHaveBeenCalled();
      });
   });

   describe('Gestion des raccourcis clavier', () => {
      it('devrait gérer Shift+Space pour play/pause', () => {
         const event = new KeyboardEvent('keydown', { 
               code: 'Space',
               shiftKey: true 
         });
         document.dispatchEvent(event);
         expect((globalThis as any).mockPlayer.paused).toHaveBeenCalled();
      });

      it('devrait gérer les touches de vitesse de lecture', () => {
         // Ctrl+1 : Diminuer
         const decreaseEvent = new KeyboardEvent('keydown', { 
               key: '1',
               ctrlKey: true 
         });
         document.dispatchEvent(decreaseEvent);
         expect((globalThis as any).mockPlayer.playbackRate).toHaveBeenCalled();

         // Ctrl+2 : Normal
         const normalEvent = new KeyboardEvent('keydown', { 
               key: '2',
               ctrlKey: true 
         });
         document.dispatchEvent(normalEvent);
         expect((globalThis as any).mockPlayer.playbackRate).toHaveBeenCalledWith(1);

         // Ctrl+3 : Augmenter
         const increaseEvent = new KeyboardEvent('keydown', { 
               key: '3',
               ctrlKey: true 
         });
         document.dispatchEvent(increaseEvent);
         expect((globalThis as any).mockPlayer.playbackRate).toHaveBeenCalled();

         // Ctrl+4 : Vitesse favorite
         settings.settings.favoriteSpeed = 1.75;
         settings.save();
         
         // Réinitialiser le mock pour être sûr
         (globalThis as any).mockPlayer.playbackRate.mockClear();
         
         const favoriteEvent = new KeyboardEvent('keydown', { 
               key: '4',
               ctrlKey: true 
         });
         document.dispatchEvent(favoriteEvent);
         expect((globalThis as any).mockPlayer.playbackRate).toHaveBeenCalledWith(1.75);
      });
   });

   describe('Redimensionnement', () => {
      it('devrait observer les changements de taille', () => {
         const resizeObserver = (window as any).ResizeObserver;
         expect(resizeObserver.prototype.observe).toHaveBeenCalledWith(expect.any(HTMLElement));
      });

      it('devrait gérer le redimensionnement manuel', () => {
         const resizeHandle = container.querySelector('.resize-handle');
         expect(resizeHandle).toBeTruthy();

         // Simuler un début de redimensionnement
         const mousedownEvent = new MouseEvent('mousedown', {
               clientY: 100
         });
         resizeHandle?.dispatchEvent(mousedownEvent);

         // Simuler un mouvement
         const mousemoveEvent = new MouseEvent('mousemove', {
               clientY: 200
         });
         document.dispatchEvent(mousemoveEvent);

         // Simuler la fin du redimensionnement
         const mouseupEvent = new MouseEvent('mouseup');
         document.dispatchEvent(mouseupEvent);

         expect(container.style.height).toBeTruthy();
      });

      it('devrait respecter les limites de taille', () => {
         const resizeCallback = (window as any).ResizeObserver
               .mock.calls[0][0];

         // Simuler une taille trop petite
         resizeCallback([{
               contentRect: { height: 50 }
         }]);
         expect(container.style.height).toBe('100px');

         // Simuler une taille trop grande
         resizeCallback([{
               contentRect: { height: window.innerHeight + 100 }
         }]);
         expect(container.style.height).toBe(`${window.innerHeight * 0.9}px`);
      });
   });

   describe('Nettoyage', () => {
      it('devrait nettoyer correctement les ressources', () => {
         player.dispose();
         expect((globalThis as any).mockPlayer.dispose).toHaveBeenCalled();
         expect(document.querySelector('.video-container')).toBeFalsy();
      });

      it('devrait retirer les écouteurs d\'événements', () => {
         const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
         player.dispose();
         expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
         expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
         expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
      });
   });
}); 
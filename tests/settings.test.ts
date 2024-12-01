import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Settings } from '../src/settings';
import { Plugin } from 'obsidian';

describe('Settings', () => {
   let settings: Settings;
   let mockPlugin: Plugin;

   beforeEach(() => {
      // Mock du plugin avec les méthodes nécessaires
      mockPlugin = {
         loadData: vi.fn(),
         saveData: vi.fn()
      } as unknown as Plugin;
      settings = new Settings(mockPlugin);
   });

   it('devrait initialiser avec les valeurs par défaut', () => {
      expect(settings.settings).toEqual({
         lastVideoId: null,
         isVideoOpen: null,
         playlist: [],
         currentMode: null,
         viewHeight: 60,
         playbackMode: 'stream',
         favoriteSpeed: 2.0,
         isMuted: false,
         showYoutubeRecommendations: false,
         playbackRate: 1,
         volume: 1,
      });
   });

   it('devrait charger les paramètres sauvegardés', async () => {
      const savedSettings = {
         lastVideoId: 'testId',
         viewHeight: 70,
         playbackMode: 'download'
      };

      (mockPlugin.loadData as ReturnType<typeof vi.fn>).mockResolvedValue(savedSettings);
      
      await settings.loadSettings();
      
      expect(settings.settings.lastVideoId).toBe('testId');
      expect(settings.settings.viewHeight).toBe(70);
      expect(settings.settings.playbackMode).toBe('download');
   });

   it('devrait sauvegarder les paramètres', async () => {
      settings.settings.lastVideoId = 'newId';
      await settings.save();
      
      expect(mockPlugin.saveData).toHaveBeenCalledWith(settings.settings);
   });

   it('devrait valider la vitesse favorite', () => {
      // Test d'une vitesse valide
      settings.favoriteSpeed = 2.5;
      expect(settings.favoriteSpeed).toBe(2.5);

      // Test d'une vitesse invalide
      expect(() => {
         settings.favoriteSpeed = 20;
      }).toThrow("La vitesse doit être comprise entre 0.25 et 16");

      expect(() => {
         settings.favoriteSpeed = 0;
      }).toThrow("La vitesse doit être comprise entre 0.25 et 16");
   });

   it('devrait gérer correctement la playlist', () => {
      const testPlaylist = [
         { id: '1', title: 'Video 1' },
         { id: '2', title: 'Video 2' }
      ];

      settings.playlist = testPlaylist;
      expect(settings.playlist).toEqual(testPlaylist);

      // Test de l'immutabilité
      const retrievedPlaylist = settings.playlist;
      retrievedPlaylist.push({ id: '3', title: 'Video 3' });
      expect(settings.playlist).toEqual(testPlaylist);
   });
}); 
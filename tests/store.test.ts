import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Store } from '../src/store';
import { Plugin } from 'obsidian';

describe('Store', () => {
   beforeEach(() => {
      // Réinitialiser le Store avant chaque test
      Store.destroy();
      // Réinitialiser le DOM
      document.documentElement.lang = 'en';
   });

   afterEach(() => {
      // Nettoyer après chaque test
      Store.destroy();
   });

   it('devrait créer une instance unique (Singleton)', () => {
      const mockPlugin = {
         app: {
            workspace: {},
            vault: {}
         }
      } as Plugin;

      const store1 = new Store(mockPlugin);
      const store2 = new Store(mockPlugin);
      
      expect(store1).toBe(store2);
      expect(Store.instance).toBe(store1);
   });

   it('devrait initialiser correctement les services', async () => {
      const mockPlugin = {
         app: {
            workspace: {},
            vault: {}
         },
         loadData: vi.fn().mockResolvedValue({}),
         saveData: vi.fn().mockResolvedValue(undefined)
      } as unknown as Plugin;

      const store = await Store.init(mockPlugin);
      
      expect(store.Settings).toBeDefined();
      expect(store.PlayerViewAndMode).toBeDefined();
      expect(store.VideoPlayer).toBeDefined();
   });

   it('devrait utiliser la bonne langue à l\'initialisation', () => {
      // Test avec la langue française
      document.documentElement.lang = 'fr';
      const storeFr = new Store({
         app: {
            workspace: {},
            vault: {}
         }
      } as Plugin);
      expect(storeFr.t('player.title')).toBe('Lecteur YouTube');
      
      // Réinitialiser pour le test en anglais
      Store.destroy();
      document.documentElement.lang = 'en';
      
      // Test avec la langue anglaise
      const storeEn = new Store({
         app: {
            workspace: {},
            vault: {}
         }
      } as Plugin);
      expect(storeEn.t('player.title')).toBe('YouTube Player');
   });

   it('devrait retourner des valeurs par défaut quand le Store n\'est pas initialisé', () => {
      Store.destroy();
      const defaultStore = Store.get();
      
      expect(defaultStore.Settings).toBeNull();
      expect(defaultStore.PlayerViewAndMode).toBeNull();
      expect(defaultStore.VideoPlayer).toBeNull();
      expect(defaultStore.t('someKey')).toBe('someKey');
   });
}); 
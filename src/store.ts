import { Plugin } from 'obsidian';
import { Settings } from './settings';
import { PlayerViewAndMode } from './playerViewAndMode';
import { VideoPlayer } from './videoPlayer';

export class Store {
   static instance: Store | null = null;
   app: any;
   plugin!: Plugin;
   VideoPlayer: VideoPlayer | null = null;
   Settings: Settings | null = null;
   PlayerViewAndMode: PlayerViewAndMode | null = null;
   i18n: any;
   t!: (key: string) => string;
   
   constructor(plugin: Plugin) {
      if (Store.instance) {
         return Store.instance;
      }
      
      // Services Obsidian
      this.app = plugin.app;
      this.plugin = plugin;
      
      // Traductions - définies une seule fois à l'initialisation
      const translations = {
         fr: {
            player: {
               title: 'Lecteur YouTube',
               close: 'Fermer'
            }
         },
         en: {
            player: {
               title: 'YouTube Player',
               close: 'Close'
            }
         }
      } as const;
      
      // Détecter la langue d'Obsidian - une seule fois à l'initialisation
      const locale = document.documentElement.lang?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
      this.i18n = translations[locale] || translations.en;
      
      // Définir la méthode de traduction
      this.t = (key: string): string => {
         if (!this.i18n) return key;
         const result = key.split('.').reduce((o: any, i: string) => o?.[i], this.i18n);
         return result || key;
      };
      
      Store.instance = this;
   }
   
   static async init(plugin: Plugin) {
      if (!Store.instance) {
         Store.instance = new Store(plugin);
      }
      
      const instance = Store.instance;
      
      // Initialiser les managers
      instance.Settings = new Settings(plugin);
      await instance.Settings.loadSettings();
      
      instance.PlayerViewAndMode = new PlayerViewAndMode();
      await instance.PlayerViewAndMode.init();
      
      // Initialiser le VideoPlayer
      instance.VideoPlayer = new VideoPlayer(instance.Settings);
      
      return instance;
   }

   static get() {
      if (!Store.instance) {
         return {
            Settings: null,
            PlayerViewAndMode: null,
            VideoPlayer: null,
            app: null,
            i18n: null,
            t: (key: string) => key
         };
      }
      return Store.instance;
   }

   static setVideoPlayer(player: VideoPlayer) {
      if (Store.instance) {
         Store.instance.VideoPlayer = player;
      }
   }

   static destroy() {
      Store.instance = null;
   }
} 
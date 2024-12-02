import { Plugin, App } from 'obsidian';
import { Settings, PluginSettings } from './settings';
import { VideoPlayer } from './videoPlayer';
import { PlayerViewAndMode } from './playerViewAndMode';

interface Translations {
   fr: {
      player: {
         title: string;
         close: string;
      }
   };
   en: {
      player: {
         title: string;
         close: string;
      }
   };
}

// Interface pour le typage uniquement
interface PlayerViewAndModeType {
   Settings: Settings | null;
   i18n: any;
   app: App | null;
   activeLeafId: string | null;
   activeView: any;
   init(): void;
   displayVideo(params: { videoId: string; mode: string; timestamp?: number; fromUserClick?: boolean }): Promise<void>;
   closePreviousVideos(): Promise<void>;
}

export class Store {
   static instance: Store | null = null;
   app: App;
   plugin: Plugin;
   VideoPlayer: VideoPlayer | null = null;
   Settings: Settings | null = null;
   PlayerViewAndMode: PlayerViewAndMode | null = null;
   translations: Translations;
   i18n: any;
   t: (key: string) => string;

   constructor(plugin: Plugin) {
      if (Store.instance) {
         return Store.instance;
      }
      
      // Services Obsidian
      this.app = plugin.app;
      this.plugin = plugin;
      
      // Instance du VideoPlayer
      this.VideoPlayer = null;
      
      // Traductions
      this.translations = {
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
      };
      
      // Détecter la langue d'Obsidian
      const locale = document.documentElement.lang?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
      
      // Utiliser la langue détectée
      this.i18n = this.translations[locale] || this.translations.en;
      
      // Définir la méthode de traduction
      this.t = (key: string) => {
         if (!this.i18n) {
               return key;
         }
         
         const result = key.split('.').reduce((o, i) => o?.[i], this.i18n);
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
               settings: null,
               translations: null,
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

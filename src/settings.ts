import { Store } from './store';
import { VideoMode } from './types';

interface PluginSettings {
   youtubeFlowPlugin: any;
   i18n: any;
   settings: {
      lastVideoId: string | null;
      isVideoOpen: boolean | null;
      playlist: any[];
      currentMode: VideoMode;
      viewHeight: number;
      overlayHeight: number;
      activeLeafId: string | null;
      playbackMode: string;
      favoriteSpeed: number;
      isMuted: boolean;
      showYoutubeRecommendations: boolean;
      playbackRate: number;
      volume: number;
   };
}

export class Settings {
   settings: PluginSettings = {
      youtubeFlowPlugin: null,
      i18n: null,
      settings: {
         lastVideoId: null,
         isVideoOpen: null,
         playlist: [],
         currentMode: 'sidebar' as VideoMode,
         viewHeight: 60,
         overlayHeight: 200,
         activeLeafId: null,
         playbackMode: 'stream',
         favoriteSpeed: 2.0,
         isMuted: false,
         showYoutubeRecommendations: false,
         playbackRate: 1,
         volume: 1,
      },
   };

   constructor(plugin: any) {
      this.settings.youtubeFlowPlugin = plugin;
      const { i18n } = Store.get();
      this.settings.i18n = i18n;
   }

   async loadSettings() {
      try {
         const savedData = await this.settings.youtubeFlowPlugin.loadData();
         if (savedData) {
            this.settings.settings = {
               ...this.settings.settings,
               ...savedData
            };
         }
      } catch (error) {
         throw error;
      }
   }

   async save() {
      try {
         await this.settings.youtubeFlowPlugin.saveData(this.settings.settings);
      } catch (error) {
         throw error;
      }
   }

   // Getters et setters
   get lastVideoId() { return this.settings.settings.lastVideoId; }
   set lastVideoId(value: string | null) { 
      this.settings.settings.lastVideoId = value;
      this.save();
   }

   get playlist() { return [...this.settings.settings.playlist]; }
   set playlist(value: any[]) {
      if (!Array.isArray(value)) {
         throw new Error("La playlist doit être un tableau");
      }
      this.settings.settings.playlist = value;
      this.save();
   }

   get isMuted() { return this.settings.settings.isMuted; }
   set isMuted(value: boolean) {
      this.settings.settings.isMuted = value;
      this.save();
   }

   get showYoutubeRecommendations() { return this.settings.settings.showYoutubeRecommendations; }
   set showYoutubeRecommendations(value: boolean) {
      this.settings.settings.showYoutubeRecommendations = value;
      this.save();
   }

   get favoriteSpeed() { return this.settings.settings.favoriteSpeed; }
   set favoriteSpeed(value: number) {
      const speed = parseFloat(value.toString());
      if (isNaN(speed) || speed < 0.25 || speed > 16) {
         throw new Error("La vitesse doit être comprise entre 0.25 et 16");
      }
      this.settings.settings.favoriteSpeed = speed;
      this.save();
   }
} 
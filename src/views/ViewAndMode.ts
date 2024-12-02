import { App } from 'obsidian';
import { VideoMode } from '../types';
import { cleanVideoId, extractVideoId } from '../utils';
import { SettingsService } from '../services/settings/SettingsService';

export class PlayerViewAndMode {
   activeLeafId: string | null = null;
   activeView: any = null;

   constructor(private app: App, private settings: SettingsService) {}

   async displayVideo({ videoId, mode, timestamp = 0, fromUserClick = false }: {
      videoId: string;
      mode: VideoMode;
      timestamp?: number;
      fromUserClick?: boolean;
   }) {
      if (!videoId) return;

      const cleanedId = cleanVideoId(videoId);
      if (!cleanedId) return;

      // Sauvegarder le mode actuel
      this.settings.currentMode = mode;
      this.settings.lastVideoId = cleanedId;
      this.settings.lastTimestamp = timestamp;
      this.settings.isVideoOpen = true;
      await this.settings.save();

      // Créer une nouvelle vue selon le mode
      let leaf = null;
      if (mode === 'tab') {
         leaf = this.app.workspace.getLeaf('split');
         this.app.workspace.revealLeaf(leaf);
      } else if (mode === 'sidebar') {
         leaf = this.app.workspace.getRightLeaf(false);
         this.app.workspace.revealLeaf(leaf);
      } else {
         leaf = this.app.workspace.getLeaf('window');
         this.app.workspace.revealLeaf(leaf);
      }
      if (!leaf) {
         console.error("Impossible de créer une nouvelle vue");
         return;
      }

      // Sauvegarder l'ID de la leaf active
      this.activeLeafId = (leaf as any).id;
      this.activeView = leaf.view;

      // Ouvrir la vue YouTube
      await leaf.setViewState({
         type: 'youtube-player',
         state: {
            videoId: cleanedId,
            timestamp: timestamp || 0
         }
      });

      // Sauvegarder les paramètres
      this.settings.lastVideoId = cleanedId;
      this.settings.currentMode = mode;
      this.settings.isVideoOpen = true;
      this.settings.activeLeafId = this.activeLeafId;
      await this.settings.save();
   }

   async closePreviousVideos() {
      const leaf = this.app.workspace.getLeafById(this.activeLeafId);
      if (leaf) {
         await leaf.close(); // Fermer l'ancienne feuille
      }
      this.settings.isVideoOpen = false;
      await this.settings.save();
   }
}

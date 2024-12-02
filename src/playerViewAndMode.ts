import { Store } from './store';
import { VideoMode } from './types';
import { cleanVideoId, extractVideoId } from './utils';

export class PlayerViewAndMode {
   activeLeafId: string | null = null;
   activeView: any = null;

   constructor() {
      const { Settings } = Store.get();
      this.activeLeafId = Settings?.activeLeafId || null;
   }

   async init() {
      const { app, Settings } = Store.get();
      if (!app || !Settings) return;
      
      this.activeLeafId = Settings.activeLeafId || null;
   }

   async displayVideo(params: { 
      videoId: string; 
      mode: VideoMode; 
      timestamp?: number; 
      fromUserClick?: boolean; 
   }) {
      const { app, Settings } = Store.get();
      if (!app || !Settings) return;

      // Extraire et nettoyer le videoId
      const extractedId = extractVideoId(params.videoId);
      if (!extractedId) {
         console.error("ID vidéo invalide:", params.videoId);
         return;
      }
      const cleanedVideoId = cleanVideoId(extractedId);

      // Si on a déjà une vue ouverte et qu'on change de mode
      if (Settings.isVideoOpen && Settings.currentMode !== params.mode) {
         // Sauvegarder le videoId avant de fermer
         const currentVideoId = cleanedVideoId;
         // Forcer la fermeture de toutes les vues précédentes
         await this.closePreviousVideos();
         // Réinitialiser l'ID pour forcer une nouvelle création
         this.activeLeafId = null;
         // Restaurer le videoId
         Settings.lastVideoId = currentVideoId;
      }

      // Créer une nouvelle vue selon le mode
      let leaf = null;
      if (params.mode === 'tab') {
         leaf = app.workspace.getLeaf('split');
         app.workspace.revealLeaf(leaf);
      } else if (params.mode === 'sidebar') {
         leaf = app.workspace.getRightLeaf(false);
         app.workspace.revealLeaf(leaf);
      } else {
         leaf = app.workspace.getLeaf('window');
         app.workspace.revealLeaf(leaf);
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
            videoId: cleanedVideoId,
            timestamp: params.timestamp || 0
         }
      });

      // Sauvegarder les paramètres
      Settings.lastVideoId = cleanedVideoId;
      Settings.currentMode = params.mode as VideoMode;
      Settings.isVideoOpen = true;
      Settings.activeLeafId = this.activeLeafId;
      await Settings.save();
   }

   async closePreviousVideos() {
      const { Settings } = Store.get();
      if (!Settings) return;

      const leaf = app.workspace.getLeafById(this.activeLeafId);
      if (leaf) {
         await leaf.close(); // Fermer l'ancienne feuille
      }

      Settings.isVideoOpen = false;
      this.activeLeafId = null;
      this.activeView = null;
      await Settings.save();
   }
}
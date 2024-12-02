import { Store } from './store';
import { VideoMode } from './types';

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
      mode: string; 
      timestamp?: number; 
      fromUserClick?: boolean; 
   }) {
      const { Settings } = Store.get();
      if (!Settings) return;

      // Créer les éléments DOM nécessaires
      const container = document.createElement('div');
      container.className = 'youtube-view-container';
      
      // Ajouter la classe spécifique au mode
      container.classList.add(`youtube-view-${params.mode}`);

      // Créer les contrôles
      const controls = document.createElement('div');
      controls.className = 'youtube-view-controls';
      
      // Ajouter le bouton de fermeture
      const closeButton = document.createElement('button');
      closeButton.className = 'youtube-view-close';
      controls.appendChild(closeButton);

      // Créer le conteneur vidéo redimensionnable
      const videoContainer = document.createElement('div');
      videoContainer.style.minHeight = '100px';
      
      // Utiliser la hauteur appropriée selon le mode
      if (params.mode === 'overlay') {
         videoContainer.style.height = `${Settings.overlayHeight}px`;
      } else {
         videoContainer.style.height = `${Settings.viewHeight}px`;
      }

      // Ajouter la poignée de redimensionnement
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'resize-handle';
      
      // Ajouter une classe spécifique pour la poignée en mode overlay
      if (params.mode === 'overlay') {
         resizeHandle.classList.add('resize-handle-overlay');
      }
      
      // Assembler les éléments
      container.appendChild(controls);
      container.appendChild(videoContainer);
      container.appendChild(resizeHandle);
      
      // Positionner le conteneur selon le mode
      if (params.mode === 'overlay') {
         container.style.position = 'fixed';
         container.style.bottom = '0';
         container.style.right = '0';
         container.style.width = '100%';
         container.style.zIndex = '1000';
      }
      
      document.body.appendChild(container);

      // Sauvegarder les paramètres
      Settings.lastVideoId = params.videoId;
      Settings.currentMode = params.mode as VideoMode;
      Settings.isVideoOpen = true;
      Settings.activeLeafId = this.activeLeafId;
      await Settings.save();
   }

   async closePreviousVideos() {
      const { Settings } = Store.get();
      if (!Settings) return;

      Settings.isVideoOpen = false;
      this.activeLeafId = null;
      this.activeView = null;
      await Settings.save();
   }
} 





       // Nettoyer le videoId
       const cleanedVideoId = cleanVideoId(videoId);
       console.log(`displayVideo() ${cleanedVideoId} en mode ${mode} avec timestamp ${timestamp}`);
       
       // Si on a déjà une vue ouverte et qu'on change de mode
       if (this.Settings.settings.isVideoOpen && 
           this.Settings.settings.currentMode !== mode) {
           // Sauvegarder le videoId avant de fermer
           const currentVideoId = cleanedVideoId;
           // Forcer la fermeture de toutes les vues précédentes
           await this.closePreviousVideos();
           // Réinitialiser l'ID pour forcer une nouvelle création
           this.activeLeafId = null;
           // Restaurer le videoId
           this.Settings.settings.lastVideoId = currentVideoId;
       }
       
       
       // Créer une nouvelle vue selon le mode
       const { PlayerViewAndMode } = Store.get();
       await PlayerViewAndMode.displayVideo({
           videoId: cleanedVideoId,
           mode: mode,
           timestamp: timestamp,
           fromUserClick: fromUserClick
       });
       
import { Plugin } from 'obsidian';
import { Store } from './store';

export class PlayerViewAndMode {
   activeLeafId: string | null = null;
   activeView: any = null;

   constructor() {
      const { Settings } = Store.get();
      this.activeLeafId = Settings?.settings?.activeLeafId || null;
   }

   async init() {
      const { app, Settings } = Store.get();
      if (!app || !Settings) return;
      
      this.activeLeafId = Settings.settings.activeLeafId || null;
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
         videoContainer.style.height = `${Settings.settings.overlayHeight}px`;
      } else {
         videoContainer.style.height = `${Settings.settings.viewHeight}px`;
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
      Settings.settings.lastVideoId = params.videoId;
      Settings.settings.currentMode = params.mode;
      Settings.settings.isVideoOpen = true;
      await Settings.save();
   }

   async closePreviousVideos() {
      const { Settings } = Store.get();
      if (!Settings) return;

      Settings.settings.isVideoOpen = false;
      this.activeLeafId = null;
      this.activeView = null;
      await Settings.save();
   }
} 
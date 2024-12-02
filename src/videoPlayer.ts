import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import { VideoJsPlayerOptions } from 'video.js';
import type { default as VideoJs } from 'video.js';
import 'videojs-youtube';
import { App, Plugin, Menu } from 'obsidian';
import { Store } from './store';
import { Settings, PluginSettings } from './settings';

type VideoJsPlayer = ReturnType<typeof videojs>;
type VideoJsPlayerOptions = Parameters<typeof videojs>[1];
type VideoJsPlayerEvents = VideoJsPlayer;

export class VideoPlayer {
   private static instance: VideoPlayer | null = null;
   Player: VideoJsPlayer | null = null;
   Settings: Settings;
   hasVideoJS: boolean = false;
   currentLanguage: string;
   container: HTMLElement | null = null;
   resizeObserver: ResizeObserver | null = null;
   playbackRateButton: any = null;
   isDragging: boolean = false;
   startY: number = 0;
   startHeight: number = 0;

   private constructor(Settings: Settings) {
      this.Settings = Settings;
      this.currentLanguage = document.documentElement.lang || 'en';
      this.hasVideoJS = typeof window.videojs !== 'undefined';
      this.addCustomStyles();
   }

// getObsidianLanguage() : Récupérer la langue de l'interface d'Obsidian avec fallback sur EN
   getObsidianLanguage(): string {
      const htmlLang = document.documentElement.lang;
      return htmlLang?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
   }
// checkVideoJS() : Vérifier si VideoJS est disponible
   async checkVideoJS(): Promise<boolean> {
      try {
         await new Promise(resolve => setTimeout(resolve, 100));
         const vjsInstance = (window as any).videojs || videojs;
         if (typeof vjsInstance === 'function') {
               this.hasVideoJS = true;
               return true;
         }
         
         console.warn('VideoJS non disponible');
         return false;
      } catch (error) {
         return false;
      }
   }
   static getInstance(Settings: Settings): VideoPlayer {
      if (!VideoPlayer.instance) {
         VideoPlayer.instance = new VideoPlayer(Settings);
      }
      return VideoPlayer.instance;
   }

   static destroyInstance(): void {
      if (VideoPlayer.instance) {
         VideoPlayer.instance.dispose();
         VideoPlayer.instance = null;
      }
   }
// initializePlayer() : Initialiser le player
   async initializePlayer(videoId: string, container: HTMLElement, timestamp: number = 0, fromUserClick: boolean = false): Promise<VideoJsPlayer | HTMLElement> {
      try {
         if (!this.Settings) {
            console.warn('Settings non initialisés');
            return this.createFallbackPlayer(videoId, container, timestamp);
         }

         if (!videoId) {
            console.warn('VideoId manquant');
            return this.createFallbackPlayer('ag7HXbgJtuk', container, timestamp);
         }

         // Si on a déjà un player avec le même ID, ne rien faire
         if (this.Player && this.Player.src().includes(videoId)) {
            console.log("Player déjà initialisé avec le même ID");
            return this.Player;
         }

         // Nettoyer l'ancien player si nécessaire
         if (this.Player) {
            console.log("Nettoyage de l'ancien player");
            this.Player.dispose();
            this.Player = null;
         }

         console.log("Initialisation du player avec videoId:", videoId);
         // Vérifier si videojs est disponible
         if (typeof videojs !== 'function') {
            return this.createFallbackPlayer(videoId, container, timestamp);
         }

         // Conteneur principal
         const mainContainer = document.createElement('div');
         mainContainer.id = 'youtube-flow-player';
         mainContainer.className = 'youtube-flow-container';
         
         // Wrapper pour la vidéo et ses contrôles
         const playerWrapper = document.createElement('div');
         playerWrapper.className = 'player-wrapper';
         mainContainer.appendChild(playerWrapper);
         
         // Élément vidéo
         const video = document.createElement('video-js');
         video.className = 'video-js vjs-obsidian-theme';
         playerWrapper.appendChild(video);
         
         // Ajouter d'abord le conteneur au DOM
         container.appendChild(mainContainer);
         
         // Attendre que le conteneur soit bien dans le DOM
         await new Promise(resolve => setTimeout(resolve, 100));
         
         console.log("Création du player VideoJS");
         
         // Configuration du player
         const options: VideoJsPlayerOptions = {
            techOrder: ['youtube'],
            sources: [{
               type: 'video/youtube',
               src: `https://www.youtube.com/watch?v=${videoId}`
            }],
            // Désactiver les composants non désirés
            liveTracker: false,
            liveui: false,
            // Option générique pour tous les types de sources
            autoplay: fromUserClick,
            // Définir l'ordre des composants
            children: [
               'MediaLoader'
            ],
            // Configuration de la barre de contrôle
            controlBar: {
               children: [
                  'playToggle',
                  'volumePanel',
                  'skipBackward',
                  'skipForward',
                  'currentTimeDisplay',
                  'timeDivider',
                  'durationDisplay',
                  'progressControl',
                  'pictureInPictureToggle',
                  'fullscreenToggle'
               ]
            },
            
            // Traductions de la barre de contrôle
            language: this.currentLanguage,
            languages: {
               en: {
                  "Play": "Play",
                  "Pause": "Pause",
                  "Mute": "Mute",
                  "Unmute": "Unmute",
                  "Skip Backward": "Backward",
                  "Skip Forward": "Forward",
                  "Current Time": " ",
                  "Duration": " ",
                  "Fullscreen": "Fullscreen",
                  "Non-Fullscreen": "Exit Fullscreen",
                  "Picture-in-Picture": "PIP",
                  "Exit Picture-in-Picture": "PIP",
                  "Close": "Close"
               },
               fr: {
                  "Play": "Lecture",
                  "Pause": "Pause",
                  "Mute": "Muet",
                  "Unmute": "Son",
                  "Skip Backward": "Précédent",
                  "Skip Forward": "Suivant",
                  "Current Time": "Temps actuel",
                  "Duration": "Durée",
                  "Fullscreen": "Plein écran",
                  "Non-Fullscreen": "Quitter le plein écran",
                  "Picture-in-Picture": "PIP",
                  "Exit Picture-in-Picture": "PIP",
                  "Close": "Fermer"
               }
            },
            
            // Configuration spécifique à YouTube
            youtube: {
               iv_load_policy: 3,
               modestbranding: 1,
               rel: this.Settings.showYoutubeRecommendations ? 1 : 0,
               endscreen: this.Settings.showYoutubeRecommendations ? 1 : 0,
               controls: 0,
               ytControls: 0,
               preload: 'auto',
               showinfo: 0,
               fs: 0,
               playsinline: 1,
               disablekb: 1,
               enablejsapi: 1,
               origin: window.location.origin,
            },
            
            // Configuration de la barre de progression
            progressControl: {
               seekBar: true
            },
            enableSmoothSeeking: true,
            
            // Actions utilisateur
            userActions: {
               hotkeys: true
            },
            startTime: timestamp,
            
            // Configuration du plein écran
            fullscreen: {
               options: {
                  navigationUI: 'hide'
               }
            },
            
            // Appliquer le mode muet depuis les settings
            muted: this.Settings.isMuted ? 1 : 0,
         };

         console.log("Player créé avec videoId:", this.Settings.getSettings().lastVideoId);

// Créer le player
         console.log("Création du player VideoJS");
         this.Player = videojs(video, options);

         if (!this.Player) {
            console.error("Échec de création du player");
            return this.createFallbackPlayer(videoId, container, timestamp);
         }

         console.log("Player créé avec succès");

// Maintenant on peut utiliser ready()
         await new Promise<void>((resolve) => {
            this.Player!.ready(() => {
               console.log("Player prêt");
               resolve();
            });
         });

// Ajouter notre bouton de vitesse personnalisé
         this.playbackRateButton = this.Player!.controlBar.addChild('button', {
            className: 'vjs-playback-rate-button'
         });
         const buttonEl = this.playbackRateButton.el();
// Gérer le hover pour afficher le menu
         buttonEl.addEventListener('mouseenter', (e) => {
            const menu = new Menu();
            const rates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5, 8, 10, 16];
            const currentRate = this.Player!.playbackRate();
            
            rates.forEach(rate => {
               menu.addItem(item => 
                  item
                     .setTitle(`${rate}x`)
                     .setChecked(currentRate === rate)
                     .onClick(() => {
                        this.Player!.playbackRate(rate);
                        this.updatePlaybackRateButton(rate);
                     })
               );
            });

// Calculer la position exacte du menu
            const rect = buttonEl.getBoundingClientRect();
            const menuWidth = 100; // Largeur approximative du menu
            menu.showAtPosition({
               x: rect.left + (rect.width - menuWidth) / 2,
               y: rect.bottom
            });
         });

// Écouter les changements de vitesse
         this.Player!.on('ratechange', () => {
            const newRate = this.Player!.playbackRate();
            this.updatePlaybackRateButton(newRate);
         });

         if (timestamp > 0) {
            console.log(`Setting timestamp to ${timestamp}s`);
            this.Player!.currentTime(timestamp);
         }

// Appliquer la dernière vitesse utilisée
         const savedRate = this.Settings.getSettings().playbackRate || 1;
         this.Player!.playbackRate(savedRate);
         this.updatePlaybackRateButton(savedRate);

// Mettre à jour le stockage quand la vitesse change
         this.Player!.on('ratechange', () => {
            const newRate = this.Player!.playbackRate();
            this.updatePlaybackRateButton(newRate);
            this.Settings.playbackRate = newRate;
         });

// Après l'initialisation du player
         this.Player!.on('volumechange', () => {
            this.Settings.volume = this.Player!.volume() || 0;
            this.Settings.isMuted = this.Player!.muted() || false;
         });

// Mettre à jour le player dans le Store
         Store.setVideoPlayer(this);
         console.log("Player mis à jour dans le Store");

         return this.Player;
      } catch (error) {
         console.error("Erreur lors de l'initialisation du player vidéo:", error);
         return this.createFallbackPlayer(videoId, container, timestamp);
      }
   }

   addCustomStyles(): void {
      if (!this.hasVideoJS) {
         console.warn('VideoJS non disponible, utilisation du lecteur de secours');
         return;
      }

      const style = document.createElement('style');
      style.textContent = `
         .video-js {
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
            height: 100% !important;
         }

         /* Conteneur principal de l'iframe */
         .video-js > div:first-child {
            flex: 1 !important;
            position: relative !important;
            min-height: 0 !important;
         }

         /* L'iframe elle-même */
         .vjs-tech {
            width: 100% !important;
            height: 100% !important;
            position: relative !important;
         }

         /* Barre de contrôle */
         .vjs-control-bar {
            height: 60px !important;
            background: var(--background-secondary) !important;
            display: flex !important;
            align-items: center !important;
            padding: 0 10px !important;
         }

         /* Contrôles individuels */
         .vjs-control {
            display: flex !important;
            align-items: center !important;
            height: 40px !important;
         }

         /* Volume panel */
         .vjs-volume-panel {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            width: auto !important;
         }

         .vjs-volume-control {
            width: 80px !important;
            height: 100% !important;
         }

         /* Progress control */
         .vjs-progress-control {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 4px !important;
            background: var(--background-modifier-border) !important;
            cursor: pointer !important;
            transition: height 0.2s !important;
         }

         .vjs-progress-control:hover {
            height: 8px !important;
         }

         .vjs-play-progress {
            background: var(--interactive-accent) !important;
            height: 100% !important;
            max-height: 4px !important;
         }

         .vjs-progress-control:hover .vjs-play-progress {
            max-height: 8px !important;
         }

         /* Progress holder */
         .vjs-progress-holder {
            position: relative !important;
            height: 6px !important;
            width: 100% !important;
            display: flex !important;
            align-items: center !important;
            cursor: pointer !important;
            transition: height 0.2s !important;
         }

         /* Load progress */
         .vjs-load-progress {
            position: absolute !important;
            height: 100% !important;
            background: var(--background-modifier-border) !important;
         }

         /* Time tooltip */
         .vjs-time-tooltip {
            background: var(--background-secondary) !important;
            padding: 2px 5px !important;
            border-radius: 3px !important;
            font-size: 12px !important;
            white-space: nowrap !important;
         }

         /* Mouse display */
         .vjs-mouse-display {
            position: absolute !important;
            height: 100% !important;
            width: 1px !important;
            background: var(--text-muted) !important;
         }

         /* Supprimer complètement le poster/thumbnail */
         .vjs-poster,
         .vjs-loading-spinner,
         .vjs-big-play-button {
            display: none !important;
         }

         /* Contrôles de temps */
         .vjs-time-control {
            display: flex !important;
            align-items: center !important;
            min-width: 50px !important;
            padding: 0 8px !important;
            font-size: 13px !important;
         }

         .vjs-current-time,
         .vjs-duration,
         .vjs-time-divider {
            display: flex !important;
            align-items: center !important;
         }

         .vjs-time-divider {
            padding: 0 3px !important;
         }

         /* Forcer la hauteur complète */
         .player-wrapper {
            height: 100% !important;
            min-height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
         }

         /* Conteneur de l'iframe */
         .video-js > div:first-child {
            position: relative !important;
            width: 100% !important;
            flex: 1 !important;  /* Remplace height: calc(100% - 60px) */
            display: flex !important;
            flex-direction: column !important;
         }

         /* Masquer le tooltip par défaut */
         .vjs-time-tooltip {
            opacity: 0;
            transition: opacity 0.2s;
         }

         /* Afficher uniquement pendant le hover */
         .vjs-progress-control:hover .vjs-time-tooltip {
            opacity: 1;
         }

         /* Cacher les labels "Current Time" et "Duration" */
         .vjs-control-text[role="presentation"] {
            display: none !important;
         }

         /* Styles pour le bouton plein écran */
         .vjs-fullscreen-control {
            cursor: pointer !important;
            width: 40px !important;
            height: 40px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            opacity: 0.8 !important;
            transition: opacity 0.2s ease !important;
         }

         .vjs-fullscreen-control:hover {
            opacity: 1 !important;
         }

         .vjs-fullscreen-control .vjs-icon-placeholder:before {
            font-size: 1.8em !important;
            line-height: 40px !important;
         }

         /* Styles pour le mode plein écran */
         .video-js.vjs-fullscreen {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 9999 !important;
         }
      `;
      document.head.appendChild(style);
   }

   createFallbackPlayer(videoId: string, container: HTMLElement, timestamp: number = 0): HTMLElement {
      console.log("Utilisation du lecteur de secours pour", videoId);
      container.innerHTML = '';
      
      const playerContainer = document.createElement('div');
      playerContainer.className = 'fallback-player-container';
      
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${videoId}${timestamp ? `?start=${timestamp}` : ''}`;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      
      playerContainer.appendChild(iframe);
      container.appendChild(playerContainer);
      
      // Ajouter la poignée de redimensionnement même pour le fallback
      this.addResizeHandle(container);
      
      return playerContainer;
   }

   getPlayerConfig(videoId: string): any {
      return {
         techOrder: ['youtube'],
         sources: [{
               type: 'video/youtube',
               src: `https://www.youtube.com/watch?v=${videoId}`
         }],
         liveTracker: false,
         liveui: false,
         children: ['MediaLoader'],
         controlBar: {
               children: [
                  'playToggle',
                  'volumePanel',
                  'skipBackward',
                  'skipForward',
                  'currentTimeDisplay',
                  'timeDivider',
                  'durationDisplay',
                  'progressControl',
                  'pictureInPictureToggle',
                  'fullscreenToggle'
               ]
         },
         
         // Configuration de la langue
         language: this.currentLanguage,
         languages: {
               en: {
                  "Play": "Play",
                  "Pause": "Pause",
                  "Mute": "Mute",
                  "Unmute": "Unmute",
                  "Skip Backward": "Backward",
                  "Skip Forward": "Forward",
                  "Current Time": " ",
                  "Duration": " ",
                  "Fullscreen": "Fullscreen",
                  "Non-Fullscreen": "Exit Fullscreen",
                  "Picture-in-Picture": "PIP",
                  "Exit Picture-in-Picture": "PIP",
                  "Close": "Close"
               },
               fr: {
                  "Play": "Lecture",
                  "Pause": "Pause",
                  "Mute": "Muet",
                  "Unmute": "Son",
                  "Skip Backward": "Précédent",
                  "Skip Forward": "Suivant",
                  "Current Time": " ",
                  "Duration": " ",
                  "Fullscreen": "Plein écran",
                  "Non-Fullscreen": "Quitter le plein écran",
                  "Picture-in-Picture": "PIP",
                  "Exit Picture-in-Picture": "PIP",
                  "Close": "Fermer"
               }
         },
         
         // Configuration YouTube
         youtube: {
               iv_load_policy: 3,
               modestbranding: 1,
               rel: this.Settings.showYoutubeRecommendations ? 1 : 0,
               endscreen: this.Settings.showYoutubeRecommendations ? 1 : 0,
               controls: 0,
               ytControls: 0,
               preload: 'auto',
               showinfo: 0,
               fs: 0,
               playsinline: 1,
               disablekb: 1,
               enablejsapi: 1,
               origin: window.location.origin,
         },
         
         // Configuration de la barre de progression
         progressControl: {
               seekBar: true
         },
         enableSmoothSeeking: true,
         
         // Actions utilisateur
         userActions: {
               hotkeys: true
         },
         
         // Configuration du plein écran
         fullscreen: {
               options: {
                  navigationUI: 'hide'
               }
         },
         
         // État initial
         muted: this.Settings.isMuted ? 1 : 0,
      };
   }

   private initializeEvents(): void {
      if (!this.Player) return;
      
      this.Player.on('play', (() => {
         if (this.Settings) {
            this.Settings.isPlaying = true;
         }
      }) as VideoJsPlayerEvents['play']);

      this.Player.on('pause', () => {
         if (this.Settings) {
            this.Settings.isPlaying = false;
         }
      });

      this.Player.on('volumechange', () => {
         if (this.Player && this.Settings) {
            this.Settings.volume = this.Player.volume();
            this.Settings.isMuted = this.Player.muted();
         }
      });

      this.Player.on('ratechange', () => {
         if (this.Player && this.Settings) {
            this.Settings.playbackRate = this.Player.playbackRate();
         }
      });

      // Raccourcis clavier
      window.addEventListener('keydown', this.handleKeydown.bind(this));
   }

   private addResizeHandle(container: HTMLElement): void {
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'resize-handle';
      container.appendChild(resizeHandle);

      // Ajouter les gestionnaires d'événements avec le bon type
      resizeHandle.addEventListener('mousedown', (e: Event) => {
         if (e instanceof MouseEvent) {
               this.handleResizeStart(e);
         }
      });

      document.addEventListener('mousemove', (e: Event) => {
         if (e instanceof MouseEvent) {
               this.handleResizeMove(e);
         }
      });

      document.addEventListener('mouseup', () => {
         this.handleResizeEnd();
      });

      // Observer les changements de taille
      this.resizeObserver = new window.ResizeObserver(entries => {
         for (const entry of entries) {
               const height = entry.contentRect.height;
               if (height < 100) container.style.height = '100px';
               if (height > window.innerHeight * 0.9) {
                  container.style.height = `${window.innerHeight * 0.9}px`;
               }
         }
      });
      this.resizeObserver.observe(container);
   }

   private handleResizeStart(e: MouseEvent): void {
      if (!this.container) return;
      this.isDragging = true;
      this.startY = e.clientY;
      this.startHeight = this.container.clientHeight;
   }

   private handleResizeMove(e: MouseEvent): void {
      if (!this.isDragging || !this.container) return;
      
      const delta = e.clientY - this.startY;
      let newHeight = this.startHeight + delta;
      
      // Appliquer les limites
      newHeight = Math.max(100, Math.min(newHeight, window.innerHeight * 0.9));
      
      // Vérifier si nous sommes en mode overlay
      const isOverlay = this.container.closest('.youtube-view-overlay');
      
      // Mettre à jour la hauteur
      this.container.style.height = `${newHeight}px`;
      
      // Sauvegarder la hauteur dans les paramètres
      const { Settings } = Store.get();
      if (Settings) {
         if (isOverlay) {
               Settings.overlayHeight = newHeight;
         } else {
               Settings.viewHeight = newHeight;
         }
         Settings.save();
      }
   }

   private handleResizeEnd(): void {
      this.isDragging = false;
   }

   private handleKeydown(e: KeyboardEvent): void {
      if (!this.Player) return;

      // Debug pour comprendre ce qui se passe
      console.log('Keydown event:', {
         key: e.key,
         code: e.code,
         shiftKey: e.shiftKey,
         target: e.target,
         eventPhase: e.eventPhase
      });

      // Shift + Space pour play/pause - version plus robuste
      if (e.code === 'Space' && e.shiftKey) {
         console.log('Raccourci détecté: Shift + Space');
         e.stopPropagation();
         e.preventDefault();
         
         try {
            if (this.Player.paused()) {
               console.log('Tentative de lecture');
               this.Player.play();
            } else {
               console.log('Tentative de pause');
               this.Player.pause();
            }
         } catch (error) {
            console.error('Erreur lors du contrôle du lecteur:', error);
         }
         return;
      }

      // Contrôles de vitesse
      if (e.ctrlKey) {
         switch (e.key) {
               case '1': // Diminuer
                  const newRate1 = Math.max(0.25, this.Player.playbackRate() - 0.25);
                  this.Player.playbackRate(newRate1);
                  this.updatePlaybackRateButton(newRate1);
                  break;
               case '2': // Normal
                  this.Player.playbackRate(1);
                  this.updatePlaybackRateButton(1);
                  break;
               case '3': // Augmenter
                  const newRate3 = Math.min(16, this.Player.playbackRate() + 0.25);
                  this.Player.playbackRate(newRate3);
                  this.updatePlaybackRateButton(newRate3);
                  break;
               case '4': // Favori
                  const favoriteSpeed = this.Settings.favoriteSpeed;
                  if (favoriteSpeed) {
                     this.Player.playbackRate(favoriteSpeed);
                     this.updatePlaybackRateButton(favoriteSpeed);
                  }
                  break;
         }
      }
   }

   updatePlaybackRateButton(rate: number): void {
      if (this.Player) {
         this.Player.playbackRate(rate);
         this.Settings.playbackRate = rate;
      }
   }

   dispose(): void {
      if (this.resizeObserver) {
         this.resizeObserver.disconnect();
      }
      document.removeEventListener('keydown', this.handleKeydown.bind(this));
      document.removeEventListener('mousemove', this.handleResizeMove.bind(this));
      document.removeEventListener('mouseup', this.handleResizeEnd.bind(this));
      
      if (this.Player && typeof this.Player.dispose === 'function') {
         this.Player.dispose();
      }

      if (this.container) {
         this.container.remove();
         this.container = null;
      }

      const videoContainer = document.querySelector('.video-container');
      if (videoContainer) {
         videoContainer.remove();
      }
   }

   private formatTimestamp(seconds: number): string {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;
      
      if (hours > 0) {
         return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
      }
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
   }

   requestFullscreen(): void {
      if (!this.Player) return;
      try {
         this.Player.requestFullscreen().catch(error => {
            console.error("Erreur lors du passage en plein écran:", error);
         });
      } catch (error) {
         console.error("Erreur lors du passage en plein écran:", error);
      }
   }

   exitFullscreen(): void {
      if (!this.Player) return;
      try {
         this.Player.exitFullscreen().catch(error => {
            console.error("Erreur lors de la sortie du plein écran:", error);
         });
      } catch (error) {
         console.error("Erreur lors de la sortie du plein écran:", error);
      }
   }
}
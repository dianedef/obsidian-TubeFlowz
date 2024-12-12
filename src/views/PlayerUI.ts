import videojs from 'video.js';
import 'videojs-youtube';
import { SettingsService } from '../services/SettingsService';
import { type IVideoJsPlayer, type IControlBarComponent, type IVideoJsOptions } from 'video.js';
import { IPlayerUI } from '../types/IPlayerUI';
import { PlayerAppError, PlayerErrorCode } from '../types/IErrors';
import { ERROR_MESSAGE_KEYS } from '../services/TranslationsService';
import { Menu } from 'obsidian';
import { VideoId, Timestamp, PlaybackRate } from '../types/IBase';
import { eventBus } from '../services/EventBus';
import { VIEW_MODES } from '../types/ISettings';
import { IPlayerState } from '../types/IPlayer';

export class PlayerUI implements IPlayerUI {
   private static instance: PlayerUI | null = null;
   Player: IVideoJsPlayer | null = null;
   private settings: SettingsService;

   hasVideoJS: boolean = false;
   container: HTMLElement | null = null;
   resizeObserver: ResizeObserver | null = null;
   playbackRateButton: IControlBarComponent | null = null;
   isDragging: boolean = false;
   startY: number = 0;
   startHeight: number = 0;
   private controlsContainer: HTMLElement | null = null;
   private videoContainer: HTMLElement | null = null;
   private resizeHandle: HTMLElement;
   private cleanupFunctions: (() => void)[] = [];
   private currentVideoId: VideoId | null = null;

   private constructor(
      settings: SettingsService
   ) {
      this.settings = settings;
      
      this.resizeHandle = document.createElement('div');
      this.resizeHandle.className = 'resize-handle';

      this.initializeEventListeners();
   }

// Méthodes du Singleton
      static getInstance(settings: SettingsService): PlayerUI {
      if (!PlayerUI.instance) {
         PlayerUI.instance = new PlayerUI(settings);
      }
      return PlayerUI.instance;
   }

   static destroyInstance(): void {
      if (PlayerUI.instance) {
         PlayerUI.instance.dispose();
         PlayerUI.instance = null;
         console.log("[PlayerUI dans destroyInstance] Instance détruite");
      }
   }

// Mettre à jour initializePlayer pour initialiser l'observateur de langue
   async initializePlayer(container: HTMLElement): Promise<IVideoJsPlayer | HTMLElement> {
      if (this.Player) {
         console.log("[PlayerUI dans initializePlayer] Player déjà initialisé, réutilisation de l'instance existante");
         return this.Player;
      }

      try {
         // Trouver le conteneur .view-content d'Obsidian
         const viewContent = container.querySelector('.view-content');
         if (!viewContent) {
            throw new PlayerAppError(
               PlayerErrorCode.MEDIA_ERR_ABORTED,
               ERROR_MESSAGE_KEYS.CONTAINER_NOT_INITIALIZED
            );
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
         const video = document.createElement('video') as HTMLVideoElement;
         video.className = 'video-js vjs-obsidian-theme';
         playerWrapper.appendChild(video);
         
         // Ajouter le conteneur dans .view-content
         viewContent.appendChild(mainContainer);
         
         console.log("[PlayerUI dans initializePlayer] Création du player VideoJS");
         
         const lastVideoId = this.settings.getSettings().lastVideoId;
         console.log("[PlayerUI dans initializePlayer] Initialisation avec videoId:", lastVideoId);

         // Configuration du player avec les types corrects
         const options: IVideoJsOptions = {
            techOrder: ['youtube'],
            sources: [{
               type: 'video/youtube',
               src: `https://www.youtube.com/watch?v=${lastVideoId}`
            }],
            languages: {
               fr: {
                  "Play": "Lecture",
                  "Pause": "Pause",
                  "Mute": "Muet",
                  "Unmute": "Son activé",
                  "Current Time": "Temps actuel",
                  "Duration": "Durée",
                  "Remaining Time": "Temps restant",
                  "Playback Rate": "Vitesse de lecture",
                  "Fullscreen": "Plein écran",
                  "Non-Fullscreen": "Fenêtré"
               },
               en: {
                  "Play": "Play",
                  "Pause": "Pause",
                  "Mute": "Mute",
                  "Unmute": "Unmute",
                  "Current Time": "Current Time",
                  "Duration": "Duration",
                  "Remaining Time": "Remaining Time",
                  "Playback Rate": "Playback Rate",
                  "Fullscreen": "Fullscreen",
                  "Non-Fullscreen": "Exit Fullscreen"
               }
            },
            controlBar: {
               children: [
                  'playToggle',
                  'volumePanel',
                  'currentTimeDisplay',
                  'timeDivider',
                  'durationDisplay',
                  'customControlSpacer',
                  'playbackRateMenuButton',
                  'pictureInPictureToggle',
                  'fullscreenToggle',
                  'progressControl'
               ]
            },
            youtube: {
               iv_load_policy: 3,
               modestbranding: 1,
               rel: this.settings.showYoutubeRecommendations ? 1 : 0,
               endscreen: this.settings.showYoutubeRecommendations ? 1 : 0,
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
            userActions: {
               hotkeys: true
            },
            fullscreen: {
               options: {
                  navigationUI: 'hide'
               }
            }
         };

         console.log("[PlayerUI dans initializePlayer] Options du player:", options);

         // Créer le player avec le bon élément
         this.Player = videojs(video, options) as IVideoJsPlayer;

         if (!this.Player) {
            console.error("[PlayerUI dans initializePlayer] Échec de création de l'interface");
            return this.createFallbackPlayer(this.settings.getSettings().lastVideoId, container);
         }

         console.log("[PlayerUI dans initializePlayer] Interface créée avec succès");

         // Attendre que le player soit prêt
         await new Promise<void>((resolve) => {
            this.Player!.ready(() => {
               console.log("[PlayerUI dans initializePlayer] Interface prête");
               resolve();
            });
         });

         // Initialiser les contrôles personnalisés
         await this.initializeCustomControls();

// Mettre à jour le stockage quand la vitesse change
         this.Player!.on('ratechange', () => {
            const newRate = this.Player!.playbackRate();
            if (typeof newRate === 'number') {
               if (this.playbackRateButton) {
                  const buttonElement = this.playbackRateButton.el();
                  if (buttonElement) {
                     buttonElement.textContent = `${newRate}x`;
                  }
               }
            }
            console.log("[PlayerUI dans initializePlayer] Vitesse de lecture mise à jour:", newRate);
         });

// Après l'initialisation du player
         this.Player!.on('volumechange', () => {
            this.settings.volume = this.Player!.volume() || 0;
            this.settings.isMuted = this.Player!.muted() || false;
         });

         // Émettre l'événement une fois que tout est prêt
         eventBus.emit('player:init');
         return this.Player;
      } catch (error) {
         console.error("[PlayerUI dans initializePlayer] Erreur lors de l'initialisation de l'interface:", error);
         throw new PlayerAppError(
            PlayerErrorCode.MEDIA_ERR_ABORTED,
            ERROR_MESSAGE_KEYS.MEDIA_ERR_ABORTED
         );
      }
   }

   private async initializeCustomControls(): Promise<void> {
      if (!this.Player) return;

      // Ajouter le bouton de vitesse personnalisé
      this.playbackRateButton = this.Player.controlBar.addChild('button', {
         className: 'vjs-playback-rate'
      }) as IControlBarComponent;

      const buttonEl = this.playbackRateButton.el();
      buttonEl.textContent = `${this.settings.playbackRate}x`;

      // Gérer le hover pour afficher le menu
      buttonEl.addEventListener('mouseenter', () => {
         const menu = new Menu();
         const rates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5, 8, 10, 16] as const;
         const currentRate = this.Player?.playbackRate() as PlaybackRate;

         rates.forEach(rate => {
            menu.addItem(item => 
               item
                  .setTitle(`${rate}x`)
                  .setChecked(currentRate === rate)
                  .onClick(() => {
                     if (this.Player) {
                        this.Player.playbackRate(rate);
                        this.updatePlaybackRateButton(rate);
                     }
                  })
            );
         });

         const rect = buttonEl.getBoundingClientRect();
         menu.showAtPosition({
            x: rect.left,
            y: rect.bottom
         });
      });
      console.log("[PlayerUI dans initializeCustomControls] Menu ajouté");
   }

   createFallbackPlayer(videoId: VideoId, container: HTMLElement): HTMLElement {
      console.log("[PlayerUI dans createFallbackPlayer] Utilisation du lecteur de secours pour", videoId);
      container.innerHTML = '';
      
      const playerContainer = document.createElement('div');
      playerContainer.className = 'fallback-player-container';
      
      const iframe = document.createElement('iframe');
      iframe.src = videoId;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      
      playerContainer.appendChild(iframe);
      container.appendChild(playerContainer);
      
      // Ajouter la poignée de redimensionnement même pour le fallback
      this.addResizeHandle(container);
      console.log("[PlayerUI dans createFallbackPlayer] Poignée de redimensionnement ajoutée", this.resizeHandle);
      
      return playerContainer;
   }

   getPlayerConfig(videoId: VideoId): any {
      return {
         techOrder: ['youtube'],
         sources: [{
               type: 'video/youtube',
               src: videoId
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
               rel: this.settings.showYoutubeRecommendations ? 1 : 0,
               endscreen: this.settings.showYoutubeRecommendations ? 1 : 0,
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
         muted: this.settings.isMuted ? 1 : 0,
      };
   }

   private addResizeHandle(container: HTMLElement): void {
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'resize-handle';
      container.appendChild(resizeHandle);
      console.log("[PlayerUI dans addResizeHandle] Poignée de redimensionnement ajoutée", resizeHandle);

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
      
      // Mettre à jour la hauteur
      this.container.style.height = `${newHeight}px`;
   }

   private handleResizeEnd(): void {
      this.isDragging = false;
      if (this.container) {
         eventBus.emit('view:resize', this.container.clientHeight);
      }
   }

   private handleKeydown(e: KeyboardEvent): void {
      if (!this.Player) return;

      // Shift + Space pour play/pause
      if (e.code === 'Space' && e.shiftKey) {
         e.stopPropagation();
         e.preventDefault();
         
         if (this.Player.paused()) {
            this.Player.play();
         } else {
            this.Player.pause();
         }
         return;
      }

      // Contrôles de vitesse
      if (e.ctrlKey) {
         const currentRate = this.Player.playbackRate();
         if (typeof currentRate !== 'number') return;

         switch (e.key) {
               case '1': // Diminuer
                  const newRate1 = Math.max(0.25, currentRate - 0.25);
                  this.Player.playbackRate(newRate1);
                  this.updatePlaybackRateButton(newRate1);
                  break;
               case '2': // Normal
                  this.Player.playbackRate(1);
                  this.updatePlaybackRateButton(1);
                  break;
               case '3': // Augmenter
                  const newRate3 = Math.min(16, currentRate + 0.25);
                  this.Player.playbackRate(newRate3);
                  this.updatePlaybackRateButton(newRate3);
                  break;
               case '4': // Favori
                  const favoriteSpeed = this.settings.favoriteSpeed;
                  if (favoriteSpeed) {
                     this.Player.playbackRate(favoriteSpeed);
                     this.updatePlaybackRateButton(favoriteSpeed);
                  }
                  break;
         }
      }
   }

   requestFullscreen(): void {
      if (!this.Player) {
         throw new PlayerAppError(
            PlayerErrorCode.MEDIA_ERR_ABORTED,
            ERROR_MESSAGE_KEYS.MEDIA_ERR_ABORTED
         );
      }
      try {
         this.Player.requestFullscreen().catch((error: Error) => {
            console.error("Erreur lors du passage en plein écran:", error);
            throw new PlayerAppError(
               PlayerErrorCode.MEDIA_ERR_ABORTED,
               ERROR_MESSAGE_KEYS.FULLSCREEN_ERROR
            );
         });
      } catch (error) {
         console.error("Erreur lors du passage en plein écran:", error);
         throw new PlayerAppError(
            PlayerErrorCode.MEDIA_ERR_ABORTED,
            ERROR_MESSAGE_KEYS.FULLSCREEN_ERROR
         );
      }
   }

   exitFullscreen(): void {
      if (!this.Player) {
         throw new PlayerAppError(
            PlayerErrorCode.MEDIA_ERR_ABORTED,
            ERROR_MESSAGE_KEYS.MEDIA_ERR_ABORTED
         );
      }
      try {
         this.Player.exitFullscreen().catch((error: Error) => {
            console.error("Erreur lors de la sortie du plein écran:", error);
            throw new PlayerAppError(
               PlayerErrorCode.MEDIA_ERR_ABORTED,
               ERROR_MESSAGE_KEYS.FULLSCREEN_ERROR
            );
         });
      } catch (error) {
         console.error("Erreur lors de la sortie du plein écran:", error);
         throw new PlayerAppError(
            PlayerErrorCode.MEDIA_ERR_ABORTED,
            ERROR_MESSAGE_KEYS.FULLSCREEN_ERROR
         );
      }
   }

   // Méthodes de contrôle du player
   togglePlayPause(): void {
      if (!this.Player) {
         throw new PlayerAppError(
            PlayerErrorCode.MEDIA_ERR_ABORTED,
            ERROR_MESSAGE_KEYS.MEDIA_ERR_ABORTED
         );
      }
      if (this.Player.paused()) {
         this.Player.play();
      } else {
         this.Player.pause();
      }
   }

   rewind(): void {
      if (!this.Player) {
         throw new PlayerAppError(
            PlayerErrorCode.MEDIA_ERR_ABORTED,
            ERROR_MESSAGE_KEYS.MEDIA_ERR_ABORTED
         );
      }
      const currentTime = this.Player.currentTime();
      if (typeof currentTime === 'number') {
         this.Player.currentTime(Math.max(0, currentTime - 10));
      }
   }

   forward(): void {
      if (!this.Player) {
         throw new PlayerAppError(
            PlayerErrorCode.MEDIA_ERR_ABORTED,
            ERROR_MESSAGE_KEYS.MEDIA_ERR_ABORTED
         );
      }
      const currentTime = this.Player.currentTime();
      const duration = this.Player.duration();
      if (typeof currentTime === 'number' && typeof duration === 'number') {
         this.Player.currentTime(Math.min(duration, currentTime + 10));
      }
   }

   increaseSpeed(): void {
      if (!this.Player) {
         throw new PlayerAppError(
            PlayerErrorCode.MEDIA_ERR_ABORTED,
            ERROR_MESSAGE_KEYS.MEDIA_ERR_ABORTED
         );
      }
      const currentRate = this.Player.playbackRate();
      if (typeof currentRate === 'number') {
         const newRate = Math.min(16, currentRate + 0.25);
         this.Player.playbackRate(newRate);
         this.updatePlaybackRateButton(newRate);
      }
   }

   decreaseSpeed(): void {
      if (!this.Player) {
         throw new PlayerAppError(
            PlayerErrorCode.MEDIA_ERR_ABORTED,
            ERROR_MESSAGE_KEYS.MEDIA_ERR_ABORTED
         );
      }
      const currentRate = this.Player.playbackRate();
      if (typeof currentRate === 'number') {
         const newRate = Math.max(0.25, currentRate - 0.25);
         this.Player.playbackRate(newRate);
         this.updatePlaybackRateButton(newRate);
      }
   }

   resetSpeed(): void {
      if (!this.Player) {
         throw new PlayerAppError(
            PlayerErrorCode.MEDIA_ERR_ABORTED,
            ERROR_MESSAGE_KEYS.MEDIA_ERR_ABORTED
         );
      }
      this.Player.playbackRate(1);
      this.updatePlaybackRateButton(1);
   }

   getCurrentVideoId(): string | null {
      return this.currentVideoId;
   }

   update(state: IPlayerState): void {
      if (this.Player) {
         if (state.isPlaying) {
            this.Player.play();
         } else {
            this.Player.pause();
         }
      }
   }

   destroy(): void {
      if (this.Player) {
         this.Player.dispose();
         this.Player = null;
      }
      if (this.container) {
         this.container.empty();
         this.container.detach();
      }
   }


    private createControls(): HTMLElement {
        const controlsContainer = document.createElement('div');
        controlsContainer.addClass('youtube-view-controls');
        controlsContainer.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 101;
            display: flex;
            gap: 5px;
        `;

        // Ajouter le bouton de fermeture
        const closeButton = controlsContainer.createDiv('youtube-view-close');
        closeButton.setAttribute('aria-label', 'Close');
        closeButton.innerHTML = '✕';
        closeButton.style.cssText = `
            cursor: pointer;
            padding: 5px;
            background: var(--background-secondary);
            border-radius: 3px;
            opacity: 0.8;
        `;

        closeButton.addEventListener('click', () => {
            eventBus.emit('view:close');
        });
        return controlsContainer;
    }

    private createVideoContainer(): HTMLElement {
        const mode = this.settings.currentMode;
        const defaultHeight = mode === VIEW_MODES.Overlay 
            ? this.settings.overlayHeight 
            : this.settings.viewHeight;

        const videoContainer = document.createElement('div');
        videoContainer.addClass('youtube-player-video-container');
        videoContainer.style.cssText = `
            width: 100%;
            height: ${defaultHeight || 60}%; 
            min-height: 100px;
            position: relative;
        `;
        
        videoContainer.appendChild(this.resizeHandle);
        return videoContainer;
    }

    private updatePlaybackRateButton(rate: number): void {
        if (this.playbackRateButton) {
            this.playbackRateButton.el().textContent = `${rate as PlaybackRate}x`;
        }
    }

    private initializeEventListeners(): void {
        this.cleanupFunctions = [
            eventBus.on('video:stateChange', (state) => this.update(state)),
            eventBus.on('view:resize', () => this.handleResizeEnd())
        ];
    }

    public dispose(): void {
        // Nettoyer les événements
        this.cleanupFunctions.forEach(cleanup => cleanup());
        this.cleanupFunctions = [];

        // Nettoyer le reste
        this.destroy();
        this.container?.remove();
        this.controlsContainer?.remove();
        this.videoContainer?.remove();

        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }
}
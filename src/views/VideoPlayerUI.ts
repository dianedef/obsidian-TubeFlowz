import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import type { default as VideoJs } from 'video.js';
import 'videojs-youtube';
import { App, Plugin, Menu } from 'obsidian';
import { SettingsService } from '../services/settings/SettingsService';
import { ViewMode } from '../types/settings';
import { VideoJsOptions, VideoJsEvents, PlayerControls, Translations, PlaybackRate } from '../types';
import { IPlayerUI } from '../types/IPlayerUI';
import { IPlayerState } from '../types/IPlayer';
import { DEFAULT_SETTINGS } from '../types/settings';
import { PlayerAppError, YouTubeAppError, PlayerErrorCode, YouTubeErrorCode } from '../types/errors';
import { MESSAGE_KEYS } from '../i18n/messages';

type VideoJsPlayer = ReturnType<typeof videojs> & PlayerControls;
type VideoJsPlayerOptions = VideoJsOptions;

// Types spécifiques pour la barre de contrôle
interface ControlBarComponent {
    el: () => HTMLElement;
    controlText: (text: string) => void;
    on: (event: string, handler: (e: Event) => void) => void;
}

interface ControlBar {
    addChild: (name: string, options?: any) => ControlBarComponent;
}

interface ExtendedVideoJsPlayer extends VideoJsPlayer {
    controlBar: ControlBar;
}

interface VideoJsEventMap {
    'play': () => void;
    'pause': () => void;
    'timeupdate': () => void;
    'volumechange': () => void;
    'ratechange': () => void;
    'ended': () => void;
}

export class VideoPlayerUI implements IPlayerUI {
   private static instance: VideoPlayerUI | null = null;
   Player: ExtendedVideoJsPlayer | null = null;
   private settings: SettingsService;
   hasVideoJS: boolean = false;
   currentLanguage: string;
   container: HTMLElement | null = null;
   resizeObserver: ResizeObserver | null = null;
   playbackRateButton: ControlBarComponent | null = null;
   isDragging: boolean = false;
   startY: number = 0;
   startHeight: number = 0;
   private currentVideoId: string | null = null;

   private constructor(settings: SettingsService) {
      this.settings = settings;
      this.currentLanguage = settings.getCurrentLanguage();
   }

   // Méthodes du Singleton
   static getInstance(settings: SettingsService): VideoPlayerUI {
      if (!VideoPlayerUI.instance) {
         VideoPlayerUI.instance = new VideoPlayerUI(settings);
      }
      return VideoPlayerUI.instance;
   }

   static destroyInstance(): void {
      if (VideoPlayerUI.instance) {
         VideoPlayerUI.instance.dispose();
         VideoPlayerUI.instance = null;
      }
   }

   // Mettre à jour la méthode pour utiliser les settings
   getObsidianLanguage(): string {
      return this.settings.getCurrentLanguage();
   }

   // Ajouter une méthode pour mettre à jour la langue du player
   updatePlayerLanguage(): void {
      if (!this.Player) return;
      
      const newLang = this.settings.getCurrentLanguage();
      if (this.currentLanguage !== newLang) {
         this.currentLanguage = newLang;
         this.Player.language(newLang);
         
         // Mettre à jour les traductions
         const translations = newLang === 'fr' ? {
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
         } : {
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
         };
         
         // Utiliser la méthode language pour définir la langue uniquement
         this.Player.language(newLang);
      }
   }

   // Ajouter un observateur pour les changements de langue
   private initLanguageObserver(): void {
      const observer = new MutationObserver(() => {
         this.updatePlayerLanguage();
      });
      
      observer.observe(document.documentElement, {
         attributes: true,
         attributeFilter: ['lang']
      });
   }

   // Mettre à jour initializePlayer pour initialiser l'observateur de langue
   async initializePlayer(videoId: string, container: HTMLElement, timestamp: number = 0, fromUserClick: boolean = false): Promise<ExtendedVideoJsPlayer | HTMLElement> {
      try {
         const settings = this.settings || DEFAULT_SETTINGS;

         if (!videoId) {
            console.warn('VideoId manquant');
            throw new YouTubeAppError(
               YouTubeErrorCode.INVALID_PARAMETER,
               MESSAGE_KEYS.VIDEO_ID_MISSING
            );
         }

         // Si on a déjà un player avec le même ID, ne rien faire
         if (this.Player && this.Player.src() && this.Player.src().toString().includes(videoId)) {
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
            throw new PlayerAppError(
               PlayerErrorCode.MEDIA_ERR_SRC_NOT_SUPPORTED,
               MESSAGE_KEYS.INITIALIZATION_ERROR
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
         const video = document.createElement('video-js');
         video.className = 'video-js vjs-obsidian-theme';
         playerWrapper.appendChild(video);
         
         // Ajouter d'abord le conteneur au DOM
         container.appendChild(mainContainer);
         
         // Attendre que le conteneur soit bien dans le DOM
         await new Promise(resolve => setTimeout(resolve, 100));
         
         console.log("Création du player VideoJS");
         
         // Configuration du player avec les types corrects
         const options: VideoJsOptions = {
            techOrder: ['youtube'],
            sources: [{
               type: 'video/youtube',
               src: `https://www.youtube.com/watch?v=${videoId}`
            }],
            language: this.currentLanguage,
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
                  'progressControl',
                  'customControlSpacer',
                  'playbackRateMenuButton',
                  'pictureInPictureToggle',
                  'fullscreenToggle'
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
               origin: window.location.origin
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

         console.log("Player créé avec videoId:", this.settings.getSettings().lastVideoId);

         // Créer le player avec le bon élément
         console.log("Création du player VideoJS");
         const player = videojs(video, options) as ExtendedVideoJsPlayer;
         this.Player = player;

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

// Initialiser les contrôles personnalisés
         await this.initializeCustomControls();

// Mettre à jour le stockage quand la vitesse change
         this.Player!.on('ratechange', () => {
            const newRate = this.Player!.playbackRate();
            this.updatePlaybackRateButton(newRate);
            this.settings.playbackRate = newRate;
         });

// Après l'initialisation du player
         this.Player!.on('volumechange', () => {
            this.settings.volume = this.Player!.volume() || 0;
            this.settings.isMuted = this.Player!.muted() || false;
         });

// Mettre à jour le player dans le Store
         console.log("Player initialisé avec succès");

         // Initialiser l'observateur de langue après la création du player
         this.initLanguageObserver();
         
         return this.Player;
      } catch (error) {
         console.error("Erreur lors de l'initialisation du player vidéo:", error);
         if (error instanceof YouTubeAppError || error instanceof PlayerAppError) {
            throw error;
         }
         throw new PlayerAppError(
            PlayerErrorCode.MEDIA_ERR_DECODE,
            MESSAGE_KEYS.INITIALIZATION_ERROR
         );
      }
   }

   private async initializeCustomControls(): Promise<void> {
      if (!this.Player) return;

      // Ajouter le bouton de vitesse personnalisé
      this.playbackRateButton = this.Player.controlBar.addChild('button', {
         className: 'vjs-playback-rate'
      });

      const buttonEl = this.playbackRateButton.el();
      buttonEl.textContent = `${this.settings.playbackRate}x`;

      // Gérer le hover pour afficher le menu
      buttonEl.addEventListener('mouseenter', (e: MouseEvent) => {
         const menu = new Menu();
         const rates: PlaybackRate[] = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5, 8, 10, 16];
         const currentRate = this.Player?.playbackRate();

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

   private initializeEvents(): void {
      if (!this.Player) {
         throw new PlayerAppError(
            PlayerErrorCode.MEDIA_ERR_ABORTED,
            MESSAGE_KEYS.INITIALIZATION_ERROR
         );
      }

      // Typer correctement les événements
      this.Player.on('play', () => {
         if (this.settings) {
            this.settings.isPlaying = true;
         }
      });

      this.Player.on('pause', () => {
         if (this.settings) {
            this.settings.isPlaying = false;
         }
      });

      this.Player.on('volumechange', () => {
         if (!this.Player || !this.settings) return;
         
         const volume = this.Player.volume();
         const isMuted = this.Player.muted();
         
         if (typeof volume === 'number') {
            this.settings.volume = volume;
         }
         if (typeof isMuted === 'boolean') {
            this.settings.isMuted = isMuted;
         }
      });

      this.Player.on('ratechange', () => {
         if (!this.Player || !this.settings) return;
         
         const rate = this.Player.playbackRate();
         if (typeof rate === 'number' && this.isValidPlaybackRate(rate)) {
            this.settings.playbackRate = rate;
            this.updatePlaybackRateButton(rate);
         }
      });

      this.Player.on('timeupdate', () => {
         if (!this.Player || !this.settings) return;
         
         const currentTime = this.Player.currentTime();
         if (typeof currentTime === 'number') {
            this.settings.lastTimestamp = Math.floor(currentTime);
         }
      });

      this.Player.on('ended', () => {
         if (this.settings) {
            this.settings.isPlaying = false;
            this.settings.lastTimestamp = 0;
         }
      });
   }

   private isValidPlaybackRate(rate: number): rate is PlaybackRate {
      const validRates: PlaybackRate[] = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5, 8, 10, 16];
      return validRates.includes(rate as PlaybackRate);
   }

   updatePlaybackRateButton(rate: number): void {
      if (this.playbackRateButton) {
         const buttonElement = this.playbackRateButton.el();
         if (buttonElement) {
            buttonElement.textContent = `${rate}x`;
         }
      }
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
      if (isOverlay) {
         this.settings.overlayHeight = newHeight;
      } else {
         this.settings.viewHeight = newHeight;
      }
      this.settings.save();
   }

   private handleResizeEnd(): void {
      this.isDragging = false;
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

   dispose(): void {
      if (this.resizeObserver) {
         this.resizeObserver.disconnect();
      }
      this.destroy();
      if (this.container) {
         this.container.remove();
         this.container = null;
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
      if (!this.Player) {
         throw new PlayerAppError(
            PlayerErrorCode.MEDIA_ERR_ABORTED,
            MESSAGE_KEYS.INITIALIZATION_ERROR
         );
      }
      try {
         this.Player.requestFullscreen().catch(error => {
            console.error("Erreur lors du passage en plein écran:", error);
            throw new PlayerAppError(
               PlayerErrorCode.MEDIA_ERR_ABORTED,
               MESSAGE_KEYS.FULLSCREEN_ERROR
            );
         });
      } catch (error) {
         console.error("Erreur lors du passage en plein écran:", error);
         throw new PlayerAppError(
            PlayerErrorCode.MEDIA_ERR_ABORTED,
            MESSAGE_KEYS.FULLSCREEN_ERROR
         );
      }
   }

   exitFullscreen(): void {
      if (!this.Player) {
         throw new PlayerAppError(
            PlayerErrorCode.MEDIA_ERR_ABORTED,
            MESSAGE_KEYS.INITIALIZATION_ERROR
         );
      }
      try {
         this.Player.exitFullscreen().catch(error => {
            console.error("Erreur lors de la sortie du plein écran:", error);
            throw new PlayerAppError(
               PlayerErrorCode.MEDIA_ERR_ABORTED,
               MESSAGE_KEYS.FULLSCREEN_ERROR
            );
         });
      } catch (error) {
         console.error("Erreur lors de la sortie du plein écran:", error);
         throw new PlayerAppError(
            PlayerErrorCode.MEDIA_ERR_ABORTED,
            MESSAGE_KEYS.FULLSCREEN_ERROR
         );
      }
   }

   // Méthodes de contrôle du player
   togglePlayPause(): void {
      if (!this.Player) {
         throw new PlayerAppError(
            PlayerErrorCode.MEDIA_ERR_ABORTED,
            MESSAGE_KEYS.INITIALIZATION_ERROR
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
            MESSAGE_KEYS.INITIALIZATION_ERROR
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
            MESSAGE_KEYS.INITIALIZATION_ERROR
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
            MESSAGE_KEYS.INITIALIZATION_ERROR
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
            MESSAGE_KEYS.INITIALIZATION_ERROR
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
            MESSAGE_KEYS.INITIALIZATION_ERROR
         );
      }
      this.Player.playbackRate(1);
      this.updatePlaybackRateButton(1);
   }

   async initialize(videoId: string, container: HTMLElement, timestamp: number = 0): Promise<void> {
      this.currentVideoId = videoId;
   }

   getCurrentVideoId(): string | null {
      return this.currentVideoId;
   }

   render(container: HTMLElement): void {
      this.container = container;
      this.initializePlayer(this.currentVideoId || '', container);
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

   show(): void {
      if (this.container) {
         this.container.style.display = 'block';
      }
   }

   hide(): void {
      if (this.container) {
         this.container.style.display = 'none';
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
}


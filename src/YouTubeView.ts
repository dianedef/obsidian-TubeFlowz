import { ItemView, WorkspaceLeaf, Plugin } from 'obsidian';
import videojs from 'video.js';
import 'videojs-youtube';
import { Menu } from 'obsidian';
import { Settings } from './Settings';

export class YouTubeView extends ItemView {
   private isDragging: boolean = false;
   private startY: number = 0;
   private startHeight: number = 0;
   private resizeObserver: ResizeObserver | null = null;
   private playerContainer: HTMLElement | null = null;
   private player: any = null;
   private playbackRateButton: any = null;
   private currentRate: number = this.settings.favoriteSpeed;

   getViewType(): string {
      return "youtube-player";
   }

   getDisplayText(): string {
      return "YouTube Player";
   }

   private getPlayerConfig(): any {
      return {
         techOrder: ['youtube'],
         controls: true,
         textTrackSettings: false,
         fluid: true,
         liveTracker: false,
         liveui: false,
         children: ['MediaLoader'],
         sources: [{
            type: 'video/youtube',
            src: 'https://www.youtube.com/watch?v=default'
         }],
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
         youtube: {
            ytControls: 0,
            controls: 0,
            noCookie: true,
            showinfo: 0,
            useCustomIframe: true,
            modestbranding: 1,
            iv_load_policy: 3,
            youtubeshowrecomendations: 0,
            annotations: 0,
            rel: 0,
            disablekb: 0,
            fs: 1,
            playsinline: 1,
            enablejsapi: 1,
            origin: window.location.origin,
            noerror: 1,
            privacy: true,
            nocookie: true,
            cc_load_policy: 0,
            cc_lang_pref: 'fr',
            hl: 'fr',
            color: 'white',
            autohide: 1,
            widget_referrer: window.location.origin,
            adsense: 0,
            doubleclick: 0,
            ad_tag: 0,
            ad_preroll: 0,
            ad_postroll: 0,
            adTagUrl: '',
            ima3: false,
            ima: {
               adTagUrl: ''
            }
         },
         modal: false,
         controlBar: {
            children: [
               'playToggle',
               'volumePanel',
               'currentTimeDisplay',
               'timeDivider',
               'durationDisplay',
               'progressControl',
               'pictureInPictureToggle',
               'fullscreenToggle'
            ],
            layout: 'absolute',
            progressControl: {
               layout: 'absolute',
               seekBar: {
                  layout: 'absolute',
                  loadProgressBar: false,
                  playProgressBar: true,
                  seekHandle: true,
                  mouseTimeDisplay: true
               }
            }
         },
         loadingSpinner: true,
         bigPlayButton: true,
         errorDisplay: false,
         textTrackDisplay: false,
         posterImage: false,
      };
   }

   async onOpen() {
      console.log('YouTubeView: onOpen');
      const container = this.containerEl;
      container.empty();
      
      // Conteneur principal
      const contentEl = container.createDiv({ cls: 'youtube-player-container' });
      this.playerContainer = contentEl;

      // Récupérer la hauteur sauvegardée
      const settings = await Settings.loadSettings();
      const height = settings.viewHeight;
      
      // Appliquer la hauteur au conteneur principal
      contentEl.style.height = height;

      // Conteneur pour le player et ses contrôles
      const playerWrapper = contentEl.createDiv({ cls: 'youtube-player-wrapper' });
      
      // Conteneur pour la vidéo uniquement
      const videoContainer = playerWrapper.createDiv({ cls: 'youtube-video-container' });
      
      // Conteneur pour les contrôles
      const controlsContainer = playerWrapper.createDiv({ cls: 'youtube-controls-container' });
      
      // Créer l'élément vidéo pour video.js
      const videoElement = document.createElement('video');
      videoElement.className = 'video-js';
      videoElement.style.width = '100%';
      videoElement.style.height = '100%';
      videoElement.setAttribute('playsinline', 'true');
      videoContainer.appendChild(videoElement);

      console.log('YouTubeView: Initialisation du player video.js');
      try {
         this.player = videojs(videoElement, this.getPlayerConfig());
         
         this.player.ready(() => {
            console.log('YouTubeView: Player est prêt');
            
            // Déplacer les contrôles dans leur conteneur
            const controlBar = videoContainer.querySelector('.vjs-control-bar');
            if (controlBar) {
               controlsContainer.appendChild(controlBar);
            }

            // Initialiser le bouton de vitesse
            this.initializePlaybackRateButton();
         });

      } catch (error) {
         console.error('YouTubeView: Erreur lors de l\'initialisation du player:', error);
      }

      // Ajouter le resize handle dans son conteneur
      this.addResizeHandle(contentEl);
   }

   private initializePlaybackRateButton(): void {
      if (!this.player) return;

      // Ajouter le bouton de vitesse personnalisé
      this.playbackRateButton = this.player.controlBar.addChild('button', {
         className: 'vjs-playback-rate'
      });

      const buttonEl = this.playbackRateButton.el();
      buttonEl.textContent = '1x';

      // Gérer le hover pour afficher le menu
      buttonEl.addEventListener('mouseenter', () => {
         const menu = new Menu();
         const rates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5, 8, 10, 16];
         const currentRate = this.player?.playbackRate();

         rates.forEach(rate => {
            menu.addItem(item => 
               item
                  .setTitle(`${rate}x`)
                  .setChecked(currentRate === rate)
                  .onClick(() => {
                     if (this.player) {
                        this.player.playbackRate(rate);
                        buttonEl.textContent = `${rate}x`;
                     }
                  })
            );
         });

         const rect = buttonEl.getBoundingClientRect();
         menu.showAtPosition({
            x: rect.right,
            y: rect.bottom
         });
      });
   }

   async loadVideo(videoId: string) {
      console.log('YouTubeView: Chargement de la vidéo', videoId);
      if (!this.player) return;

      try {
         // Utiliser l'URL embed directement
         const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;
         this.player.src({
            type: 'video/youtube',
            src: embedUrl
         });
         console.log('YouTubeView: Source vidéo définie');
      } catch (error) {
         console.error('YouTubeView: Erreur lors du chargement de la vidéo:', error);
      }
   }

   async onClose() {
      if (this.resizeObserver) {
         this.resizeObserver.disconnect();
      }
      if (this.player) {
         this.player.dispose();
      }
   }

   private addResizeHandle(container: HTMLElement): void {
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'youtube-resize-handle';
      container.appendChild(resizeHandle);

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

      this.resizeObserver = new ResizeObserver(entries => {
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
      if (!this.playerContainer) return;
      this.isDragging = true;
      this.startY = e.clientY;
      this.startHeight = this.playerContainer.clientHeight;
   }

   private handleResizeMove(e: MouseEvent): void {
      if (!this.isDragging || !this.playerContainer) return;
      
      const delta = e.clientY - this.startY;
      let newHeight = this.startHeight + delta;
      
      newHeight = Math.max(100, Math.min(newHeight, window.innerHeight * 0.9));
      this.playerContainer.style.height = `${newHeight}px`;
   }

   private handleResizeEnd(): void {
      this.isDragging = false;
      if (this.playerContainer) {
         const height = this.playerContainer.style.height;
         Settings.saveSettings({ viewHeight: height });
      }
   }
} 
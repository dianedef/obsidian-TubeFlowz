import { ItemView, WorkspaceLeaf, Plugin } from 'obsidian';
import videojs from 'video.js';
import 'videojs-youtube';
import { Menu } from 'obsidian';
import { Settings } from './Settings';

export class YouTube extends ItemView {
   private isDragging: boolean = false;
   private startY: number = 0;
   private startHeight: number = 0;
   private resizeObserver: ResizeObserver | null = null;
   private playerContainer: HTMLElement | null = null;
   private player: any = null;
   private playbackRateButton: any = null;

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
         loadingSpinner: true,
         bigPlayButton: true,
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
            ]
         },
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
         errorDisplay: false,
         textTrackDisplay: false,
         posterImage: false,
         modal: false,
         modalDialog: false, 
         imageQuality: false,
         thumbnail: false,
         poster: false,
      };
   }

   async onOpen() {
      console.log('YouTube: onOpen');
      const container = this.containerEl;
      container.empty();
      
      // Conteneur principal
      const contentEl = container.createDiv({ cls: 'youtube-player-container' });
      this.playerContainer = contentEl;

      // Récupérer les settings
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

      console.log('YouTube: Initialisation du player video.js');
      try {
         const config = this.getPlayerConfig();
         console.log('YouTube: Configuration du player:', config);
         
         this.player = videojs(videoElement, config);
         console.log('YouTube: Player créé:', this.player);
         
         this.player.ready(() => {
            console.log('YouTube: Player est prêt');
            
            // Déplacer les contrôles dans leur conteneur
            const controlBar = videoContainer.querySelector('.vjs-control-bar');
            const progressControl = videoContainer.querySelector('.vjs-progress-control');
            
            if (progressControl) {
                controlsContainer.appendChild(progressControl);
            }
            
            if (controlBar) {
                controlsContainer.appendChild(controlBar);
            }
            
            // Initialiser le bouton de vitesse
            this.initializePlaybackRateButton();

            // Appliquer la vitesse sauvegardée
            const savedRate = settings.playbackRate;
            if (savedRate) {
               this.setPlaybackRate(savedRate);
            }

            // Initialiser les événements du player
            this.player.on('error', (error: any) => {
               console.error('YouTube: Erreur du player:', error);
            });

            this.player.on('play', () => {
               console.log('YouTube: Lecture démarrée');
            });

            this.player.on('pause', () => {
               console.log('YouTube: Lecture en pause');
            });

            this.player.on('ratechange', async () => {
               const newRate = this.player.playbackRate();
               console.log('YouTube: Changement de vitesse:', newRate);
               await Settings.saveSettings({ playbackRate: newRate });
               if (this.playbackRateButton) {
                  this.playbackRateButton.el().textContent = `${newRate}x`;
               }
            });

            this.player.on('volumechange', () => {
               console.log('YouTube: Changement de volume:', this.player.volume());
            });

            console.log('YouTube: Tous les événements sont enregistrés');
         });

      } catch (error) {
         console.error('YouTube: Erreur lors de l\'initialisation du player:', error);
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
      console.log('YouTube: Chargement de la vidéo', videoId);
      if (!this.player) return;

      try {
         // Utiliser l'URL embed directement
         const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;
         this.player.src({
            type: 'video/youtube',
            src: embedUrl
         });
         console.log('YouTube: Source vidéo définie');
      } catch (error) {
         console.error('YouTube: Erreur lors du chargement de la vidéo:', error);
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

   // Méthodes publiques pour interagir avec le player
   togglePlayPause(): void {
      console.log('YouTube: Toggle play/pause');
      if (!this.player) return;
      if (this.player.paused()) {
         console.log('YouTube: Play');
         this.player.play();
      } else {
         console.log('YouTube: Pause');
         this.player.pause();
      }
   }

   seekBackward(seconds: number): void {
      console.log('YouTube: Seek backward', seconds);
      if (!this.player) return;
      const currentTime = this.player.currentTime();
      const newTime = Math.max(0, currentTime - seconds);
      console.log('YouTube: New time', newTime);
      this.player.currentTime(newTime);
   }

   seekForward(seconds: number): void {
      console.log('YouTube: Seek forward', seconds);
      if (!this.player) return;
      const currentTime = this.player.currentTime();
      const duration = this.player.duration();
      const newTime = Math.min(duration, currentTime + seconds);
      console.log('YouTube: New time', newTime);
      this.player.currentTime(newTime);
   }

   async setPlaybackRate(rate: number): Promise<void> {
      console.log('YouTube: Set playback rate', rate);
      if (!this.player) return;
      this.player.playbackRate(rate);
      await Settings.saveSettings({ playbackRate: rate });
   }

   async increasePlaybackRate(): Promise<void> {
      console.log('YouTube: Increase playback rate');
      if (!this.player) return;
      const rates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5, 8, 10, 16];
      const currentRate = this.player.playbackRate();
      console.log('YouTube: Current rate', currentRate);
      const nextRate = rates.find(rate => rate > currentRate);
      if (nextRate) {
         console.log('YouTube: New rate', nextRate);
         await this.setPlaybackRate(nextRate);
      }
   }

   async decreasePlaybackRate(): Promise<void> {
      console.log('YouTube: Decrease playback rate');
      if (!this.player) return;
      const rates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5, 8, 10, 16];
      const currentRate = this.player.playbackRate();
      console.log('YouTube: Current rate', currentRate);
      const prevRate = rates.reverse().find(rate => rate < currentRate);
      if (prevRate) {
         console.log('YouTube: New rate', prevRate);
         await this.setPlaybackRate(prevRate);
      }
   }

   toggleMute(): void {
      console.log('YouTube: Toggle mute');
      if (!this.player) return;
      const isMuted = this.player.muted();
      console.log('YouTube: Current muted state', isMuted);
      this.player.muted(!isMuted);
   }

   toggleFullscreen(): void {
      console.log('YouTube: Toggle fullscreen');
      if (!this.player) return;
      if (this.player.isFullscreen()) {
         console.log('YouTube: Exit fullscreen');
         this.player.exitFullscreen();
      } else {
         console.log('YouTube: Enter fullscreen');
         this.player.requestFullscreen();
      }
   }

   increaseVolume(step: number = 0.1): void {
      console.log('YouTube: Increase volume', step);
      if (!this.player) return;
      const currentVolume = this.player.volume();
      const newVolume = Math.min(1, currentVolume + step);
      console.log('YouTube: New volume', newVolume);
      this.player.volume(newVolume);
   }

   decreaseVolume(step: number = 0.1): void {
      console.log('YouTube: Decrease volume', step);
      if (!this.player) return;
      const currentVolume = this.player.volume();
      const newVolume = Math.max(0, currentVolume - step);
      console.log('YouTube: New volume', newVolume);
      this.player.volume(newVolume);
   }

} 
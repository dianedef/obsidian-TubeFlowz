import { ItemView, WorkspaceLeaf, Plugin } from 'obsidian';
import videojs from 'video.js';
import 'videojs-youtube';

interface TubeFlowzSettings {
   showYoutubeRecommendations: boolean;
   isMuted: boolean;
   language: string;
}

export class YouTubeView extends ItemView {
   private isDragging: boolean = false;
   private startY: number = 0;
   private startHeight: number = 0;
   private resizeObserver: ResizeObserver | null = null;
   private playerContainer: HTMLElement | null = null;
   private plugin: Plugin;
   private player: any = null;
   private settings: TubeFlowzSettings = {
      showYoutubeRecommendations: false,
      isMuted: false,
      language: 'fr'
   };

   constructor(leaf: WorkspaceLeaf, plugin: Plugin) {
      super(leaf);
      this.plugin = plugin;
   }

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
            noCookie: true,
            useCustomIframe: true,
            iv_load_policy: 3,
            modestbranding: 1,
            controls: 0,
            showinfo: 0,
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
                  loadProgressBar: true,
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
         progressControl: {
            insertBeforeProgressBar: true,
            keepTooltipsInside: true,
            seekBar: {
               mouseTimeDisplay: {
                  displayBeforeBar: true
               }
            }
         }
      };
   }

   async onOpen() {
      console.log('YouTubeView: onOpen');
      const container = this.containerEl;
      container.empty();
      
      // Conteneur principal
      const contentEl = container.createDiv({ cls: 'youtube-player-container' });
      this.playerContainer = contentEl;

      // Récupérer la hauteur sauvegardée ou utiliser la valeur par défaut
      const savedHeight = await this.plugin.loadData();
      const height = savedHeight?.playerHeight || '60vh';
      
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
         });

      } catch (error) {
         console.error('YouTubeView: Erreur lors de l\'initialisation du player:', error);
      }

      // Ajouter le resize handle dans son conteneur
      this.addResizeHandle(contentEl);
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
         this.plugin.saveData({ playerHeight: height });
      }
   }
} 
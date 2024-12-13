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
         autoplay: false,
         controls: true,
         fluid: true,
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
         sources: [{
            type: 'video/youtube',
            src: 'https://www.youtube.com/watch?v=M7lc1UVf-VE'
         }],
         youtube: {
            iv_load_policy: 3,
            modestbranding: 1,
            rel: this.settings.showYoutubeRecommendations ? 1 : 0,
            endscreen: this.settings.showYoutubeRecommendations ? 1 : 0,
            controls: 1,
            ytControls: 0,
            preload: 'auto',
            showinfo: 0,
            fs: 1,
            playsinline: 1,
            disablekb: 0,
            enablejsapi: 1,
            origin: window.location.origin,
         },
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
         }
      };
   }

   async onOpen() {
      console.log('YouTubeView: onOpen');
      const container = this.containerEl;
      container.empty();
      
      const contentEl = container.createDiv({ cls: 'youtube-player-container' });
      contentEl.createEl('h4', { text: 'YouTube Player' });
      
      const playerEl = contentEl.createDiv({ cls: 'youtube-player-embed' });
      this.playerContainer = playerEl;

      // Récupérer la hauteur sauvegardée ou utiliser la valeur par défaut
      const savedHeight = await this.plugin.loadData();
      const height = savedHeight?.playerHeight || '60vh';
      
      playerEl.style.cssText = `
         width: 100%;
         height: ${height};
         background: var(--background-secondary);
         display: flex;
         align-items: center;
         justify-content: center;
         position: relative;
      `;

      // Créer l'élément vidéo pour video.js
      const videoElement = document.createElement('video');
      videoElement.className = 'video-js';
      videoElement.style.width = '100%';
      videoElement.style.height = '100%';
      videoElement.setAttribute('playsinline', 'true');
      videoElement.setAttribute('controls', 'true');
      playerEl.appendChild(videoElement);

      console.log('YouTubeView: Initialisation du player video.js');
      try {
         this.player = videojs(videoElement, this.getPlayerConfig());
         
         this.player.ready(() => {
            console.log('YouTubeView: Player est prêt');
            // S'assurer que le player est visible
            this.player.show();
         });

      } catch (error) {
         console.error('YouTubeView: Erreur lors de l\'initialisation du player:', error);
      }

      this.addResizeHandle(playerEl);
   }

   async loadVideo(videoId: string) {
      console.log('YouTubeView: Chargement de la vidéo', videoId);
      if (!this.player) {
         console.error('YouTubeView: Player non initialisé');
         return;
      }

      try {
         this.player.src({
            type: 'video/youtube',
            src: `https://www.youtube.com/watch?v=${videoId}`
         });
         console.log('YouTubeView: Source vidéo définie');
         // Forcer le rechargement
         this.player.load();
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
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import 'videojs-youtube';
import { App } from 'obsidian';
import { eventBus } from '../../core/EventBus';
import {
   VideoId,
   VideoMode,
   VideoPlayerState,
   Volume,
   PlaybackRate,
   Timestamp,
   isValidVolume,
   isValidPlaybackRate,
   isValidVideoId
} from '../../types';

interface IVideoPlayer {
   initialize(container: HTMLElement): Promise<void>;
   loadVideo(videoId: VideoId, timestamp?: Timestamp): Promise<void>;
   play(): void;
   pause(): void;
   setVolume(volume: Volume): void;
   setPlaybackRate(rate: PlaybackRate): void;
   destroy(): void;
}

export class VideoPlayer implements IVideoPlayer {
   private static instance: VideoPlayer | null = null;
   private player: Player | null = null;
   private container: HTMLElement | null = null;
   private resizeObserver: ResizeObserver | null = null;
   private currentVideoId: VideoId | null = null;
   private state: VideoPlayerState = {
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 1 as Volume,
      isMuted: false,
      playbackRate: 1 as PlaybackRate,
      isLoading: false,
      error: null
   };

   private constructor(private app: App) {
      this.initializeEventListeners();
   }

   public static getInstance(app: App): VideoPlayer {
      if (!VideoPlayer.instance) {
         VideoPlayer.instance = new VideoPlayer(app);
      }
      return VideoPlayer.instance;
   }

   private initializeEventListeners(): void {
      // Écouter les événements globaux
      eventBus.on('video:load', this.handleVideoLoad.bind(this));
      eventBus.on('video:play', this.play.bind(this));
      eventBus.on('video:pause', this.pause.bind(this));
   }

   public async initialize(container: HTMLElement): Promise<void> {
      try {
         this.container = container;
         await this.setupVideoJS();
         this.setupResizeObserver();
         this.emitStateUpdate();
      } catch (error) {
         console.error('[VideoPlayer] Initialization error:', error);
         this.state.error = error as Error;
         this.emitStateUpdate();
         throw error;
      }
   }

   private async setupVideoJS(): Promise<void> {
      if (!this.container) {
         throw new Error('Container element not found');
      }

      const videoElement = document.createElement('video');
      videoElement.className = 'video-js vjs-default-skin';
      this.container.appendChild(videoElement);

      const options: videojs.PlayerOptions = {
         controls: true,
         fluid: true,
         techOrder: ['youtube'],
         youtube: {
               iv_load_policy: 3,
               modestbranding: 1,
               rel: 0
         }
      };

      try {
         this.player = videojs(videoElement, options);
         this.setupPlayerEventListeners();
      } catch (error) {
         console.error('[VideoPlayer] VideoJS setup error:', error);
         throw error;
      }
   }

   private setupPlayerEventListeners(): void {
      if (!this.player) return;

      this.player.on('play', () => {
         this.state.isPlaying = true;
         this.emitStateUpdate();
      });

      this.player.on('pause', () => {
         this.state.isPlaying = false;
         this.emitStateUpdate();
      });

      this.player.on('timeupdate', () => {
         this.state.currentTime = this.player?.currentTime() || 0;
         eventBus.emit('video:timeUpdate', this.state.currentTime);
         this.emitStateUpdate();
      });

      this.player.on('error', (error) => {
         this.state.error = error;
         eventBus.emit('video:error', error);
         this.emitStateUpdate();
      });

      this.player.on('loadstart', () => {
         this.state.isLoading = true;
         this.emitStateUpdate();
      });

      this.player.on('loaded', () => {
         this.state.isLoading = false;
         this.state.duration = this.player?.duration() || 0;
         this.emitStateUpdate();
      });
   }

   private setupResizeObserver(): void {
      if (!this.container) return;

      this.resizeObserver = new ResizeObserver((entries) => {
         for (const entry of entries) {
               const height = entry.contentRect.height;
               eventBus.emit('view:resize', height);
         }
      });

      this.resizeObserver.observe(this.container);
   }

   private async handleVideoLoad(videoId: VideoId): Promise<void> {
      if (!isValidVideoId(videoId)) {
         throw new Error('Invalid video ID');
      }
      await this.loadVideo(videoId);
   }

   public async loadVideo(videoId: VideoId, timestamp?: Timestamp): Promise<void> {
      if (!this.player) {
         throw new Error('Player not initialized');
      }

      try {
         this.state.isLoading = true;
         this.emitStateUpdate();

         await this.player.src({
               type: 'video/youtube',
               src: `https://www.youtube.com/watch?v=${videoId}`
         });

         this.currentVideoId = videoId;

         if (timestamp) {
               this.player.currentTime(timestamp);
         }

         // Restaurer les paramètres précédents
         if (this.state.playbackRate !== 1) {
               this.player.playbackRate(this.state.playbackRate);
         }
         
         if (this.state.volume !== 1) {
               this.player.volume(this.state.volume);
         }

         if (this.state.isMuted) {
               this.player.muted(true);
         }

      } catch (error) {
         console.error('[VideoPlayer] Load video error:', error);
         this.state.error = error as Error;
         this.emitStateUpdate();
         throw error;
      }
   }

   public play(): void {
      if (this.player && !this.state.isPlaying) {
         this.player.play();
      }
   }

   public pause(): void {
      if (this.player && this.state.isPlaying) {
         this.player.pause();
      }
   }

   public setVolume(volume: Volume): void {
      if (!isValidVolume(volume)) {
         throw new Error('Invalid volume value');
      }

      if (this.player) {
         this.player.volume(volume);
         this.state.volume = volume;
         this.emitStateUpdate();
      }
   }

   public setPlaybackRate(rate: PlaybackRate): void {
      if (!isValidPlaybackRate(rate)) {
         throw new Error('Invalid playback rate value');
      }

      if (this.player) {
         this.player.playbackRate(rate);
         this.state.playbackRate = rate;
         this.emitStateUpdate();
      }
   }

   private emitStateUpdate(): void {
      eventBus.emit('video:stateChange', { ...this.state });
   }

   public getCurrentState(): VideoPlayerState {
      return { ...this.state };
   }

   public destroy(): void {
      if (this.player) {
         this.player.dispose();
         this.player = null;
      }

      if (this.resizeObserver) {
         this.resizeObserver.disconnect();
         this.resizeObserver = null;
      }

      this.container = null;
      this.currentVideoId = null;
      this.state = {
         isPlaying: false,
         currentTime: 0,
         duration: 0,
         volume: 1 as Volume,
         isMuted: false,
         playbackRate: 1 as PlaybackRate,
         isLoading: false,
         error: null
      };
   }
} 
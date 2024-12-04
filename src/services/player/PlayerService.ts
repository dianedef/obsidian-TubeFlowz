import { IPlayerService } from '../../types/IPlayerService';
import { IPlayerState } from '../../types/IPlayer';
import { eventBus } from '../../core/EventBus';
import { YouTubeService } from '../youtube/YouTubeService';
import { PluginSettings } from '../../types/ISettings';
import { createVolume, createPlaybackRate } from '../../utils';
import { App } from 'obsidian';
import videojs, { VideoJsPlayer, VideoJsOptions } from 'video.js';
import 'videojs-youtube';
import { EventMap } from '../../types/IEvents';
import { Volume, PlaybackRate, Timestamp } from '../../types/IBase';

export default class PlayerService implements IPlayerService {
    private static instance: PlayerService | null = null;
    private container: HTMLElement | null = null;
    private player: VideoJsPlayer | null = null;
    private youtubeService: YouTubeService;
    private settings: Readonly<PluginSettings>;
    private resizeObserver: ResizeObserver | null = null;
    private currentState: IPlayerState = {
        videoId: '',
        timestamp: 0,
        currentTime: 0,
        volume: 1,
        playbackRate: 1,
        isMuted: false,
        isPlaying: false,
        error: null,
        mode: 'sidebar',
        isPaused: true,
        isStopped: true,
        isLoading: false,
        isError: false,
        containerId: '',
        height: 0,
        controls: true,
        loop: false
    };

    private constructor(private app: App, settings: Readonly<PluginSettings>) {
        this.youtubeService = YouTubeService.getInstance(app);
        this.settings = settings;
        this.currentState = {
            videoId: settings.lastVideoId || 'dQw4w9WgXcQ',
            timestamp: settings.lastTimestamp,
            currentTime: settings.lastTimestamp,
            isPlaying: settings.isPlaying,
            volume: settings.volume,
            isMuted: settings.isMuted,
            playbackRate: settings.playbackRate,
            error: null,
            mode: settings.currentMode,
            isPaused: !settings.isPlaying,
            isStopped: false,
            isLoading: false,
            isError: false,
            containerId: '',
            height: 0,
            controls: true,
            loop: false
        };
        this.initializeEventListeners();
    }

    public static getInstance(app: App, settings: PluginSettings): PlayerService {
        if (!PlayerService.instance) {
            PlayerService.instance = new PlayerService(app, settings);
        }
        return PlayerService.instance;
    }

    private initializeEventListeners(): void {
        eventBus.on('video:load', async (videoId: string) => {
            await this.handleVideoLoad(videoId);
        });
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
            this.currentState.error = error as Error;
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

        const options: VideoJsOptions = {
            controls: true,
            fluid: true,
            techOrder: ['youtube'],
            youtube: this.youtubeService.getYouTubeOptions(this.settings.showYoutubeRecommendations)
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
            this.currentState.isPlaying = true;
            this.emitStateUpdate();
        });

        this.player.on('pause', () => {
            this.currentState.isPlaying = false;
            this.emitStateUpdate();
        });

        this.player.on('timeupdate', () => {
            this.currentState.timestamp = this.player?.currentTime() || 0;
            eventBus.emit('video:timeUpdate', this.currentState.timestamp);
            this.emitStateUpdate();
        });

        this.player.on('error', () => {
            const error = this.player?.error();
            if (error) {
                const messageKey = this.youtubeService.getErrorMessageKey(error.code);
                const errorType = this.youtubeService.getErrorType(error.code);
                const youtubeError = this.youtubeService.createYouTubeError(
                    error.code,
                    messageKey,
                    this.currentState.videoId
                );
                
                eventBus.emit('video:error', {
                    code: String(error.code),
                    message: youtubeError.message,
                    type: errorType
                });
            }
        });

        this.player.on('qualitychange', () => {
            this.youtubeService.handleQualityChange(this.player?.videoHeight());
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

    private async handleVideoLoad(videoId: string): Promise<void> {
        await this.loadVideo({
            ...this.currentState,
            videoId,
            mode: this.settings.currentMode,
            timestamp: 0,
            currentTime: 0,
            volume: this.currentState.volume,
            playbackRate: this.currentState.playbackRate,
            isMuted: this.currentState.isMuted,
            isPlaying: false,
            error: null,
            isPaused: true,
            isStopped: false,
            isLoading: false,
            isError: false,
            containerId: this.currentState.containerId,
            height: this.currentState.height,
            controls: this.currentState.controls,
            loop: this.currentState.loop
        });
    }

    public async loadVideo(options: IPlayerState): Promise<void> {
        if (!this.player) {
            throw new Error('Player not initialized');
        }

        try {
            this.currentState.videoId = options.videoId;
            await this.player.src({
                type: 'video/youtube',
                src: `https://www.youtube.com/watch?v=${options.videoId}`
            });

            if (options.timestamp) {
                await this.seekTo(options.timestamp);
            }

            if (options.volume !== undefined) {
                await this.setVolume(options.volume);
            }

            if (options.playbackRate !== undefined) {
                await this.setPlaybackRate(options.playbackRate);
            }

            this.emitStateUpdate();
        } catch (error) {
            console.error('[VideoPlayer] Load video error:', error);
            this.currentState.error = error as Error;
            this.emitStateUpdate();
            throw error;
        }
    }

    public async play(): Promise<void> {
        if (this.player && !this.currentState.isPlaying) {
            await this.player.play();
        }
    }

    public async pause(): Promise<void> {
        if (this.player && this.currentState.isPlaying) {
            await this.player.pause();
        }
    }

    public async setVolume(volume: number): Promise<void> {
        if (this.player) {
            this.player.volume(volume);
            this.currentState.volume = volume;
            this.emitStateUpdate();
        }
    }

    public async setPlaybackRate(rate: number): Promise<void> {
        if (this.player) {
            this.player.playbackRate(rate);
            this.currentState.playbackRate = rate;
            this.emitStateUpdate();
        }
    }

    private emitStateUpdate(): void {
        const state: IPlayerState = {
            isPlaying: this.currentState.isPlaying,
            currentTime: this.currentState.timestamp as Timestamp,
            duration: this.player?.duration() || 0,
            volume: this.currentState.volume as Volume,
            isMuted: this.currentState.isMuted,
            playbackRate: this.currentState.playbackRate as PlaybackRate,
            isLoading: false,
            isError: false,
            isPaused: !this.currentState.isPlaying,
            isStopped: false,
            error: this.currentState.error || null,
            mode: this.currentState.mode,
            containerId: this.currentState.containerId,
            height: this.currentState.height,
            controls: this.currentState.controls,
            loop: this.currentState.loop,
            videoId: this.currentState.videoId
        };
        
        eventBus.emit('video:stateChange', state);
    }

    public getCurrentState(): IPlayerState {
        return { ...this.currentState };
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
        this.currentState = {
            videoId: '',
            timestamp: 0,
            currentTime: 0,
            volume: 1,
            playbackRate: 1,
            isMuted: false,
            isPlaying: false,
            error: null,
            mode: 'sidebar',
            isPaused: true,
            isStopped: true,
            isLoading: false,
            isError: false,
            containerId: '',
            height: 0,
            controls: true,
            loop: false
        };
    }

    public async dispose(): Promise<void> {
        eventBus.off('video:load', async (videoId: string) => {
            await this.handleVideoLoad(videoId);
        });
        eventBus.off('video:play', this.play.bind(this));
        eventBus.off('video:pause', this.pause.bind(this));
        this.destroy();
    }

    public async seekTo(time: number): Promise<void> {
        if (this.player) {
            this.player.currentTime(time);
            this.currentState.timestamp = time;
            this.emitStateUpdate();
        }
    }

    public async getCurrentTime(): Promise<number> {
        return this.player?.currentTime() || 0;
    }

    public getState(): IPlayerState {
        return {
            videoId: this.currentState.videoId,
            timestamp: this.currentState.timestamp,
            currentTime: this.currentState.timestamp,
            volume: this.currentState.volume,
            playbackRate: this.currentState.playbackRate,
            isMuted: this.currentState.isMuted,
            isPlaying: this.currentState.isPlaying,
            error: this.currentState.error,
            mode: this.currentState.mode,
            isPaused: this.currentState.isPaused,
            isStopped: this.currentState.isStopped,
            isLoading: this.currentState.isLoading,
            isError: this.currentState.isError,
            containerId: this.currentState.containerId,
            height: this.currentState.height,
            controls: this.currentState.controls,
            loop: this.currentState.loop
        };
    }

    public async setState(state: Partial<IPlayerState>): Promise<void> {
        if (state.volume !== undefined) {
            await this.setVolume(state.volume);
        }
        if (state.playbackRate !== undefined) {
            await this.setPlaybackRate(state.playbackRate);
        }
        if (state.isMuted !== undefined && this.player) {
            this.player.muted(state.isMuted);
            this.currentState.isMuted = state.isMuted;
            this.emitStateUpdate();
        }
        if (state.timestamp !== undefined) {
            await this.seekTo(state.timestamp);
        }
        if (state.videoId !== undefined) {
            await this.loadVideo({
                ...this.currentState,
                videoId: state.videoId,
                mode: this.settings.currentMode,
                timestamp: state.timestamp || 0,
                currentTime: state.timestamp || 0,
                volume: this.currentState.volume,
                playbackRate: this.currentState.playbackRate,
                isMuted: this.currentState.isMuted,
                isPlaying: false,
                error: null,
                isPaused: true,
                isStopped: false,
                isLoading: false,
                isError: false,
                containerId: this.currentState.containerId,
                height: this.currentState.height,
                controls: this.currentState.controls,
                loop: this.currentState.loop
            });
        }
        if (state.isPlaying !== undefined) {
            if (state.isPlaying) {
                await this.play();
            } else {
                await this.pause();
            }
        }
    }

    public on<K extends keyof EventMap>(event: K, callback: (state: IPlayerState) => void): void {
        eventBus.on(event, () => callback(this.currentState));
    }

    public off<K extends keyof EventMap>(event: K, callback: (state: IPlayerState) => void): void {
        eventBus.off(event, () => callback(this.currentState));
    }
} 
import { IPlayerService } from '../../types/IPlayerService';
import { IPlayerState } from '../../types/IPlayer';
import { eventBus } from '../../core/EventBus';
import { YouTubeService } from '../youtube/YouTubeService';
import { IPluginSettings } from '../../types/ISettings';
import { DEFAULT_SETTINGS } from '../../types/ISettings';
import { VideoId } from '../../types/IBase';
import { App } from 'obsidian';
import videojs, { IVideoJsPlayer, IVideoJsOptions } from 'video.js';
import 'videojs-youtube';
import { IPlayerOptions } from '../../types/IPlayer';
import { Volume, PlaybackRate, Timestamp } from '../../types/IBase';
import { IEventMap } from '../../types/IEvents';

export default class PlayerService implements IPlayerService {
    private static instance: PlayerService | null = null;
    private container: HTMLElement | null = null;
    private player: IVideoJsPlayer | null = null;
    private youtubeService: YouTubeService;
    private settings: Readonly<IPluginSettings>;
    private resizeObserver: ResizeObserver | null = null;
    private currentState: IPlayerState = {
        videoId: '',
        timestamp: 0,
        currentTime: 0,
        duration: 0,
        volume: 1,
        playbackRate: 1,
        isMuted: false,
        isPlaying: false,
        isPaused: true,
        mode: 'sidebar',
        height: 0,
        containerId: '',
        error: null,
        isError: false,
        isLoading: false
    };

    private videoLoadHandler = async (videoId: string) => this.handleVideoLoad(videoId);
    private playHandler = async () => this.play();
    private pauseHandler = async () => this.pause();

    private constructor(private app: App, settings: Readonly<IPluginSettings>) {
        this.youtubeService = YouTubeService.getInstance(app);
        this.settings = settings;
        this.currentState = {
            videoId: settings.lastVideoId || DEFAULT_SETTINGS.lastVideoId,
            timestamp: settings.lastTimestamp,
            currentTime: settings.lastTimestamp,
            duration: 0,
            volume: settings.volume,
            playbackRate: settings.playbackRate,
            isMuted: settings.isMuted,
            isPlaying: settings.isPlaying,
            isPaused: !settings.isPlaying,
            mode: settings.currentMode,
            height: settings.viewHeight,
            containerId: '',
            error: null,
            isError: false,
            isLoading: false
        };
        this.initializeEventListeners();
    }

    public static getInstance(app: App, settings: IPluginSettings): PlayerService {
        if (!PlayerService.instance) {
            PlayerService.instance = new PlayerService(app, settings);
        }
        return PlayerService.instance;
    }

    private initializeEventListeners(): void {
        eventBus.on('video:load', this.videoLoadHandler);
        eventBus.on('video:play', this.playHandler);
        eventBus.on('video:pause', this.pauseHandler);
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

        const options: IVideoJsOptions = {
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
            videoId: videoId as VideoId,
            timestamp: 0,
            mode: this.settings.currentMode,
            height: this.settings.viewHeight,
            containerId: this.currentState.containerId,
            autoplay: false,
            controls: true,
            loop: false,
            isMuted: this.currentState.isMuted,
            volume: this.currentState.volume,
            playbackRate: this.currentState.playbackRate,
            language: this.settings.language,
            techOrder: ['youtube'],
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
            }
        });
    }

    public async loadVideo(options: IPlayerOptions): Promise<void> {
        try {
            if (!this.player) {
                throw new Error('Player not initialized');
            }

            await this.setState({
                videoId: options.videoId,
                timestamp: options.timestamp || 0,
                currentTime: options.timestamp || 0,
                duration: 0,
                volume: options.volume || this.settings.volume,
                playbackRate: options.playbackRate || this.settings.playbackRate,
                isMuted: options.isMuted || this.settings.isMuted,
                isPlaying: options.autoplay || false,
                isPaused: !options.autoplay,
                mode: options.mode || this.settings.currentMode,
                height: options.height || this.settings.viewHeight,
                containerId: options.containerId || '',
                error: null,
                isError: false,
                isLoading: true
            });

            await this.player.loadVideo(options.videoId, options.timestamp);
            
            this.emitStateUpdate();
        } catch (error) {
            console.error('[PlayerService] Load video error:', error);
            await this.setState({
                error: error as Error,
                isError: true,
                isLoading: false
            });
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
            timestamp: this.currentState.timestamp as Timestamp,
            currentTime: this.currentState.timestamp as Timestamp,
            duration: this.player?.duration() || 0,
            volume: this.currentState.volume as Volume,
            isMuted: this.currentState.isMuted,
            playbackRate: this.currentState.playbackRate as PlaybackRate,
            isLoading: false,
            isError: false,
            isPaused: !this.currentState.isPlaying,
            error: this.currentState.error || null,
            mode: this.currentState.mode,
            containerId: this.currentState.containerId,
            height: this.currentState.height,
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
            duration: 0,
            volume: 1,
            playbackRate: 1,
            isMuted: false,
            isPlaying: false,
            isPaused: true,
            mode: 'sidebar',
            height: 0,
            containerId: '',
            error: null,
            isError: false,
            isLoading: false
        };
    }

    public async dispose(): Promise<void> {
        eventBus.off('video:load', this.videoLoadHandler);
        eventBus.off('video:play', this.playHandler);
        eventBus.off('video:pause', this.pauseHandler);
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
            isLoading: this.currentState.isLoading,
            isError: this.currentState.isError,
            containerId: this.currentState.containerId,
            height: this.currentState.height,
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
                videoId: state.videoId as VideoId,
                mode: this.settings.currentMode,
                timestamp: state.timestamp || 0,
                volume: this.currentState.volume,
                playbackRate: this.currentState.playbackRate,
                isMuted: this.currentState.isMuted,
                containerId: this.currentState.containerId,
                height: this.currentState.height,
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

    public on<K extends keyof IEventMap>(event: K, callback: (state: IPlayerState) => void): void {
        eventBus.on(event, () => callback(this.currentState));
    }

    public off<K extends keyof IEventMap>(event: K, callback: (state: IPlayerState) => void): void {
        eventBus.off(event, () => callback(this.currentState));
    }
} 
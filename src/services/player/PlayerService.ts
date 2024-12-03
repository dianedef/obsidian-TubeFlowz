import { IPlayerService } from '../../types/IPlayerService';
import { IPlayerState } from '../../types/IPlayer';
import { EventMap } from '../../types/index';
import { eventBus } from '../../core/EventBus';
import { PluginSettings } from '../../types/settings';

export default class PlayerService implements IPlayerService {
    private static instance: PlayerService | null = null;
    private currentState: IPlayerState;
    private container: HTMLElement | null = null;

    private constructor(settings: Readonly<PluginSettings>) {
        this.currentState = {
            videoId: settings.lastVideoId || 'dQw4w9WgXcQ',
            timestamp: settings.lastTimestamp,
            isPlaying: settings.isPlaying,
            volume: settings.volume,
            isMuted: settings.isMuted,
            playbackRate: settings.playbackRate
        };
    }

    public static getInstance(settings: PluginSettings): PlayerService {
        if (!PlayerService.instance) {
            PlayerService.instance = new PlayerService(settings);
        }
        return PlayerService.instance;
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

    private async handleVideoLoad(videoId: string): Promise<void> {
        await this.loadVideo({ 
            videoId,
            mode: 'tab'
        });
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

    public async play(): Promise<void> {
        if (this.player && !this.state.isPlaying) {
            await this.player.play();
        }
    }

    public async pause(): Promise<void> {
        if (this.player && this.state.isPlaying) {
            this.player.pause();
        }
    }

    public async setVolume(volume: number): Promise<void> {
        if (this.player) {
            this.player.volume(volume);
            this.state.volume = volume;
            this.emitStateUpdate();
        }
    }

    public async setPlaybackRate(rate: number): Promise<void> {
        if (this.player) {
            this.player.playbackRate(rate);
            this.state.playbackRate = rate;
            this.emitStateUpdate();
        }
    }

    private emitStateUpdate(): void {
        eventBus.emit('video:stateChange' as keyof EventMap, { ...this.currentState });
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

    public async dispose(): Promise<void> {
        // Nettoyer les écouteurs d'événements
        eventBus.off('video:load', this.handleVideoLoad.bind(this));
        eventBus.off('video:play', this.play.bind(this));
        eventBus.off('video:pause', this.pause.bind(this));
        
        // Appeler destroy pour nettoyer le player
        this.destroy();
    }

    public async seekTo(time: number): Promise<void> {
        if (this.player) {
            this.player.currentTime(time);
        }
    }

    public async getCurrentTime(): Promise<number> {
        return this.player?.currentTime() || 0;
    }

    public getState(): IPlayerState {
        return {
            videoId: this.currentVideoId,
            timestamp: this.state.currentTime,
            volume: this.state.volume,
            playbackRate: this.state.playbackRate,
            isMuted: this.state.isMuted,
            isPlaying: this.state.isPlaying
        };
    }

    public async setState(state: Partial<IPlayerState>): Promise<void> {
        if (state.volume !== undefined) {
            await this.setVolume(state.volume);
        }
        if (state.playbackRate !== undefined) {
            await this.setPlaybackRate(state.playbackRate);
        }
        if (state.isMuted !== undefined) {
            this.player?.muted(state.isMuted);
        }
        if (state.timestamp !== undefined) {
            await this.seekTo(state.timestamp);
        }
        if (state.videoId !== undefined) {
            await this.loadVideo(state.videoId);
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
import videojs from 'video.js';
import type { default as VideoJs } from 'video.js';
import type Player from 'videojs-youtube';
import 'videojs-youtube';
import { App } from 'obsidian';
import { eventBus } from '../../core/EventBus';
import { Volume, PlaybackRate, createVolume, createPlaybackRate, isValidVolume, isValidPlaybackRate } from '../../types/settings';
import { createError } from '../../core/errors/ErrorClasses';
import { YouTubeErrorCode, PlayerErrorCode } from '../../types/errors';

export class YouTubeService {
    private static instance: YouTubeService;
    private player: Player | null = null;
    private container: HTMLElement | null = null;
    private resizeObserver: ResizeObserver | null = null;

    private constructor(private app: App) {}

    public static getInstance(app: App): YouTubeService {
        if (!YouTubeService.instance) {
            YouTubeService.instance = new YouTubeService(app);
        }
        return YouTubeService.instance;
    }

    public async initialize(container: HTMLElement): Promise<void> {
        try {
            this.container = container;
            await this.setupPlayer();
            this.setupResizeObserver();
        } catch (error) {
            console.error('[YouTubeService] Initialization error:', error);
            throw createError.youtube(YouTubeErrorCode.HTML5_ERROR);
        }
    }

    private async setupPlayer(): Promise<void> {
        if (!this.container) {
            throw createError.player(PlayerErrorCode.MEDIA_ERR_ABORTED, 0);
        }

        const videoElement = document.createElement('video');
        videoElement.className = 'video-js vjs-default-skin';
        this.container.appendChild(videoElement);

        const options = {
            controls: true,
            fluid: true,
            techOrder: ['youtube'],
            autoplay: false,
            youtube: {
                iv_load_policy: 3, // Désactive les annotations
                modestbranding: 1, // Réduit le branding YouTube
                rel: 0, // Désactive les vidéos suggérées
                customVars: {
                    playsinline: 1
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
                    'playbackRateMenuButton',
                    'fullscreenToggle'
                ]
            }
        };

        try {
            this.player = videojs(videoElement, options);
            this.setupEventListeners();
            eventBus.emit('video:ready', this.player);
        } catch (error) {
            console.error('[YouTubeService] Player setup error:', error);
            throw createError.player(PlayerErrorCode.MEDIA_ERR_DECODE);
        }
    }

    private setupEventListeners(): void {
        if (!this.player) return;

        // Événements de lecture
        this.player.on('play', () => eventBus.emit('video:play'));
        this.player.on('pause', () => eventBus.emit('video:pause'));
        this.player.on('ended', () => eventBus.emit('video:ended'));

        // Événements de temps
        this.player.on('timeupdate', () => {
            const currentTime = this.player?.currentTime() || 0;
            eventBus.emit('video:timeUpdate', currentTime);
        });

        // Événements de volume
        this.player.on('volumechange', () => {
            try {
                const rawVolume = this.player?.volume() || 0;
                const isMuted = this.player?.muted() || false;
                const typedVolume = createVolume(rawVolume);
                eventBus.emit('video:volumeChange', {
                    volume: typedVolume,
                    isMuted
                });
            } catch (error) {
                console.error('[YouTubeService] Volume change error:', error);
            }
        });

        // Événements de vitesse
        this.player.on('ratechange', () => {
            try {
                const rawRate = this.player?.playbackRate() || 1;
                const typedRate = createPlaybackRate(rawRate);
                eventBus.emit('video:rateChange', typedRate);
            } catch (error) {
                console.error('[YouTubeService] Rate change error:', error);
            }
        });

        // Événements de qualité
        this.player.on('qualitychange', () => {
            const quality = this.player?.videoHeight() ? `${this.player.videoHeight()}p` : 'auto';
            eventBus.emit('video:qualityChange', quality);
        });

        // Événements d'erreur
        this.player.on('error', () => {
            const error = this.player?.error();
            if (error) {
                const playerError = createError.player(
                    error.code as PlayerErrorCode,
                    this.getCurrentTime()
                );
                
                eventBus.emit('video:error', {
                    code: String(playerError.code),
                    message: playerError.message,
                    type: this.getErrorType(error.code)
                });
            }
        });
    }

    private getErrorType(code: number): string {
        switch (code) {
            case 1:
                return 'MEDIA_ERR_ABORTED';
            case 2:
                return 'MEDIA_ERR_NETWORK';
            case 3:
                return 'MEDIA_ERR_DECODE';
            case 4:
                return 'MEDIA_ERR_SRC_NOT_SUPPORTED';
            case 5:
                return 'MEDIA_ERR_ENCRYPTED';
            default:
                return 'MEDIA_ERR_UNKNOWN';
        }
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

    public async loadVideo(videoId: string, timestamp?: number): Promise<void> {
        if (!this.player) {
            throw createError.player(PlayerErrorCode.MEDIA_ERR_ABORTED, 0);
        }

        try {
            await this.player.src({
                type: 'video/youtube',
                src: `https://www.youtube.com/watch?v=${videoId}`
            });

            if (timestamp) {
                this.player.currentTime(timestamp);
            }

            eventBus.emit('video:load', videoId);
        } catch (error) {
            console.error('[YouTubeService] Load video error:', error);
            throw createError.youtube(YouTubeErrorCode.VIDEO_NOT_FOUND, videoId);
        }
    }

    public play(): void {
        this.player?.play();
    }

    public pause(): void {
        this.player?.pause();
    }

    public setVolume(volume: Volume): void {
        if (this.player) {
            const rawVolume = Number(volume);
            if (isValidVolume(rawVolume)) {
                this.player.volume(rawVolume);
                eventBus.emit('video:volumeChange', {
                    volume,
                    isMuted: this.player.muted() || false
                });
            }
        }
    }

    public setPlaybackRate(rate: PlaybackRate): void {
        if (this.player) {
            const rawRate = Number(rate);
            if (isValidPlaybackRate(rawRate)) {
                this.player.playbackRate(rawRate);
                eventBus.emit('video:rateChange', rate);
            }
        }
    }

    public getCurrentTime(): number {
        return this.player?.currentTime() || 0;
    }

    public getDuration(): number {
        return this.player?.duration() || 0;
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
    }
} 
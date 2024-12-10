import { App } from 'obsidian';
import { eventBus } from '../../core/EventBus';
import { YouTubeErrorCode, PlayerErrorCode, YouTubeAppError, PlayerAppError } from '../../types/IErrors';
import { MessageKey } from '../../i18n/messages';
import { IPlayer } from '../../types/IPlayer';
import videojs from 'video.js';
import 'videojs-youtube';

export interface IYouTubeOptions {
    iv_load_policy: number;
    modestbranding: number;
    rel: number;
    endscreen: number;
    controls: number;
    ytControls: number;
    preload: string;
    showinfo: number;
    fs: number;
    playsinline: number;
    disablekb: number;
    enablejsapi: number;
    origin: string;
    customVars?: {
        playsinline: number;
    };
}

export class YouTubeService implements IPlayer {
    private static instance: YouTubeService;
    private currentLang: 'en' | 'fr' = 'en';
    private player: any = null;
    private container: HTMLElement | null = null;

    public static getInstance(app: App): YouTubeService {
        if (!YouTubeService.instance) {
            YouTubeService.instance = new YouTubeService(app);
        }
        return YouTubeService.instance;
    }

    public setLanguage(lang: 'en' | 'fr'): void {
        this.currentLang = lang;
    }

    public getYouTubeOptions(showRecommendations: boolean = false): YouTubeOptions {
        return {
            iv_load_policy: 3,
            modestbranding: 1,
            rel: showRecommendations ? 1 : 0,
            endscreen: showRecommendations ? 1 : 0,
            controls: 0,
            ytControls: 0,
            preload: 'auto',
            showinfo: 0,
            fs: 0,
            playsinline: 1,
            disablekb: 1,
            enablejsapi: 1,
            origin: window.location.origin,
        };
    }

    public handleQualityChange(height: number | undefined): void {
        const quality = height && height > 0 ? `${height}p` : 'auto';
        eventBus.emit('video:qualityChange', quality);
    }

    public getErrorMessageKey(code: number): MessageKey {
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
                return 'MEDIA_ERR_DECODE';
        }
    }

    public getErrorType(code: number): string {
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

    public createYouTubeError(code: YouTubeErrorCode, messageKey: MessageKey, videoId?: string): YouTubeAppError {
        return new YouTubeAppError(
            code,
            messageKey,
            videoId,
            undefined,
            this.currentLang
        );
    }

    public async dispose(): Promise<void> {
        if (this.player) {
            this.player.dispose();
            this.player = null;
        }
        if (this.container) {
            this.container.innerHTML = '';
            this.container = null;
        }
        eventBus.clear();
        YouTubeService.instance = null as any;
    }

    public async initialize(): Promise<void> {
        if (!this.container) {
            throw new PlayerAppError(
                PlayerErrorCode.MEDIA_ERR_ABORTED,
                'MEDIA_ERR_ABORTED',
                undefined,
                undefined,
                this.currentLang
            );
        }

        const video = document.createElement('video');
        video.className = 'video-js vjs-default-skin';
        this.container.appendChild(video);

        const options = {
            ...this.getYouTubeOptions(),
            techOrder: ['youtube'],
            autoplay: false,
            controls: true,
            fluid: true,
            language: this.currentLang
        };

        try {
            this.player = videojs(video, options);
            await new Promise<void>((resolve) => {
                this.player.ready(() => resolve());
            });

            this.setupEventListeners();
        } catch (error) {
            console.error('[YouTubeService] Initialization error:', error);
            throw new PlayerAppError(
                PlayerErrorCode.MEDIA_ERR_ABORTED,
                'MEDIA_ERR_ABORTED',
                undefined,
                undefined,
                this.currentLang
            );
        }
    }

    private setupEventListeners(): void {
        if (!this.player) return;

        const player = this.player;
        
        this.player.on('error', () => {
            const error = player.error();
            if (error) {
                const messageKey = this.getErrorMessageKey(error.code);
                const errorType = this.getErrorType(error.code);
                eventBus.emit('video:error', {
                    code: String(error.code),
                    type: errorType
                });
            }
        });

        this.player.on('qualitychange', () => {
            const height = this.player?.videoHeight?.();
            this.handleQualityChange(height);
        });

        this.player.on('play', () => {
            eventBus.emit('video:play');
        });

        this.player.on('pause', () => {
            eventBus.emit('video:pause');
        });

        this.player.on('timeupdate', () => {
            eventBus.emit('video:timeupdate', this.getCurrentTime());
        });

        this.player.on('volumechange', () => {
            eventBus.emit('video:volumeChange', this.player.volume());
        });

        this.player.on('ratechange', () => {
            if (this.player) {
                const rate = this.player.playbackRate();
                if (rate !== null && rate !== undefined) {
                    eventBus.emit('video:rateChange', rate);
                }
            }
        });
    }

    public async loadVideo(videoId: string, timestamp?: number): Promise<void> {
        if (!this.player) {
            throw new PlayerAppError(
                PlayerErrorCode.MEDIA_ERR_ABORTED,
                'MEDIA_ERR_ABORTED',
                undefined,
                undefined,
                this.currentLang
            );
        }

        try {
            await this.player.src({
                type: 'video/youtube',
                src: videoId
            });

            if (timestamp) {
                this.player.currentTime(timestamp);
            }

            eventBus.emit('video:load', videoId);
        } catch (error) {
            console.error('[YouTubeService] Load video error:', error);
            throw new PlayerAppError(
                PlayerErrorCode.MEDIA_ERR_SRC_NOT_SUPPORTED,
                'MEDIA_ERR_SRC_NOT_SUPPORTED',
                undefined,
                undefined,
                this.currentLang
            );
        }
    }

    public destroy(): void {
        if (this.player) {
            this.player.dispose();
            this.player = null;
        }
        if (this.container) {
            this.container.innerHTML = '';
            this.container = null;
        }
        this.dispose();
    }

    public getCurrentTime(): number {
        if (!this.player) return 0;
        return this.player.currentTime();
    }

    public getDuration(): number {
        if (!this.player) return 0;
        return this.player.duration();
    }

    public play(): void {
        if (this.player) {
            this.player.play();
        }
    }

    public pause(): void {
        if (this.player) {
            this.player.pause();
        }
    }

    public setVolume(volume: number): void {
        if (this.player) {
            this.player.volume(volume);
        }
    }

    public setPlaybackRate(rate: number): void {
        if (this.player) {
            this.player.playbackRate(rate);
            eventBus.emit('video:rateChange', rate);
        }
    }

    public seekTo(time: number): void {
        if (this.player) {
            this.player.currentTime(time);
        }
    }

} 
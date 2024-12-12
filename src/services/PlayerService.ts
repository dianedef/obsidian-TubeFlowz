import { IPlayerService } from '../types/IPlayerService';
import { eventBus } from './EventBus';
import { YouTubeService } from './YouTubeService';
import { IPluginSettings } from '../types/ISettings';
import { VideoId } from '../types/IBase';
import videojs, { IVideoJsPlayer, IVideoJsOptions } from 'video.js';
import { YouTubeAppError } from '../utils/ErrorClasses';
import { YouTubeErrorCode } from '../types/IErrors';
import { PlayerAppError } from '../utils/ErrorClasses';
import { ERROR_MESSAGE_KEYS } from '../services/TranslationsService';
import { PlayerErrorCode } from '../types/IErrors';
import 'videojs-youtube';
import { IPlayerState } from '../types/IPlayer';
import { Volume, PlaybackRate, Timestamp } from '../types/IBase';
import { createInitialState } from '../types/IPlayer';

export default class PlayerService implements IPlayerService {
    private static instance: PlayerService | null = null;
    private container: HTMLElement | null = null;
    private player: IVideoJsPlayer | null = null;
    private youtubeService: YouTubeService;
    private settings: Readonly<IPluginSettings>;
    private currentState!: IPlayerState;

    private isInitializing: boolean = false;
    public isInitialized: boolean = false;

    private cleanupFunctions: Array<() => void> = [];

    private constructor(settings: Readonly<IPluginSettings>) {
        console.log('[PlayerService] Constructeur appelé avec settings:', settings);
        this.youtubeService = YouTubeService.getInstance();
        this.settings = settings;
        this.currentState = createInitialState(settings);
    }

    public static getInstance(settings: IPluginSettings): PlayerService {
        if (!PlayerService.instance) {
            PlayerService.instance = new PlayerService(settings);
        }
        return PlayerService.instance;
    }

    public async initialize(container: HTMLElement): Promise<void> {
        try {
            if (this.isInitializing) {
                console.log('[PlayerService dans initialize] Initialisation déjà en cours, ignoré');
                return;
            }
            
            if (this.isInitialized && this.container === container) {
                console.log('[PlayerService dans initialize] Déjà initialisé avec le même container, ignoré');
                return;
            }

            this.isInitializing = true;
            console.log('[PlayerService dans initialize] Début de l\'initialisation');

            // Si on a déjà un player mais avec un container différent
            if (this.isInitialized && this.container !== container) {
                console.log('[PlayerService dans initialize] Changement de container détecté, nettoyage du player existant');
                if (this.player) {
                    this.player.dispose();
                    this.player = null;
                }
            }

            // Initialiser l'état initial seulement si pas déjà initialisé
            if (!this.isInitialized) {
                console.log('[PlayerService dans initialize] Première initialisation, création de l\'état initial');
                this.currentState = {
                    videoId: this.settings.lastVideoId,
                    timestamp: this.settings.lastTimestamp,
                    currentTime: this.settings.lastTimestamp,
                    autoplay: false,
                    duration: 0,
                    loop: false,
                    controls: true,
                    volume: this.settings.volume,
                    playbackRate: this.settings.playbackRate,
                    isMuted: this.settings.isMuted,
                    isPlaying: this.settings.isPlaying,
                    isPaused: !this.settings.isPlaying,
                    mode: this.settings.currentMode,
                    height: this.settings.viewHeight,
                    containerId: '',
                    error: null,
                    isError: false,
                    isLoading: false
                };
            }

            this.container = container;
            this.isInitialized = true;
            this.isInitializing = false;
            
            console.log('[PlayerService dans initialize] Initialisation terminée avec succès');
        } catch (error) {
            this.isInitializing = false;
            console.error('[PlayerService dans initialize ] Erreur d\'initialisation:', error);
            
            eventBus.emit('video:error', {
                code: 'INIT_ERROR',
                message: (error as Error).message,
                type: 'initialization'
            });
            
            throw error;
        }
    }

    private async setupVideoJS(): Promise<void> {
        console.log('[PlayerService dans setupVideoJS] Création du player VideoJS');
        if (!this.container) {
            throw new Error('Container element not found');
        }

        if (this.player) {
            console.log('[PlayerService dans setupVideoJS] Player déjà existant, destruction...');
            this.player.dispose();
            this.player = null;
        }

        try {
            this.container.innerHTML = '';
            
            const videoElement = document.createElement('video');
            videoElement.className = 'video-js vjs-default-skin';
            this.container.appendChild(videoElement);
            
            const options: IVideoJsOptions = {
                controls: true,
                fluid: true,
                techOrder: ['youtube'],
                sources: [{
                    type: 'video/youtube',
                    src: `https://www.youtube.com/watch?v=${this.currentState.videoId}`
                }],
                youtube: this.youtubeService.getYouTubeOptions(this.settings.showYoutubeRecommendations)
            };

            this.player = videojs(videoElement, options);
            console.log('[PlayerService dans setupVideoJS] Player créé avec succès');
            
            this.setupPlayerEvents();
            eventBus.emit('player:init');
        } catch (error) {
            console.error('[PlayerService dans setupVideoJS] Erreur lors de la création du player:', error);
            throw error;
        }
    }

    private setupPlayerEvents(): void {
        if (!this.player) return;

        // Garder uniquement les événements pour mettre à jour l'état
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
                eventBus.emit('video:error', {
                    code: String(error.code),
                    type: this.youtubeService.getErrorType(error.code),
                    message: this.youtubeService.getErrorMessageKey(error.code)
                });
            }
        });
    }

    private async initializePlayer(container: HTMLElement, videoId: string): Promise<void> {
        try {
            if (!container) {
                throw new PlayerAppError(
                    PlayerErrorCode.MEDIA_ERR_ABORTED,
                    ERROR_MESSAGE_KEYS.CONTAINER_NOT_INITIALIZED
                );
            }

            // Créer l'élément vidéo
            const video = document.createElement('video');
            video.className = 'video-js vjs-default-skin';
            container.appendChild(video);

            // Configuration du player
            const options: IVideoJsOptions = {
                techOrder: ['youtube'],
                sources: [{
                    type: 'video/youtube',
                    src: `https://www.youtube.com/watch?v=${videoId}`
                }],
                youtube: this.youtubeService.getYouTubeOptions(this.settings.showYoutubeRecommendations),
                controls: true,
                fluid: true,
                language: this.settings.language
            };

            try {
                // Tentative d'initialisation du player principal
                this.player = videojs(video, options);
                
                await new Promise<void>((resolve, reject) => {
                    this.player.ready(() => {
                        this.setupPlayerEvents();
                        resolve();
                    });

                    // Timeout de sécurité
                    setTimeout(() => {
                        reject(new Error('Player initialization timeout'));
                    }, 10000);
                });

            } catch (error) {
                console.error('[PlayerService] Erreur d\'initialisation du player principal:', error);
                // Création du fallback player
                this.createFallbackPlayer(container, videoId);
            }

            eventBus.emit('player:init');
        } catch (error) {
            console.error('[PlayerService] Erreur fatale lors de l\'initialisation:', error);
            throw error;
        }
    }

    private createFallbackPlayer(container: HTMLElement, videoId: string): void {
        console.log('[PlayerService] Utilisation du lecteur de secours pour:', videoId);
        
        // Nettoyer le container
        container.innerHTML = '';
        
        // Créer le fallback player
        const fallbackContainer = document.createElement('div');
        fallbackContainer.className = 'fallback-player-container';
        
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${videoId}`;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        
        fallbackContainer.appendChild(iframe);
        container.appendChild(fallbackContainer);
        
        // Mettre à jour l'état
        this.currentState = {
            ...this.currentState,
            videoId,
            isError: false,
            isLoading: false
        };
        
        this.emitStateUpdate();
    }

    public async handleLoadVideo(options: Partial<IPlayerState>): Promise<void> {
        try {
            if (!options.videoId) {
                console.warn('VideoId manquant');
                throw new YouTubeAppError(
                    YouTubeErrorCode.INVALID_PARAMETER,
                    ERROR_MESSAGE_KEYS.INVALID_PARAMETER
                );
            }

            if (!this.player) {
                // Initialisation initiale
                await this.initializePlayer(this.container!, options.videoId);
            } else {
                // Tentative de chargement avec le player existant
                try {
                    await new Promise<void>((resolve, reject) => {
                        this.player.src({
                            type: 'video/youtube',
                            src: `https://www.youtube.com/watch?v=${options.videoId}`
                        });

                        this.player.one('loadeddata', () => resolve());
                        this.player.one('error', (e: any) => reject(e));
                    });
                } catch (error) {
                    // En cas d'erreur, on réinitialise avec le fallback
                    console.error('[PlayerService] Erreur de chargement, passage au fallback:', error);
                    this.destroy();
                    await this.initializePlayer(this.container!, options.videoId);
                }
            }

            // Mise à jour de l'état
            this.currentState = {
                ...this.currentState,
                ...options,
                isError: false,
                isLoading: false
            };

            this.emitStateUpdate();
        } catch (error) {
            console.error('[PlayerService] Erreur lors du chargement:', error);
            throw error;
        }
    }

    private async loadVideo(options: IPlayerState): Promise<void> {
        try {
            if (!this.player) {
                await this.setupVideoJS();
                console.log('setupVideoJS dans loadVideo');
            }

            // Mettre à jour l'état directement
            this.currentState = {
                ...this.currentState,
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
                isLoading: true,
                loop: options.loop || false,
                controls: options.controls || true
            };

            // Appliquer les paramètres au player
            if (this.player) {
                this.player.volume(this.currentState.volume);
                this.player.playbackRate(this.currentState.playbackRate);
                this.player.muted(this.currentState.isMuted);

                this.player.src(options.videoId);

                if (options.timestamp) {
                    this.player.currentTime(options.timestamp);
                }
            }
            
            this.emitStateUpdate();
        } catch (error) {
            console.error('[PlayerService] Load video error:', error);
            this.currentState.error = error as Error;
            this.currentState.isError = true;
            this.currentState.isLoading = false;
            this.emitStateUpdate();
            throw error;
        }
    }

    private emitStateUpdate(): void {
        const state: IPlayerState = {
            isPlaying: this.currentState.isPlaying,
            autoplay: this.currentState.autoplay,
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
            videoId: this.currentState.videoId,
            loop: this.currentState.loop,
            controls: this.currentState.controls
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

        this.container = null;
    }

    public async dispose(): Promise<void> {
        // Nettoyer les handlers d'événements
        this.cleanupFunctions.forEach(cleanup => cleanup());
        this.cleanupFunctions = [];

        // Nettoyer le player
        if (this.player) {
            this.player.dispose();
            this.player = null;
        }
    }

    public async seekTo(time: number): Promise<void> {
        if (this.player) {
            this.player.currentTime(time);
            this.currentState.timestamp = time;
            this.emitStateUpdate();
        }
    }

    public getCurrentTime(): number {
        return this.player?.currentTime() || 0;
    }

    public getState(): IPlayerState {
        return {
            videoId: this.currentState.videoId,
            autoplay: this.currentState.autoplay,
            timestamp: this.currentState.timestamp,
            currentTime: this.currentState.timestamp,
            volume: this.currentState.volume,
            playbackRate: this.currentState.playbackRate,
            isMuted: this.currentState.isMuted,
            isPlaying: this.currentState.isPlaying,
            error: this.currentState.error,
            duration: this.player?.duration() || 0,
            mode: this.currentState.mode,
            isPaused: this.currentState.isPaused,
            isLoading: this.currentState.isLoading,
            isError: this.currentState.isError,
            containerId: this.currentState.containerId,
            height: this.currentState.height,
            loop: this.currentState.loop,
            controls: this.currentState.controls
        };
    }

    public getCurrentVideoId(): string {
        return this.player?.currentSrc() || '';
    }

    public isReady(): boolean {
        return this.isInitialized && this.player !== null;
    }
}
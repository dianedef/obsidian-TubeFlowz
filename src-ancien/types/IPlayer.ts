import { ViewMode } from './ISettings';
import { IEventMap } from './IEvents';
import { VideoId } from './IBase';
import { IPluginSettings } from './ISettings';
import { DEFAULT_SETTINGS } from './ISettings';
import { IVideoJsOptions } from 'video.js';

export interface IPlayer {
    // Core
    initialize(container: HTMLElement): Promise<void>;
    dispose(): Promise<void>;
    
    // Video
    handleLoadVideo(options: Partial<IPlayerState>): Promise<void>;
    
    // Controls
    play(): Promise<void>;
    pause(): Promise<void>;
    seekTo(time: number): Promise<void>;
    
    // State
    getState(): IPlayerState;
    
    // Events
    on<K extends keyof IEventMap>(event: K, callback: (data: IEventMap[K]) => void): void;
    off<K extends keyof IEventMap>(event: K, callback: (data: IEventMap[K]) => void): void;
}

export interface IPlayerState {
    // Configuration de la vidéo
    videoId: VideoId;
    timestamp: number;
    currentTime: number;
    duration: number;
    
    // Contrôles de lecture
    volume: number;
    playbackRate: number;
    isMuted: boolean;
    isPlaying: boolean;
    isPaused: boolean;
    autoplay: boolean;
    loop: boolean;
    controls: boolean;
    
    // Options d'affichage
    mode: ViewMode;
    height: number;
    containerId: string;
    
    // Options VideoJS
    videoJsOptions?: Partial<IVideoJsOptions>;
    fromUserClick?: boolean;
    
    // État d'erreur
    error: Error | null;
    isError: boolean;
    isLoading: boolean;
}

export interface IPlayerControls {
    play: () => void;
    pause: () => void;
    currentTime: (time?: number) => number;
    duration: () => number;
    volume: (level?: number) => number;
    muted: (muted?: boolean) => boolean;
    playbackRate: (rate?: number) => number;
    language: (lang: string) => void;
    dispose: () => void;
} 

export function createInitialState(settings: IPluginSettings): IPlayerState {
    return {
        videoId: settings.lastVideoId || DEFAULT_SETTINGS.lastVideoId,
        timestamp: settings.lastTimestamp || DEFAULT_SETTINGS.lastTimestamp,
        currentTime: settings.lastTimestamp || DEFAULT_SETTINGS.lastTimestamp,
        duration: 0,
        volume: settings.volume || DEFAULT_SETTINGS.volume,
        playbackRate: settings.playbackRate || DEFAULT_SETTINGS.playbackRate,
        isMuted: settings.isMuted || DEFAULT_SETTINGS.isMuted,
        isPlaying: settings.isPlaying || DEFAULT_SETTINGS.isPlaying,
        isPaused: !settings.isPlaying,
        mode: settings.currentMode || DEFAULT_SETTINGS.currentMode,
        height: settings.viewHeight || DEFAULT_SETTINGS.viewHeight,
        containerId: '',
        error: null,
        isError: false,
        isLoading: false,
        loop: false,
        autoplay: false,
        controls: true
    };
} 
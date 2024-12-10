import { ViewMode } from './ISettings';
import { VideoId } from './IBase';

export interface IPlayer {
    initialize(): Promise<void>;
    loadVideo(videoId: string, timestamp?: number): Promise<void>;
    dispose(): Promise<void>;
    getCurrentTime(): number;
    getDuration(): number;
    play(): void;
    pause(): void;
    setVolume(volume: number): void;
    setPlaybackRate(rate: number): void;
    seekTo(time: number): void;
}

export interface IPlayerState {
    // État de la vidéo en cours
    videoId: string;
    timestamp: number;
    currentTime: number;
    duration: number;
    
    // État des contrôles
    volume: number;
    playbackRate: number;
    isMuted: boolean;
    isPlaying: boolean;
    isPaused: boolean;
    
    // État de l'interface
    mode: ViewMode;
    height: number;
    containerId: string;
    
    // État des erreurs et chargement
    error: Error | null;
    isError: boolean;
    isLoading: boolean;
}

export interface IPlayerOptions {
    // Configuration de la vidéo
    videoId: VideoId;
    timestamp?: number;
    
    // Options d'affichage
    mode?: ViewMode;
    height?: number;
    containerId?: string;
    
    // Options de comportement
    fromUserClick?: boolean;
    autoplay?: boolean;
    controls?: boolean;
    loop?: boolean;
    isMuted?: boolean;
    volume?: number;
    playbackRate?: number;
    
    // Options de langue
    language?: string;
    languages?: {
        [key: string]: {
            [key: string]: string;
        };
    };
    
    // Options techniques
    techOrder?: string[];
    youtube?: {
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
    };
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
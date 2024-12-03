import { VideoId, Timestamp } from './video';

// Interface pour le redimensionnement
export interface ResizerOptions {
    container: HTMLElement;
    targetElement: HTMLElement;
    handle: HTMLElement;
    mode: ViewMode;
    onResize: (height: number) => void;
    minHeight?: number;
    maxHeight?: number;
}

// Types de base pour les paramètres
export type Volume = number & { readonly _brand: unique symbol };
export type PlaybackRate = number & { readonly _brand: unique symbol };

// Type Guards pour les paramètres
export const isValidVolume = (value: unknown): value is Volume => {
    return typeof value === 'number' && value >= 0 && value <= 1;
};

export const isValidPlaybackRate = (value: unknown): value is PlaybackRate => {
    return typeof value === 'number' && value >= 0.25 && value <= 16;
};

export const createVolume = (value: unknown): Volume => {
    if (!isValidVolume(value)) {
        throw new Error(`Invalid volume value: ${value}`);
    }
    return value as Volume;
};

export const createPlaybackRate = (value: unknown): PlaybackRate => {
    if (!isValidPlaybackRate(value)) {
        throw new Error(`Invalid playback rate value: ${value}`);
    }
    return value as PlaybackRate;
};

// Modes d'affichage
export type ViewMode = 'sidebar' | 'overlay' | 'tab';

export const VIEW_MODES = {
    Sidebar: 'sidebar' as ViewMode,
    Tab: 'tab' as ViewMode,
    Overlay: 'overlay' as ViewMode
} as const;

// Mode de lecture
export enum PlaybackMode {
    Stream = 'stream',
    Download = 'download'
}

// Configuration du plugin
export interface PluginSettings {
    language: string;
    // Dernière session
    lastVideoId: VideoId;
    lastTimestamp: Timestamp;
    isVideoOpen: boolean;
    currentMode: ViewMode;
    isChangingMode: boolean;
    activeLeafId: string | null;
    overlayLeafId: string | null;
    
    // État de lecture
    isPlaying: boolean;
    playbackMode: PlaybackMode;
    playbackRate: PlaybackRate;
    favoriteSpeed: PlaybackRate;
    
    // Audio
    volume: Volume;
    isMuted: boolean;
    
    // Interface
    viewHeight: number;
    overlayHeight: number;
    showYoutubeRecommendations: boolean;
    
    // Raccourcis clavier
    hotkeys?: {
        togglePlay?: string;
        volumeUp?: string;
        volumeDown?: string;
        speedUp?: string;
        speedDown?: string;
        toggleMute?: string;
    };
    
    // Thème
    theme?: {
        useCustomColors: boolean;
        primaryColor?: string;
        secondaryColor?: string;
        textColor?: string;
        backgroundColor?: string;
    };
    // Playlist
    playlist: Array<{
        id: string;
        title: string;
        timestamp: number;
    }>;
}

// Valeurs par défaut
export const DEFAULT_SETTINGS: PluginSettings = {
    language: 'en',
    lastVideoId: 'dQw4w9WgXcQ' as VideoId,
    lastTimestamp: 0 as Timestamp,
    isVideoOpen: false,
    currentMode: 'sidebar',
    isChangingMode: false,
    activeLeafId: null,
    overlayLeafId: null,
    isPlaying: false,
    playbackMode: PlaybackMode.Stream,
    playbackRate: createPlaybackRate(1),
    favoriteSpeed: createPlaybackRate(2),
    volume: createVolume(1),
    isMuted: false,
    viewHeight: 60,
    overlayHeight: 60,
    showYoutubeRecommendations: false,
    playlist: []
}; 
import { VideoId, Timestamp } from './video';

// Types de base pour les paramètres
export type Volume = number & { readonly _brand: unique symbol };
export type PlaybackRate = number & { readonly _brand: unique symbol };

// Type Guards pour les paramètres
export const isValidVolume = (value: number): value is Volume => {
    return value >= 0 && value <= 1;
};

export const isValidPlaybackRate = (value: number): value is PlaybackRate => {
    return value >= 0.25 && value <= 16;
};

export const createVolume = (value: number): Volume => {
    if (!isValidVolume(value)) {
        throw new Error(`Invalid volume value: ${value}`);
    }
    return value as Volume;
};

export const createPlaybackRate = (value: number): PlaybackRate => {
    if (!isValidPlaybackRate(value)) {
        throw new Error(`Invalid playback rate value: ${value}`);
    }
    return value as PlaybackRate;
};

// Modes d'affichage
export enum ViewMode {
    Sidebar = 'sidebar',
    Tab = 'tab',
    Overlay = 'overlay'
}

// Mode de lecture
export enum PlaybackMode {
    Stream = 'stream',
    Download = 'download'
}

// Configuration du plugin
export interface PluginSettings {
    // Dernière session
    lastVideoId: VideoId | null;
    lastTimestamp: Timestamp;
    lastViewMode: ViewMode;
    
    // État de lecture
    isVideoOpen: boolean;
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
    activeLeafId: string | null;
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
}

// Valeurs par défaut
export const DEFAULT_SETTINGS: PluginSettings = {
    lastVideoId: null,
    lastTimestamp: 0,
    lastViewMode: ViewMode.Sidebar,
    isVideoOpen: false,
    isPlaying: false,
    playbackMode: PlaybackMode.Stream,
    playbackRate: createPlaybackRate(1),
    favoriteSpeed: createPlaybackRate(1),
    volume: createVolume(1),
    isMuted: false,
    viewHeight: 300,
    overlayHeight: 200,
    activeLeafId: null,
    showYoutubeRecommendations: false
}; 
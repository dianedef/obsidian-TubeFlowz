import { VideoId, Timestamp } from './IBase';

// Interface pour le redimensionnement
export interface IResizerOptions {
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
    Overlay: 'overlay' as ViewMode,
    Tab: 'tab' as ViewMode
} as const;

// Mode de lecture
export enum PlaybackMode {
    Stream = 'stream',
    Download = 'download'
}
export interface IPluginSettings {
    language: string;
    lastVideoId: VideoId;
    lastTimestamp: Timestamp;
    isVideoOpen: boolean;
    currentMode: ViewMode;
    isChangingMode: boolean;
    activeLeafId: string | null;
    overlayLeafId: string | null;
    isPlaying: boolean;
    playbackMode: PlaybackMode;
    playbackRate: PlaybackRate;
    favoriteSpeed: PlaybackRate;
    volume: Volume;
    isMuted: boolean;
    viewHeight: number;
    overlayHeight: number;
    showYoutubeRecommendations: boolean;
    playlist: {
        id: string;
        title: string;
        timestamp: number;
    }[];
}

// Valeurs par défaut
export const DEFAULT_SETTINGS: IPluginSettings = {
    language: 'en',
    lastVideoId: 'EIHAt93_Vs4' as VideoId,
    lastValidVideoId: 'jNQXAC9IVRw' as VideoId,
    lastTimestamp: 0 as Timestamp,
    isVideoOpen: false,
    currentMode: VIEW_MODES.Tab,
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
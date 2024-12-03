// Re-export des types de base
export * from './video';
export * from './settings';
export * from './errors';

import { Volume, PlaybackRate } from './settings';

// Types spécifiques à l'application
export interface AppError extends Error {
    code: string;
    details: Record<string, unknown>;
}

// Types pour les événements de l'application
export type AppEventType = 
    | 'app:ready'
    | 'app:error'
    | 'app:themeChange'
    | 'app:settingsChange';

// Types spécifiques pour les payloads d'événements
export interface AppReadyPayload {
    version: string;
    timestamp: number;
}

export interface AppErrorPayload {
    error: AppError;
    context?: string;
}

export interface AppThemeChangePayload {
    theme: 'light' | 'dark';
    customColors?: {
        primary?: string;
        secondary?: string;
        text?: string;
        background?: string;
    };
}

export interface AppSettingsChangePayload {
    key: string;
    oldValue: unknown;
    newValue: unknown;
}

// Type union pour tous les payloads possibles
export type AppEventPayload =
    | AppReadyPayload
    | AppErrorPayload
    | AppThemeChangePayload
    | AppSettingsChangePayload;

// Interface générique pour les événements de l'application
export interface AppEvent<T extends AppEventPayload> {
    type: AppEventType;
    payload: T;
    timestamp: number;
}

// Types spécifiques pour le lecteur vidéo
export interface VideoPlayerState {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: Volume;
    isMuted: boolean;
    playbackRate: PlaybackRate;
    isLoading: boolean;
    error: Error | null;
}

// Types pour les événements vidéo
export interface EventMap {
    'video:load': (videoId: string) => void;
    'video:play': () => void;
    'video:pause': () => void;
    'video:timeUpdate': (time: number) => void;
    'video:volumeChange': (data: { volume: Volume; isMuted: boolean }) => void;
    'video:rateChange': (rate: PlaybackRate) => void;
    'video:error': (error: Error) => void;
    'video:stateChange': (state: VideoPlayerState) => void;
}

// Types pour VideoJS
export interface VideoJsOptions {
    techOrder: string[];
    sources: {
        type: string;
        src: string;
    }[];
    youtube: {
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
    language: string;
    languages: {
        [key: string]: {
            [key: string]: string;
        };
    };
    controlBar: {
        children: string[];
    };
    userActions: {
        hotkeys: boolean;
    };
    fullscreen: {
        options: {
            navigationUI: string;
        };
    };
} 
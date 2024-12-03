// Types de base pour la vidéo
export type VideoId = string & { readonly _brand: unique symbol };
export type Timestamp = number;

// Type Guards pour la vidéo
export const isValidVideoId = (value: string): value is VideoId => {
    return /^[a-zA-Z0-9_-]{11}$/.test(value);
};

export const createVideoId = (value: string): VideoId | null => {
    return isValidVideoId(value) ? value as VideoId : null;
};

// États et configurations
export interface VideoMetadata {
    id: VideoId;
    title: string;
    timestamp: Timestamp;
    duration?: number;
    thumbnailUrl?: string;
}

export interface VideoPlayerState {
    isPlaying: boolean;
    currentTime: Timestamp;
    duration: number;
    volume: number;
    isMuted: boolean;
    playbackRate: number;
    isLoading: boolean;
    error: Error | null;
    quality?: string;
    buffered?: number;
}

// Configuration du lecteur vidéo
export interface VideoPlayerConfig {
    container: HTMLElement;
    initialVolume?: number;
    initialPlaybackRate?: number;
    autoplay?: boolean;
    muted?: boolean;
    controls?: boolean;
    keyboard?: boolean;
    modestBranding?: boolean;
    showRelatedVideos?: boolean;
}

// Types d'événements vidéo
export type VideoEventType = 
    | 'load'
    | 'play'
    | 'pause'
    | 'timeUpdate'
    | 'volumeChange'
    | 'rateChange'
    | 'qualityChange'
    | 'error'
    | 'ready'
    | 'stateChange';

export interface VideoEvent<T = any> {
    type: VideoEventType;
    payload?: T;
    timestamp: number;
}

// Types pour l'API YouTube
export interface YouTubePlayerOptions {
    videoId: VideoId;
    height?: string | number;
    width?: string | number;
    playerVars?: {
        autoplay?: 0 | 1;
        cc_load_policy?: 1;
        controls?: 0 | 1 | 2;
        disablekb?: 0 | 1;
        enablejsapi?: 0 | 1;
        end?: number;
        fs?: 0 | 1;
        hl?: string;
        iv_load_policy?: 1 | 3;
        list?: string;
        listType?: 'playlist' | 'user_uploads';
        loop?: 0 | 1;
        modestbranding?: 0 | 1;
        origin?: string;
        playlist?: string;
        playsinline?: 0 | 1;
        rel?: 0 | 1;
        start?: number;
        widget_referrer?: string;
    };
    events?: {
        onReady?: (event: any) => void;
        onStateChange?: (event: any) => void;
        onPlaybackQualityChange?: (event: any) => void;
        onPlaybackRateChange?: (event: any) => void;
        onError?: (event: any) => void;
        onApiChange?: (event: any) => void;
    };
}

import type { Player } from 'video.js';

export interface VideoPlayer extends Player {
    // Ajoutez ici des propriétés spécifiques si nécessaire
} 
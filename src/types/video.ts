// Types de base pour la vidéo avec sécurité de type
export type VideoId = string & { readonly _brand: unique symbol };
export type Timestamp = number & { readonly _brand: unique symbol };

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
    currentTime: number;
    duration: number;
    volume: number;
    isMuted: boolean;
    playbackRate: number;
    isLoading: boolean;
    error: Error | null;
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

// Types spécifiques pour les payloads d'événements
export interface VideoLoadPayload {
    videoId: VideoId;
    timestamp?: Timestamp;
}

export interface VideoTimeUpdatePayload {
    currentTime: Timestamp;
    duration: number;
}

export interface VideoVolumeChangePayload {
    volume: number;
    muted: boolean;
}

export interface VideoRateChangePayload {
    playbackRate: number;
}

export interface VideoQualityChangePayload {
    quality: string;
}

export interface VideoErrorPayload {
    code: number;
    message: string;
    details?: unknown;
}

export interface VideoStateChangePayload {
    state: -1 | 0 | 1 | 2 | 3 | 5; // États YouTube : unstarted, ended, playing, paused, buffering, video cued
}

// Type union pour tous les payloads possibles
export type VideoEventPayload =
    | VideoLoadPayload
    | VideoTimeUpdatePayload
    | VideoVolumeChangePayload
    | VideoRateChangePayload
    | VideoQualityChangePayload
    | VideoErrorPayload
    | VideoStateChangePayload
    | undefined;

// Interface générique pour les événements vidéo
export interface VideoEvent<T extends VideoEventPayload = undefined> {
    type: VideoEventType;
    payload: T;
    timestamp: number;
}

// Interface du lecteur vidéo
export interface VideoPlayer {
    // Contrôles de base
    playVideo(): void;
    pauseVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    loadVideoById(videoId: VideoId, startSeconds?: number): void;
    cueVideoById(videoId: VideoId, startSeconds?: number): void;
    
    // Getters d'état
    getCurrentTime(): number;
    getDuration(): number;
    getVideoLoadedFraction(): number;
    getPlayerState(): VideoStateChangePayload['state'];
    
    // Contrôles audio
    setVolume(value: number): void;
    getVolume(): number;
    mute(): void;
    unMute(): void;
    isMuted(): boolean;
    
    // Contrôles de vitesse
    setPlaybackRate(rate: number): void;
    getPlaybackRate(): number;
    getAvailablePlaybackRates(): number[];
    
    // Qualité vidéo
    getPlaybackQuality(): string;
    setPlaybackQuality(quality: string): void;
    getAvailableQualityLevels(): string[];
    
    // Métadonnées
    getVideoUrl(): string;
    getVideoEmbedCode(): string;
    getVideoData(): VideoMetadata;
}

// Types pour les événements YouTube
export interface YouTubePlayerEvents {
    onReady: (event: { target: VideoPlayer }) => void;
    onStateChange: (event: { data: VideoStateChangePayload['state'] }) => void;
    onPlaybackQualityChange: (event: { data: string }) => void;
    onPlaybackRateChange: (event: { data: number }) => void;
    onError: (event: { data: number }) => void;
}

// Configuration complète du lecteur YouTube
export interface YouTubePlayerOptions {
    videoId: VideoId;
    width?: number;
    height?: number;
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
        showinfo?: 0 | 1;
        start?: number;
        widget_referrer?: string;
    };
    events?: Partial<YouTubePlayerEvents>;
} 
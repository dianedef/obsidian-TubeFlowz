import { ViewMode } from './ISettings';

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
    videoId: string;
    timestamp: number;
    currentTime: number;
    volume: number;
    playbackRate: number;
    isMuted: boolean;
    isPlaying: boolean;
    error: Error | null;
    mode: ViewMode;
    fromUserClick?: boolean;
    autoplay?: boolean;
    isPaused: boolean;
    isStopped: boolean;
    isLoading: boolean;
    isError: boolean;
    containerId: string;
    height: number;
    controls?: boolean;
    loop?: boolean;
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
import { ViewMode } from './settings';

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
    volume: number;
    playbackRate: number;
    isMuted: boolean;
    isPlaying: boolean;
}

export interface IPlayerOptions {
    videoId: string;
    mode: ViewMode;
    timestamp?: number;
    volume?: number;
    playbackRate?: number;
    fromUserClick?: boolean;
} 
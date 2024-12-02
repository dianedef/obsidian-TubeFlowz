import { Plugin } from 'obsidian';

declare module 'video.js';

interface Window {
   videojs: VideoJSStatic;
}

export type Volume = number & { _brand: 'Volume' };
export type PlaybackRate = number & { _brand: 'PlaybackRate' };
export type VideoMode = 'sidebar' | 'tab' | 'overlay';
export type PlaybackMode = 'stream' | 'download';

export function isValidVolume(value: number): value is Volume {
    return value >= 0 && value <= 1;
}

export function isValidPlaybackRate(value: number): value is PlaybackRate {
    return value >= 0.25 && value <= 16;
}

export interface PluginSettings {
   lastVideoId: string | null;
   lastTimestamp: number;
   isVideoOpen: boolean;
   isPlaying: boolean;
   currentMode: VideoMode;
   viewHeight: number;
   overlayHeight: number;
   activeLeafId: string | null;
   playbackMode: PlaybackMode;
   playbackRate: PlaybackRate;
   favoriteSpeed: PlaybackRate;
   volume: Volume;
   isMuted: boolean;
   showYoutubeRecommendations: boolean;
   playlist: Array<{
       id: string;
       title: string;
       timestamp: number;
   }>;
}

export interface DisplayVideoParams {
    videoId: string;
    mode: VideoMode;
    timestamp?: number;
    fromUserClick?: boolean;
} 
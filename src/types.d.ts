import { Plugin } from 'obsidian';

declare module 'video.js';

interface Window {
    videojs: VideoJSStatic; 
}

export type Volume = number;
export type PlaybackRate = 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2 | 3 | 4 | 5 | 8 | 10 | 16;
export type VideoMode = 'tab' | 'sidebar' | 'overlay';
export type PlaybackMode = 'stream' | 'download';

export function isValidVolume(value: number): value is Volume {
    return value >= 0 && value <= 1;
}

export function isValidPlaybackRate(value: number): value is PlaybackRate {
    return value >= 0.25 && value <= 16;
}

export interface PluginSettings {
    lastVideoId: string;
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

export interface VideoJsEvents {
    play: () => void;
    pause: () => void;
    timeupdate: () => void;
    volumechange: () => void;
    ratechange: () => void;
    ended: () => void;
}

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

export interface Translations {
    [key: string]: {
        [key: string]: string;
    };
}

export interface PlayerControls {
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
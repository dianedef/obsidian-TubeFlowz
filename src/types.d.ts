import { Plugin } from 'obsidian';

declare module 'video.js';

interface Window {
   videojs: VideoJSStatic;
}

export interface PlayerSettings {
   lastVideoId: string | null;
   isVideoOpen: boolean | null;
   playlist: any[];
   currentMode: VideoMode;
   viewHeight: number;
   playbackMode: PlaybackMode;
   favoriteSpeed: number;
   isMuted: boolean;
   showYoutubeRecommendations: boolean;
   playbackRate: number;
   volume: number;
   isPlaying: boolean;
   activeLeafId: string | null;
   overlayHeight: number;
}

export interface PluginSettings {
   settings: PlayerSettings;
   save: () => Promise<void>;
}

export interface PluginWithSettings extends Plugin {
   settings: PlayerSettings;
}



export type VideoMode = 'sidebar' | 'tab' | 'overlay';
export type PlaybackMode = 'stream' | 'download' | 'default';

export interface DisplayVideoParams {
    videoId: string;
    mode: VideoMode;
    timestamp?: number;
    fromUserClick?: boolean;
} 
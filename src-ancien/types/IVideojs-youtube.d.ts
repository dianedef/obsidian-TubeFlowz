import videojs from 'video.js';

declare module 'videojs-youtube' {
    export interface IYouTubeOptions {
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
        customVars?: {
            playsinline: number;
        };
    }

    interface IYouTubePlayerOptions {
        youtube?: YouTubeOptions;
    }

    interface YouTubePlayer extends videojs.Player {
        youtube: {
            getVideoQuality(): string;
            setVideoQuality(quality: string): void;
        };
        src(options: { type: string; src: string; }): Promise<void>;
        videoHeight(): number;
        error(): { code: number; message?: string; } | null;
    }

    const Player: {
        prototype: YouTubePlayer;
        new (element: string | Element, options?: YouTubePlayerOptions): YouTubePlayer;
    };

    export default Player;
} 
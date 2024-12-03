import videojs from 'video.js';

declare module 'videojs-youtube' {
    interface YouTubePlayerOptions {
        youtube?: {
            iv_load_policy?: number;
            modestbranding?: number;
            rel?: number;
            customVars?: {
                playsinline?: number;
            };
        };
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
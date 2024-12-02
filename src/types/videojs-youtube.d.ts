import videojs from 'video.js';

declare module 'videojs-youtube' {
    interface YouTubePlayerOptions extends videojs.PlayerOptions {
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
        src(options: {
            type: string;
            src: string;
        }): Promise<void>;
        
        videoHeight(): number;
        
        error(): {
            code: number;
            message?: string;
            status?: number;
            type?: string;
        } | null;
    }

    const Player: YouTubePlayer;
    export default Player;
}

// Augmentation du module video.js pour inclure les options YouTube
declare module 'video.js' {
    interface PlayerOptions {
        youtube?: {
            iv_load_policy?: number;
            modestbranding?: number;
            rel?: number;
            customVars?: {
                playsinline?: number;
            };
        };
    }
} 
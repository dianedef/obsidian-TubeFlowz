declare module 'video.js' {
    export interface IControlBarComponent {
        el: () => HTMLElement;
        controlText: (text: string) => void;
        on: (event: string, handler: (e: Event) => void) => void;
    }

    export interface IControlBar {
        addChild: (name: string, options?: any) => IControlBarComponent;
    }

    export interface IVideoJsPlayer {
        controlBar: IControlBar;
        play(): Promise<void>;
        pause(): void;
        currentTime(seconds?: number): number;
        duration(): number;
        volume(level?: number): number;
        muted(muted?: boolean): boolean;
        playbackRate(rate?: number): number;
        src(source: { type: string; src: string }): void;
        dispose(): void;
        ready(callback: () => void): void;
        error(): { code: number } | null;
        videoHeight(): number;
        on(event: string, callback: (...args: any[]) => void): void;
        off(event: string, callback: (...args: any[]) => void): void;
    }

    export interface IVideoJsOptions {
        controls?: boolean;
        fluid?: boolean;
        techOrder: string[];
        sources?: {
            type: string;
            src: string;
        }[];
        youtube?: {
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
        };
        language?: string;
        languages?: {
            [key: string]: {
                [key: string]: string;
            };
        };
        controlBar?: {
            children: string[];
        };
        userActions?: {
            hotkeys: boolean;
        };
        fullscreen?: {
            options: {
                navigationUI: string;
            };
        };
    }

    export interface IVideoJsEventMap {
        'play': () => void;
        'pause': () => void;
        'timeupdate': () => void;
        'volumechange': () => void;
        'ratechange': () => void;
        'ended': () => void;
    }

    const videojs: (element: string | HTMLVideoElement, options?: IVideoJsOptions) => IVideoJsPlayer;
    export default videojs;
} 
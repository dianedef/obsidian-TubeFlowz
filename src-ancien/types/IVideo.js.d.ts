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
        currentSrc(): string;
        requestFullscreen(): Promise<void>;
        exitFullscreen(): Promise<void>;
        isFullscreen(): boolean;
        tech(tech?: boolean): any;
        addClass(className: string): void;
        removeClass(className: string): void;
        error(): { code: number } | null;
        paused(): boolean;
        videoHeight(): number;
        videoWidth(): number;
        el(): HTMLElement;
        language(language: string): string;
        dispose(): void;
        ready(callback: () => void): void;
        on(event: string, callback: Function): void;
        playbackRate(rate?: number): number;
        play(): Promise<void>;
        pause(): void;
        currentTime(): number;
        currentTime(seconds: number): void;
        duration(): number;
        volume(): number;
        volume(value: number): void;
        muted(): boolean;
        muted(value: boolean): void;
        src(source: string | { type: string; src: string } | Array<{ type: string; src: string }>): void;
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
        'ended': () => void;
        'timeupdate': (time: number) => void;
        'volumechange': () => void;
        'ratechange': () => void;
        'error': (error: Error) => void;
    }

    const videojs: (element: string | HTMLVideoElement, options?: IVideoJsOptions) => IVideoJsPlayer;
    export default videojs;
} 
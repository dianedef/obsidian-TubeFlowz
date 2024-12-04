import { Volume, PlaybackRate, VideoId, Timestamp } from './IBase';
import type { IVideoJsPlayer, IControlBar } from 'video.js';

export interface IExtendedVideoJsPlayer extends IVideoJsPlayer {
    controlBar: IControlBar & {
        playToggle: {
            handleClick: () => void;
        };
        volumePanel: {
            volumeControl: {
                handleMouseMove: (event: MouseEvent) => void;
            };
        };
        progressControl: {
            seekBar: {
                update: () => void;
            };
        };
    };
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
} 
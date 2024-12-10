/// <reference types="video.js" />

import { IPlayerOptions } from './IPlayer';

// Interface pour la barre de contrôle
export interface IControlBar {
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
    addChild(name: string, options?: any): IControlBarComponent;
}

// Interface pour les composants de la barre de contrôle
export interface IControlBarComponent {
    el(): HTMLElement;
    on(event: string, callback: Function): void;
    off(event: string, callback: Function): void;
}

// Interface pour les options de configuration VideoJS
export interface IVideoJsOptions extends IPlayerOptions {
    fluid?: boolean;
    sources?: {
        type: string;
        src: string;
    }[];
}

// Interface pour les événements VideoJS
export interface IVideoJsEvents {
    play: () => void;
    pause: () => void;
    ended: () => void;
    timeupdate: (time: number) => void;
    volumechange: () => void;
    ratechange: () => void;
    error: (error: Error) => void;
}

// Extension de l'interface VideoJS Player
export interface IExtendedVideoJsPlayer {
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
} 
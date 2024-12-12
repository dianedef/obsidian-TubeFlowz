import { ViewMode } from './ISettings';
import { IPlayerState } from './IPlayer';
import { IVideoJsPlayer } from 'video.js';
export interface IPlayerUI {
    initializePlayer(
        container: HTMLElement
    ): Promise<IVideoJsPlayer | HTMLElement>;
    update(state: IPlayerState): void;
    destroy(): void;
    /**
     * Nettoie les ressources de l'interface utilisateur
     */
    dispose(): void;
}

export interface IPlayerControls {
    createControlsContainer(): HTMLElement;
    updateControls(state: IPlayerState): void;
    setControlsVisibility(visible: boolean): void;
}

export interface IPlayerView {
    getViewType(): string;
    getDisplayText(): string;
    getMode(): ViewMode;
    setMode(mode: ViewMode): void;
    closePreviousVideos(): Promise<void>;
} 
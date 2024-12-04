import { ViewMode } from './ISettings';
import { IPlayerState, IPlayerOptions } from './IPlayer';

export interface IPlayerUI {
    render(container: HTMLElement): void;
    update(state: IPlayerState): void;
    show(): void;
    hide(): void;
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
    displayVideo(options: IPlayerOptions): Promise<void>;
    closePreviousVideos(): Promise<void>;
} 
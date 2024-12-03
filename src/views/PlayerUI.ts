import { IPlayerUI } from '../types/IPlayerUI';
import { IPlayerOptions } from '../types/IPlayer';
import { ViewMode, VIEW_MODES } from '../types/settings';
import { SettingsService } from '../services/settings/SettingsService';
import { IPlayerState } from '../types/IPlayer';

export class PlayerUI implements IPlayerUI {
    private container: HTMLElement;
    private controlsContainer: HTMLElement;
    private videoContainer: HTMLElement;
    private resizeHandle: HTMLElement;
    private settings: SettingsService;

    constructor(settings: SettingsService) {
        this.settings = settings;
        this.container = document.createElement('div');
        this.container.addClass('youtube-player-container');
        
        this.resizeHandle = document.createElement('div');
        this.resizeHandle.addClass('youtube-player-resize-handle');
        
        this.controlsContainer = this.createControls();
        this.videoContainer = this.createVideoContainer();
        
        this.container.appendChild(this.controlsContainer);
        this.container.appendChild(this.videoContainer);
    }

    private createControls(): HTMLElement {
        const controlsContainer = document.createElement('div');
        controlsContainer.addClass('youtube-view-controls');
        controlsContainer.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 101;
            display: flex;
            gap: 5px;
        `;

        // Ajouter le bouton de fermeture
        const closeButton = controlsContainer.createDiv('youtube-view-close');
        closeButton.setAttribute('aria-label', 'Close');
        closeButton.innerHTML = '✕';
        closeButton.style.cssText = `
            cursor: pointer;
            padding: 5px;
            background: var(--background-secondary);
            border-radius: 3px;
            opacity: 0.8;
        `;

        closeButton.addEventListener('click', () => this.hide());
        return controlsContainer;
    }

    private createVideoContainer(): HTMLElement {
        const mode = this.settings.currentMode;
        const defaultHeight = mode === VIEW_MODES.Overlay 
            ? this.settings.overlayHeight 
            : this.settings.viewHeight;

        const videoContainer = document.createElement('div');
        videoContainer.addClass('youtube-player-video-container');
        videoContainer.style.cssText = `
            width: 100%;
            height: ${defaultHeight || 60}%; 
            min-height: 100px;
            position: relative;
        `;
        
        videoContainer.appendChild(this.resizeHandle);
        return videoContainer;
    }

    render(parentElement: HTMLElement): void {
        parentElement.empty();
        parentElement.appendChild(this.container);
    }

    update(state: IPlayerState): void {
        // Mise à jour de l'interface selon l'état
        if (state.videoId) {
            this.container.setAttribute('data-video-id', state.videoId);
        }
        if (state.isPlaying) {
            this.container.addClass('is-playing');
        } else {
            this.container.removeClass('is-playing');
        }
    }

    show(): void {
        this.container.style.display = 'block';
    }

    hide(): void {
        this.container.style.display = 'none';
    }

    destroy(): void {
        this.container.empty();
        this.container.detach();
    }

    dispose(): void {
        this.destroy();
        this.container?.remove();
        this.controlsContainer?.remove();
        this.videoContainer?.remove();
    }
} 
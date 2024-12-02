import { ItemView, WorkspaceLeaf, Plugin } from 'obsidian';
import { YouTubeService } from '../services/youtube/YouTubeService';
import { PluginSettings, ViewMode } from '../types/settings';
import { getHeight, saveHeight } from '../utils';

interface IPlayerContainer {
   plugin: Plugin;
   Settings: PluginSettings;
   PlayerViewAndMode: PlayerViewAndMode;
   t: (key: string) => string;
   videoId: string | null;
   timestamp: number;
   activeLeafId: string | null;
   VideoPlayer: VideoPlayer | null;
}

export class PlayerContainer extends ItemView implements IPlayerContainer {
    plugin: Plugin;
    Settings: PluginSettings;
    private youtubeService: YouTubeService | null = null;
    private videoId: string | null = null;
    private timestamp: number = 0;
    private isInitialized: boolean = false;
    private resizeHandle: HTMLElement;

    constructor(
        leaf: WorkspaceLeaf,
        private plugin: Plugin,
        private mode: ViewMode = ViewMode.Sidebar
    ) {
        super(leaf);
        
        // Initialiser le service YouTube
        this.youtubeService = YouTubeService.getInstance(this.plugin.app);

        // Créer la poignée de redimensionnement
        this.resizeHandle = document.createElement('div');
        this.resizeHandle.className = 'youtube-resize-handle';
        this.resizeHandle.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 12px;
            cursor: ns-resize;
            z-index: 102;
        `;
    }

    getViewType(): string {
        return 'youtube-player';
    }

    getDisplayText(): string {
        return 'YouTube Player';
    }

    async setMode(mode: ViewMode): Promise<void> {
        this.mode = mode;
        if (this.isInitialized) {
            await this.onOpen(); // Recharger la vue avec le nouveau mode
        }
    }

    async onOpen(): Promise<void> {
        const container = this.containerEl;
        container.empty();
        container.addClass('youtube-flow-container');
        container.addClass(`youtube-player-${this.mode}`);

        const playerSection = this.createPlayerSection();
        container.appendChild(playerSection);

        try {
            if (this.youtubeService && this.videoId) {
                await this.youtubeService.initialize(playerSection);
                await this.youtubeService.loadVideo(this.videoId, this.timestamp);
                this.isInitialized = true;
            }

            this.setupResizeHandling(playerSection);
        } catch (error) {
            console.error("Erreur lors de l'initialisation du player:", error);
            this.showError(playerSection);
        }
    }

    private createPlayerSection(): HTMLElement {
        const section = document.createElement('div');
        section.className = 'player-wrapper youtube-player-section';
        section.style.cssText = `
            width: 100%;
            height: ${getHeight(this.mode)}%;
            min-height: 100px;
            position: relative;
            display: flex;
            flex-direction: column;
        `;
        return section;
    }

    private setupResizeHandling(playerSection: HTMLElement): void {
        this.resizeHandle.className = 'youtube-resize-handle';
        playerSection.appendChild(this.resizeHandle);
        
        let startY = 0;
        let startHeight = 0;
        
        const handleResize = (e: MouseEvent) => {
            const deltaY = e.clientY - startY;
            const containerHeight = this.containerEl.getBoundingClientRect().height;
            const newHeight = startHeight + (deltaY / containerHeight * 100);
            const clampedHeight = Math.min(Math.max(newHeight, 20), 90);
            
            playerSection.style.height = `${clampedHeight}%`;
            saveHeight(clampedHeight, this.mode);
        };

        this.resizeHandle.addEventListener('mousedown', (e) => {
            startY = e.clientY;
            startHeight = parseFloat(playerSection.style.height);
            
            document.addEventListener('mousemove', handleResize);
            document.addEventListener('mouseup', () => {
                document.removeEventListener('mousemove', handleResize);
            }, { once: true });
            
            e.preventDefault();
        });
    }

    private showError(container: HTMLElement): void {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            padding: 20px;
            color: var(--text-error);
            text-align: center;
        `;
        errorDiv.textContent = 'Error initializing YouTube player';
        container.appendChild(errorDiv);
    }

    async onClose(): Promise<void> {
        if (this.youtubeService) {
            this.youtubeService.destroy();
            this.youtubeService = null;
            this.isInitialized = false;
        }
    }

    async loadVideo(videoId: string, timestamp: number = 0): Promise<void> {
        this.videoId = videoId;
        this.timestamp = timestamp;
        if (this.isInitialized) {
            await this.onOpen(); // Recharger la vue avec la nouvelle vidéo
        }
    }
} 
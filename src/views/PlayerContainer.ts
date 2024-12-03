import { ItemView, Plugin, WorkspaceLeaf } from 'obsidian';
import { DEFAULT_SETTINGS, PluginSettings, ViewMode } from '../types/settings';
import { getHeight, saveHeight } from '../utils';
import { VideoPlayer } from '../types/video';
import { PlayerViewAndMode } from '../types/player';
import { YouTubeService } from '../services/youtube/YouTubeService';

interface IPlayerContainer {
    plugin: Plugin;
    Settings: PluginSettings;
    PlayerViewAndMode: PlayerViewAndMode;
    t: (key: string) => string;
    activeLeafId: string | null;
    VideoPlayer: VideoPlayer | null;
    videoId: string | null;
    timestamp: number;
}

export class PlayerContainer extends ItemView implements IPlayerContainer {
    Settings: PluginSettings;
    PlayerViewAndMode: PlayerViewAndMode;
    t: (key: string) => string;
    activeLeafId: string | null = null;
    VideoPlayer: VideoPlayer | null = null;
    private youtubeService: YouTubeService | null = null;
    videoId: string | null = null;
    timestamp: number = 0;
    private isInitialized: boolean = false;
    private resizeHandle: HTMLElement;
    private playerSection: HTMLElement | null = null;

    constructor(
        leaf: WorkspaceLeaf,
        public plugin: Plugin,
        private mode: ViewMode = ViewMode.Sidebar
    ) {
        super(leaf);
        
        // Initialiser les propriétés requises
        this.Settings = DEFAULT_SETTINGS;
        
        this.PlayerViewAndMode = {
            mode: this.mode,
            viewType: this.getViewType(),
            displayText: this.getDisplayText()
        };
        
        this.t = (key: string) => key;
        
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
            background: transparent;
        `;

        // Charger les settings
        this.loadSettings();
    }

    private async loadSettings() {
        try {
            const loadedSettings = await this.plugin.loadData();
            if (loadedSettings) {
                this.Settings = {
                    ...DEFAULT_SETTINGS,
                    ...loadedSettings
                };
            }
        } catch (error) {
            console.error("Erreur lors du chargement des settings:", error);
            this.Settings = { ...DEFAULT_SETTINGS };
        }
    }

    getViewType(): string {
        return this.mode === ViewMode.Tab ? 'youtube-tab' : 'youtube-sidebar';
    }

    getDisplayText(): string {
        return this.mode === ViewMode.Tab ? 'YouTube Player' : 'YouTube Sidebar';
    }

    async setMode(mode: ViewMode): Promise<void> {
        this.mode = mode;
        this.PlayerViewAndMode = {
            mode: this.mode,
            viewType: this.getViewType(),
            displayText: this.getDisplayText()
        };
        
        if (this.isInitialized) {
            // Supprimer toutes les classes de mode
            this.containerEl.classList.remove('youtube-player-sidebar', 'youtube-player-tab', 'youtube-player-overlay');
            // Ajouter la nouvelle classe
            this.containerEl.classList.add(`youtube-player-${this.mode}`);
            // Recharger la vue avec le nouveau mode
            await this.onOpen();
        }
    }

    async onOpen(): Promise<void> {
        try {
            // S'assurer que les settings sont chargés
            await this.loadSettings();

            const container = this.containerEl;
            container.empty();
            container.addClass('youtube-flow-container');
            container.addClass(`youtube-player-${this.mode}`);

            this.playerSection = this.createPlayerSection();
            container.appendChild(this.playerSection);

            // Initialiser le player si on a un ID vidéo
            await this.initializePlayer();

            this.setupResizeHandling(this.playerSection);
        } catch (error) {
            console.error("Erreur lors de l'ouverture:", error);
            if (this.playerSection) {
                this.showError(this.playerSection);
            }
        }
    }

    private async initializePlayer(): Promise<void> {
        if (!this.youtubeService || !this.videoId || !this.playerSection) {
            return;
        }

        try {
            await this.youtubeService.initialize(this.playerSection);
            await this.youtubeService.loadVideo(this.videoId, this.timestamp);
            this.isInitialized = true;

            // Restaurer les paramètres de lecture
            if (this.Settings.playbackRate) {
                await this.youtubeService.setPlaybackRate(this.Settings.playbackRate);
            }
            if (this.Settings.volume) {
                await this.youtubeService.setVolume(this.Settings.volume);
            }
            if (this.Settings.isMuted) {
                await this.youtubeService.setMuted(true);
            }
        } catch (error) {
            console.error("Erreur lors de l'initialisation du player:", error);
            this.showError(this.playerSection);
            throw error;
        }
    }

    private createPlayerSection(): HTMLElement {
        const playerSection = document.createElement('div');
        playerSection.className = 'youtube-player-section';
        
        // Utiliser getHeight avec les settings et le mode actuels
        const initialHeight = getHeight(this.mode, this.Settings);
        
        playerSection.style.cssText = `
            width: 100%;
            height: ${initialHeight}%;
            min-height: 100px;
            position: relative;
            display: flex;
            flex-direction: column;
            background-color: var(--background-primary);
        `;
        
        return playerSection;
    }

    private setupResizeHandling(playerSection: HTMLElement) {
        const container = this.containerEl;
        
        // Nettoyer l'ancienne poignée si elle existe
        this.resizeHandle.remove();
        
        // Ajouter la nouvelle poignée
        container.appendChild(this.resizeHandle);

        let startY = 0;
        let startHeight = 0;

        const onMouseMove = (e: MouseEvent) => {
            const deltaY = e.clientY - startY;
            const containerHeight = container.clientHeight;
            const newHeightPercent = (startHeight + deltaY) / containerHeight * 100;
            const clampedHeight = Math.max(10, Math.min(90, newHeightPercent));
            
            playerSection.style.height = `${clampedHeight}%`;
        };

        const onMouseUp = async (e: MouseEvent) => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            
            const height = parseFloat(playerSection.style.height);
            if (!isNaN(height)) {
                try {
                    await saveHeight(height, this.mode, this.plugin);
                    this.Settings = {
                        ...this.Settings,
                        ...(this.mode === ViewMode.Overlay 
                            ? { overlayHeight: height }
                            : { viewHeight: height })
                    };
                } catch (error) {
                    console.error("Erreur lors de la sauvegarde de la hauteur:", error);
                }
            }
        };

        this.resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startY = e.clientY;
            startHeight = playerSection.clientHeight;
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    private showError(container: HTMLElement, message?: string): void {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'youtube-error-message';
        errorDiv.style.cssText = `
            padding: 20px;
            color: var(--text-error);
            text-align: center;
            background-color: var(--background-modifier-error);
            border-radius: 4px;
            margin: 10px;
        `;
        errorDiv.textContent = message || this.t('PLAYER_INITIALIZATION_ERROR');
        container.appendChild(errorDiv);
    }

    async onClose(): Promise<void> {
        // Nettoyer les événements de redimensionnement
        if (this.resizeHandle) {
            this.resizeHandle.remove();
        }
        
        // Nettoyer le service YouTube
        if (this.youtubeService) {
            await this.youtubeService.destroy();
            this.youtubeService = null;
            this.isInitialized = false;
        }

        // Appeler la méthode parent
        await super.onClose();
    }

    close(): void {
        this.onClose().catch(error => {
            console.error("Erreur lors de la fermeture:", error);
        });
    }

    async loadVideo(videoId: string, timestamp: number = 0): Promise<void> {
        try {
            this.videoId = videoId;
            this.timestamp = timestamp;

            if (!this.isInitialized) {
                // Si le player n'est pas initialisé, on réouvre la vue
                await this.onOpen();
            } else if (this.youtubeService) {
                // Sinon on charge juste la nouvelle vidéo
                await this.youtubeService.loadVideo(videoId, timestamp);
            }
        } catch (error) {
            console.error("Erreur lors du chargement de la vidéo:", error);
            if (this.playerSection) {
                this.showError(this.playerSection);
            }
            throw error;
        }
    }
} 
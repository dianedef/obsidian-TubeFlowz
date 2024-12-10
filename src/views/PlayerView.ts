import { ItemView, WorkspaceLeaf } from 'obsidian';
import { IPlayerService } from '../types/IPlayerService';
import { IPlayerUI } from '../types/IPlayerUI';
import { saveHeight } from '../utils';
import { VIEW_MODES } from '../types/ISettings';
import { SettingsService } from '../services/settings/SettingsService';
import { ViewModeService } from '../services/viewMode/ViewModeService';
import { IResizerOptions } from '../types/ISettings';
import { PlayerAppError, YouTubeAppError, PlayerErrorCode, YouTubeErrorCode } from '../types/IErrors';
import { ViewMode } from '../types/ISettings';
import { IPlayerOptions } from '../types/IPlayerOptions';
import { TranslationsService } from '../services/translations/TranslationsService';

export class PlayerView extends ItemView {
    private playerService: IPlayerService;
    private playerUI: IPlayerUI;
    private settings: SettingsService;
    private viewModeService: ViewModeService;
    private translations: TranslationsService;
    private currentMode: ViewMode = VIEW_MODES.Tab;
    public viewId: string;

    constructor(
        leaf: WorkspaceLeaf,
        playerService: IPlayerService,
        playerUI: IPlayerUI,
        settings: SettingsService,
        viewModeService: ViewModeService
    ) {
        super(leaf);
        this.playerService = playerService;
        this.playerUI = playerUI;
        this.settings = settings;
        this.viewModeService = viewModeService;
        this.translations = new TranslationsService();
        this.viewId = `youtube-player-${Math.random().toString(36).substr(2, 9)}`;
    }

    getViewType(): string {
        return 'youtube-player';
    }

    getDisplayText(): string {
        return this.translations.t('player.title');
    }

    getMode(): ViewMode {
        return this.currentMode;
    }

    async setMode(mode: ViewMode): Promise<void> {
        this.currentMode = mode;
        await this.onOpen();
    }

    private clearError(): void {
        const errorMessages = this.containerEl.querySelectorAll('.error-message');
        errorMessages.forEach(message => message.remove());
    }

    private showError(error: PlayerAppError | YouTubeAppError): void {
        this.clearError();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            padding: 20px;
            color: var(--text-error);
            text-align: center;
            background-color: var(--background-modifier-error);
            border-radius: 4px;
            margin: 10px;
        `;
        errorDiv.textContent = error.message;
        this.containerEl.appendChild(errorDiv);
    }

    async onOpen(): Promise<void> {
        try {
            this.playerUI.render(this.containerEl);
            await this.playerService.initialize(this.containerEl);
            this.clearError();
        } catch (error) {
            console.error("Erreur lors de l'ouverture de la vue:", error);
            const playerError = new PlayerAppError(
                PlayerErrorCode.MEDIA_ERR_ABORTED,
                this.translations.t('messages.initializationError')
            );
            this.showError(playerError);
        }
    }

    async displayVideo(options: IPlayerOptions): Promise<void> {
        try {
            const { videoId, mode, timestamp = 0, fromUserClick = false } = options;
            if (!videoId) {
                throw new YouTubeAppError(
                    YouTubeErrorCode.INVALID_PARAMETER,
                    this.translations.t('messages.videoIdMissing')
                );
            }

            this.currentMode = mode;
            
            let leaf: WorkspaceLeaf;
            
            switch (mode) {
                case VIEW_MODES.Tab:
                    leaf = this.app.workspace.getLeaf('split');
                    break;
                case VIEW_MODES.Sidebar:
                    const sideLeaf = this.app.workspace.getRightLeaf(false);
                    if (!sideLeaf) {
                        throw new PlayerAppError(
                            PlayerErrorCode.MEDIA_ERR_ABORTED,
                            this.translations.t('messages.sidebarCreateError')
                        );
                    }
                    leaf = sideLeaf;
                    break;
                case VIEW_MODES.Overlay:
                default:
                    const activeLeaf = this.app.workspace.activeLeaf;
                    if (!activeLeaf) {
                        throw new PlayerAppError(
                            PlayerErrorCode.MEDIA_ERR_ABORTED,
                            this.translations.t('messages.sidebarCreateError')
                        );
                    }
                    leaf = activeLeaf;
                    break;
            }

            this.app.workspace.revealLeaf(leaf);

            await leaf.setViewState({
                type: 'youtube-player',
                state: {
                    videoId,
                    timestamp: timestamp || 0,
                    autoplay: fromUserClick
                }
            });

            await this.playerService.loadVideo(options);
            this.clearError();
        } catch (error) {
            console.error("Erreur lors du chargement de la vidéo:", error);
            if (error instanceof YouTubeAppError || error instanceof PlayerAppError) {
                this.showError(error);
            } else {
                const playerError = new PlayerAppError(
                    PlayerErrorCode.MEDIA_ERR_DECODE,
                    this.translations.t('messages.videoLoadError')
                );
                this.showError(playerError);
            }
        }
    }

    async onClose(): Promise<void> {
        if (this.playerService) {
            try {
                await this.playerService.dispose();
                
                // Vérifier s'il reste d'autres vues ouvertes
                const leaves = this.app?.workspace.getLeavesOfType('youtube-player') || [];
                if (leaves.length <= 1 && !this.settings.isChangingMode) {
                    this.settings.isVideoOpen = false;
                }
                
            } catch (error) {
                console.warn("Erreur lors de la fermeture du player:", error);
            }
        }
        
        // Nettoyage supplémentaire
        this.playerUI?.dispose();
        this.containerEl.empty();
    }

    async closePreviousVideos(): Promise<void> {
        try {
            if (this.playerService) {
                await this.playerService.dispose();
            }
            if (this.playerUI) {
                this.playerUI.dispose();
            }
            this.containerEl.empty();
        } catch (error) {
            console.error("Erreur lors de la fermeture des vidéos précédentes:", error);
            throw new PlayerAppError(
                PlayerErrorCode.MEDIA_ERR_ABORTED,
                this.translations.t('messages.initializationError')
            );
        }
    }

    private createResizer(options: ResizerOptions) {
        const {
            container,
            targetElement,
            handle,
            mode,
            onResize,
            minHeight = 20,
            maxHeight = 90
        } = options;

        let startY = 0;
        let startHeight = 0;
        let rafId: number | null = null;
        let lastSaveTime = Date.now();

        const updateSize = (newHeight: number) => {
            if (rafId) cancelAnimationFrame(rafId);
            
            rafId = requestAnimationFrame(async () => {
                const clampedHeight = Math.min(Math.max(newHeight, minHeight), maxHeight);
                
                try {
                    if (mode === VIEW_MODES.Overlay) {
                        targetElement.style.height = `${clampedHeight}%`;
                        const editorEl = targetElement.closest('.workspace-leaf')?.querySelector('.cm-editor') as HTMLElement;
                        if (editorEl) {
                            editorEl.style.height = `${100 - clampedHeight}%`;
                            editorEl.style.top = `${clampedHeight}%`;
                        }
                    } else {
                        targetElement.style.height = `${clampedHeight}%`;
                        const iframe = targetElement.querySelector('iframe');
                        if (iframe) {
                            iframe.style.height = '100%';
                        }
                    }
                
                    // Throttle la sauvegarde
                    const now = Date.now();
                    if (now - lastSaveTime >= 300) {
                        await saveHeight(clampedHeight, mode, this.settings.getPlugin());
                        onResize(clampedHeight);
                        lastSaveTime = now;
                    }
                } catch (error) {
                    console.error("Erreur lors du redimensionnement:", error);
                    const playerError = new PlayerAppError(
                        PlayerErrorCode.MEDIA_ERR_ABORTED,
                        this.translations.t('messages.resizeError')
                    );
                    this.showError(playerError);
                }
                
                rafId = null;
            });
        };

        handle.addEventListener('mousedown', (e) => {
            startY = e.clientY;
            startHeight = parseFloat(targetElement.style.height);
            document.body.style.cursor = 'ns-resize';
            
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 9999;
                cursor: ns-resize;
            `;
            document.body.appendChild(overlay);
            
            const handleMouseMove = (e: MouseEvent) => {
                const deltaY = e.clientY - startY;
                const containerHeight = container.getBoundingClientRect().height;
                const newHeight = startHeight + (deltaY / containerHeight * 100);
                updateSize(newHeight);
            };
            
            const handleMouseUp = () => {
                overlay.remove();
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.body.style.cursor = '';
                
                if (rafId) {
                    cancelAnimationFrame(rafId);
                }
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            
            e.preventDefault();
            e.stopPropagation();
        });

        return handle;
    }




} 
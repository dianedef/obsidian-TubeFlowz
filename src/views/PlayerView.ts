import { ItemView, WorkspaceLeaf } from 'obsidian';
import { eventBus } from '../services/EventBus';
import { TranslationsService } from '../services/TranslationsService';
import { PlayerAppError, PlayerErrorCode } from '../types/IErrors';
import type { YouTubeAppError } from '../types/IErrors';
import type { IPlayerService } from '../types/IPlayerService';
import type { IPlayerUI } from '../types/IPlayerUI';
import type { TranslationKey } from '../services/TranslationsService';

/**
 * Vue Obsidian pour le player YouTube
 * Gère l'intégration du player dans l'interface d'Obsidian
 * @extends {ItemView}
 */
export class PlayerView extends ItemView {
    private playerService: IPlayerService;
    private playerUI: IPlayerUI;
    private translations: TranslationsService;
    public readonly viewId: string;

    /**
     * Crée une instance de PlayerView
     * @param {WorkspaceLeaf} leaf - Feuille Obsidian où la vue sera rendue
     * @param {IPlayerService} playerService - Service gérant la logique du player
     * @param {IPlayerUI} playerUI - Service gérant l'interface du player
     * @param {SettingsService} settings - Service de configuration
     */
    constructor(
        leaf: WorkspaceLeaf,
        playerService: IPlayerService,
        playerUI: IPlayerUI,
    ) {
        super(leaf);
        this.playerService = playerService;
        this.playerUI = playerUI;
        this.translations = TranslationsService.getInstance();
        this.viewId = `youtube-player-${Math.random().toString(36).slice(2, 11)}`;
    }

    /**
     * Retourne l'identifiant du type de vue pour Obsidian
     * @returns {string} L'identifiant de la vue
     */
    public getViewType(): string {
        return 'youtube-player';
    }

    /**
     * Retourne le titre affiché dans l'interface d'Obsidian
     * @returns {string} Le titre de la vue
     */ 
    public getDisplayText(): string {
        return this.translations.t('player.title' as TranslationKey);
    }

    /**
     * Appelé lorsque la vue est ouverte
     * Initialise le player et son interface
     * @returns {Promise<void>}
     */
    public async onOpen(): Promise<void> {
        try {
            console.log('[PlayerView dans onOpen] Début onOpen');
            
            const cleanup = eventBus.on('view:ready', () => {
                this.playerUI.initializePlayer(this.containerEl);
                cleanup();
            });
            
            // Initialiser le player directement
            console.log('[PlayerView dans onOpen] Initialisation du player UI');
            await this.playerUI.initializePlayer(this.containerEl);
            
            console.log('[PlayerView dans onOpen] Fin onOpen avec succès');
        } catch (error) {
            console.error('[PlayerView dans onOpen] Erreur lors de l\'ouverture:', error);
            this.handleError(error as Error);
            throw error;
        }
    }

    /**
     * Appelé lorsque la vue est fermée
     * Nettoie les ressources du player
     * @returns {Promise<void>}
     */
    public async onClose(): Promise<void> {
        try {
            // Nettoyage des ressources
            if (this.playerService) {
                await this.playerService.dispose();
            }
            this.playerUI?.dispose();
            this.containerEl.empty();
        } catch (error) {
            console.error('[PlayerView dans onClose] Erreur lors de la fermeture de la vue:', error);
            throw error;
        }
    }

    private handleError(error: Error): void {
        console.error("[PlayerView dans handleError] Erreur:", error);
        const playerError = new PlayerAppError(
            PlayerErrorCode.MEDIA_ERR_ABORTED,
            'messages.initializationError' as TranslationKey,
            undefined, // mediaError optional
            undefined  // currentTime optional
        );
        this.showError(playerError);
    }

    private showError(error: PlayerAppError | YouTubeAppError): void {
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

    /**
     * Retourne l'état sauvegardé du player
     * @returns {Record<string, unknown>} L'état sauvegardé du player
     */
    public getState(): Record<string, unknown> {
        return {
            type: this.getViewType(),
            playerState: {
                videoId: this.playerService.getCurrentVideoId?.(),
                timestamp: this.playerService.getCurrentTime?.()
            }
        };
    }
} 
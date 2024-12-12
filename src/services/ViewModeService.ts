import { Plugin, WorkspaceLeaf } from 'obsidian';
import { ViewMode, VIEW_MODES } from '../types/ISettings';
import { PlayerView } from '../views/PlayerView';
import { IViewModeService } from '../types/IViewModeService';
import PlayerService from './PlayerService';
import { PlayerAppError } from '../utils/ErrorClasses';
import { PlayerErrorCode } from '../types/IErrors';
import { TranslationsService } from './TranslationsService';
import { eventBus } from './EventBus';
import { SettingsService } from './SettingsService';
/**
 * Service gérant les différents modes d'affichage du player YouTube dans Obsidian
 * @implements {IViewModeService}
 */
export class ViewModeService implements IViewModeService {
    private currentMode: ViewMode;
    private activeView: PlayerView | null = null;
    private plugin: Plugin;
    private playerService: PlayerService | null;
    private settings: SettingsService;
    private translations: TranslationsService;
    private cleanupFunctions: (() => void)[];
    private isCreatingView: boolean = false;

    /**
     * Crée une instance du service de gestion des modes de vue
     * @param {Plugin} plugin - Instance du plugin Obsidian
     * @param {PlayerService} playerService - Service gérant le player YouTube
     * @param {ViewMode} initialMode - Mode de vue initial (par défaut: Tab)
     */
    constructor(
        plugin: Plugin, 
        playerService: PlayerService | null,
        settings: SettingsService,
        initialMode: ViewMode = VIEW_MODES.Tab
    ) {
        this.plugin = plugin;
        this.playerService = playerService;
        this.settings = settings;
        this.currentMode = initialMode;
        this.translations = TranslationsService.getInstance();
        this.cleanupFunctions = [];

        // Écouter les événements
        this.cleanupFunctions = [
            eventBus.on('view:close', () => this.closeView()),
            // autres événements...
        ];

        // Surveiller les changements de layout
        this.plugin.app.workspace.onLayoutReady(() => {
            this.registerLayoutEvents();
        });
    }

    public dispose(): void {
        this.cleanupFunctions.forEach(fn => fn());
    }

    /**
     * Récupère le mode de vue actuel
     * @returns {ViewMode} Le mode de vue actuel
     */
    getCurrentMode(): ViewMode {
        return this.currentMode;
    }

    /**
     * Change le mode d'affichage du player
     * @param {ViewMode} mode - Nouveau mode d'affichage
     * @returns {Promise<void>}
     */
    async setMode(mode: ViewMode): Promise<void> {
        try {
            // Si le mode est le même et qu'une vue existe déjà
            if (mode === this.currentMode && this.activeView) {
                // Émettre view:ready car la vue existe déjà
                eventBus.emit('view:ready');
                return;
            }

            // Sinon, fermer la vue existante et en créer une nouvelle
            await this.closeView();
            await this.createView(mode);
            this.currentMode = mode;
        } catch (error) {
            console.error('[ViewModeService dans setMode] Erreur lors du changement de mode:', error);
            throw error;
        }
    }

    /**
     * Crée une nouvelle vue du player dans le mode spécifié
     * @param {ViewMode} mode - Mode d'affichage pour la nouvelle vue
     * @returns {Promise<PlayerView>} La vue créée
     */
    async createView(mode: ViewMode): Promise<PlayerView> {
        console.log('[ViewModeService dans createView] createView appelé avec mode:', mode);
        if (this.activeView) {
            console.log('[ViewModeService dans createView] activeView existe déjà, on envoie vers le playerService');
            eventBus.emit('video:load', '');
            return this.activeView;
        }
        if (this.isCreatingView) {
            console.log('[ViewModeService dans createView] Création de vue déjà en cours, on ignore');
            return this.activeView!;
        }

        try {
            this.isCreatingView = true;

            if (this.activeView) {
                console.log('[ViewModeService dans createView] Vue active existe déjà');
                return this.activeView;
            }

            const leaf = this.getLeafForMode(mode);
            
            await leaf.setViewState({
                type: 'youtube-player',
                active: true,
                state: {
                    mode: mode,
                    player: this.playerService
                }
            });

            this.plugin.app.workspace.revealLeaf(leaf);
            const view = leaf.view as PlayerView;
            this.activeView = view;

            // N'émettre view:ready qu'une seule fois
            if (view) {
                eventBus.emit('view:ready');
            }
            
            return view;
        } finally {
            this.isCreatingView = false;
        }
    }

    /**
     * Obtient la feuille (leaf) Obsidian appropriée pour le mode spécifié
     * @private
     * @param {ViewMode} mode - Mode d'affichage désiré
     * @returns {WorkspaceLeaf} La feuille Obsidian correspondante
     * @throws {PlayerAppError} Si la création de la feuille échoue
     */
    private getLeafForMode(mode: ViewMode): WorkspaceLeaf {
        console.log('[ViewModeService dans getLeafForMode] getLeafForMode appelé avec mode:', mode);
        console.log('[ViewModeService dans getLeafForMode] this.plugin:', this.plugin);
        console.log('[ViewModeService dans getLeafForMode] this:', this);

        switch (mode) {
            case VIEW_MODES.Sidebar:
                console.log('[ViewModeService dans getLeafForMode] Tentative création rightLeaf');
                const rightLeaf = this.plugin?.app?.workspace.getRightLeaf(true);
                console.log('[ViewModeService dans getLeafForMode] rightLeaf créé:', rightLeaf);
                
                if (!rightLeaf) throw new PlayerAppError(
                    PlayerErrorCode.MEDIA_ERR_ABORTED,
                    this.translations.t('messages.sidebarCreateError')
                );
                return rightLeaf;
            case VIEW_MODES.Overlay:
                return this.plugin.app.workspace.getMostRecentLeaf() ?? this.plugin.app.workspace.getLeaf();
            case VIEW_MODES.Tab:
            default:
                return this.plugin.app.workspace.getLeaf('split');
        }
    }

    /**
     * Ferme la vue active du player
     * @returns {Promise<void>}
     */
    async closeView(): Promise<void> {
        if (this.activeView) {
            // Sauvegarder l'état avant de fermer
            const currentState = this.playerService?.getState();
            if (currentState) {
                // Mettre à jour les settings avec l'état actuel
                this.settings.lastVideoId = currentState.videoId;
                this.settings.lastTimestamp = currentState.currentTime;
                this.settings.isVideoOpen = false;
                await this.settings.save();
            }
            console.log('[ViewModeService dans closeView] Sauvegarde de l\'état avant de fermer');

            // Fermer la vue
            const leaves = this.plugin.app.workspace.getLeavesOfType('youtube-player');
            leaves.forEach(leaf => leaf.detach());
            this.activeView = null;
        }
    }

    private registerLayoutEvents(): void {
        let layoutChangeTimeout: NodeJS.Timeout;
        
        this.plugin.registerEvent(
            this.plugin.app.workspace.on('layout-change', () => {
                // Debounce les événements de layout-change
                clearTimeout(layoutChangeTimeout);
                console.log('[ViewModeService dans registerLayoutEvents] Début du debounce');
                layoutChangeTimeout = setTimeout(() => {
                    const hasYouTubeView = this.plugin.app.workspace.getLeavesOfType('youtube-player').length > 0;
                    
                    if (!hasYouTubeView && this.activeView) {
                        this.activeView = null;
                        eventBus.emit('view:close');
                    }
                }, 100); // Attendre 100ms avant de traiter le changement
            })
        );
    }
} 
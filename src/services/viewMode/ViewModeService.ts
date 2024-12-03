import { Plugin, WorkspaceLeaf } from 'obsidian';
import { ViewMode, VIEW_MODES } from '../../types/settings';
import { PlayerView } from '../../views/PlayerView';
import { IViewModeService } from '../../types/IViewModeService';

export class ViewModeService implements IViewModeService {
    private currentMode: ViewMode;
    private activeView: PlayerView | null = null;
    private plugin: Plugin;

    constructor(plugin: Plugin, initialMode: ViewMode = VIEW_MODES.Tab) {
        this.plugin = plugin;
        this.currentMode = initialMode;
    }

    getCurrentMode(): ViewMode {
        return this.currentMode;
    }

    async setMode(mode: ViewMode): Promise<void> {
        if (mode === this.currentMode && this.activeView) {
            return;
        }

        // Fermer la vue existante si nécessaire
        await this.closeView();

        // Créer la nouvelle vue dans le bon mode
        await this.createView(mode);
        
        this.currentMode = mode;
    }

    async createView(mode: ViewMode): Promise<PlayerView> {
        let leaf: WorkspaceLeaf;

        // Vérifier si une vue existe déjà
        const existingView = this.plugin.app.workspace.getActiveViewOfType(PlayerView);
        if (existingView) {
            await this.closeView(); // Fermer la vue existante
        }

        switch (mode) {
            case VIEW_MODES.Sidebar:
                const rightLeaf = this.plugin.app.workspace.getRightLeaf(true);
                if (!rightLeaf) throw new Error("Failed to create sidebar leaf");
                leaf = rightLeaf;
                break;
            case VIEW_MODES.Overlay:
                leaf = this.plugin.app.workspace.getMostRecentLeaf() ?? this.plugin.app.workspace.getLeaf();
                break;
            case VIEW_MODES.Tab:
            default:
                leaf = this.plugin.app.workspace.getLeaf(true);
                  /*leaf = this.plugin.app.workspace.getLeaf('split', 'vertical'); */
                break;
        }

        await leaf.setViewState({
            type: 'youtube-player',
            active: true
        });

        // Mettre la vue en focus et la révéler
        this.plugin.app.workspace.revealLeaf(leaf);

        const view = leaf.view as PlayerView;
        this.activeView = view;
        
        return view;
    }

    async closeView(): Promise<void> {
        if (this.activeView) {
            await this.activeView.closePreviousVideos();
            const leaves = this.plugin.app.workspace.getLeavesOfType('youtube-player');
            leaves.forEach(leaf => leaf.detach());
            this.activeView = null;
        }
    }
} 
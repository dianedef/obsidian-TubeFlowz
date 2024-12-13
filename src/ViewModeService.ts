import { Plugin, WorkspaceLeaf } from 'obsidian';
import { ViewMode } from './types';
import { YouTubeView } from './YouTubeView';
import { Settings } from './Settings';

export class ViewModeService {
   private currentView: YouTubeView | null = null;
   private currentMode: ViewMode | null = null;
   private activeLeaf: WorkspaceLeaf | null = null;
   private leafId: string | null = null;

   constructor(private plugin: Plugin) {
      // Initialiser le mode depuis les settings
      Settings.loadSettings().then(settings => {
         this.currentMode = settings.currentMode;
      });
      // Nettoyer les anciennes leafs au démarrage
      this.closeCurrentView();
   }

   private async closeCurrentView() {
      if (this.currentView) {
         const leaves = this.plugin.app.workspace.getLeavesOfType("youtube-player");
         leaves.forEach(leaf => {
            if (leaf.view instanceof YouTubeView) {
               leaf.detach();
            }
         });
         this.currentView = null;
         this.activeLeaf = null;
         this.leafId = null;
      }
   }

   private getLeafForMode(mode: ViewMode): WorkspaceLeaf {
      const workspace = this.plugin.app.workspace;
      
      // Fermer toutes les vues YouTube existantes
      const existingLeaves = workspace.getLeavesOfType("youtube-player");
      existingLeaves.forEach(leaf => {
         if (leaf.view instanceof YouTubeView) {
            leaf.detach();
         }
      });
      
      let leaf: WorkspaceLeaf;
      switch (mode) {
         case 'sidebar':
            leaf = workspace.getRightLeaf(false) ?? workspace.getLeaf('split');
            break;
         case 'overlay':
            const activeLeaf = workspace.getMostRecentLeaf() ?? workspace.getLeaf('split');
            leaf = workspace.createLeafBySplit(activeLeaf, 'horizontal', true);
            break;
         case 'tab':
         default:
            leaf = workspace.getLeaf('split');
            break;
      }

      // Générer et sauvegarder un nouvel ID pour la leaf
      this.leafId = leaf.id;
      return leaf;
   }

   async setView(mode: ViewMode) {
      if (mode === this.currentMode && this.currentView && this.activeLeaf) {
         return;
      }

      await this.closeCurrentView();

      const leaf = this.getLeafForMode(mode);
      await leaf.setViewState({
         type: 'youtube-player',
         active: true,
         state: { 
            mode: mode,
            leafId: this.leafId
         }
      });

      this.currentMode = mode;
      // Sauvegarder le nouveau mode dans les settings
      await Settings.saveSettings({ currentMode: mode });
      
      this.currentView = leaf.view as YouTubeView;
      this.activeLeaf = leaf;
      this.plugin.app.workspace.revealLeaf(leaf);
   }

   getActiveLeaf(): WorkspaceLeaf | null {
      return this.activeLeaf;
   }

   getCurrentLeafId(): string | null {
      return this.leafId;
   }
} 
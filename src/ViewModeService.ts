import { Plugin, WorkspaceLeaf } from 'obsidian';
import { ViewMode } from './types';
import { YouTubeView } from './YouTubeView';

export class ViewModeService {
   private currentView: YouTubeView | null = null;
   private currentMode: ViewMode | null = null;
   private activeLeaf: WorkspaceLeaf | null = null;

   constructor(private plugin: Plugin) {}

   private async closeCurrentView() {
      if (this.currentView) {
         this.currentView.leaf.detach();
         this.currentView = null;
         this.activeLeaf = null;
      }
   }

   private getLeafForMode(mode: ViewMode): WorkspaceLeaf {
      const workspace = this.plugin.app.workspace;
      
      // Vérifier si une vue YouTube existe déjà
      const activeView = workspace.getActiveViewOfType(YouTubeView);
      if (activeView) {
         activeView.leaf.detach();
      }
      
      switch (mode) {
         case 'sidebar':
               return workspace.getRightLeaf(false) ?? workspace.getLeaf('split');
         case 'overlay':
               const activeLeaf = workspace.getMostRecentLeaf() ?? workspace.getLeaf('split');
               return workspace.createLeafBySplit(activeLeaf, 'horizontal', true);
               
         case 'tab':
         default:
               return workspace.getLeaf('split');
      }
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
         state: { mode: mode }
      });

      this.currentView = leaf.view as YouTubeView;
      this.currentMode = mode;
      this.activeLeaf = leaf;
      this.plugin.app.workspace.revealLeaf(leaf);
   }

   getActiveLeaf(): WorkspaceLeaf | null {
      return this.activeLeaf;
   }
} 
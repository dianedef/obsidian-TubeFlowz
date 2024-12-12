import { Plugin, addIcon, Menu, WorkspaceLeaf, ItemView } from 'obsidian';

// Type pour les modes d'affichage
export type ViewMode = 'tab' | 'sidebar' | 'overlay';

// Définition de l'icône YouTube (en SVG)
const YOUTUBE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
   <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
</svg>`;

export class YouTubeView extends ItemView {
   constructor(leaf: WorkspaceLeaf) {
      super(leaf);
   }

   getViewType(): string {
      return "youtube-player";
   }

   getDisplayText(): string {
      return "YouTube Player";
   }

   async onOpen() {
      const container = this.containerEl;
      container.empty();
      
      const contentEl = container.createDiv({ cls: 'youtube-player-container' });
      contentEl.createEl('h4', { text: 'YouTube Player' });
      
      // Créer le conteneur pour le player
      const playerEl = contentEl.createDiv({ cls: 'youtube-player-embed' });
      playerEl.style.cssText = `
         width: 100%;
         height: 60vh;
         background: var(--background-secondary);
         display: flex;
         align-items: center;
         justify-content: center;
      `;
      
      playerEl.createSpan({ text: 'Prêt à lire une vidéo YouTube' });
   }
}

export class ViewModeService {
   private currentView: YouTubeView | null = null;
   private currentMode: ViewMode | null = null;
   private activeLeaf: WorkspaceLeaf | null = null;

   constructor(private plugin: Plugin) {}

   private async closeCurrentView() {
      if (this.currentView) {
         await this.currentView.leaf.detach();
         this.currentView = null;
         this.activeLeaf = null;
      }
   }

   private getLeafForMode(mode: ViewMode): WorkspaceLeaf {
      const workspace = this.plugin.app.workspace;
      
      switch (mode) {
         case 'sidebar':
            return workspace.getRightLeaf(true);
         case 'overlay':
            const activeLeaf = workspace.activeLeaf;
            if (activeLeaf) {
               // Créer un split horizontal au-dessus de la feuille active
               return workspace.createLeafBySplit(activeLeaf, 'horizontal', true);
            }
            return workspace.getLeaf('split');
         case 'tab':
         default:
            return workspace.getLeaf('split');
      }
   }

   async setView(mode: ViewMode) {
      // Si le même mode est sélectionné et qu'une vue existe déjà, ne rien faire
      if (mode === this.currentMode && this.currentView && this.activeLeaf) {
         return;
      }

      // Fermer la vue existante
      await this.closeCurrentView();

      // Créer la nouvelle vue
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

export default class YoutubeReaderPlugin extends Plugin {
   private viewModeService: ViewModeService;

   async onload() {
      // Enregistrer la vue YouTube
      this.registerView(
         "youtube-player",
         (leaf) => new YouTubeView(leaf)
      );

      this.viewModeService = new ViewModeService(this);
      
      // Ajouter le bouton dans la barre latérale
      addIcon('youtube', YOUTUBE_ICON);
      const ribbonIcon = this.addRibbonIcon('youtube', 'YouTube Reader', () => {});

      // Gestion du menu au survol
      ribbonIcon.addEventListener('mouseenter', () => {
         const menu = new Menu();
         
         const createMenuItem = (title: string, icon: string, mode: ViewMode) => {
            menu.addItem((item) => {
               item.setTitle(title)
                  .setIcon(icon)
                  .onClick(async () => {
                     await this.viewModeService.setView(mode);
                  });
            });
         };

         createMenuItem("YouTube Tab", "tab", "tab");
         createMenuItem("YouTube Sidebar", "layout-sidebar-right", "sidebar");
         createMenuItem("YouTube Overlay", "layout-top", "overlay");

         const iconRect = ribbonIcon.getBoundingClientRect();
         menu.showAtPosition({ 
            x: iconRect.left, 
            y: iconRect.top - 10
         });

         // Gérer la fermeture du menu
         const handleMouseLeave = (e: MouseEvent) => {
            const target = e.relatedTarget as Node;
            const menuDom = (menu as any).dom;
            const isOverIcon = ribbonIcon.contains(target);
            const isOverMenu = menuDom && menuDom.contains(target);
            
            if (!isOverIcon && !isOverMenu) {
               menu.hide();
               ribbonIcon.removeEventListener('mouseleave', handleMouseLeave);
               if (menuDom) {
                  menuDom.removeEventListener('mouseleave', handleMouseLeave);
               }
            }
         };

         ribbonIcon.addEventListener('mouseleave', handleMouseLeave);
         const menuDom = (menu as any).dom;
         if (menuDom) {
            menuDom.addEventListener('mouseleave', handleMouseLeave);
         }
      });
   }

   onunload() {
      // Nettoyage lors de la désactivation du plugin
      this.app.workspace.detachLeavesOfType("youtube-player");
   }
}

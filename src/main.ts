import { Plugin, addIcon, Menu, App } from 'obsidian';
import { ViewPlugin, ViewUpdate, DecorationSet } from '@codemirror/view';
import { YOUTUBE_ICON } from './constants';
import { ViewModeService } from './ViewModeService';
import { YouTubeView } from './YouTubeView';
import { ViewMode } from './types';
import { registerStyles } from './RegisterStyles';
import { createDecorations } from './Decorations';
import { Settings, SettingsTab } from './Settings'

interface DecorationState {
   decorations: DecorationSet;
   app: App;
   settings: any;
   viewModeService: ViewModeService;
   update(update: ViewUpdate): void;
}

export default class TubeFlowz extends Plugin {
   private viewModeService!: ViewModeService;
   settings!: Settings;

   async refresh() {
      // Détacher les vues existantes
      this.app.workspace.detachLeavesOfType("youtube-player");
      
      // Recharger les paramètres
      this.settings = await Settings.loadSettings();
      
      // Réinitialiser le service de mode de vue
      this.viewModeService = new ViewModeService(this);
      
      // Réenregistrer la vue
      this.registerView(
         "youtube-player",
         (leaf) => {
            const view = new YouTubeView(leaf);
            return view;
         }
      );
   }

   async onload() {
// Initialisation
      Settings.initialize(this);
      this.settings = await Settings.loadSettings();
      this.viewModeService = new ViewModeService(this);
      
      this.addSettingTab(new SettingsTab(this.app, this, this.settings, this.viewModeService));

      this.registerView(
         "youtube-player",
         (leaf) => {
            const view = new YouTubeView(leaf);
            return view;
         }
      );

      
// Ajout des décorations
      this.registerEditorExtension([
         ViewPlugin.define<DecorationState>(view => ({
            decorations: createDecorations(view, this.app),
            app: this.app,
            settings: this.settings,
            viewModeService: this.viewModeService,
            update(update: ViewUpdate) {
               if (update.docChanged || update.viewportChanged) {
                  this.decorations = createDecorations(update.view, this.app);
               }
            }
         }), {
            decorations: v => v.decorations
         })
      ]);

// Création du menu
      addIcon('youtube', YOUTUBE_ICON);
      const ribbonIcon = this.addRibbonIcon('youtube', 'TubeFlowz', () => {});

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

      registerStyles();
   }

   onunload() {
      this.app.workspace.detachLeavesOfType("youtube-player");
   }
}

import { Plugin, addIcon, Menu, App } from 'obsidian';
import { ViewPlugin, ViewUpdate, DecorationSet } from '@codemirror/view';
import { YOUTUBE_ICON } from './constants';
import { ViewMode } from './ViewMode';
import { YouTube } from './YouTube';
import { TViewMode } from './types';
import { registerStyles } from './RegisterStyles';
import { createDecorations } from './Decorations';
import { Settings, SettingsTab, DEFAULT_SETTINGS } from './Settings'
import { Translations } from './Translations';

interface DecorationState {
   decorations: DecorationSet;
   app: App;
   settings: any;
   viewMode: ViewMode;
   update(update: ViewUpdate): void;
}

export default class TubeFlowz extends Plugin {
   private viewMode!: ViewMode;
   settings!: Settings;
   private translations: Translations = new Translations();

   async refresh() {
      // Détacher les vues existantes
      this.app.workspace.detachLeavesOfType("youtube-player");
      
      // Recharger les paramètres
      this.settings = await Settings.loadSettings();
      
      // Réinitialiser le service de mode de vue
      this.viewMode = new ViewMode(this);
      
      // Réenregistrer la vue
      this.registerView(
         "youtube-player",
         (leaf) => {
            const view = new YouTube(leaf);
            return view;
         }
      );
   }

   async onload() {
      // Attendre que l'app soit chargée
      await this.loadApp();

      // Initialisation
      Settings.initialize(this);
      const settings = await Settings.loadSettings();
      this.settings = settings;
      this.viewMode = new ViewMode(this);
      
      // Initialiser les traductions maintenant que l'app est chargée
      this.loadLanguage();
      
      this.addSettingTab(new SettingsTab(
         this.app,
         this,
         settings,
         this.viewMode,
         this.translations
      ));

      this.registerView(
         "youtube-player",
         (leaf) => {
            const view = new YouTube(leaf);
            return view;
         }
      );

      // Ajout des décorations
      this.registerEditorExtension([
         ViewPlugin.define<DecorationState>(view => ({
            decorations: createDecorations(view, this.app),
            app: this.app,
            settings: this.settings,
            viewMode: this.viewMode,
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

            const createMenuItem = (title: string, icon: string, mode: TViewMode) => {
               menu.addItem((item) => {
                  item.setTitle(title)
                        .setIcon(icon)
                        .onClick(async () => {
                           await this.viewMode.setView(mode);
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

   private async loadApp(): Promise<void> {
      return new Promise((resolve) => {
         // Attendre que l'app soit prête
         if (this.app.workspace) {
            resolve();
         } else {
            this.app.workspace.onLayoutReady(() => resolve());
         }
      });
   }

   private loadLanguage(): void {
      try {
         const locale = document.documentElement.lang?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
         console.log('Langue détectée:', locale);
         this.translations.setLanguage(locale);
      } catch (error) {
         console.warn('Erreur lors de la détection de la langue, utilisation du français par défaut');
         this.translations.setLanguage('fr');
      }
   }

   onunload() {
      this.app.workspace.detachLeavesOfType("youtube-player");
   }
}

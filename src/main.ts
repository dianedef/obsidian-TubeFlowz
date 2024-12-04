import { App, Plugin, Notice, Menu, WorkspaceLeaf } from 'obsidian';
import { SettingsService } from './services/settings/SettingsService';
import { SettingsTab } from './services/settings/SettingsTab';
import { PlayerView } from './views/PlayerView';
import PlayerService from './services/player/PlayerService';
import { PlayerUI } from './views/PlayerUI';
import { ViewModeService } from './services/viewMode/ViewModeService';
import { VIEW_MODES, DEFAULT_SETTINGS } from './types/ISettings';
import { Hotkeys } from './services/hotkeys/HotkeysService';
import { TranslationsService } from './services/translations/TranslationsService';
import { ViewPlugin, DecorationSet, ViewUpdate } from '@codemirror/view';
import { registerStyles, unregisterStyles } from './services/styles/StylesService';
import createDecorations from './services/decorations/DecorationService';
import { IPlayerUI } from './types/IPlayerUI';
import { extractVideoId, cleanVideoId } from './utils';
import { ViewMode } from './types/ISettings';

interface ObsidianMenu extends Menu {
   dom: HTMLElement;
}

interface DecorationState {
   decorations: DecorationSet;
   settings: SettingsService;
}

export default class TubeFlows extends Plugin {
   private settings!: SettingsService;
   private viewModeService!: ViewModeService;
   private playerUI!: PlayerUI;
   private translationService!: TranslationsService;
   private hotkeys!: Hotkeys;

   constructor(app: App, manifest: any) {
      super(app, manifest);
   }

   async onload() {
      console.log("Chargement du plugin YouTubeFlow");

      // Initialisation des services dans le bon ordre
      this.settings = new SettingsService(this);
      await this.settings.initialize();

      // Initialiser les services
      const playerService = PlayerService.getInstance(this.app, this.settings.getSettings());
      const videoPlayer = PlayerUI.getInstance(this.settings, playerService);
      this.viewModeService = new ViewModeService(this, VIEW_MODES.Tab);

      // Les services sont initialisés, maintenant on peut configurer les commandes
      this.addCommand({
         id: 'open-youtube-video',
         name: 'Ouvrir une vidéo YouTube',
         callback: () => {
            // La création de la vue se fera ici quand l'utilisateur le demande
            this.viewModeService.createView(VIEW_MODES.Tab);
         }
      });

      // Initialiser le service de traduction
      const translationsService = new TranslationsService();
      
      // Initialiser les raccourcis avec le service approprié
      this.hotkeys = new Hotkeys(
         this,
         this.settings,
         videoPlayer,
         translationsService
      );
      
      // registerHotkeys
      this.hotkeys.registerHotkeys();
      // registerView
      this.registerView(
         'youtube-player',
         (leaf: WorkspaceLeaf) => new PlayerView(
            leaf,
            playerService,
            videoPlayer,
            this.settings,
            this.viewModeService
         )
      );

      this.app.workspace.onLayoutReady(() => {
         this.registerEvent(
            this.app.workspace.on('layout-change', () => {
               const hasYouTubeView = this.app.workspace.getLeavesOfType('youtube-player').length > 0;
               if (!hasYouTubeView && this.settings.isVideoOpen) {
                  this.settings.isVideoOpen = false;
                  this.settings.save();
               }
            })
         );
      });

      // Ajouter un seul bouton dans la sidebar qui ouvre un menu au survol
      const ribbonIcon = this.addRibbonIcon('video', 'YouTube Flow', (evt) => {
         // Le click ne fait rien, tout est géré au survol
      });

      // Gestion du menu au survol
      ribbonIcon.addEventListener('mouseenter', (evt) => {
         const menu = new Menu();
         
         const createMenuItem = (title: string, icon: string, mode: ViewMode) => {
            menu.addItem((item) => {
               item.setTitle(title)
                  .setIcon(icon)
                  .onClick(async () => {
                     await this.viewModeService.closeView();
                     await this.viewModeService.createView(mode);
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
            const isOverIcon = ribbonIcon.contains(target);
            const menuDom = (menu as ObsidianMenu).dom;
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
         const menuDom = (menu as ObsidianMenu).dom;
         if (menuDom) {
            menuDom.addEventListener('mouseleave', handleMouseLeave);
         }
      });

      // SettingsTab
      this.addSettingTab(new SettingsTab(this.app, this, this.settings));

      // Créer la "décoration" des liens YouTube dans les fichiers Markdown
      this.registerEditorExtension([
         ViewPlugin.define<DecorationState>(view => ({
            decorations: createDecorations(view, this.settings),
            settings: this.settings,
            update(update: ViewUpdate) {
               if (update.docChanged || update.viewportChanged) {
                  this.decorations = createDecorations(update.view, this.settings);
               }
            }
         }), {
            decorations: v => v.decorations
         })
      ]);
      
      // registerStyles
      registerStyles();

      // addCommands
      this.addCommand({
         id: 'open-youtube-sidebar',
         name: 'Ouvrir le lien YouTube en barre latérale',
         callback: async () => {
            const clipText = await navigator.clipboard.readText();
            await this.handleYouTubeLink(clipText, VIEW_MODES.Sidebar);
         }
      });

      this.addCommand({
         id: 'open-youtube-tab',
         name: 'Ouvrir le lien YouTube en onglet',
         callback: async () => {
            const clipText = await navigator.clipboard.readText();
            await this.handleYouTubeLink(clipText, VIEW_MODES.Tab);
         }
      });

      this.addCommand({
         id: 'open-youtube-overlay',
         name: 'Ouvrir le lien YouTube en superposition',
         callback: async () => {
            const clipText = await navigator.clipboard.readText();
            await this.handleYouTubeLink(clipText, VIEW_MODES.Overlay);
         }
      });

      // Ajouter les boutons de mode dans le ribbon
      this.addRibbonIcon('layout-sidebar', 'Mode Sidebar', () => {
         this.handleYouTubeLink('', VIEW_MODES.Sidebar);
      });

      this.addRibbonIcon('layout-template', 'Mode Tab', () => {
         this.handleYouTubeLink('', VIEW_MODES.Tab);
      });

      this.addRibbonIcon('layout-cards', 'Mode Overlay', () => {
         this.handleYouTubeLink('', VIEW_MODES.Overlay);
      });
   }

   // handleYouTubeLink
   async handleYouTubeLink(url: string, mode: ViewMode = VIEW_MODES.Sidebar) {
      const videoId = extractVideoId(url);
      if (!videoId) {
         new Notice("URL YouTube invalide");
         return;
      }
      const cleanedId = cleanVideoId(videoId);
      
      try {
         const view = await this.viewModeService.createView(mode);
         if (view) {
            await view.displayVideo({
               videoId: cleanedId,
               mode: mode,
               timestamp: 0,
            });
         }
      } catch (error) {
         console.error("Erreur lors de la création de la vue:", error);
         new Notice("Erreur lors de l'ouverture de la vidéo");
      }
   }

   async onunload() {
      try {
         await this.viewModeService.closeView();
         unregisterStyles();
      } catch (error) {
         console.warn("Erreur lors du déchargement:", error);
      }
   }
}

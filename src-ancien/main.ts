import { App, Plugin, Menu, WorkspaceLeaf } from 'obsidian';
import { SettingsService } from './services/SettingsService';
import { SettingsTab } from './services/SettingsTab';
import { PlayerView } from './views/PlayerView';
import PlayerService from './services/PlayerService';
import { PlayerUI } from './views/PlayerUI';
import { ViewModeService } from './services/ViewModeService';
import { VIEW_MODES } from './types/ISettings';
import { ViewMode } from './types/ISettings';
import { Hotkeys } from './services/HotkeysService';
import { TranslationsService } from './services/TranslationsService';
import { ViewPlugin, DecorationSet, ViewUpdate } from '@codemirror/view';
import { registerStyles, unregisterStyles } from './services/StylesService';
import createDecorations from './services/DecorationService';
import { EventBus } from './services/EventBus';

interface ObsidianMenu extends Menu {
   dom: HTMLElement;
}

interface DecorationState {
   decorations: DecorationSet;
   settings: SettingsService;
   viewModeService: ViewModeService;
}

export default class TubeFlows extends Plugin {
   private settings!: SettingsService;
   private viewModeService!: ViewModeService;
   private hotkeys!: Hotkeys;
   private playerService!: PlayerService;
   private playerUI!: PlayerUI;
   private eventBus: EventBus = EventBus.getInstance();
   private translationsService!: TranslationsService;

   constructor(app: App, manifest: any) {
      super(app, manifest);
   }

   async onload() {
      try {
         console.log("[main dans onload] Chargement du plugin YouTubeFlow");

// Initialisation des services de base
         this.settings = new SettingsService(this);
// Attendre que les settings soient chargés
         await this.settings.initialize();
         console.log("[main dans onload] Settings initialisés:", this.settings.getSettings());

// Initialiser le service de traduction
         const locale = document.documentElement.lang?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
         TranslationsService.initialize(locale);
         this.translationsService = TranslationsService.getInstance();

// Initialiser PlayerService
         this.playerService = PlayerService.getInstance(this.settings.getSettings());
         
// Créer l'instance de PlayerUI
         this.playerUI = PlayerUI.getInstance(this.settings);

// Initialiser ViewModeService
         this.viewModeService = new ViewModeService(
            this,
            this.playerService,
            this.settings,
            VIEW_MODES.Tab
         );

// Gérer les erreurs de chargement de vidéo
         this.eventBus.on('video:error', (error) => {
            console.error("[main dans onload] Erreur lors du chargement de la vidéo:", error);
         });

// Initialiser les raccourcis
         this.hotkeys = new Hotkeys(
            this,
            this.settings,
            this.playerService,
            this.translationsService
         );

// registerHotkeys
         this.hotkeys.registerHotkeys();

// registerView
         this.registerView(
            'youtube-player',
            (leaf: WorkspaceLeaf) => new PlayerView(
               leaf,
               this.playerService,
               this.playerUI,
            )
         );

         this.app.workspace.onLayoutReady(() => {
            this.eventBus.emit('plugin:layout-ready');
            this.registerEvent(
               this.app.workspace.on('layout-change', () => {
                  const hasYouTube = this.app.workspace.getLeavesOfType('youtube-player').length > 0;
                  if (!hasYouTube && this.settings.isVideoOpen) {
                     this.settings.isVideoOpen = false;
                     this.settings.save();
                  }
               })
            );
         });

// Ajouter un seul bouton dans la sidebar qui ouvre un menu au survol
         const ribbonIcon = this.addRibbonIcon('video', 'YouTube Flow', () => {
            // Le click ne fait rien, tout est géré au survol
         });

// Gestion du menu au survol
         ribbonIcon.addEventListener('mouseenter', () => {
            const menu = new Menu();
            
            const createMenuItem = (title: string, icon: string, mode: ViewMode) => {
               menu.addItem((item) => {
                  item.setTitle(title)
                     .setIcon(icon)
                     .onClick(async () => {
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
         this.addSettingTab(new SettingsTab(this.app, this, this.settings, this.playerService));

// Créer la "décoration" des liens YouTube dans les fichiers Markdown
         this.registerEditorExtension([
            ViewPlugin.define<DecorationState>(view => ({
               decorations: createDecorations(view),
               settings: this.settings,
               viewModeService: this.viewModeService,
               update(update: ViewUpdate) {
                  if (update.docChanged || update.viewportChanged) {
                     this.decorations = createDecorations(update.view);
                  }
               }
            }), {
               decorations: v => v.decorations
            })
         ]);
         
// registerStyles
         registerStyles();

         this.eventBus.emit('plugin:loaded');
      } catch (error) {
         console.error("[main dans onload] Erreur lors du chargement du plugin:", error);
      }
   }

   async onunload() {
      try {
         this.eventBus.emit('plugin:unloading');
         await this.viewModeService.closeView();
         unregisterStyles();
         this.eventBus.emit('plugin:unloaded');
      } catch (error) {
         console.warn("[main dans onunload] Erreur lors du déchargement:", error);
      }
   }
}
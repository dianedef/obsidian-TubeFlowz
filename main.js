const { Plugin, Notice, Modal, ItemView, WorkspaceLeaf, MarkdownView, PluginSettingTab, Setting, Menu } = require('obsidian');
const { EditorView, ViewPlugin, Decoration, WidgetType } = require('@codemirror/view');

class SettingsManager {
   constructor() {
      this.settings = {
         lastVideoId: 'aZyghlNOmiU',
         isVideoOpen: null,
         playlist: [],
         currentMode: null
      };
   }

   async load(plugin) {
      const savedData = await plugin.loadData() || {};
      this.settings = { ...this.settings, ...savedData };
      this.plugin = plugin;
      console.log("Settings chargées:", this.settings);
   }
   async save() {
      if (!this.plugin) return;
      await this.plugin.saveData(this.settings);
      console.log("Settings sauvegardées:", this.settings);
   }
}
class VideoViewManager {
   constructor(plugin) {
      this.plugin = plugin;
      this.activeLeafId = null;
      this.activeView = null;
      this.restoreLastSession();
   }
// restoreLastSession() : Restaurer la dernière session
   async restoreLastSession() {
      await this.closePreviousVideos();
      const settings = this.plugin.settingsManager.settings;
      console.log("lancement de restoreLastSession avec activeLeafId:", this.activeLeafId);
      if (settings.isVideoOpen && settings.lastVideoId) {
         await this.displayVideo(settings.lastVideoId, settings.currentMode);
      }
   }
// displayVideo(videoId, mode) : Créer la nouvelle vue selon le mode et mettre à jour les settings
   async displayVideo(videoId, mode) {
      console.log(`Affichage vidéo ${videoId} en mode ${mode}`);
      this.closePreviousVideos();
      switch(mode) {
         case 'sidebar':
            await this.createSidebarView(videoId);
            break;
         case 'tab':
            await this.createTabView(videoId);
            break;
         case 'overlay':
            await this.createOverlayView(videoId);
            break;
      }
      this.plugin.settingsManager.settings.lastVideoId = videoId;
      this.plugin.settingsManager.settings.isVideoOpen = true;
      this.plugin.settingsManager.settings.currentMode = mode;
      this.plugin.settingsManager.settings.activeLeafId = this.activeLeafId;
      await this.plugin.settingsManager.save();
   }
// closePreviousVideos() : Fermer toutes vues précédentes et réinitialiser les états
   async closePreviousVideos() {
      console.log("=== Début closePreviousVideos ===");
      const leaves = this.plugin.app.workspace.getLeavesOfType('youtube-player');
      for (const leaf of leaves) {
         if (leaf && !leaf.detached) {
            leaf.detach();
         }
      }
      this.activeView = null;
      
      console.log("État après fermeture:", {
         activeLeafId: !!this.activeLeafId,
         settings: this.plugin.settingsManager.settings
      });
      console.log("=== Fin closePreviousVideos ===");
      await this.plugin.settingsManager.save();
   }
   
// createSidebarView(videoId) : Créer la vue en sidebar
   async createSidebarView(videoId) {
      const leaf = this.plugin.app.workspace.getRightLeaf(false);
      
      this.plugin.app.workspace.revealLeaf(leaf);
      
      this.activeLeafId = leaf.id;
      console.log("Nouvelle sidebar créée avec ID:", leaf.id);
      
      const view = new YouTubePlayerView(leaf, this.plugin);
      this.activeView = view;
      
      await leaf.setViewState({
         type: 'youtube-player',
         state: { videoId }
      });
   }
// createTabView(videoId) : Créer la vue en tab
   async createTabView(videoId) {
      const leaf = this.plugin.app.workspace.splitActiveLeaf('vertical');
      
      this.activeLeafId = leaf.id;
      console.log("Nouvelle leaf créée avec ID:", leaf.id);
      
      const view = new YouTubePlayerView(leaf, this.plugin);
      this.activeView = view;
      
      await leaf.setViewState({
         type: 'youtube-player',
         state: { videoId }
      });
   }
// createOverlayView(videoId) : Créer la vue en overlay
   async createOverlayView(videoId) {
      const activeLeaf = this.plugin.app.workspace.activeLeaf;
      if (!activeLeaf) return;

      const view = new YouTubePlayerView(activeLeaf, this.plugin);
      this.activeView = view;
      
      await activeLeaf.setViewState({
         type: 'youtube-player',
         state: { videoId }
      });

      this.activeLeafId = activeLeaf.id;
      console.log("Overlay créé avec ID:", activeLeaf.id);
   }
}
class YouTubeFlowSettingTab extends PluginSettingTab {
   constructor(app, plugin) {
      super(app, plugin);
      this.plugin = plugin;
   }

   display() {
      const {containerEl} = this;
      containerEl.empty();

      new Setting(containerEl)
         .setName('Mode d\'affichage par défaut')
         .setDesc('Choisissez comment les vidéos s\'ouvriront par défaut')
         .addDropdown(dropdown => dropdown
            .addOption('tab', 'Onglet')
            .addOption('sidebar', 'Barre latérale')
            .addOption('overlay', 'Superposition')
            .setValue(this.plugin.settingsManager.settings.currentMode)
            .onChange(async (value) => {
               this.plugin.settingsManager.settings.currentMode = value;
               await this.plugin.settingsManager.save();
            }));
   }
}
class YouTubePlayerView extends ItemView {
   constructor(leaf, plugin) {
      super(leaf);
      this.plugin = plugin;
   }

   getViewType() {
      return 'youtube-player';
   }

   getDisplayText() {
      return 'YouTube Player';
   }
// onOpen() : Créer la vue
   async onOpen() {
      const container = this.containerEl.children[1];
      container.empty();
      const videoId = this.leaf.getViewState().state.videoId;

      container.style.cssText = `
         display: flex;
         flex-direction: column;
         align-items: center;
         padding: 10px;
         height: 100%;
      `;

      // Création d'un conteneur pour la vidéo
      const videoContainer = document.createElement('div');
      videoContainer.style.cssText = `
         width: 100%;
         height: 60%; 
         min-height: 100px; 
         margin-bottom: 20px;
      `;

      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${videoId}`;
      iframe.style.cssText = `
         width: 100%;
         height: 100%;
         border: none;
      `;
      
      videoContainer.appendChild(iframe);
      container.appendChild(videoContainer);

      // Espace disponible pour d'autres éléments en dessous
      const bottomSpace = document.createElement('div');
      bottomSpace.style.cssText = `
         width: 100%;
         flex: 1;
         background-color: var(--background-secondary);
         border-radius: 8px;
      `;
      container.appendChild(bottomSpace);
   }
// onClose() : Mettre à jour les settings quand la vue est fermée
   async onClose() {
      console.log("YouTubePlayerView onClose called");
      if (!this.plugin?.settingsManager) {
         console.warn("Plugin ou SettingsManager non initialisé dans YouTubePlayerView");
         return;
      }

      this.plugin.settingsManager.settings.isVideoOpen = false;
      this.plugin.settingsManager.settings.currentMode = null;
      await this.plugin.settingsManager.save();
      console.log("Nettoyage de la vue YouTube avec settings :", this.plugin.settingsManager.settings);
   }
}
class YouTubeFlowPlugin extends Plugin {
// Logique : Chargement des settings, initialisation de VideoViewManager lorsque le layout est prêt
   async onload() {
      console.log("Type de this:", this.constructor.name);  // Affichera "YouTubeFlowPlugin"
      console.log("Est-ce une instance de Plugin?", this instanceof Plugin);  // Affichera "true"
      
      this.settingsManager = new SettingsManager();
      await this.settingsManager.load(this);

      this.app.workspace.onLayoutReady(() => {
         console.log("Layout prêt, initialisation des écouteurs...");
         this.videoManager = new VideoViewManager(this);
         this.registerView(
            'youtube-player',
            (leaf) => new YouTubePlayerView(leaf, this)
         );
         this.registerEvent(
            this.app.workspace.on('leaf-closed', (leaf) => {
               console.log("evenement leaf-closed détecté!", {
                  ferméeId: leaf?.id,
                  activeId: this.videoManager?.activeLeafId,
                  match: leaf?.id === this.videoManager?.activeLeafId
               });
               if (!leaf) {
                     console.log("Feuille fermée détectée!", {
                     ferméeId: leaf?.id,
                     activeId: this.videoManager?.activeLeafId,
                     match: leaf?.id === this.videoManager?.activeLeafId
                  });
                  return;
               }

               
               if (this.videoManager && leaf?.id && 
                  leaf.id === this.videoManager.activeLeafId) {
                  console.log("Vue YouTube fermée manuellement, nettoyage...");
               }
            })
         );
      });

// Ajouter un seul bouton dans la sidebar qui ouvre un menu
      const ribbonIcon = this.addRibbonIcon('video', 'YouTube Flow', (evt) => {});

      ribbonIcon.addEventListener('mouseenter', (evt) => {
         const menu = new Menu();
         
         menu.addItem((item) => {
            item.setTitle("YouTube Tab")
               .setIcon("tab")
               .onClick(() => this.videoManager.displayVideo(this.settingsManager.settings.lastVideoId || 'default-id', 'tab'));
         });
         menu.addItem((item) => {
            item.setTitle("YouTube Sidebar")
               .setIcon("layout-sidebar-right")
               .onClick(() => this.videoManager.displayVideo(this.settingsManager.settings.lastVideoId || 'default-id', 'sidebar'));
         });
         menu.addItem((item) => {
            item.setTitle("YouTube Overlay")
               .setIcon("layout-top")
               .onClick(() => this.videoManager.displayVideo(this.settingsManager.settings.lastVideoId || 'default-id', 'overlay'));
         });

         const iconRect = ribbonIcon.getBoundingClientRect();
         menu.showAtPosition({ 
            x: iconRect.left, 
            y: iconRect.top - 10
         });

         const menuEl = menu.dom;
         menuEl.style.pointerEvents = 'all';
         
         const handleMouseLeave = (e) => {
            const isOverIcon = ribbonIcon.contains(e.relatedTarget);
            const isOverMenu = menuEl.contains(e.relatedTarget);
            
            if (!isOverIcon && !isOverMenu) {
               menu.hide();
               menuEl.removeEventListener('mouseleave', handleMouseLeave);
               ribbonIcon.removeEventListener('mouseleave', handleMouseLeave);
            }
         };

         menuEl.addEventListener('mouseleave', handleMouseLeave);
         ribbonIcon.addEventListener('mouseleave', handleMouseLeave);
      });

      this.addSettingTab(new YouTubeFlowSettingTab(this.app, this));
   }
   async onunload() {
      await this.videoManager.closePreviousVideos();
   }
}

module.exports = YouTubeFlowPlugin;

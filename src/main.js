import { Plugin, Notice, ItemView, MarkdownView, PluginSettingTab, Setting, Menu } from 'obsidian';
import { ViewPlugin, Decoration, WidgetType } from '@codemirror/view';
import videojs from 'video.js';
import 'videojs-youtube';

// ---------- STORE ET SETTINGS ----------

class Settings {
   constructor(plugin) {
      this.youtubeFlowPlugin = plugin;
      const { i18n } = Store.get();
      this.i18n = i18n;
      this.settings = {
         lastVideoId: null,
         isVideoOpen: null,
         playlist: [],
         currentMode: null,
         viewHeight: 60,
         playbackMode: 'stream',
         favoriteSpeed: 2.0
      };
   }

   async loadSettings() {
      try {
         const savedData = await this.youtubeFlowPlugin.loadData();
         if (savedData) {
            this.settings = {
               ...this.settings,
               ...savedData
            };
         }
         console.debug("Settings chargées:", this.settings);
      } catch (error) {
         console.error("Erreur lors du chargement des paramètres:", error);
      }
   }

   async save() {
      try {
         await this.youtubeFlowPlugin.saveData(this.settings);
         console.debug("Settings sauvegardées:", this.settings);
      } catch (error) {
         console.error("Erreur lors de la sauvegarde des paramètres:", error);
         throw error;
      }
   }

   // Getters et setters pour un accès contrôlé aux paramètres
   get lastVideoId() { return this.settings.lastVideoId; }
   set lastVideoId(value) { 
      this.settings.lastVideoId = value;
      this.save();
   }

   get playlist() { return [...this.settings.playlist]; }
   set playlist(value) {
      if (!Array.isArray(value)) {
         throw new Error("La playlist doit être un tableau");
      }
      this.settings.playlist = value.slice(0, this.settings.maxPlaylistSize);
      this.save();
   }

   // Méthode utilitaire pour réinitialiser les paramètres
   async resetToDefault() {
      this.settings = structuredClone(Settings.DEFAULT_SETTINGS);
      await this.save();
   }
}

class Store {
   static instance = null;
   
   constructor(plugin) {
      console.log("Initialisation du Store");
      if (Store.instance) {
         return Store.instance;
      }
      
      // Services Obsidian
      this.app = plugin.app;
      this.plugin = plugin;
      
      // Traductions en dur dans le Store pour le fichier unique
      this.translations = {
         fr: {
            player: {
               title: 'Lecteur YouTube',
               close: 'Fermer'
            }
            // ... autres traductions
         },
         en: {
            player: {
               title: 'YouTube Player',
               close: 'Close'
            }
            // ... autres traductions
         }
      };
      
      // Forcer la langue française pour le test
      const locale = 'fr';
      console.log("Langue forcée:", locale);
      
      // Vérifier si la langue est supportée
      if (this.translations[locale]) {
         console.log("Langue supportée, utilisation de:", locale);
         this.i18n = this.translations[locale];
      } else {
         console.log("Langue non supportée, fallback sur l'anglais");
         this.i18n = this.translations.en;
      }
      
      // Définir la méthode de traduction
      this.t = (key) => {
         if (!this.i18n) {
            console.warn("Store.t - this.i18n n'est pas défini !");
            return key;
         }
         
         const result = key.split('.').reduce((o, i) => o?.[i], this.i18n);
         return result || key;
      };
      
      Store.instance = this;
   }
   
   static async init(plugin) {
      if (!Store.instance) {
         Store.instance = new Store(plugin);
      }
      
      const instance = Store.instance;
      
      // Initialiser les managers
      instance.Settings = new Settings(plugin);
      await instance.Settings.loadSettings();
      
      instance.PlayerViewAndMode = new PlayerViewAndMode();
      await instance.PlayerViewAndMode.init();
      
      return instance;
   }

   static get() {
      if (!Store.instance) {
         return {
            Settings: null,
            PlayerViewAndMode: null,
            Player: null,
            t: (key) => key
         };
      }
      return Store.instance;
   }

   static destroy() {
      Store.instance = null;
   }
}

class SettingsTab extends PluginSettingTab {
   constructor(app, plugin) {
      super(app, plugin);
      const { Settings } = Store.get();
      this.Settings = Settings;
   }

   display() {
      const {containerEl} = this;
      containerEl.empty();
      
// Créer le menu de sélection du mode d'affichage par défaut
      new Setting(containerEl)
         .setName('Mode d\'affichage par défaut')
         .setDesc('Choisissez comment les vidéos s\'ouvriront par défaut')
         .addDropdown(dropdown => dropdown
            .addOption('tab', 'Onglet')
            .addOption('sidebar', 'Barre latérale')
            .addOption('overlay', 'Superposition')
            .setValue(this.Settings.settings.currentMode)
            .onChange(async (value) => {
               this.Settings.settings.currentMode = value;
               await this.Settings.save();
            }));
// Setting pour le mode de lecture
      new Setting(containerEl)
      .setName('Mode de lecture')
      .setDesc('Choisir entre streaming ou téléchargement')
      .addDropdown(dropdown => dropdown
         .addOption('stream', 'Streaming')
         .addOption('download', 'Téléchargement')
         .setValue(this.Settings.settings.playbackMode || 'stream')
         .onChange(async (value) => {
            this.Settings.settings.playbackMode = value;
            await this.Settings.save();
         }));
   }
}


// ---------- VIEW ----------
class PlayerContainer extends ItemView {
   constructor(leaf, activeLeafId, plugin) {
      super(leaf);
      const { Settings, PlayerViewAndMode, t } = Store.get();
      console.log("PlayerContainer - Store.get() retourne:", Store.get());
      this.plugin = plugin;
      this.Settings = Settings;
      this.PlayerViewAndMode = PlayerViewAndMode;
      this.t = t;
      this.videoId = null;
      this.timestamp = 0;
      this.activeLeafId = activeLeafId;
      this.VideoPlayer = null;
      
      // Initialiser comme une note Markdown vide
      this.contentEl.addClass('markdown-source-view');
      this.contentEl.addClass('mod-cm6');
      this.contentEl.style.background = 'var(--background-primary)';
      this.contentEl.empty();
   }

   getViewType() {
      return 'youtube-player';
   }

   getDisplayText() {
      return this.t('player.title');
   }

   getState() {
      return {
         videoId: this.videoId,
         timestamp: this.timestamp
      };
   }

   async setState(state) {
      this.videoId = state.videoId;
      this.timestamp = state.timestamp || 0;
      await this.onOpen();
   }

   async onOpen() {
      const container = this.containerEl.children[1];
      if (!container) {
         console.error("Conteneur non trouvé");
         return;
      }

      try {
         container.empty();
         container.style.background = 'var(--background-primary)';
         const videoId = this.leaf.getViewState().state.videoId;

         // Configuration du conteneur principal
         container.style.cssText = `
            display: flex;
            flex-direction: column;
            height: 100%;
            background: var(--background-primary);
         `;

         // Créer le conteneur pour le player et ses contrôles
         const playerSection = document.createElement('div');
         playerSection.style.cssText = `
            width: 100%;
            height: ${this.Settings.settings.viewHeight || 60}%;
            min-height: 100px;
            position: relative;
            display: flex;
            flex-direction: column;
         `;
         container.appendChild(playerSection);

         try {
            // Attendre que l'élément soit dans le DOM
            await new Promise(resolve => requestAnimationFrame(resolve));
            
            // Initialiser le player vidéo dans le playerSection
            this.VideoPlayer = new VideoPlayer(this.Settings);
            await this.VideoPlayer.initializePlayer(this.videoId, playerSection, this.timestamp);
         } catch (error) {
            console.error("Erreur lors de l'initialisation du player:", error);
            // Utiliser le lecteur de secours
            const fallbackPlayer = new VideoPlayer(this.Settings);
            fallbackPlayer.createFallbackPlayer(this.videoId, playerSection, this.timestamp);
         }

         // Ajouter le resize handle à la fin du playerSection
         const resizeHandle = document.createElement('div');
         resizeHandle.className = 'resize-handle';
         resizeHandle.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 12px;
            cursor: ns-resize;
            z-index: 102;
         `;
         playerSection.appendChild(resizeHandle);

         // Créer la section pour la note markdown
         const markdownSection = document.createElement('div');
         markdownSection.className = 'markdown-section';
         markdownSection.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 10px;
         `;
         container.appendChild(markdownSection);

         // Gérer le resize
         this.createResizer({
            container: container,
            targetElement: playerSection,
            handle: resizeHandle,
            mode: this.Settings.settings.currentMode,
            onResize: (height) => {
               playerSection.style.height = `${height}%`;
               this.Settings.settings.viewHeight = height;
               this.Settings.save();
            }
         });
      } catch (error) {
         console.error("Erreur lors de l'ouverture de la vue:", error);
         // Créer un message d'erreur visuel
         const errorContainer = document.createElement('div');
         errorContainer.style.cssText = `
            padding: 20px;
            color: var(--text-error);
            text-align: center;
         `;
         errorContainer.textContent = "Impossible de charger le lecteur vidéo. Utilisation du lecteur de secours.";
         container.appendChild(errorContainer);
         
         // Utiliser le lecteur de secours
         if (this.VideoPlayer) {
            this.VideoPlayer.createFallbackPlayer(this.videoId, container, this.timestamp);
         }
      }
   }

   createControls(container) {
      const controlsContainer = container.createDiv('youtube-view-controls');
      controlsContainer.style.cssText = `
         position: absolute;
         top: 10px;
         right: 10px;
         z-index: 101;
         display: flex;
         gap: 5px;
      `;

      // Ajouter le bouton de fermeture
      const closeButton = controlsContainer.createDiv('youtube-view-close');
      closeButton.setAttribute('aria-label', this.t('player.close'));
      closeButton.innerHTML = '✕';
      closeButton.style.cssText = `
         cursor: pointer;
         padding: 5px;
         background: var(--background-secondary);
         border-radius: 3px;
         opacity: 0.8;
      `;

      // Ajouter l'événement click sur le bouton de fermeture
      closeButton.addEventListener('click', async () => {
         const { PlayerViewAndMode } = Store.get();
         await PlayerViewAndMode.closePreviousVideos();
      });

      controlsContainer.appendChild(closeButton);
      return controlsContainer;
   }

   createVideoContainer() {
      const mode = this.Settings.settings.currentMode;
      const defaultHeight = mode === 'overlay' 
         ? this.Settings.settings.overlayHeight 
         : this.Settings.settings.viewHeight;

      const videoContainer = document.createElement('div');
      videoContainer.style.cssText = `
         width: 100%;
         height: ${defaultHeight || 60}%; 
         min-height: 100px;
         position: relative;
      `;
      
      this.createResizer({
         container: this.containerEl,
         targetElement: videoContainer,
         mode: this.Settings.settings.currentMode,
         onResize: (height) => {
            videoContainer.style.height = `${height}%`;
         }
      });
   
      return videoContainer;
   }


// onClose() : Mettre à jour les settings quand la vue est fermée
   async onClose() {
      if (this.VideoPlayer) {
         try {
            // Vérifier si le player existe et a une méthode dispose
            if (this.VideoPlayer.player && typeof this.VideoPlayer.player.dispose === 'function') {
               // Vérifier si l'élément existe encore dans le DOM avant de le supprimer
               const playerElement = this.VideoPlayer.player.el();
               if (playerElement && playerElement.parentNode) {
                  this.VideoPlayer.player.dispose();
               }
            }

            const leaves = this.app.workspace.getLeavesOfType('youtube-player');
            if (leaves.length <= 1 && !this.Settings.settings.isChangingMode) {
               this.Settings.settings.isVideoOpen = false;
               await this.Settings.save();
            }
            
            // Nettoyer la référence
            this.VideoPlayer = null;
            
         } catch (error) {
            console.warn("Erreur lors de la fermeture du player:", error);
         }
      }
   }

   createResizer(options) {
      const {
         container,
         targetElement,
         handle,
         mode,
         onResize,
         minHeight = 20,
         maxHeight = 90
      } = options;

      let startY = 0;
      let startHeight = 0;
      let rafId = null;
      let lastSaveTime = Date.now();

      const updateSize = (newHeight) => {
         if (rafId) cancelAnimationFrame(rafId);
         
         rafId = requestAnimationFrame(() => {
            const clampedHeight = Math.min(Math.max(newHeight, minHeight), maxHeight);
            
            if (mode === 'overlay') {
               // Pour l'overlay, mise à jour directe
               targetElement.style.height = `${clampedHeight}%`;
               const editorEl = targetElement.closest('.workspace-leaf').querySelector('.cm-editor');
               if (editorEl) {
                  editorEl.style.height = `${100 - clampedHeight}%`;
                  editorEl.style.top = `${clampedHeight}%`;
               }
            } else {
               // Pour tab/sidebar, mise à jour directe
               targetElement.style.height = `${clampedHeight}%`;
               
               // Mettre à jour l'iframe pour qu'elle suive immédiatement
               const iframe = targetElement.querySelector('iframe');
               if (iframe) {
                  iframe.style.height = '100%';
               }
            }
            
            // Appeler le callback onResize
            onResize(clampedHeight);
            
            // Sauvegarder la hauteur globalement
            const now = Date.now();
            if (now - lastSaveTime >= 300) {
               this.Settings.settings.viewHeight = clampedHeight;
               this.Settings.settings.overlayHeight = clampedHeight;
               this.Settings.save();
               lastSaveTime = now;
            }
            
            rafId = null;
         });
      };

      handle.addEventListener('mousedown', (e) => {
         startY = e.clientY;
         startHeight = parseFloat(targetElement.style.height);
         document.body.style.cursor = 'ns-resize';
         
         const overlay = document.createElement('div');
         overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9999;
            cursor: ns-resize;
         `;
         document.body.appendChild(overlay);
         
         const handleMouseMove = (e) => {
            const deltaY = e.clientY - startY;
            const containerHeight = container.getBoundingClientRect().height;
            const newHeight = startHeight + (deltaY / containerHeight * 100);
            updateSize(newHeight);
         };
         
         const handleMouseUp = () => {
            overlay.remove();
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            
            if (rafId) {
               cancelAnimationFrame(rafId);
            }
         };
         
         document.addEventListener('mousemove', handleMouseMove);
         document.addEventListener('mouseup', handleMouseUp);
         
         e.preventDefault();
         e.stopPropagation();
      });

      return handle;
   }
}
class PlayerViewAndMode {
   constructor() {
      const { Settings, i18n } = Store.get();
      this.Settings = Settings;
      this.i18n = i18n;
      this.activeLeafId = null;
      this.activeView = null;
   }

   init() {
      const { app, Settings } = Store.get();
      this.app = app;
      this.Settings = Settings;
      this.activeLeafId = Settings.settings.activeLeafId || null;
   }

   async displayVideo(videoId, mode, timestamp = 0) {
      console.log(`displayVideo() ${videoId} en mode ${mode} avec timestamp ${timestamp}`);
      
      // Si on a déjà une vue ouverte et qu'on change de mode
      if (this.Settings.settings.isVideoOpen && 
         this.Settings.settings.currentMode !== mode) {
         console.log("Changement de mode détecté, fermeture des vues précédentes");
         // Forcer la fermeture de toutes les vues précédentes
         await this.closePreviousVideos();
         // Réinitialiser l'ID pour forcer une nouvelle création
         this.activeLeafId = null;
      }
      
      // Indiquer qu'on change de mode pour éviter les fermetures inutiles
      this.Settings.settings.isChangingMode = true;
      this.Settings.settings.currentMode = mode;
      
      // Chercher une leaf YouTube existante seulement si on ne change pas de mode
      let targetLeaf = null;
      if (this.activeLeafId && this.Settings.settings.currentMode === mode) {
         const existingLeaves = this.app.workspace.getLeavesOfType('youtube-player');
         targetLeaf = existingLeaves.find(leaf => leaf.id === this.activeLeafId);
      }

      // Si on trouve la leaf et qu'on ne change pas de mode, l'utiliser
      if (targetLeaf && this.Settings.settings.currentMode === mode) {
         console.log("Réutilisation de la leaf existante:", this.activeLeafId);
         await targetLeaf.setViewState({
            type: 'youtube-player',
            state: { videoId, timestamp }
         });
      } else {
         // Créer une nouvelle vue selon le mode
         switch(mode) {
            case 'sidebar':
               await this.createSidebarView(videoId, timestamp);
               break;
            case 'tab':
               await this.createTabView(videoId, timestamp);
               break;
            case 'overlay':
               await this.createOverlayView(videoId, timestamp);
               break;
         }
      }
      // Sauvegarder l'état
      this.Settings.settings.lastVideoId = videoId;
      this.Settings.settings.lastTimestamp = timestamp;
      this.Settings.settings.isVideoOpen = true;
      this.Settings.settings.activeLeafId = this.activeLeafId;
      this.Settings.settings.isChangingMode = false;
      await this.Settings.save();
   }

   async restoreLastSession() {
      const settings = this.Settings.settings;
      
      console.log("lancement de restoreLastSession", settings);
      
      // Ne restaurer que si une vido tait ouverte et qu'on a un ID valide
      if (settings.isVideoOpen && settings.lastVideoId && settings.currentMode) {
         // S'assurer qu'il n'y a pas de vues existantes
         await this.closePreviousVideos();
         console.log("Restauration de la session avec:", {
            videoId: settings.lastVideoId,
            mode: settings.currentMode
         });
         
         
         // Attendre un peu que l'éditeur soit prêt pour le mode overlay
         if (settings.currentMode === 'overlay') {
            setTimeout(() => {
               this.displayVideo(settings.lastVideoId, settings.currentMode);
            }, 500);
         } else {
            await this.displayVideo(settings.lastVideoId, settings.currentMode);
         }
      } else {
         // Réinitialiser l'état si les conditions ne sont pas remplies
         settings.isVideoOpen = false;
         await this.Settings.save();
      }
   }

   async closePreviousVideos() {
      console.log("=== Début closePreviousVideos ===");
      
      // Gérer les overlays
      const overlays = document.querySelectorAll('.youtube-overlay');
      overlays.forEach(overlay => {
         const containerEl = overlay.closest('.workspace-leaf');
         if (containerEl) {
            const editor = containerEl.querySelector('.cm-editor');
            if (editor) {
               editor.style.height = '100%';
               editor.style.top = '0';
            }
         }
         overlay.remove();
      });

      // Gérer les leaves (tab et sidebar)
      const leaves = this.app.workspace.getLeavesOfType('youtube-player');
      for (const leaf of leaves) {
         if (leaf && !leaf.detached) {
            leaf.detach();
         }
      }

      // Réinitialiser les états
      this.activeView = null;
      this.activeLeafId = null;
      this.Settings.settings.isVideoOpen = false;
      
      console.log("État après fermeture:", {
         activeLeafId: this.activeLeafId
      });
      
      await this.Settings.save();
   }
   
// createSidebarView(videoId) : Créer la vue en sidebar
   async createSidebarView(videoId, timestamp = 0) {
      const existingLeaves = this.app.workspace.getLeavesOfType('youtube-player');
      const existingSidebar = existingLeaves.find(leaf => 
         leaf.getViewState().type === 'youtube-player' && 
         leaf.parent.type !== 'split'
      );

      let leaf;
      
      if (existingSidebar) {
         leaf = existingSidebar;
         await leaf.setViewState({
            type: 'youtube-player',
            state: { videoId, timestamp }
         });
      } else {
         await this.closePreviousVideos();
         leaf = this.app.workspace.getRightLeaf(false);
         await leaf.setViewState({
            type: 'youtube-player',
            state: { videoId, timestamp }
         });
         this.app.workspace.revealLeaf(leaf);
      }
      
      this.activeLeafId = leaf.id;
      this.activeView = leaf.view;
   }
// createTabView(videoId) : Créer la vue en tab
   async createTabView(videoId, timestamp = 0) {
      // Chercher une tab YouTube existante
      const existingLeaves = this.app.workspace.getLeavesOfType('youtube-player');
      const existingTab = existingLeaves.find(leaf => 
         leaf.getViewState().type === 'youtube-player' && 
         leaf.parent.type === 'split'
      );
      
      let leaf;
      
      if (existingTab) {
         leaf = existingTab;
         await leaf.setViewState({
            type: 'youtube-player',
            state: { videoId, timestamp }
         });
      } else {
         await this.closePreviousVideos();
         leaf = this.app.workspace.getLeaf('split');
         await leaf.setViewState({
            type: 'youtube-player',
            state: { videoId, timestamp }
         });
      }
      
      this.activeLeafId = leaf.id;
      this.activeView = leaf.view;
      
      // Activer la leaf pour la mettre au premier plan
      this.app.workspace.setActiveLeaf(leaf);
   }
// createOverlayView(videoId) : Créer la vue en overlay
   async createOverlayView(videoId, timestamp = 0) {
      const activeLeaf = this.app.workspace.activeLeaf;
      let startY, startHeight;
      let rafId = null;
      let lastSaveTime = Date.now();
      if (!activeLeaf) return;

      // Vérifier si on a déjà une overlay sur cette leaf
      const existingOverlay = activeLeaf.view.containerEl.querySelector('.youtube-overlay');
      if (existingOverlay && activeLeaf.id === this.activeLeafId) {
         // Mettre à jour la vidéo dans l'overlay existante
         const iframe = existingOverlay.querySelector('iframe');
         if (iframe) {
            iframe.src = `https://www.youtube.com/embed/${videoId}`;
            return;
         }
      }

      // Définir immédiatement l'ID de la leaf active
      this.activeLeafId = activeLeaf.id;
      this.activeView = activeLeaf.view;
      console.log("Nouvelle overlay créée avec ID:", this.activeLeafId);

      const editorEl = activeLeaf.view.containerEl.querySelector('.cm-editor');
      if (!editorEl) return;

      // Sauvegarder l'ID de la feuille active pour la restauration
      this.settings.settings.overlayLeafId = activeLeaf.id;
      
      // Utiliser la hauteur sauvegardée ou la valeur par défaut (60%)
      const overlayHeight = this.settings.settings.overlayHeight || 60;
      
      // Appliquer immédiatement la hauteur sauvegardée
      editorEl.style.height = `${100 - overlayHeight}%`;
      editorEl.style.position = 'relative';
      editorEl.style.top = `${overlayHeight}%`;

      const overlayContainer = activeLeaf.view.containerEl.createDiv('youtube-overlay');
      overlayContainer.style.cssText = `
         position: absolute;
         top: 0;
         left: 0;
         width: 100%;
         height: ${overlayHeight}%;
         background: var(--background-primary);
         z-index: 100;
         display: flex;
         flex-direction: column;
         align-items: center;
      `;

      const closeButton = overlayContainer.createDiv('youtube-overlay-close');
      closeButton.innerHTML = '✕';
      closeButton.style.cssText = `
         cursor: pointer;
         padding: 5px;
         background: var(--background-secondary);
         border-radius: 3px;
         opacity: 0.8;
      `;
      
      const { resizeHandler } = Store.get();
      resizeHandler.createResizer({
         container: activeLeaf.view.containerEl,
         targetElement: overlayContainer,
         mode: 'overlay',
         onResize: (height) => {
            overlayContainer.style.height = `${height}%`;
            editorEl.style.height = `${100 - height}%`;
            editorEl.style.top = `${height}%`;
         }
      });

      const controlsContainer = overlayContainer.createDiv('youtube-view-controls');
      controlsContainer.style.cssText = `
         position: absolute;
         top: 10px;
         right: 10px;
         z-index: 101;
         display: flex;
         gap: 5px;
      `;

      controlsContainer.appendChild(closeButton);

      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${videoId}`;
      iframe.style.cssText = `
         width: 100%;
         height: 100%;
         border: none;
      `;
      
      overlayContainer.appendChild(iframe);
      
      closeButton.addEventListener('click', async () => {
         const { PlayerViewAndMode } = Store.get();
         await PlayerViewAndMode.closePreviousVideos();
      });

      this.settings.settings.lastVideoId = videoId;
      this.settings.settings.isVideoOpen = true;
      this.settings.settings.currentMode = 'overlay';

      this.registerOverlayCleanup(activeLeaf, overlayContainer, editorEl);
   }
   async registerOverlayCleanup(leaf, overlayContainer, editorEl) {
      const cleanup = async () => {
         overlayContainer.remove();
         if (editorEl) {
            editorEl.style.height = '100%';
            editorEl.style.top = '0';
         }
         this.settings.settings.isVideoOpen = false;
         this.settings.settings.overlayLeafId = null;  // Nettoyer l'ID
         await this.settings.save();
      };

      leaf.on('unload', cleanup);
   }
}
// ----- VideoPlayer.js -----
class VideoPlayer {
   constructor(Settings) {
      this.Settings = Settings;
      this.player = null;
      this.playbackRateButton = null;
      this.isFullscreen = false;
      
      // On n'initialise pas VideoJS dans le constructeur
      this.hasVideoJS = false;
   }

   async checkVideoJS() {
      try {
         // Attendre un peu pour s'assurer que VideoJS est bien chargé
         await new Promise(resolve => setTimeout(resolve, 100));
         
         // Vérifier si VideoJS est disponible
         const vjsInstance = window.videojs || videojs;
         if (typeof vjsInstance === 'function') {
            this.hasVideoJS = true;
            return true;
         }
         
         console.warn('VideoJS non disponible');
         return false;
      } catch (error) {
         console.error('Erreur lors de la vérification de VideoJS:', error);
         return false;
      }
   }

   addCustomStyles() {
      if (!this.hasVideoJS) {
         console.warn('VideoJS non disponible, utilisation du lecteur de secours');
         return;
      }

      const style = document.createElement('style');
      style.textContent = `
         .video-js {
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
            height: 100% !important;
         }

         .vjs-control-bar {
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: center !important;
            width: 100% !important;
            padding: 0 10px !important;
            background: var(--background-secondary) !important;
            position: relative !important;
            height: 60px !important;
            flex-shrink: 0 !important;
         }

         /* Contrôles individuels */
         .vjs-control {
            display: flex !important;
            align-items: center !important;
            height: 40px !important;
         }

         /* Volume panel */
         .vjs-volume-panel {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            width: auto !important;
         }

         .vjs-volume-control {
            width: 80px !important;
            height: 100% !important;
         }

         /* Progress control */
         .vjs-progress-control {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 4px !important;
            background: var(--background-modifier-border) !important;
            cursor: pointer !important;
            transition: height 0.2s !important;
         }

         .vjs-progress-control:hover {
            height: 8px !important;
         }

         .vjs-play-progress {
            background: var(--interactive-accent) !important;
            height: 100% !important;
            max-height: 4px !important;
         }

         .vjs-progress-control:hover .vjs-play-progress {
            max-height: 8px !important;
         }

         /* Progress holder */
         .vjs-progress-holder {
            position: relative !important;
            height: 6px !important;
            width: 100% !important;
            display: flex !important;
            align-items: center !important;
            cursor: pointer !important;
            transition: height 0.2s !important;
         }

         /* Load progress */
         .vjs-load-progress {
            position: absolute !important;
            height: 100% !important;
            background: var(--background-modifier-border) !important;
         }

         /* Time tooltip */
         .vjs-time-tooltip {
            background: var(--background-secondary) !important;
            padding: 2px 5px !important;
            border-radius: 3px !important;
            font-size: 12px !important;
            white-space: nowrap !important;
         }

         /* Mouse display */
         .vjs-mouse-display {
            position: absolute !important;
            height: 100% !important;
            width: 1px !important;
            background: var(--text-muted) !important;
         }

         /* Supprimer complètement le poster/thumbnail */
         .vjs-poster,
         .vjs-loading-spinner,
         .vjs-big-play-button {
            display: none !important;
         }

         /* Contrôles de temps */
         .vjs-time-control {
            display: flex !important;
            align-items: center !important;
            min-width: 50px !important;
            padding: 0 8px !important;
            font-size: 13px !important;
         }

         .vjs-current-time,
         .vjs-duration,
         .vjs-time-divider {
            display: flex !important;
            align-items: center !important;
         }

         .vjs-time-divider {
            padding: 0 3px !important;
         }

         /* Forcer la hauteur complète */
         .player-wrapper {
            height: 100% !important;
            min-height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
         }

         /* Conteneur de l'iframe */
         .video-js > div:first-child {
            position: relative !important;
            width: 100% !important;
            height: calc(100% - 40px) !important;
            display: flex !important;
            flex-direction: column !important;
         }

         /* Masquer le tooltip par défaut */
         .vjs-time-tooltip {
            opacity: 0;
            transition: opacity 0.2s;
         }

         /* Afficher uniquement pendant le hover */
         .vjs-progress-control:hover .vjs-time-tooltip {
            opacity: 1;
         }

         /* Cacher les labels "Current Time" et "Duration" */
         .vjs-control-text[role="presentation"] {
            display: none !important;
         }

         /* Styles pour le bouton plein écran */
         .vjs-fullscreen-control {
            cursor: pointer !important;
            width: 40px !important;
            height: 40px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            opacity: 0.8 !important;
            transition: opacity 0.2s ease !important;
         }

         .vjs-fullscreen-control:hover {
            opacity: 1 !important;
         }

         .vjs-fullscreen-control .vjs-icon-placeholder:before {
            font-size: 1.8em !important;
            line-height: 40px !important;
         }

         /* Styles pour le mode plein écran */
         .video-js.vjs-fullscreen {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 9999 !important;
         }
      `;
      document.head.appendChild(style);
   }

   async initializePlayer(videoId, container, timestamp = 0) {
      try {
         // Vérifier si videojs est disponible
         if (typeof videojs !== 'function') {
            console.warn("VideoJS non disponible, utilisation du lecteur de secours");
            return this.createFallbackPlayer(videoId, container, timestamp);
         }

         // Conteneur principal
         const mainContainer = document.createElement('div');
         mainContainer.id = 'youtube-flow-player';
         mainContainer.className = 'youtube-flow-container';
         mainContainer.style.cssText = `
            position: relative;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
         `;
         container.appendChild(mainContainer);

         // Wrapper pour la vidéo et ses contrôles
         const playerWrapper = document.createElement('div');
         playerWrapper.className = 'player-wrapper';
         playerWrapper.style.cssText = `
            flex: 1;
            display: flex;
            flex-direction: column;
            position: relative;
            overflow: hidden;
         `;
         mainContainer.appendChild(playerWrapper);

         // Créer le conteneur vidéo
         const videoContainer = document.createElement('div');
         videoContainer.style.cssText = `
            flex: 1;
            position: relative;
            overflow: hidden;
         `;
         playerWrapper.appendChild(videoContainer);

         // Élément vidéo avec autoplay
         const video = document.createElement('video-js');
         video.className = 'video-js vjs-obsidian-theme';
         video.setAttribute('autoplay', '');
         videoContainer.appendChild(video);

         // Créer la barre de contrôle horizontale
         const controlBar = document.createElement('div');
         controlBar.className = 'youtube-flow-control-bar';
         controlBar.style.cssText = `
            height: 40px;
            width: 100%;
            background: var(--background-secondary);
            border-top: 1px solid var(--background-modifier-border);
            display: flex;
            align-items: center;
            padding: 0 10px;
            position: relative;
         `;
         playerWrapper.appendChild(controlBar);

         // Ajouter les contrôles de base
         const playbackRateButton = document.createElement('button');
         playbackRateButton.className = 'youtube-flow-playback-rate';
         playbackRateButton.innerHTML = '🔄 1x';
         playbackRateButton.style.cssText = `
            background: none;
            border: none;
            padding: 5px 10px;
            cursor: pointer;
            color: var(--text-normal);
            display: flex;
            align-items: center;
            gap: 5px;
         `;
         controlBar.appendChild(playbackRateButton);

         // Gérer le menu de vitesse
         playbackRateButton.addEventListener('mouseenter', (e) => {
            const menu = new Menu();
            const rates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5, 8, 10, 16];
            const currentRate = this.player ? this.player.playbackRate() : 1;
            
            rates.forEach(rate => {
               menu.addItem(item => 
                  item
                     .setTitle(`${rate}x`)
                     .setChecked(currentRate === rate)
                     .onClick(() => {
                        if (this.player) {
                           this.player.playbackRate(rate);
                           playbackRateButton.innerHTML = `🔄 ${rate}x`;
                        }
                     })
               );
            });

            const rect = playbackRateButton.getBoundingClientRect();
            menu.showAtPosition({
               x: rect.left,
               y: rect.bottom
            });
         });

         // Attendre que le DOM soit mis à jour
         await new Promise(resolve => {
            requestAnimationFrame(() => {
               setTimeout(resolve, 100);
            });
         });

         // S'assurer que l'élément est toujours dans le DOM
         if (!document.contains(video)) {
            console.warn("L'élément vidéo n'est plus dans le DOM, utilisation du lecteur de secours");
            return this.createFallbackPlayer(videoId, container, timestamp);
         }

         // Configuration du player
         this.player = videojs(video, {
            // Configuration technique
            techOrder: ['youtube'],
            sources: [{
               type: 'video/youtube',
               src: `https://www.youtube.com/watch?v=${videoId}`
            }],
            
            // Options générales du player
            controls: true,
            fluid: false,
            preload: 'auto',
            playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5, 8, 10, 16],
            autoplay: true,
            
            // Configuration YouTube spécifique
            youtube: {
               iv_load_policy: 3,
               modestbranding: 1,
               cc_load_policy: 0,
               rel: 0,
               controls: 0,
               ytControls: 0,
               preload: 'auto'
            }
         });

         // Attendre que le player soit prêt
         await new Promise((resolve, reject) => {
            this.player.ready(() => {
               if (timestamp > 0) {
                  this.player.currentTime(timestamp);
               }
               resolve();
            });
            
            // Timeout de sécurité
            setTimeout(() => {
               reject(new Error("Timeout lors de l'initialisation du player"));
            }, 5000);
         });

         // Mettre à jour le bouton de vitesse quand le player change de vitesse
         this.player.on('ratechange', () => {
            const rate = this.player.playbackRate();
            playbackRateButton.innerHTML = `🔄 ${rate}x`;
         });

         return this.player;
      } catch (error) {
         console.error("Erreur lors de l'initialisation du player vidéo:", error);
         return this.createFallbackPlayer(videoId, container, timestamp);
      }
   }

   updatePlaybackRateButton(rate) {
      if (this.playbackRateButton) {
         const buttonEl = this.playbackRateButton.el();
         if (buttonEl) {
            buttonEl.innerHTML = `🔄 ${rate}x`;
         }
      }
   }

   createFallbackPlayer(videoId, container, timestamp = 0) {
      console.log("Utilisation du lecteur de secours pour", videoId);
      container.innerHTML = '';
      
      // Créer le conteneur du lecteur
      const playerContainer = document.createElement('div');
      playerContainer.style.cssText = `
         width: 100%;
         height: 100%;
         display: flex;
         flex-direction: column;
         background: var(--background-primary);
      `;
      
      // Créer l'iframe YouTube
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${videoId}${timestamp ? `?start=${timestamp}` : ''}`;
      iframe.style.cssText = `
         width: 100%;
         height: 100%;
         border: none;
         flex: 1;
      `;
      
      playerContainer.appendChild(iframe);
      container.appendChild(playerContainer);
      
      return playerContainer;
   }

   async playerControl() {
   }

   formatTimestamp(seconds) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;
      
      if (hours > 0) {
         return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
      }
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
   }

   // Méthodes de gestion du plein écran
   requestFullscreen() {
      if (!this.player) return;
      
      try {
         this.player.requestFullscreen().catch(error => {
            console.error("Erreur lors du passage en plein écran:", error);
         });
      } catch (error) {
         console.error("Erreur lors de la demande de plein écran:", error);
      }
   }

   exitFullscreen() {
      if (!this.player) return;
      
      try {
         this.player.exitFullscreen().catch(error => {
            console.error("Erreur lors de la sortie du plein écran:", error);
         });
      } catch (error) {
         console.error("Erreur lors de l'initialisation du player:", error);
         return this.createFallbackPlayer(videoId, container, timestamp);
      }
   }
   // ... rest of the code ...
}
// ------ décoration des urls ------
function createDecorations(view) {
   const decorations = [];
   const doc = view.state.doc;
   const { Settings, PlayerViewAndMode } = Store.get();
   
   for (let pos = 0; pos < doc.length;) {
      const line = doc.lineAt(pos);
      const lineText = line.text;
      
      const linkRegex = /(?:\[([^\]]+)\]\(([^)]+)\)|(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+))/g;
      let match;
      
      while ((match = linkRegex.exec(lineText)) !== null) {
         const fullMatch = match[0];
         const url = match[2] || fullMatch;
         const startPos = line.from + match.index;
         const endPos = startPos + fullMatch.length;
         
         const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/;
         const youtubeMatch = url.match(youtubeRegex);
         
         if (youtubeMatch) {
            const videoId = youtubeMatch[1];
            
            if (startPos >= 0 && endPos <= doc.length) {
               decorations.push(Decoration.mark({
                  class: "youtube-link",
                  attributes: {
                     "data-video-id": videoId
                  },
                  inclusive: false
               }).range(startPos, endPos));
               
               decorations.push(Decoration.widget({
                  widget: new DecorationForUrl(videoId),
                  side: 1
               }).range(endPos));
            }
         }
      }
      
      pos = line.to + 1;
   }
   
   return Decoration.set(decorations, true);
}
class DecorationForUrl extends WidgetType {
// Créer le widget de décoration avec le gestionnaire d'événements click
   constructor(videoId) {
      super();
      this.videoId = videoId;
   }
      
   toDOM() {
      const sparkle = document.createElement('button');
      sparkle.textContent = '▶️▶️ Ouvrir le player ✨';
      sparkle.className = 'youtube-sparkle-decoration';
      sparkle.setAttribute('aria-label', 'Ouvrir le player YouTube');
      sparkle.setAttribute('data-video-id', this.videoId);
      sparkle.style.cssText = `
         cursor: pointer;
         user-select: none;
         pointer-events: all;
         background: none;
         border: none;
         padding: 2px;
         margin-left: 4px;
         position: relative;
         display: inline-block;
      `;
      
      sparkle.addEventListener('click', (e) => {
         e.preventDefault();
         e.stopPropagation();
         const { PlayerViewAndMode, Settings } = Store.get();
         if (PlayerViewAndMode) {
            PlayerViewAndMode.displayVideo(
               this.videoId,
               Settings.settings.currentMode || 'sidebar'
            );
         }
      });
      
      return sparkle;
   }
}
// ------ redimensionnement du Player ------
class PlayerResizeHandler {
   constructor() {
      const { Settings } = Store.get();
      this.Settings = Settings;
   }

   createResizer(options) {
      const {
         container,
         targetElement,
         onResize,
         mode,
         minHeight = 20,
         maxHeight = 90
      } = options;

      const handle = document.createElement('div');
      handle.className = 'resize-handle';
      targetElement.appendChild(handle);

      let startY = 0;
      let startHeight = 0;
      let rafId = null;
      let lastSaveTime = Date.now();

      const updateSize = (newHeight) => {
         if (rafId) cancelAnimationFrame(rafId);
         
         rafId = requestAnimationFrame(() => {
            const clampedHeight = Math.min(Math.max(newHeight, minHeight), maxHeight);
            
            if (mode === 'overlay') {
               // Pour l'overlay, mise à jour directe
               targetElement.style.height = `${clampedHeight}%`;
               const editorEl = targetElement.closest('.workspace-leaf').querySelector('.cm-editor');
               if (editorEl) {
                  editorEl.style.height = `${100 - clampedHeight}%`;
                  editorEl.style.top = `${clampedHeight}%`;
               }
            } else {
               // Pour tab/sidebar, mise à jour directe
               targetElement.style.height = `${clampedHeight}%`;
               
               // Mettre à jour l'iframe pour qu'elle suive immédiatement
               const iframe = targetElement.querySelector('iframe');
               if (iframe) {
                  iframe.style.height = '100%';
               }
            }
            
            // Appeler le callback onResize
            onResize(clampedHeight);
            
            // Sauvegarder la hauteur globalement
            const now = Date.now();
            if (now - lastSaveTime >= 300) {
               this.Settings.settings.viewHeight = clampedHeight;
               this.Settings.settings.overlayHeight = clampedHeight;
               this.Settings.save();
               lastSaveTime = now;
            }
            
            rafId = null;
         });
      };

      handle.addEventListener('mousedown', (e) => {
         startY = e.clientY;
         startHeight = parseFloat(targetElement.style.height);
         document.body.style.cursor = 'ns-resize';
         
         const overlay = document.createElement('div');
         overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9999;
            cursor: ns-resize;
         `;
         document.body.appendChild(overlay);
         
         const handleMouseMove = (e) => {
            const deltaY = e.clientY - startY;
            const containerHeight = container.getBoundingClientRect().height;
            const newHeight = startHeight + (deltaY / containerHeight * 100);
            updateSize(newHeight);
         };
         
         const handleMouseUp = () => {
            overlay.remove();
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            
            if (rafId) {
               cancelAnimationFrame(rafId);
            }
         };
         
         document.addEventListener('mousemove', handleMouseMove);
         document.addEventListener('mouseup', handleMouseUp);
         
         e.preventDefault();
         e.stopPropagation();
      });

      return handle;
   }
}
class Hotkeys {
   constructor() {
      const { app, youtubeFlowPlugin, Player } = Store.get();
      this.app = app;
      this.youtubeFlowPlugin = youtubeFlowPlugin;
      this.Player = Player;
   }

   registerHotkeys() {
      // Raccourci pour ouvrir la vidéo en cours dans une modale
      this.youtubeFlowPlugin.addCommand({
         id: 'open-youtube-modal',
         name: 'Ouvrir la vidéo dans une modale',
         hotkeys: [{ modifiers: ['Alt'], key: 'y' }],
         callback: () => {
            const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (activeView) {
               const cursor = activeView.editor.getCursor();
               const line = activeView.editor.getLine(cursor.line);
               const urlMatch = line.match(/(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[^&\s]+)/);
               if (urlMatch) {
                  const videoId = this.player.getVideoId(urlMatch[1]);
                  if (videoId) {
                     new YouTubeModal(this.app, videoId).open();
                  }
               }
            }
         }
      });

      this.youtubeFlowPlugin.addCommand({
         id: 'play-pause',
         name: 'Lecture/Pause',
         hotkeys: [{ modifiers: ['Shift'], key: ' ' }],
         callback: () => this.player.player?.getPlayerState() === 1 
            ? this.player.pause() 
            : this.player.play()
      });

      this.youtubeFlowPlugin.addCommand({
         id: 'write-timestamp',
         name: 'Écrire le timestamp',
         hotkeys: [{ modifiers: ['Alt'], key: 't' }],
         callback: () => this.writeTimestamp()
      });

      this.youtubeFlowPlugin.addCommand({
         id: 'next-video',
         name: 'Vidéo suivante',
         hotkeys: [{ modifiers: ['Ctrl'], key: 'ArrowRight' }],
         callback: () => this.player.nextVideo()
      });

      this.youtubeFlowPlugin.addCommand({
         id: 'previous-video',
         name: 'Vidéo précédente',
         hotkeys: [{ modifiers: ['Ctrl'], key: 'ArrowLeft' }],
         callback: () => this.player.previousVideo()
      });

      this.youtubeFlowPlugin.addCommand({
         id: 'normal-speed',
         name: 'Vitesse normale',
         hotkeys: [{ modifiers: ['Ctrl'], key: '1' }],
         callback: () => this.player.setPlaybackSpeed(1.0)
      });

      this.youtubeFlowPlugin.addCommand({
         id: 'speed-increase',
         name: 'Augmenter la vitesse',
         hotkeys: [{ key: '+' }], // Comme l'extension Chrome
         callback: () => this.player.increaseSpeed()
      });

      this.youtubeFlowPlugin.addCommand({
         id: 'speed-decrease',
         name: 'Diminuer la vitesse',
         hotkeys: [{ key: '-' }], // Comme l'extension Chrome
         callback: () => this.player.decreaseSpeed()
      });

      // Raccourcis préréglés
      const speedPresets = [1, 2, 3, 4, 5, 8, 10, 16];
      speedPresets.forEach((speed, index) => {
         this.youtubeFlowPlugin.addCommand({
            id: `speed-${speed}x`,
            name: `Vitesse ${speed}x`,
            hotkeys: [{ modifiers: ['Ctrl'], key: `${index + 1}` }],
            callback: () => this.player.setPlaybackSpeed(speed)
         });
      });

      this.youtubeFlowPlugin.addCommand({
         id: 'seek-forward',
         name: 'Avancer de 10s',
         hotkeys: [{ modifiers: ['Shift'], key: 'ArrowRight' }],
         callback: () => this.player.seekForward()
      });

      this.youtubeFlowPlugin.addCommand({
         id: 'seek-backward',
         name: 'Reculer de 10s',
         hotkeys: [{ modifiers: ['Shift'], key: 'ArrowLeft' }],
         callback: () => this.player.seekBackward()
      });

      this.youtubeFlowPlugin.addCommand({
         id: 'speed-3x',
         name: 'Vitesse 3x',
         hotkeys: [{ modifiers: ['Ctrl'], key: '4' }],
         callback: () => this.player.setPlaybackSpeed(3.0)
      });

      this.youtubeFlowPlugin.addCommand({
         id: 'speed-4x',
         name: 'Vitesse 4x',
         hotkeys: [{ modifiers: ['Ctrl'], key: '5' }],
         callback: () => this.player.setPlaybackSpeed(4.0)
      });

      this.youtubeFlowPlugin.addCommand({
         id: 'speed-5x',
         name: 'Vitesse 5x',
         hotkeys: [{ modifiers: ['Ctrl'], key: '6' }],
         callback: () => this.player.setPlaybackSpeed(5.0)
      });
   }

   writeTimestamp() {
      if (!this.player.player) return;
      const time = Math.floor(this.player.player.getCurrentTime());
      const timestamp = this.formatTimestamp(time);
      
      const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (activeView) {
         const cursor = activeView.editor.getCursor();
         activeView.editor.replaceRange(`[${timestamp}]`, cursor);
      }
   }

   formatTimestamp(seconds) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
   }
}

// ---------- MEDIA AND SOURCE ----------
class MediaAndSource {
   constructor(plugin) {
      this.plugin = plugin;
      this.players = new Map();
      this.currentPlayer = null;
   }
   async initialize(videoId, container) {
      
      // Créer le player
      const video = document.createElement('video');
      container.appendChild(video);
      
      this.player = await this.createPlayer(videoId, container);

      // Support pour différentes sources
      if (this.settings.settings.playbackMode === 'stream' && this.isYouTubeUrl(videoId)) {
         await this.setupYouTubeStream(videoId);
      } else if (this.settings.settings.playbackMode === 'download' && this.isYouTubeUrl(videoId)) {
         await this.setupLocalVideo(videoId);
      }
}

   async createPlayer(videoId, container, options = {}) {
      try {
         // Tenter d'abord avec yt-player
         const player = await this.createYouTubePlayer(videoId, container);
         
         // Si on a besoin de vitesse > 2x, basculer sur solution alternative
         if (options.speed > 2) {
               return this.createCustomPlayer(videoId, container, options);
         }
         
         return player;
      } catch (error) {
         console.error('Erreur création player:', error);
         // Fallback sur solution alternative
         return this.createCustomPlayer(videoId, container, options);
      }
   }

   async getVideoMetadata(videoId) {
      try {
         const yt = await import('yt-dlp-wrap');
         const info = await yt.getInfo(videoId);
         return {
               title: info.videoDetails.title,
               duration: info.videoDetails.lengthSeconds,
               author: info.videoDetails.author.name,
               // ... autres métadonnées utiles
         };
      } catch (error) {
         console.error('Erreur métadonnées:', error);
         throw new Error('Impossible de récupérer les mtadonnées');
      }
   }
// STREAMING
   async setupYouTubeStream(videoId) {
      try {
         const yt = await import('yt-dlp-wrap');
         const info = await yt.getInfo(videoId);
         
         // Obtenir le format avec la meilleure qualité
         const format = yt.chooseFormat(info.formats, {
            quality: 'highestvideo'
         });

         // Créer un MediaSource
         const mediaSource = new MediaSource();
         this.streamUrl = URL.createObjectURL(mediaSource);

         mediaSource.addEventListener('sourceopen', async () => {
            const sourceBuffer = mediaSource.addSourceBuffer(format.mimeType);
            
            // Streaming par chunks
            const stream = yt(videoId, { format });
            const reader = stream.getReader();

            while (true) {
                  const {done, value} = await reader.read();
                  if (done) break;
                  await new Promise(resolve => {
                     sourceBuffer.appendBuffer(value);
                     sourceBuffer.addEventListener('updateend', resolve, {once: true});
                  });
            }

            mediaSource.endOfStream();
         });

      } catch (error) {
         console.error('Erreur streaming:', error);
         // Fallback sur le player YouTube standard si nécessaire
      }
   }
// DOWNLOAD
   async setupLocalVideo(path) {
         const { app } = Store.get();
         const url = await app.vault.adapter.getResourcePath(path);
         await this.shakaPlayer.load(url);
   }

   async loadVideoDownload(videoId, yt) {
      const YTDlpWrap = require('yt-dlp-wrap').default;
      const ytDlp = new YTDlpWrap();
   
      try {
         new Notice('Rcupération des informations...');
         
         // Obtenir les infos de la vidéo
         const videoInfo = await ytDlp.getVideoInfo(`https://www.youtube.com/watch?v=${videoId}`);
         
         // Choisir le meilleur format
         const format = videoInfo.formats.reduce((best, current) => {
            if (!best) return current;
            if (current.height > best.height) return current;
            return best;
         });
   
         new Notice('Téléchargement en cours...');
   
         // Télécharger avec progression
         await ytDlp.exec([
            `https://www.youtube.com/watch?v=${videoId}`,
            '-f', format.format_id,
            '--progress-template', '%(progress)s',
            '-o', '-'  // Output to stdout
         ], {
            onProgress: (progress) => {
               new Notice(`Téléchargement: ${Math.round(progress.percent)}%`);
            }
         });
   
         // Charger la vidéo dans le player
         this.player.src({
            src: format.url,
            type: format.ext === 'mp4' ? 'video/mp4' : `video/${format.ext}`
         });
   
      } catch (error) {
         console.error('Erreur téléchargement:', error);
         new Notice('Erreur lors du téléchargement');
         throw error;
      }
   }

}

// ---------- MEDIA OPERATIONS ----------
class MediaOperations {
   constructor() {
      this.players = new Map();
      this.currentPlayer = null;
   }
   async initialize(videoId, container) {
   }

   async extractAudio(videoId) {
   }
}

// ---------- TRANSCRIPTION ----------
class Transcript {
   constructor() {
      this.cache = new Map();
   }

   async getTranscript(videoId) {
      if (this.cache.has(videoId)) {
         return this.cache.get(videoId);
      }

      try {
         const { YoutubeTranscript } = await import('youtube-transcript');
         const transcript = await YoutubeTranscript.fetchTranscript(videoId);
         this.cache.set(videoId, transcript);
         return transcript;
      } catch (error) {
         console.error('Erreur lors de la récupération de la transcription:', error);
         throw new Error('Impossible de récupérer la transcription');
      }
   }

   async searchInTranscript(videoId, query) {
      const transcript = await this.getTranscript(videoId);
      return transcript.filter(item => 
         item.text.toLowerCase().includes(query.toLowerCase())
      );
   }
} 
// ---------- TRANSLATIONS ----------
console.log("Début du chargement de translations.js");

// Traductions générales de l'application
const translations = {
   fr: {
      settings: {
         displayMode: {
            name: "Mode d'affichage par défaut",
            desc: "Choisissez comment les vidéos s'ouvriront par défaut",
            options: {
               tab: "Onglet",
               sidebar: "Barre latérale",
               overlay: "Superposition"
            }
         },
         playbackMode: {
            name: "Mode de lecture",
            desc: "Choisir entre streaming ou téléchargement",
            options: {
               stream: "Streaming",
               download: "Téléchargement"
            }
         },
         favoriteSpeed: {
            name: "Vitesse préférée",
            desc: "Définir la vitesse préférée (utilisée avec Ctrl+4)"
         }
      },
      player: {
         title: "Lecteur YouTube",
         close: "Fermer",
         controls: {
            mute: "Couper le son",
            unmute: "Remettre le son"
         },
         menu: {
            mode: {
               title: "Changer le mode d'affichage",
               tab: "Ouvrir dans un onglet",
               sidebar: "Ouvrir dans la barre latérale",
               overlay: "Ouvrir en superposition"
            }
         }
      },
      ribbon: {
         title: "YouTube Flow - Changer le mode d'affichage"
      }
   },
   en: {
      settings: {
         displayMode: {
            name: "Default display mode",
            desc: "Choose how videos will open by default",
            options: {
               tab: "Tab",
               sidebar: "Sidebar",
               overlay: "Overlay"
            }
         },
         playbackMode: {
            name: "Playback mode",
            desc: "Choose between streaming or downloading",
            options: {
               stream: "Streaming",
               download: "Download"
            }
         },
         favoriteSpeed: {
            name: "Favorite speed",
            desc: "Set your favorite playback speed (used with Ctrl+4)"
         }
      },
      player: {
         title: "YouTube Player",
         close: "Close",
         controls: {
            mute: "Mute",
            unmute: "Unmute"
         },
         menu: {
            mode: {
               title: "Change display mode",
               tab: "Open in tab",
               sidebar: "Open in sidebar",
               overlay: "Open as overlay"
            }
         }
      },
      ribbon: {
         title: "YouTube Flow - Change display mode"
      }
   }
};


// ---------- PLAYLISTS ----------
class Playlists {
   constructor() {
      const { app, settings } = Store.get();
      this.app = app;
      this.settings = settings;
      
      this.playlist = [];
      this.createPlaylistUI();
   }

   createPlaylistUI() {
      // Créer le conteneur de la playlist
      this.playlistContainer = document.createElement('div');
      this.playlistContainer.className = 'youtube-flow-playlist';
      this.playlistContainer.style.cssText = `
         position: absolute;
         right: 0;
         top: 0;
         width: 300px;
         height: 100%;
         background: var(--background-secondary);
         border-left: 1px solid var(--background-modifier-border);
         display: flex;
         flex-direction: column;
         overflow: hidden;
      `;

      // En-tête de la playlist
      const header = document.createElement('div');
      header.className = 'youtube-flow-playlist-header';
      header.style.cssText = `
         padding: 10px;
         border-bottom: 1px solid var(--background-modifier-border);
         display: flex;
         justify-content: space-between;
         align-items: center;
      `;
      
      const title = document.createElement('h3');
      title.textContent = 'Playlist';
      title.style.margin = '0';
      
      const toggleBtn = document.createElement('button');
      toggleBtn.innerHTML = '⬅️';
      toggleBtn.onclick = () => this.togglePlaylist();
      
      header.appendChild(title);
      header.appendChild(toggleBtn);
      
      // Liste des vidéos
      this.playlistList = document.createElement('div');
      this.playlistList.className = 'youtube-flow-playlist-items';
      this.playlistList.style.cssText = `
         flex: 1;
         overflow-y: auto;
         padding: 10px;
      `;

      this.playlistContainer.appendChild(header);
      this.playlistContainer.appendChild(this.playlistList);
   }

   attachToContainer(container) {
      container.style.position = 'relative';
      container.appendChild(this.playlistContainer);
   }

   addVideo(videoId, title) {
// Vérifier si la vidéo existe déjà
      if (!this.playlist.some(video => video.videoId === videoId)) {
         this.playlist.push({ 
            videoId, 
            title,
            addedAt: new Date().toISOString()
         });
         this.updatePlaylistUI();
         this.savePlaylist();  // TODO: Implémenter la sauvegarde dans les settings
      }
   }

   removeVideo(videoId) {
      this.playlist = this.playlist.filter(video => video.videoId !== videoId);
      this.updatePlaylistUI();
      this.savePlaylist();
   }

   clearPlaylist() {
      this.playlist = [];
      this.updatePlaylistUI();
      this.savePlaylist();
   }

// Mise à jour de updatePlaylistUI pour inclure le bouton de suppression
   updatePlaylistUI() {
      this.playlistList.innerHTML = '';
      this.playlist.forEach((video, index) => {
         const item = document.createElement('div');
         item.className = 'youtube-flow-playlist-item';
         item.style.cssText = `
            padding: 8px;
            margin-bottom: 5px;
            background: var(--background-primary);
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
         `;

         const thumbnail = document.createElement('img');
         thumbnail.src = `https://img.youtube.com/vi/${video.videoId}/default.jpg`;
         thumbnail.style.width = '80px';

         const videoInfo = document.createElement('div');
         videoInfo.textContent = video.title || `Vidéo ${index + 1}`;

         item.appendChild(thumbnail);
         item.appendChild(videoInfo);

         const removeBtn = document.createElement('button');
         removeBtn.innerHTML = '❌';
         removeBtn.style.marginLeft = 'auto';
         removeBtn.onclick = (e) => {
            e.stopPropagation();
            this.removeVideo(video.videoId);
         };

         item.appendChild(removeBtn);
         this.playlistList.appendChild(item);
      });

// Ajouter un bouton pour vider la playlist
      if (this.playlist.length > 0) {
         const clearBtn = document.createElement('button');
         clearBtn.textContent = 'Vider la playlist';
         clearBtn.onclick = () => this.clearPlaylist();
         this.playlistList.appendChild(clearBtn);
      }
   }

// Méthodes pour la persistance
   async savePlaylist() {
      // TODO: Sauvegarder this.playlist dans les settings du plugin
      this.settings.settings.playlist = this.playlist;
      await this.settings.save();
   }

   async loadPlaylist() {
      // TODO: Charger la playlist depuis les settings du plugin
      // if (this.settings.settings.playlist) {
      //     this.playlist = this.settings.settings.playlist;
      //     this.updatePlaylistUI();
      // }
   }

   togglePlaylist() {
      const isVisible = this.playlistContainer.style.transform !== 'translateX(100%)';
      this.playlistContainer.style.transform = isVisible ? 'translateX(100%)' : 'translateX(0)';
   }
}

// ---------- MAIN ----------


export default class YouTubeFlowPlugin extends Plugin {
   async onload() {
      await Store.init(this);
      const { Settings, PlayerViewAndMode } = Store.get();
      this.PlayerViewAndMode = PlayerViewAndMode;

      this.app.workspace.onLayoutReady(() => {
         console.log("Layout prêt, initialisation des écouteurs...");
         
         if (Settings.settings.isVideoOpen && 
            Settings.settings.currentMode === 'overlay') {
            
            let editorEl = null;
            
            const activeLeaf = this.app.workspace.activeLeaf;
            if (activeLeaf) {
               editorEl = activeLeaf.view.containerEl.querySelector('.cm-editor');
               if (editorEl) {
                  editorEl.style.opacity = '0';
                  editorEl.style.transition = 'opacity 0.3s ease';
               }
            }

            setTimeout(() => {
               PlayerViewAndMode.displayVideo(
                  Settings.settings.lastVideoId || null, 
                  Settings.settings.currentMode
               ).then(() => {
                  if (editorEl) {
                     editorEl.style.opacity = '1';
                  }
               });
            }, 100);
         }

         this.registerView(
            'youtube-player',
            (leaf) => new PlayerContainer(leaf, PlayerViewAndMode.activeLeafId)
         );
         this.registerEvent(
            this.app.workspace.on('leaf-closed', (leaf) => {
               console.log("evenement leaf-closed détecté!", {
                  ferméeId: leaf?.id,
                  activeId: PlayerViewAndMode?.activeLeafId,
                  match: leaf?.id === PlayerViewAndMode?.activeLeafId
               });
               if (!leaf) {
                     console.log("Feuille fermée détectée!", {
                     ferméeId: leaf?.id,
                     activeId: PlayerViewAndMode?.activeLeafId,
                     match: leaf?.id === PlayerViewAndMode?.activeLeafId
                  });
                  return;
               }
               
               if (PlayerViewAndMode && leaf?.id && 
                  leaf.id === PlayerViewAndMode.activeLeafId) {
                  console.log("Vue YouTube fermée manuellement, nettoyage...");
               }
            })
         );
      });

// Ajouter un seul bouton dans la sidebar qui ouvre un menu
      const ribbonIcon = this.addRibbonIcon('video', 'YouTube Flow', (evt) => {});

      ribbonIcon.addEventListener('mouseenter', (evt) => {
         const menu = new Menu();
         const { PlayerViewAndMode, Settings } = Store.get();
         
         menu.addItem((item) => {
            item.setTitle("YouTube Tab")
               .setIcon("tab")
               .onClick(async () => {
                  const overlay = document.querySelector('.youtube-overlay');
                  if (overlay) {
                     const height = parseFloat(overlay.style.height);
                     if (!isNaN(height)) {
                        Settings.settings.viewHeight = height;
                        Settings.settings.overlayHeight = height;
                        await Settings.save();
                     }
                  }
                  // Forcer la fermeture des vues précédentes avant de changer de mode
                  await PlayerViewAndMode.closePreviousVideos();
                  // Réinitialiser l'activeLeafId pour forcer la création d'une nouvelle vue
                  PlayerViewAndMode.activeLeafId = null;
                  PlayerViewAndMode.displayVideo(
                     Settings.settings.lastVideoId || null, 
                     'tab'
                  );
               });
         });
         menu.addItem((item) => {
            item.setTitle("YouTube Sidebar")
               .setIcon("layout-sidebar-right")
               .onClick(async () => {
                  // Sauvegarder la taille actuelle avant de changer de mode
                  const overlay = document.querySelector('.youtube-overlay');
                  if (overlay) {
                     const height = parseFloat(overlay.style.height);
                     if (!isNaN(height)) {
                        Settings.settings.viewHeight = height;
                        Settings.settings.overlayHeight = height;
                        await Settings.save();
                     }
                  }
                  await PlayerViewAndMode.closePreviousVideos();
                  PlayerViewAndMode.activeLeafId = null;
                  PlayerViewAndMode.displayVideo(
                     Settings.settings.lastVideoId || null, 
                     'sidebar'
                  );
               });
         });
         menu.addItem((item) => {
            item.setTitle("YouTube Overlay")
               .setIcon("layout-top")
               .onClick(async () => {
                  // Sauvegarder la taille actuelle avant de changer de mode
                  const videoContainer = document.querySelector('.youtube-player div[style*="height"]');
                  if (videoContainer) {
                     const height = parseFloat(videoContainer.style.height);
                     if (!isNaN(height)) {
                        Settings.settings.viewHeight = height;
                        Settings.settings.overlayHeight = height;
                        await Settings.save();
                     }
                  }
                  await PlayerViewAndMode.closePreviousVideos();
                  PlayerViewAndMode.activeLeafId = null;
                  PlayerViewAndMode.displayVideo(
                     Settings.settings.lastVideoId || null, 
                     'overlay'
                  );
               });
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

      this.addSettingTab(new SettingsTab(this.app, this));
// Créer la "décoration" des liens YouTube dans les fichiers Markdown
      this.registerEditorExtension([
         ViewPlugin.define(view => ({
            decorations: createDecorations(view),
            update(update) {
               if (update.docChanged || update.viewportChanged) {
                  this.decorations = createDecorations(update.view);
               }
            }
         }), {
            decorations: v => v.decorations
         })
      ]);

      this.registerStyles();
   }

   async onunload() {
      try {
         const { PlayerViewAndMode } = Store.get();
         
         // S'assurer que toutes les vues sont fermées avant la désactivation
         if (PlayerViewAndMode) {
            // Désactiver les écouteurs d'événements
            this.app.workspace.off('leaf-closed');
            
            // Fermer proprement les vues
            await PlayerViewAndMode.closePreviousVideos();
         }

         // Nettoyer le Store en dernier
         Store.destroy();
      } catch (error) {
         console.warn("Erreur lors du déchargement:", error);
      }
   }

   registerStyles() {
      document.head.appendChild(document.createElement('style')).textContent = `
         .youtube-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: var(--background-primary);
            z-index: 100;
         }

         .youtube-view-controls {
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 101;
            display: flex;
            gap: 5px;
            background: var(--background-secondary);
            padding: 5px;
            border-radius: 5px;
            opacity: 0.8;
         }

         .youtube-view-close {
            cursor: pointer;
            padding: 5px;
            border-radius: 3px;
         }

         .resize-handle {
            position: absolute;
            bottom: -6px;
            left: 0;
            width: 100%;
            height: 12px;
            background: transparent;
            cursor: ns-resize;
            z-index: 102;
         }

         .resize-handle:hover {
            background: var(--interactive-accent);
            opacity: 0.3;
         }

         .resize-handle:active {
            background: var(--interactive-accent);
            opacity: 0.5;
         }

         .loading-overlay {
            opacity: 0;
            transition: opacity 0.3s ease;
         }
         
         .loading-overlay.ready {
            opacity: 1;
         }

         .youtube-overlay-close {
            cursor: pointer;
            padding: 5px;
            border-radius: 3px;
            background: var(--background-secondary);
         }

         .youtube-overlay-close:hover {
            opacity: 0.8;
         }

         .youtube-view-close:hover {
            opacity: 0.8;
         }

         .youtube-flow-control-bar {
            height: 40px;
            background: var(--background-secondary);
            border-top: 1px solid var(--background-modifier-border);
            display: flex;
            align-items: center;
            padding: 0 10px;
            position: relative;
            z-index: 101;
         }

         .youtube-flow-playback-rate {
            background: none;
            border: none;
            padding: 5px 10px;
            cursor: pointer;
            color: var(--text-normal);
            display: flex;
            align-items: center;
            gap: 5px;
            transition: opacity 0.2s ease;
         }

         .youtube-flow-playback-rate:hover {
            opacity: 0.8;
         }
      `;
   }
}
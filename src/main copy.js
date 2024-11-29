import { Plugin, Notice, ItemView, MarkdownView, PluginSettingTab, Setting, Menu } from 'obsidian';
import { ViewPlugin, Decoration, WidgetType } from '@codemirror/view';
import videojs from 'video.js';
import 'videojs-youtube';
import 'video.js/dist/video-js.css';

// ---------- STORE ET SETTINGS ----------
class Store {
   static instance = null;
   
   constructor(plugin) {
      if (Store.instance) {
         return Store.instance;
      }
      
      // Services Obsidian
      this.app = plugin.app;
      this.plugin = plugin;
      
      // Nos managers
      this.Settings = null;
      this.PlayerViewAndMode = null;
      Store.instance = this;
   }
   
   static async init(plugin) {
      if (!Store.instance) {
         new Store(plugin);
      }
      
      const instance = Store.instance;
      
      // 1. Settings en premier car les autres en dépendent
      instance.Settings = new Settings(plugin);
      await instance.Settings.load();
      
      // 2. Créer les instances
      instance.PlayerViewAndMode = new PlayerViewAndMode();
      
      // 3. Initialiser les instances après leur création
      await instance.PlayerViewAndMode.init();
      
      return instance;
   }

   static get() {
      if (!Store.instance) {
         return {
            Settings: null,
            PlayerViewAndMode: null,
            Player: null
         };
      }
      return Store.instance;
   }

   static destroy() {
      Store.instance = null;
   }
}
class Settings {
   constructor(plugin) {
      this.youtubeFlowPlugin = plugin;
      this.settings = {
         lastVideoId: null,
         isVideoOpen: null,
         playlist: [],
         currentMode: null,
         viewHeight: 60,
         playbackMode: 'stream'
      };
   }

   async load() {
      const savedData = await this.youtubeFlowPlugin.loadData() || {};
      this.settings = { ...this.settings, ...savedData };
      console.log("Settings chargées:", this.settings);
   }

   async save() {
      await this.youtubeFlowPlugin.saveData(this.settings);
      console.log("Settings sauvegardées:", this.settings);
   }
}

/* Centrage des contrôles avec flexbox
Utilisation du Menu d'Obsidian pour la sélection de vitesse
Affichage de la vitesse actuelle dans le bouton
Hover pour afficher le menu
Mise à jour du texte quand la vitesse change
Fixer la hauteur de la barre de contrôle à 50px
Réduire le thumbnail à 50x50px
S'assurer que l'image est bien proportionnée avec background-size: cover
Séparer les contrôles en deux barres distinctes
Placer la barre principale juste sous la vidéo
Mettre la barre de progression en dessous
Garder l'interactivité et les styles cohérents






*/
// ---------- MAIN ----------

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
   constructor(leaf, activeLeafId) {
      super(leaf);
      const { Settings, PlayerViewAndMode } = Store.get();
      this.Settings = Settings;
      this.PlayerViewAndMode = PlayerViewAndMode;
      this.videoId = null;
      this.activeLeafId = activeLeafId;
      this.VideoPlayer = null;
      
      // Initialiser comme une note Markdown vide
      this.contentEl.addClass('markdown-source-view');
      this.contentEl.addClass('mod-cm6');
      this.contentEl.style.background = 'var(--background-primary)';
      this.contentEl.empty();

      // Initialiser une vue Markdown vide
      const { app } = Store.get();
      const activeFile = app.workspace.getActiveFile();
      if (activeFile) {
         app.vault.append(activeFile, '').catch(error => {
            console.log("Erreur lors de l'initialisation de la vue Markdown:", error);
         });
      } else {
         // Si pas de fichier actif, on crée quand même une vue vide
         this.contentEl.createDiv('markdown-preview-view');
      }
   }

   getViewType() {
      return 'youtube-player';
   }

   getDisplayText() {
      return 'YouTube Player';
   }

   getState() {
      return {
         videoId: this.videoId
      };
   }

   async setState(state) {
      this.videoId = state.videoId;
      await this.onOpen();
   }

// onOpen() : Créer la vue
   async onOpen() {
      const container = this.containerEl.children[1];
      container.empty();
      container.style.background = 'var(--background-primary)';
      const videoId = this.leaf.getViewState().state.videoId;
      console.log(`Player.onOpen() - videoId: ${videoId}`);

      // Configuration du conteneur principal
      container.style.cssText = `
         display: flex;
         flex-direction: column;
         align-items: center;
         height: 100%;
         background: var(--background-primary);
         position: relative;
      `;

      // Créer les contrôles UI
      const controlsContainer = this.createControls(container);

      // Créer le conteneur vidéo avec la bonne hauteur
      const videoContainer = document.createElement('div');
      videoContainer.style.cssText = `
         width: 100%;
         height: ${this.Settings.settings.viewHeight || 60}%; 
         min-height: 100px;
         position: relative;
      `;
      container.appendChild(videoContainer);

      // Ajouter le resizer
      this.createResizer({
         container: container,
         targetElement: videoContainer,
         mode: this.Settings.settings.currentMode,
         onResize: (height) => {
            videoContainer.style.height = `${height}%`;
            this.Settings.settings.viewHeight = height;
            this.Settings.save();
         }
      });

      // Initialiser le player vidéo
      this.VideoPlayer = new VideoPlayer(this.Settings);
      await this.VideoPlayer.initializePlayer(videoId, videoContainer);
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
         mode,
         onResize,
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
class PlayerViewAndMode {
   constructor() {
      this.app = null;
      this.Settings = null;
      this.activeLeafId = null;
      this.activeView = null;
   }

   init() {
      const { app, Settings } = Store.get();
      this.app = app;
      this.Settings = Settings;
      this.activeLeafId = Settings.settings.activeLeafId || null;
   }

   async displayVideo(videoId, mode) {
      console.log(`displayVideo() ${videoId} en mode ${mode}`);
      
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
            state: { videoId }
         });
      } else {
         // Créer une nouvelle vue selon le mode
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
      }
      // Sauvegarder l'état
      this.Settings.settings.lastVideoId = videoId;
      this.Settings.settings.isVideoOpen = true;
      this.Settings.settings.activeLeafId = this.activeLeafId;
      this.Settings.settings.isChangingMode = false;
      await this.Settings.save();
   }
// restoreLastSession() : Restaurer la dernière session

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
   async createSidebarView(videoId) {
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
            state: { videoId }
         });
      } else {
         await this.closePreviousVideos();
         leaf = this.app.workspace.getRightLeaf(false);
         await leaf.setViewState({
            type: 'youtube-player',
            state: { videoId }
         });
         this.app.workspace.revealLeaf(leaf);
      }
      
      this.activeLeafId = leaf.id;
      this.activeView = leaf.view;
   }
// createTabView(videoId) : Créer la vue en tab
   async createTabView(videoId) {
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
            state: { videoId: videoId }
         });
      } else {
         await this.closePreviousVideos();
         leaf = this.app.workspace.getLeaf('split');
         await leaf.setViewState({
            type: 'youtube-player',
            state: { videoId: videoId }
         });
      }
      
      this.activeLeafId = leaf.id;
      this.activeView = leaf.view;
      
      // Activer la leaf pour la mettre au premier plan
      this.app.workspace.setActiveLeaf(leaf);
   }
// createOverlayView(videoId) : Créer la vue en overlay
   async createOverlayView(videoId) {
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
      
      // Vérifier si le CSS de video.js est chargé
      if (!document.querySelector('link[href*="video-js.css"]')) {
         const link = document.createElement('link');
         link.rel = 'stylesheet';
         link.href = 'https://vjs.zencdn.net/7.20.3/video-js.css';
         document.head.appendChild(link);
      }
      
      this.addCustomStyles();
   }

   addCustomStyles() {
      const style = document.createElement('style');
      style.textContent = `
         /* Styles de base */
         .video-js {
            font-family: var(--font-interface);
            background-color: var(--background-primary);
         }

         /* Barre de contrôle */
         .video-js .vjs-control-bar {
            background: var(--background-secondary);
            display: flex;
            flex-direction: row;
            align-items: center;
         }

         /* Menu de vitesse */
         .video-js .vjs-playback-rate .vjs-menu {
            display: none;
            position: absolute;
            bottom: 100%;
            width: auto;
         }

         .video-js .vjs-playback-rate:hover .vjs-menu {
            display: block;
         }

         .video-js .vjs-menu-button-popup .vjs-menu {
            left: -3em;
         }

         .video-js .vjs-menu-content {
            background-color: var(--background-secondary);
            border: 1px solid var(--background-modifier-border);
            border-radius: 4px;
            padding: 0.5em 0;
         }

         .video-js .vjs-menu-item {
            padding: 0.4em 1em;
            text-align: center;
            transition: background-color 0.2s;
         }

         .video-js .vjs-menu-item:hover {
            background-color: var(--interactive-accent);
            color: var(--text-on-accent);
         }

         /* Afficher la vitesse actuelle */
         .video-js .vjs-playback-rate-value {
            font-size: 1.1em;
            line-height: 2;
         }
      `;
      document.head.appendChild(style);
   }

   async initializePlayer(videoId, container) {
      try {
         const videoContainer = document.createElement('div');
         videoContainer.id = 'youtube-flow-player';
         videoContainer.className = 'youtube-flow-container';
         
         const playerWrapper = document.createElement('div');
         playerWrapper.className = 'player-wrapper';
         videoContainer.appendChild(playerWrapper);
         
         const video = document.createElement('video-js');
         video.className = 'video-js vjs-obsidian-theme';
         playerWrapper.appendChild(video);

         // Configuration du player avec plus d'options YouTube
         this.player = videojs(video, {
            techOrder: ['youtube'],
            sources: [{
               type: 'video/youtube',
               src: `https://www.youtube.com/watch?v=${videoId}`
            }],
            youtube: {
               iv_load_policy: 3,
               modestbranding: 1,
               cc_load_policy: 0,
               rel: 0,
               showinfo: 0,
               controls: 0
            },
            controls: true,
            fluid: true,
            playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5, 8, 10, 16],
            textTrackSettings: false,
            controlBar: {
               volumePanel: {
                  inline: true,
                  volumeControl: {
                     vertical: false
                  }
               },
               children: [
                  {
                     name: 'playToggle',
                     text: '▶️'
                  },
                  {
                     name: 'volumePanel',
                     inline: true
                  },
                  'currentTimeDisplay',
                  'timeDivider',
                  'durationDisplay',
                  'progressControl',
                  {
                     name: 'playbackRateMenuButton',
                     text: '🔄 Vitesse'
                  },
                  {
                     name: 'pictureInPictureToggle',
                     text: '📺'
                  }
               ]
            }
         });

      // Créer un bouton personnalisé pour la vitesse
      const playbackButton = this.player.controlBar.addChild('button', {
         text: '1x',
         className: 'vjs-playback-rate-button'
      });
      playbackButton.el().addEventListener('mouseenter', (e) => {
         const menu = new Menu();
         const rates = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5, 8, 10, 16];
         
         rates.forEach(rate => {
            menu.addItem(item => 
               item
                  .setTitle(`${rate}x`)
                  .setChecked(this.currentRate === rate)
                  .onClick(() => {
                     this.player.playbackRate(rate);
                     this.currentRate = rate;
                     playbackButton.el().textContent = `${rate}` + "Playback";
                  })
            );
         });

         // Positionner le menu sous le bouton
         const rect = e.target.getBoundingClientRect();
         menu.showAtPosition({
            x: rect.left,
            y: rect.bottom
         });
      });

      // Mettre à jour le texte quand la vitesse change
      this.player.on('ratechange', () => {
         this.currentRate = this.player.playbackRate();
         playbackButton.el().textContent = `${this.currentRate}x`;
      });

      container.appendChild(videoContainer);
      return this.player;
      } catch (error) {
      console.error("Erreur lors de l'initialisation du player vidéo:", error);
      this.createFallbackPlayer(videoId, container);
      }
      }
   // On garde le fallback en iframe
   createFallbackPlayer(videoId, container) {
      container.innerHTML = '';
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${videoId}`;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      container.appendChild(iframe);
   }

   async playerControl() {
   }
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
class MediaAndSourceManager {
   constructor() {
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
         new Notice('Récupération des informations...');
         
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
      `;
   }
}
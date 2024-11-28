const { Plugin, Notice, Modal, ItemView, WorkspaceLeaf, MarkdownView, PluginSettingTab, Setting, Menu } = require('obsidian');
const { EditorView, ViewPlugin, Decoration, WidgetType } = require('@codemirror/view');
const { EditorState } = require('@codemirror/state');
const { syntaxTreeAvailable } = require('@codemirror/language');

// 1. D'abord définir Store
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
      this.settingsManager = null;  // On initialise à null
      this.videoManager = null;     // On initialise à null
      this.player = null;           // On initialise à null
      
      Store.instance = this;
   }

   static async init(plugin) {
      if (!Store.instance) {
         const store = new Store(plugin);
         // Créer les managers dans le bon ordre
         store.settingsManager = new SettingsManager();
         await store.settingsManager.load();
         
         store.videoManager = new VideoViewManager();
         store.player = new YouTubePlayer();
         
         return store;
      }
      return Store.instance;
   }

   static get() {
      if (!Store.instance) {
         throw new Error('Store not initialized! Call Store.init(plugin) first');
      }
      return Store.instance;
   }
}

// 2. Ensuite les autres classes
class SettingsManager {
   constructor() {
      const { plugin: youtubeFlowPlugin } = Store.get();
      this.youtubeFlowPlugin = youtubeFlowPlugin;
      
      this.settings = {
         lastVideoId: 'aZyghlNOmiU',
         isVideoOpen: null,
         playlist: [],
         currentMode: null,
         overlayHeight: 60
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
class VideoViewManager {
   constructor() {
      const { app, settingsManager } = Store.get();
      this.app = app;
      this.settingsManager = settingsManager;
      
      this.activeLeafId = null;
      this.activeView = null;
      this.restoreLastSession();
   }
// restoreLastSession() : Restaurer la dernière session
   async restoreLastSession() {
      await this.closePreviousVideos();
      const settings = this.settingsManager.settings;
      
      console.log("lancement de restoreLastSession avec activeLeafId:", this.activeLeafId);
      if (settings.isVideoOpen && settings.lastVideoId) {
         // Attendre un peu que l'éditeur soit prêt pour le mode overlay
         if (settings.currentMode === 'overlay') {
            // Petit délai pour s'assurer que l'éditeur est chargé
            setTimeout(() => {
               this.displayVideo(settings.lastVideoId, settings.currentMode);
            }, 500);
         } else {
            await this.displayVideo(settings.lastVideoId, settings.currentMode);
         }
      }
   }

   async displayVideo(videoId, mode) {
      console.log(`Affichage vidéo ${videoId} en mode ${mode}`);
      await this.closePreviousVideos();
      
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

      this.settingsManager.settings.lastVideoId = videoId;
      this.settingsManager.settings.isVideoOpen = true;
      this.settingsManager.settings.currentMode = mode;
      this.settingsManager.settings.activeLeafId = this.activeLeafId;
      await this.settingsManager.save();
   }
// closePreviousVideos() : Fermer toutes vues précédentes et réinitialiser les états
   async closePreviousVideos() {
      console.log("=== Début closePreviousVideos ===");
      
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

      const leaves = this.app.workspace.getLeavesOfType('youtube-player');
      for (const leaf of leaves) {
         if (leaf && !leaf.detached) {
            leaf.detach();
         }
      }

      this.activeView = null;
      this.activeLeafId = null;
      
      console.log("État après fermeture:", {
         activeLeafId: this.activeLeafId,
         settings: this.settingsManager.settings
      });
      
      console.log("=== Fin closePreviousVideos ===");
      await this.settingsManager.save();
   }
   
// createSidebarView(videoId) : Créer la vue en sidebar
   async createSidebarView(videoId) {
      const leaf = this.app.workspace.getRightLeaf(false);
      
      this.app.workspace.revealLeaf(leaf);
      
      this.activeLeafId = leaf.id;
      console.log("Nouvelle sidebar créée avec ID:", leaf.id);
      
      const view = new YouTubePlayerView(leaf);
      this.activeView = view;
      
      await leaf.setViewState({
         type: 'youtube-player',
         state: { videoId }
      });
   }
// createTabView(videoId) : Créer la vue en tab
   async createTabView(videoId) {
      const leaf = this.app.workspace.splitActiveLeaf('vertical');
      
      this.activeLeafId = leaf.id;
      console.log("Nouvelle leaf créée avec ID:", leaf.id);
      
      const view = new YouTubePlayerView(leaf);
      this.activeView = view;
      
      await leaf.setViewState({
         type: 'youtube-player',
         state: { videoId }
      });
   }
// createOverlayView(videoId) : Créer la vue en overlay
   async createOverlayView(videoId) {
      const activeLeaf = this.app.workspace.activeLeaf;
      if (!activeLeaf) return;

      const editorEl = activeLeaf.view.containerEl.querySelector('.cm-editor');
      if (!editorEl) return;

      this.settingsManager.settings.overlayLeafId = activeLeaf.id;
      
      const overlayHeight = this.settingsManager.settings.overlayHeight || 60;
      
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
         will-change: transform;
         transform: translateZ(0);
      `;

      const resizeHandle = overlayContainer.createDiv('youtube-overlay-resize-handle');

      let startY, startHeight;
      let rafId = null;
      let lastSaveTime = Date.now();
      
      const updateSize = (newHeight) => {
         if (rafId) {
            cancelAnimationFrame(rafId);
         }
         
         rafId = requestAnimationFrame(() => {
            // Ajuster les limites min/max
            const minHeight = 150; // hauteur minimale en pixels
            const viewportHeight = window.innerHeight;
            const minHeightPercent = (minHeight / viewportHeight) * 100;
            const maxHeightPercent = 90;
            
            // Convertir le pourcentage en pixels pour la vérification
            const newHeightPixels = (newHeight / 100) * viewportHeight;
            
            // Appliquer les contraintes en pixels puis reconvertir en pourcentage
            const clampedHeight = newHeightPixels < minHeight 
               ? minHeightPercent 
               : Math.min(newHeight, maxHeightPercent);

            overlayContainer.style.height = `${clampedHeight}%`;
            editorEl.style.height = `${100 - clampedHeight}%`;
            editorEl.style.top = `${clampedHeight}%`;
            
            // Ajouter une classe spéciale quand on atteint la hauteur minimale
            if (clampedHeight <= minHeightPercent) {
               overlayContainer.classList.add('youtube-overlay-min-height');
               editorEl.classList.add('youtube-editor-max-height');
            } else {
               overlayContainer.classList.remove('youtube-overlay-min-height');
               editorEl.classList.remove('youtube-editor-max-height');
            }
            
            const now = Date.now();
            if (now - lastSaveTime >= 500) {
               this.settingsManager.settings.overlayHeight = clampedHeight;
               this.settingsManager.save();
               lastSaveTime = now;
            }
            
            rafId = null;
         });
      };

      const handleDrag = (e) => {
         const deltaY = e.clientY - startY;
         const newHeight = startHeight + (deltaY / window.innerHeight * 100);
         updateSize(newHeight);
      };

      const handleMouseUp = () => {
         document.removeEventListener('mousemove', handleDrag);
         document.removeEventListener('mouseup', handleMouseUp);
         document.body.style.cursor = '';
         
         // Remettre les styles à la fin du resize
         editorEl.style.transition = '';
         overlayContainer.style.transition = '';
         
         if (rafId) {
            cancelAnimationFrame(rafId);
         }
      };

      resizeHandle.addEventListener('mousedown', (e) => {
         startY = e.clientY;
         startHeight = parseFloat(overlayContainer.style.height);
         document.body.style.cursor = 'ns-resize';
         
         // Retirer temporairement les transitions et autres styles qui pourraient interférer
         editorEl.style.transition = 'none';
         overlayContainer.style.transition = 'none';
         
         // Retirer temporairement les contraintes de hauteur minimale
         editorEl.style.minHeight = 'auto';
         overlayContainer.classList.remove('youtube-overlay-min-height');
         editorEl.classList.remove('youtube-editor-max-height');
         
         document.addEventListener('mousemove', handleDrag);
         document.addEventListener('mouseup', handleMouseUp);
         
         e.preventDefault();
      });

      const closeButton = overlayContainer.createDiv('youtube-overlay-close');
      closeButton.innerHTML = '✕';
      
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${videoId}`;
      iframe.style.cssText = `
         width: 100%;
         height: 100%;
         border: none;
      `;
      
      overlayContainer.appendChild(iframe);
      
      closeButton.addEventListener('click', async () => {
         overlayContainer.remove();
         editorEl.style.height = '100%';
         editorEl.style.top = '0';
         this.settingsManager.settings.isVideoOpen = false;
         await this.settingsManager.save();
      });

      this.activeLeafId = activeLeaf.id;
      this.settingsManager.settings.lastVideoId = videoId;
      this.settingsManager.settings.isVideoOpen = true;
      this.settingsManager.settings.currentMode = 'overlay';
      await this.settingsManager.save();

      this.registerOverlayCleanup(activeLeaf, overlayContainer, editorEl);
   }

   registerOverlayCleanup(leaf, overlayContainer, editorEl) {
      const cleanup = () => {
         overlayContainer.remove();
         if (editorEl) {
            editorEl.style.height = '100%';
            editorEl.style.top = '0';
         }
         this.settingsManager.settings.isVideoOpen = false;
         this.settingsManager.settings.overlayLeafId = null;  // Nettoyer l'ID
         this.settingsManager.save();
      };

      leaf.on('unload', cleanup);
   }
}
class YouTubeFlowSettingTab extends PluginSettingTab {
   constructor(app, plugin) {
      super(app, plugin);
      const { settingsManager } = Store.get();
      this.settingsManager = settingsManager;
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
            .setValue(this.settingsManager.settings.currentMode)
            .onChange(async (value) => {
               this.settingsManager.settings.currentMode = value;
               await this.settingsManager.save();
            }));
   }
}
class YouTubePlayerView extends ItemView {
   constructor(leaf) {
      super(leaf);
      const { settingsManager } = Store.get();
      this.settingsManager = settingsManager;
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
      this.settingsManager.settings.isVideoOpen = false;
      this.settingsManager.settings.currentMode = null;
      await this.settingsManager.save();
      console.log("Nettoyage de la vue YouTube avec settings :", this.settingsManager.settings);
   }
}
class YouTubeFlowPlugin extends Plugin {
// Logique : Chargement des settings, initialisation de VideoViewManager lorsque le layout est prêt
   async onload() {
      // Initialiser le Store AVANT tout
      await Store.init(this);
      const { videoManager, settingsManager } = Store.get();

      this.app.workspace.onLayoutReady(() => {
         console.log("Layout prêt, initialisation des écouteurs...");
         
         this.registerView(
            'youtube-player',
            (leaf) => new YouTubePlayerView(leaf)
         );
         this.registerEvent(
            this.app.workspace.on('leaf-closed', (leaf) => {
               console.log("evenement leaf-closed détecté!", {
                  ferméeId: leaf?.id,
                  activeId: videoManager?.activeLeafId,
                  match: leaf?.id === videoManager?.activeLeafId
               });
               if (!leaf) {
                     console.log("Feuille fermée détectée!", {
                     ferméeId: leaf?.id,
                     activeId: videoManager?.activeLeafId,
                     match: leaf?.id === videoManager?.activeLeafId
                  });
                  return;
               }

               
               if (videoManager && leaf?.id && 
                  leaf.id === videoManager.activeLeafId) {
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
               .onClick(() => videoManager.displayVideo(settingsManager.settings.lastVideoId || 'default-id', 'tab'));
         });
         menu.addItem((item) => {
            item.setTitle("YouTube Sidebar")
               .setIcon("layout-sidebar-right")
               .onClick(() => videoManager.displayVideo(settingsManager.settings.lastVideoId || 'default-id', 'sidebar'));
         });
         menu.addItem((item) => {
            item.setTitle("YouTube Overlay")
               .setIcon("layout-top")
               .onClick(() => videoManager.displayVideo(settingsManager.settings.lastVideoId || 'default-id', 'overlay'));
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
// Créer la décoration des boutons
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
      const { videoManager } = Store.get();
      await videoManager.closePreviousVideos();
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

         .youtube-overlay-close {
            position: absolute;
            top: 10px;
            right: 10px;
            cursor: pointer;
            z-index: 101;
            padding: 5px;
            background: var(--background-secondary);
            border-radius: 3px;
            opacity: 0.8;
            transition: opacity 0.2s;
         }

         .youtube-overlay-close:hover {
            opacity: 1;
         }

         .youtube-overlay-resize-handle {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 6px;
            background: transparent;
            cursor: ns-resize;
            z-index: 102;
         }

         .youtube-overlay-resize-handle:hover {
            background: var(--interactive-accent);
            opacity: 0.3;
         }

         .youtube-overlay-resize-handle:active {
            background: var(--interactive-accent);
            opacity: 0.5;
         }

         .youtube-overlay-min-height {
            min-height: 150px !important;
            height: 150px !important;
         }

         .youtube-editor-max-height {
            height: calc(100% - 150px) !important;
            top: 150px !important;
         }

         .cm-editor {
            min-height: 100px !important;
         }
      `;
   }
}

function createDecorations(view) {
// Identifier les liens YouTube et ajouter les décorations
   const decorations = [];
   const doc = view.state.doc;
   
   for (let pos = 0; pos < doc.length;) {
      const line = doc.lineAt(pos);
      const lineText = line.text;
      
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let match;
      
      while ((match = linkRegex.exec(lineText)) !== null) {
         const fullMatch = match[0];
         const url = match[2];
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
                  widget: new YouTubeWidget(videoId),
                  side: 1
               }).range(endPos));
            }
         }
      }
      
      pos = line.to + 1;
   }
   
   return Decoration.set(decorations, true);
}

class YouTubeWidget extends WidgetType {
// Créer le widget de décoration avec le gestionnaire d'événements click
   constructor(videoId) {  // Plus besoin de plugin
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
         const { videoManager, settingsManager } = Store.get();
         videoManager.displayVideo(
            this.videoId,
            settingsManager.settings.currentMode || 'sidebar'
         );
      });
      
      return sparkle;
   }
   
   eq(other) {
      return other.videoId === this.videoId;
   }
   
   ignoreEvent() {
      return false;  // Important : permettre la propagation des événements
   }
}

class YouTubePlayer {
   constructor() {
      const { settingsManager } = Store.get();
      this.settingsManager = settingsManager;
      
      this.player = null;
      this.currentVideoIndex = 0;
      this.videoList = [];
   }

   getVideoId(url) {
      console.log('Extraction de l\'ID vidéo pour:', url);
      const regex = /(?:youtube\.com\/watch\?v=|youtu.be\/)([^&\s]+)/;
      const match = url.match(regex);
      const videoId = match ? match[1] : '';
      console.log('ID vidéo extrait:', videoId);
      return videoId;
   }

   play() {
      if (this.player) this.player.playVideo();
   }

   pause() {
      if (this.player) this.player.pauseVideo();
   }

   stop() {
      if (this.player) {
         this.player.stopVideo();
         this.player.seekTo(0);
      }
   }

   seekForward() {
      if (this.player) {
         const currentTime = this.player.getCurrentTime();
         this.player.seekTo(currentTime + 10, true);
      }
   }

   seekBackward() {
      if (this.player) {
         const currentTime = this.player.getCurrentTime();
         this.player.seekTo(Math.max(0, currentTime - 10), true);
      }
   }

   nextVideo() {
      if (this.currentVideoIndex < this.videoList.length - 1) {
         this.currentVideoIndex++;
         if (this.player && this.videoList[this.currentVideoIndex]) {
            this.player.loadVideoById(this.videoList[this.currentVideoIndex]);
         }
      }
   }

   previousVideo() {
      if (this.currentVideoIndex > 0) {
         this.currentVideoIndex--;
         if (this.player && this.videoList[this.currentVideoIndex]) {
            this.player.loadVideoById(this.videoList[this.currentVideoIndex]);
         }
      }
   }

   setPlaybackSpeed(speed) {
      if (this.player) this.player.setPlaybackRate(speed);
   }
}
class HotkeyManager {
   constructor() {
      const { app, youtubeFlowPlugin, player } = Store.get();
      this.app = app;
      this.youtubeFlowPlugin = youtubeFlowPlugin;
      this.player = player;
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
         id: 'increase-speed',
         name: 'Augmenter la vitesse',
         hotkeys: [{ modifiers: ['Ctrl'], key: '2' }],
         callback: () => this.player.setPlaybackSpeed(1.5)
      });

      this.youtubeFlowPlugin.addCommand({
         id: 'decrease-speed',
         name: 'Diminuer la vitesse',
         hotkeys: [{ modifiers: ['Ctrl'], key: '3' }],
         callback: () => this.player.setPlaybackSpeed(0.75)
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

class PlaylistManager {
   constructor() {
      const { app, settingsManager } = Store.get();
      this.app = app;
      this.settingsManager = settingsManager;
      
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
      this.settingsManager.settings.playlist = this.playlist;
      await this.settingsManager.save();
   }

   async loadPlaylist() {
      // TODO: Charger la playlist depuis les settings du plugin
      // if (this.settingsManager.settings.playlist) {
      //     this.playlist = this.settingsManager.settings.playlist;
      //     this.updatePlaylistUI();
      // }
   }

   togglePlaylist() {
      const isVisible = this.playlistContainer.style.transform !== 'translateX(100%)';
      this.playlistContainer.style.transform = isVisible ? 'translateX(100%)' : 'translateX(0)';
   }
}

module.exports = YouTubeFlowPlugin;

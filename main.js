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
      const store = new Store(plugin);
      // Créer les managers dans le bon ordre
      store.settingsManager = new SettingsManager();
      await store.settingsManager.load();
      
      store.videoManager = new VideoViewManager();
      
      return store;
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
         currentMode: null
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
      this.activeLeafId = settingsManager.settings.activeLeafId || null;
      this.activeView = null;
   }

   async displayVideo(videoId, mode) {
      console.log(`displayVideo() ${videoId} en mode ${mode}`);
      
      // Si on a déjà une vue ouverte et qu'on change de mode
      if (this.settingsManager.settings.isVideoOpen && 
          this.settingsManager.settings.currentMode !== mode) {
         console.log("Changement de mode détecté, fermeture des vues précédentes");
         // Forcer la fermeture de toutes les vues précédentes
         await this.closePreviousVideos();
         // Réinitialiser l'ID pour forcer une nouvelle création
         this.activeLeafId = null;
      }
      
      // Indiquer qu'on change de mode pour éviter les fermetures inutiles
      this.settingsManager.settings.isChangingMode = true;
      this.settingsManager.settings.currentMode = mode;
      
      // Chercher une leaf YouTube existante seulement si on ne change pas de mode
      let targetLeaf = null;
      if (this.activeLeafId && this.settingsManager.settings.currentMode === mode) {
         const existingLeaves = this.app.workspace.getLeavesOfType('youtube-player');
         targetLeaf = existingLeaves.find(leaf => leaf.id === this.activeLeafId);
      }

      // Si on trouve la leaf et qu'on ne change pas de mode, l'utiliser
      if (targetLeaf && this.settingsManager.settings.currentMode === mode) {
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
      this.settingsManager.settings.lastVideoId = videoId;
      this.settingsManager.settings.isVideoOpen = true;
      this.settingsManager.settings.activeLeafId = this.activeLeafId;
      this.settingsManager.settings.isChangingMode = false;
      await this.settingsManager.save();
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

      // Gérer toutes les leaves YouTube sans exception lors d'un changement de mode
      const leaves = this.app.workspace.getLeavesOfType('youtube-player');
      for (const leaf of leaves) {
         if (leaf && !leaf.detached) {
            leaf.detach();
         }
      }

      // Réinitialiser les états
      this.activeView = null;
      this.activeLeafId = null;
      
      console.log("État après fermeture:", {
         activeLeafId: this.activeLeafId
      });
      
      await this.settingsManager.save();
   }

   async restoreLastSession() {
      const settings = this.settingsManager.settings;
      
      console.log("lancement de restoreLastSession", settings);
      
      // Ne restaurer que si une vido était ouverte et qu'on a un ID valide
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
         await this.settingsManager.save();
      }
   }

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
      this.settingsManager.settings.overlayLeafId = activeLeaf.id;
      
      // Utiliser la hauteur sauvegardée ou la valeur par défaut (60%)
      const overlayHeight = this.settingsManager.settings.overlayHeight || 60;
      
      // Appliquer immédiatement la hauteur sauvegardée
      editorEl.style.height = `${100 - overlayHeight}%`;
      editorEl.style.position = 'relative';
      editorEl.style.top = `${overlayHeight}%`;

      const overlayContainer = activeLeaf.view.containerEl.createDiv('youtube-overlay');
      // Appliquer la même hauteur au container
      overlayContainer.style.height = `${overlayHeight}%`;
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
      
      const resizeHandle = overlayContainer.createDiv('youtube-overlay-resize-handle');
      
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
      });

      const updateSize = (newHeight) => {
         if (rafId) {
            cancelAnimationFrame(rafId);
         }
         
         rafId = requestAnimationFrame(() => {
            const clampedHeight = Math.min(Math.max(newHeight, 20), 90);
            overlayContainer.style.height = `${clampedHeight}%`;
            editorEl.style.height = `${100 - clampedHeight}%`;
            editorEl.style.top = `${clampedHeight}%`;
            
            const now = Date.now();
            if (now - lastSaveTime >= 300) {
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

      resizeHandle.addEventListener('mousedown', (e) => {
         startY = e.clientY;
         startHeight = parseFloat(overlayContainer.style.height);
         document.body.style.cursor = 'ns-resize';
         
         // Créer une couche transparente pour capturer les événements
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
         
         const handleMouseUp = () => {
            overlay.remove();
            document.removeEventListener('mousemove', handleDrag);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            
            if (rafId) {
               cancelAnimationFrame(rafId);
            }
         };
         
         document.addEventListener('mousemove', handleDrag);
         document.addEventListener('mouseup', handleMouseUp);
         
         e.preventDefault();
         e.stopPropagation();
      });
      
      closeButton.addEventListener('click', async () => {
         overlayContainer.remove();
         editorEl.style.height = '100%';
         editorEl.style.top = '0';
         this.settingsManager.settings.isVideoOpen = false;
         await this.settingsManager.save();
      });

      this.settingsManager.settings.lastVideoId = videoId;
      this.settingsManager.settings.isVideoOpen = true;
      this.settingsManager.settings.currentMode = 'overlay';

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
   constructor(leaf, activeLeafId) {  // Ajout du paramètre activeLeafId
      super(leaf);
      const { settingsManager } = Store.get();
      this.settingsManager = settingsManager;
      this.videoId = null;
      this.activeLeafId = activeLeafId;  // Stockage de l'ID
      
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
      console.log(`YouTubePlayerView.onOpen() - videoId: ${videoId}`);

      container.style.cssText = `
         display: flex;
         flex-direction: column;
         align-items: center;
         height: 100%;
         transition: all 0.2s ease-in-out;
         background: var(--background-primary);
         position: relative;
      `;

      // Ajouter le bouton de fermeture
      const closeButton = container.createDiv('youtube-view-close');
      closeButton.innerHTML = '✕';
      closeButton.style.cssText = `
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
      `;
      
      closeButton.addEventListener('click', async () => {
         // Fermer la leaf
         this.leaf.detach();
         // Mettre à jour les settings
         this.settingsManager.settings.isVideoOpen = false;
         await this.settingsManager.save();
      });

      closeButton.addEventListener('mouseenter', () => {
         closeButton.style.opacity = '1';
      });

      closeButton.addEventListener('mouseleave', () => {
         closeButton.style.opacity = '0.8';
      });

      const videoContainer = document.createElement('div');
      videoContainer.style.cssText = `
         width: 100%;
         height: 60%; 
         min-height: 100px;
      `;

      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&rel=0&modestbranding=1&permissions-policy=ch-ua-form-factors=()`;
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-popups allow-presentation');
      iframe.style.cssText = `
         width: 100%;
         height: 100%;
         border: none;
      `;
      
      videoContainer.appendChild(iframe);
      container.appendChild(videoContainer);
   }
// onClose() : Mettre à jour les settings quand la vue est fermée
   async onClose() {
      // Ne mettre à jour isVideoOpen que si c'est la dernière vue YouTube
      // ET si on n'est pas en train de changer de mode
      const leaves = this.app.workspace.getLeavesOfType('youtube-player');
      if (leaves.length <= 1 && !this.settingsManager.settings.isChangingMode) {
         this.settingsManager.settings.isVideoOpen = false;
         await this.settingsManager.save();
      }
      console.log("onClose avec settings :", this.settingsManager.settings);
   }
}
class YouTubeFlowPlugin extends Plugin {
// Logique : Chargement des settings, initialisation de VideoViewManager lorsque le layout est prêt
   async onload() {
      await Store.init(this);
      const { videoManager, settingsManager } = Store.get();

      // Utiliser registerStyles au lieu de addStyle
      this.registerStyles(`
         .loading-overlay {
            opacity: 0;
            transition: opacity 0.3s ease;
         }
         .loading-overlay.ready {
            opacity: 1;
         }
      `);

      this.app.workspace.onLayoutReady(() => {
         console.log("Layout prêt, initialisation des écouteurs...");
         
         if (settingsManager.settings.isVideoOpen && 
            settingsManager.settings.currentMode === 'overlay') {
            
            // Déplacer la déclaration de editorEl en dehors du if
            let editorEl = null;
            
            // Masquer l'éditeur immédiatement
            const activeLeaf = this.app.workspace.activeLeaf;
            if (activeLeaf) {
               editorEl = activeLeaf.view.containerEl.querySelector('.cm-editor');
               if (editorEl) {
                  editorEl.style.opacity = '0';
                  editorEl.style.transition = 'opacity 0.3s ease';
               }
            }

            setTimeout(() => {
               videoManager.displayVideo(
                  settingsManager.settings.lastVideoId, 
                  settingsManager.settings.currentMode
               ).then(() => {
                  if (editorEl) {
                     editorEl.style.opacity = '1';
                  }
               });
            }, 100);
         }

         this.registerView(
            'youtube-player',
            (leaf) => new YouTubePlayerView(leaf, videoManager.activeLeafId)  // Passage de l'ID
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
               .onClick(async () => {
                  // Forcer la fermeture des vues précédentes avant de changer de mode
                  await videoManager.closePreviousVideos();
                  // Réinitialiser l'activeLeafId pour forcer la création d'une nouvelle vue
                  videoManager.activeLeafId = null;
                  videoManager.displayVideo(settingsManager.settings.lastVideoId || 'default-id', 'tab');
               });
         });
         menu.addItem((item) => {
            item.setTitle("YouTube Sidebar")
               .setIcon("layout-sidebar-right")
               .onClick(async () => {
                  await videoManager.closePreviousVideos();
                  videoManager.activeLeafId = null;
                  videoManager.displayVideo(settingsManager.settings.lastVideoId || 'default-id', 'sidebar');
               });
         });
         menu.addItem((item) => {
            item.setTitle("YouTube Overlay")
               .setIcon("layout-top")
               .onClick(async () => {
                  await videoManager.closePreviousVideos();
                  videoManager.activeLeafId = null;
                  videoManager.displayVideo(settingsManager.settings.lastVideoId || 'default-id', 'overlay');
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

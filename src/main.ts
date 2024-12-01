import { Plugin, Notice, ItemView, PluginSettingTab, Setting, Menu } from 'obsidian';
import { ViewPlugin, Decoration, WidgetType } from '@codemirror/view';
import videojs from 'video.js';
import 'videojs-youtube';
import { DisplayVideoParams, VideoMode } from './types';
import { Settings } from './settings';
import { VideoPlayer } from './videoPlayer';

class Store {
   static instance: Store | null = null;
   app: App;  // de obsidian
   plugin!: Plugin;
   VideoPlayer: VideoPlayer | null = null;
   
   constructor(plugin: Plugin) {
      if (Store.instance) {
         return Store.instance;
      }
      
      // Services Obsidian
      this.app = plugin.app;
      this.plugin = plugin;
      
      // Instance du VideoPlayer
      this.VideoPlayer = null;
      
      // Traductions
      this.translations = {
         fr: {
            player: {
               title: 'Lecteur YouTube',
               close: 'Fermer'
            }
         },
         en: {
            player: {
               title: 'YouTube Player',
               close: 'Close'
            }
         }
      };
      
      // Détecter la langue d'Obsidian
      const locale = document.documentElement.lang?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
      
      // Utiliser la langue détectée
      this.i18n = this.translations[locale] || this.translations.en;
      
      // Définir la méthode de traduction
      this.t = (key) => {
         if (!this.i18n) {
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
      
      // Initialiser le VideoPlayer
      instance.VideoPlayer = new VideoPlayer(instance.Settings);
      
      return instance;
   }

   static get() {
      if (!Store.instance) {
         return {
            Settings: null,
            PlayerViewAndMode: null,
            VideoPlayer: null,
            t: (key) => key
         };
      }
      return Store.instance;
   }

   // Méthode pour mettre à jour le VideoPlayer
   static setVideoPlayer(player) {
      if (Store.instance) {
         Store.instance.VideoPlayer = player;
      }
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

      // Setting pour la vitesse favorite
      new Setting(containerEl)
         .setName('Vitesse de lecture favorite')
         .setDesc('Définir la vitesse qui sera utilisée avec le raccourci Ctrl+4')
         .addDropdown(dropdown => {
            // Ajouter les options de vitesse courantes
            const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5, 8, 10, 16];
            speeds.forEach(speed => {
               dropdown.addOption(speed.toString(), `${speed}x`);
            });
            return dropdown
               .setValue((this.Settings.settings.favoriteSpeed || 2).toString())
               .onChange(async (value) => {
                  this.Settings.settings.favoriteSpeed = parseFloat(value);
                  await this.Settings.save();
               });
         });

      new Setting(containerEl)
         .setName('Recommandations YouTube')
         .setDesc('Afficher les recommandations YouTube à la fin des vidéos')
         .addToggle(toggle => toggle
            .setValue(this.Settings.showYoutubeRecommendations)
            .onChange(async (value) => {
               this.Settings.showYoutubeRecommendations = value;
               await this.Settings.save();
               
               // Il faut recharger le player pour que les changements prennent effet
               const { VideoPlayer } = Store.get();
               if (VideoPlayer?.player) {
                  VideoPlayer.player.src({
                     type: 'video/youtube',
                     src: VideoPlayer.player.currentSrc()
                  });
               }
            }));
   }
}

// ---------- VIEW ----------
class PlayerContainer extends ItemView {
   constructor(leaf, activeLeafId, plugin) {
      super(leaf);
      const { Settings, PlayerViewAndMode, t } = Store.get();
      this.plugin = plugin;
      this.Settings = Settings;
      this.PlayerViewAndMode = PlayerViewAndMode;
      this.t = t;
      this.videoId = null;
      this.timestamp = 0;
      this.activeLeafId = activeLeafId;
      
      // Initialiser comme une note Markdown vide
      this.contentEl.addClass('markdown-source-view');
      this.contentEl.addClass('mod-cm6');
      this.contentEl.style.background = 'var(--background-primary)';
      this.contentEl.empty();

      // Garder une référence statique au player
      if (!PlayerContainer.videoPlayer) {
         PlayerContainer.videoPlayer = new VideoPlayer(Settings);
      }
      this.VideoPlayer = PlayerContainer.videoPlayer;
   }

   getViewType() {
      return 'youtube-player';
   }

   getDisplayText() {
      return this.t('player.title');
   }

   getState() {
      return {
         type: 'youtube-player'
      };
   }

   async setState(state) {
      await this.onOpen();
   }

   async onOpen() {
      const container = this.containerEl.children[1];
      if (!container) {
         return;
      }

      try {
         container.empty();
         container.style.background = 'var(--background-primary)';
         
         const { Settings } = Store.get();
         const videoId = Settings.settings.lastVideoId;
         const timestamp = Settings.settings.lastTimestamp || 0;
         
         const playerSection = document.createElement('div');
         playerSection.style.cssText = `
            width: 100%;
            height: ${Settings.settings.viewHeight || 60}%;
            min-height: 100px;
            position: relative;
            display: flex;
            flex-direction: column;
         `;
         container.appendChild(playerSection);

         try {
            // Utiliser l'instance unique du player
            await this.VideoPlayer.initializePlayer(videoId, playerSection, timestamp);
         } catch (error) {
            console.error("Erreur lors de l'initialisation du player:", error);
            this.VideoPlayer.createFallbackPlayer(videoId, playerSection, timestamp);
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
            this.VideoPlayer.createFallbackPlayer(videoId, container, timestamp);
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
   async displayVideo({ videoId, mode, timestamp = 0, fromUserClick = false }) {
      // Gérer le cas où params est null
      if (!videoId) {
         console.warn("Pas de videoId fourni à displayVideo");
         return;
      }

      console.log(`displayVideo() ${videoId} en mode ${mode} avec timestamp ${timestamp}`);
      
      // Si on a déjà une vue ouverte et qu'on change de mode
      if (this.Settings.settings.isVideoOpen && 
         this.Settings.settings.currentMode !== mode) {
         // Sauvegarder le videoId avant de fermer
         const currentVideoId = videoId;
         // Forcer la fermeture de toutes les vues précédentes
         await this.closePreviousVideos();
         // Réinitialiser l'ID pour forcer une nouvelle création
         this.activeLeafId = null;
         // Restaurer le videoId
         this.Settings.settings.lastVideoId = currentVideoId;
      }
      
      // Mettre à jour le mode immédiatement
      this.Settings.settings.currentMode = mode;
      await this.Settings.save();
      
      // Créer une nouvelle vue selon le mode
      switch(mode) {
         case 'tab':
            await this.createTabView(videoId, timestamp);
            break;
         case 'overlay':
            await this.createOverlayView(videoId, timestamp);
            break;
         case 'sidebar':
         default:
            await this.createSidebarView(videoId, timestamp);
      }

      // Sauvegarder l'état final
      this.Settings.settings.lastVideoId = videoId;
      this.Settings.settings.lastTimestamp = timestamp;
      this.Settings.settings.isVideoOpen = true;
      this.Settings.settings.activeLeafId = this.activeLeafId;
      await this.Settings.save();
   }

   async restoreLastSession() {
      const settings = this.Settings.settings;
      
      // Ne restaurer que si une vido tait ouverte et qu'on a un ID valide
      if (settings.isVideoOpen && settings.lastVideoId && settings.currentMode) {
         // S'assurer qu'il n'y a pas de vues existantes
         await this.closePreviousVideos();
         
         
         // Attendre un peu que l'éditeur soit prêt pour le mode overlay
         if (settings.currentMode === 'overlay') {
            setTimeout(() => {
               this.displayVideo({
                  videoId: settings.lastVideoId,
                  mode: settings.currentMode,
                  timestamp: settings.lastTimestamp
               });
            }, 500);
         } else {
            await this.displayVideo({
               videoId: settings.lastVideoId,
               mode: settings.currentMode,
               timestamp: settings.lastTimestamp
            });
         }
      } else {
         // Réinitialiser l'état si les conditions ne sont pas remplies
         settings.isVideoOpen = false;
         await this.Settings.save();
      }
   }

   async closePreviousVideos() {
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
         // Disposer l'ancien player avant de mettre à jour la vue
         if (this.VideoPlayer && this.VideoPlayer.player) {
            this.VideoPlayer.player.dispose();
            this.VideoPlayer.player = null;
         }
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
         leaf.parent.type === 'tabs'
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
         // Créer un nouvel onglet
         leaf = this.app.workspace.getLeaf('split');
         await leaf.setViewState({
            type: 'youtube-player',
            state: { videoId, timestamp }
         });
         // S'assurer que l'onglet est visible
         this.app.workspace.revealLeaf(leaf);
      }
      
      // Mettre à jour les références
      this.activeLeafId = leaf.id;
      this.activeView = leaf.view;
   }
// createOverlayView(videoId) : Créer la vue en overlay
   async createOverlayView(videoId, timestamp = 0) {
      const activeLeaf = this.app.workspace.activeLeaf;
      if (!activeLeaf) return;

      const editorEl = activeLeaf.view.containerEl.querySelector('.cm-editor');
      if (!editorEl) return;

      // Vérifier si on a déjà une overlay sur cette leaf
      const existingOverlay = activeLeaf.view.containerEl.querySelector('.youtube-overlay');
      if (existingOverlay && activeLeaf.id === this.activeLeafId) {
         // Mettre à jour la vidéo dans l'overlay existant
         if (this.VideoPlayer && this.VideoPlayer.player) {
            this.VideoPlayer.player.src({
               type: 'video/youtube',
               src: `https://www.youtube.com/watch?v=${videoId}`
            });
            return;
         }
      }

      // Nettoyer l'ancien overlay s'il existe
      if (existingOverlay) {
         existingOverlay.remove();
         editorEl.style.height = '100%';
         editorEl.style.top = '0';
      }

      // Définir immédiatement l'ID de la leaf active
      this.activeLeafId = activeLeaf.id;
      this.activeView = activeLeaf.view;

      // Sauvegarder l'ID de la feuille active pour la restauration
      this.Settings.settings.overlayLeafId = activeLeaf.id;
      
      // Utiliser la hauteur sauvegardée ou la valeur par défaut (60%)
      const overlayHeight = this.Settings.settings.overlayHeight || 60;
      
      // Appliquer immédiatement la hauteur sauvegardée
      editorEl.style.height = `${100 - overlayHeight}%`;
      editorEl.style.position = 'relative';
      editorEl.style.top = `${overlayHeight}%`;

      // Créer le conteneur de l'overlay
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
      `;

      // Créer le conteneur des contrôles
      const controlsContainer = overlayContainer.createDiv('youtube-overlay-controls');
      controlsContainer.style.cssText = `
         position: absolute;
         top: 10px;
         right: 10px;
         z-index: 101;
         display: flex;
         gap: 5px;
      `;

      // Ajouter le bouton de fermeture
      const closeButton = controlsContainer.createDiv('youtube-overlay-close');
      closeButton.innerHTML = '✕';
      closeButton.style.cssText = `
         cursor: pointer;
         padding: 5px;
         background: var(--background-secondary);
         border-radius: 3px;
         opacity: 0.8;
      `;

      // Créer le conteneur pour le player
      const playerContainer = overlayContainer.createDiv('player-container');
      playerContainer.style.cssText = `
         width: 100%;
         height: 100%;
         display: flex;
         align-items: center;
         justify-content: center;
      `;

      // Initialiser le player dans le conteneur
      this.VideoPlayer = new VideoPlayer(this.Settings);
      await this.VideoPlayer.initializePlayer(videoId, playerContainer, timestamp);
      
      closeButton.addEventListener('click', async () => {
         const { PlayerViewAndMode } = Store.get();
         await PlayerViewAndMode.closePreviousVideos();
      });

      // Gérer le redimensionnement
      const resizeHandle = overlayContainer.createDiv('resize-handle');
      resizeHandle.style.cssText = `
         position: absolute;
         bottom: 0;
         left: 0;
         width: 100%;
         height: 12px;
         cursor: ns-resize;
         z-index: 102;
      `;

      this.createResizer({
         container: activeLeaf.view.containerEl,
         targetElement: overlayContainer,
         handle: resizeHandle,
         mode: 'overlay',
         onResize: (height) => {
            overlayContainer.style.height = `${height}%`;
            editorEl.style.height = `${100 - height}%`;
            editorEl.style.top = `${height}%`;
            this.Settings.settings.overlayHeight = height;
            this.Settings.save();
         }
      });

      // Sauvegarder l'état
      this.Settings.settings.lastVideoId = videoId;
      this.Settings.settings.isVideoOpen = true;
      this.Settings.settings.currentMode = 'overlay';
      await this.Settings.save();

      // Enregistrer le nettoyage
      this.registerOverlayCleanup(activeLeaf, overlayContainer, editorEl);
   }
   async registerOverlayCleanup(leaf, overlayContainer, editorEl) {
      const cleanup = async () => {
         overlayContainer.remove();
         if (editorEl) {
            editorEl.style.height = '100%';
            editorEl.style.top = '0';
         }
         this.Settings.settings.isVideoOpen = false;
         this.Settings.settings.overlayLeafId = null;  // Nettoyer l'ID
         await this.Settings.save();
      };

      leaf.on('unload', cleanup);
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
            PlayerViewAndMode.displayVideo({
               videoId: this.videoId,
               mode: Settings.settings.currentMode || 'sidebar',
               timestamp: this.timestamp,
               fromUserClick: true
            });
         }
      });
      
      return sparkle;
   }
}

class Hotkeys {
   constructor(plugin) {
      console.log("Initialisation des Hotkeys");
      this.plugin = plugin;
      this.app = plugin.app;
   }

   registerHotkeys() {
      try {
         // Contrôles de lecture
         this.plugin.addCommand({
               id: 'youtube-play-pause',
               name: 'YouTube - Lecture/Pause',
               hotkeys: [{ modifiers: ['Shift'], key: 'Space' }],
               callback: () => {
                  console.log("Raccourci play/pause activé");
                  const store = Store.get();
                  console.log("État du store:", store);
                  const { VideoPlayer } = store;
                  console.log("VideoPlayer récupéré:", VideoPlayer);
                  
                  if (!VideoPlayer?.player) {
                     console.log("Pas de player disponible");
                     return;
                  }
                  
                  if (VideoPlayer.player.paused()) {
                     console.log("Lancement de la lecture");
                     VideoPlayer.player.play();
                  } else {
                     console.log("Mise en pause");
                     VideoPlayer.player.pause();
                  }
               }
         });

         // Contrôles de vitesse
         this.plugin.addCommand({
               id: 'youtube-speed-increase',
               name: 'YouTube - Augmenter la vitesse',
               hotkeys: [{ modifiers: ['Mod'], key: '3' }],
               callback: () => {
                  console.log("Raccourci augmentation vitesse activé");
                  const { VideoPlayer } = Store.get();
                  if (!VideoPlayer?.player) {
                     return;
                  }
                  
                  const currentRate = VideoPlayer.player.playbackRate();
                  console.log("Vitesse actuelle:", currentRate);
                  const newRate = Math.min(16, currentRate + 0.25);
                  console.log("Nouvelle vitesse:", newRate);
                  VideoPlayer.player.playbackRate(newRate);
                  VideoPlayer.updatePlaybackRateButton(newRate);
               }
         });

         this.plugin.addCommand({
               id: 'youtube-speed-decrease',
               name: 'YouTube - Diminuer la vitesse',
               hotkeys: [{ modifiers: ['Mod'], key: '1' }],
               callback: () => {
                  console.log("Raccourci diminution vitesse activé");
                  const { VideoPlayer } = Store.get();
                  if (!VideoPlayer?.player) {
                     return;
                  }
                  
                  const currentRate = VideoPlayer.player.playbackRate();
                  console.log("Vitesse actuelle:", currentRate);
                  const newRate = Math.max(0.25, currentRate - 0.25);
                  console.log("Nouvelle vitesse:", newRate);
                  VideoPlayer.player.playbackRate(newRate);
                  VideoPlayer.updatePlaybackRateButton(newRate);
               }
         });

         // Vitesse normale (x1)
         this.plugin.addCommand({
               id: 'youtube-speed-normal',
               name: 'YouTube - Vitesse normale (x1)',
               hotkeys: [{ modifiers: ['Mod'], key: '2' }],
               callback: () => {
                  console.log("Raccourci vitesse normale activé");
                  const { VideoPlayer } = Store.get();
                  if (!VideoPlayer?.player) {
                     return;
                  }
                  
                  VideoPlayer.player.playbackRate(1);
                  VideoPlayer.updatePlaybackRateButton(1);
               }
         });

         // Vitesse favorite
         this.plugin.addCommand({
               id: 'youtube-speed-favorite',
               name: 'YouTube - Vitesse favorite',
               hotkeys: [{ modifiers: ['Mod'], key: '4' }],
               callback: () => {
                  console.log("Raccourci vitesse favorite activé");
                  const { VideoPlayer, Settings } = Store.get();
                  if (!VideoPlayer?.player) {
                     return;
                  }
                  
                  const favoriteSpeed = Settings.settings.favoriteSpeed || 2;
                  console.log("Vitesse favorite:", favoriteSpeed);
                  VideoPlayer.player.playbackRate(favoriteSpeed);
                  VideoPlayer.updatePlaybackRateButton(favoriteSpeed);
               }
         });

         console.log("Enregistrement des raccourcis clavier terminé avec succès");
      } catch (error) {
         console.error("Erreur lors de l'enregistrement des raccourcis:", error);
      }
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
      console.log("Chargement du plugin YouTubeFlow");
      
      // Initialiser le Store en premier
      await Store.init(this);
      const { Settings, PlayerViewAndMode } = Store.get();
      this.PlayerViewAndMode = PlayerViewAndMode;

      // Initialiser les hotkeys en passant l'instance du plugin
      this.hotkeys = new Hotkeys(this);
      
      // Enregistrer les commandes avec Obsidian
      console.log("Enregistrement des raccourcis clavier...:", this.hotkeys);
      this.hotkeys.registerHotkeys();

      // Enregistrer notre vue
      this.registerView(
         'youtube-player',
         (leaf) => new PlayerContainer(leaf, PlayerViewAndMode.activeLeafId)
      );
      
      // Attendre que le layout soit prêt
      this.app.workspace.onLayoutReady(() => {
         // Ne PAS restaurer automatiquement, laisser Obsidian le faire
         // La restauration se fera via setState de PlayerContainer
         
         this.registerEvent(
            this.app.workspace.on('layout-change', () => {
               // Si aucune vue YouTube n'est ouverte mais qu'on devrait en avoir une
               const hasYouTubeView = this.app.workspace.getLeavesOfType('youtube-player').length > 0;
               if (!hasYouTubeView && Settings.settings.isVideoOpen) {
                  // Réinitialiser l'état
                  Settings.settings.isVideoOpen = false;
                  Settings.save();
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
                  // Rinitialiser l'activeLeafId pour forcer la création d'une nouvelle vue
                  PlayerViewAndMode.activeLeafId = null;
                  await PlayerViewAndMode.displayVideo({
                     videoId: Settings.settings.lastVideoId,
                     mode: 'tab',
                     timestamp: 0,
                     fromUserClick: true
                  });
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
                  await PlayerViewAndMode.displayVideo({
                     videoId: Settings.settings.lastVideoId,
                     mode: 'sidebar',
                     timestamp: 0,
                     fromUserClick: true
                  });
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
                  await PlayerViewAndMode.displayVideo({
                     videoId: Settings.settings.lastVideoId,
                     mode: 'overlay',
                     timestamp: 0,
                     fromUserClick: true
                  });
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
         /* Structure de base */
         .youtube-flow-container {
            position: relative;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
         }

         .player-wrapper {
            flex: 1;
            display: flex;
            flex-direction: column;
            position: relative;
            overflow: hidden;
            margin-bottom: 100px;
            height: 100%;
            min-height: 100%;
         }

         /* Overlay */
         .youtube-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: var(--background-primary);
            z-index: 100;
         }

         /* Contrôles */
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

         .youtube-view-close,
         .youtube-overlay-close {
            cursor: pointer;
            padding: 5px;
            border-radius: 3px;
            background: var(--background-secondary);
         }

         .youtube-view-close:hover,
         .youtube-overlay-close:hover {
            opacity: 0.8;
         }

         /* Poignée de redimensionnement */
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

         /* VideoJS - Structure de base */
         .video-js {
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
            height: 100% !important;
         }

         /* Conteneur principal de l'iframe */
         .video-js > div:first-child {
            flex: 1 !important;
            position: relative !important;
            min-height: 0 !important;
         }

         /* L'iframe elle-même */
         .vjs-tech {
            width: 100% !important;
            height: 100% !important;
            position: relative !important;
         }

         /* Barre de contrôle */
         .vjs-control-bar {
            height: 60px !important;
            background: var(--background-secondary) !important;
            display: flex !important;
            align-items: center !important;
            padding: 0 10px !important;
         }

         /* VideoJS - Contrôles */
         .video-js .vjs-control {
            pointer-events: auto;
            z-index: 3;
            margin: 0 4px;
            flex: 0 0 auto;
         }

         /* VideoJS - Groupes de contrôles */
         .video-js .vjs-control-bar > .vjs-play-control,
         .video-js .vjs-control-bar > .vjs-volume-panel {
            margin-right: auto;
         }

         .video-js .vjs-time-control {
            display: flex;
            align-items: center;
         }

         .video-js .vjs-control-bar > .vjs-picture-in-picture-control,
         .video-js .vjs-control-bar > .vjs-fullscreen-control,
         .video-js .vjs-control-bar > .vjs-playback-rate-button {
            margin-left: auto;
         }

         /* VideoJS - Barre de progression */
         .video-js .vjs-progress-control {
            position: absolute;
            top: -8px;
            width: 100%;
            height: 8px;
            pointer-events: none;
            background: rgba(255, 255, 255, 0.2);
         }

         .video-js .vjs-progress-holder {
            pointer-events: auto;
            height: 100%;
            position: relative;
            background: transparent;
            cursor: pointer;
         }

         .video-js .vjs-play-progress {
            background: var(--interactive-accent);
            height: 100%;
            position: absolute;
            left: 0;
         }

         .video-js .vjs-load-progress {
            background: rgba(255, 255, 255, 0.3);
            height: 100%;
         }

         /* VideoJS - Tooltip de temps */
         .video-js .vjs-time-tooltip {
            background: var(--background-secondary);
            border: 1px solid var(--background-modifier-border);
            color: var(--text-normal);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            transform: translateX(-50%);
            bottom: 14px;
            z-index: 1;
         }

         /* VideoJS - Animations et états */
         .video-js .vjs-progress-control:hover {
            height: 12px;
            top: -12px;
            transition: all 0.2s ease;
         }

         .video-js .vjs-progress-holder:hover {
            background: rgba(255, 255, 255, 0.1);
         }

         /* VideoJS - Indicateur de position */
         .video-js .vjs-play-progress:after {
            content: '';
            position: absolute;
            right: -4px;
            top: -2px;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--interactive-accent);
         }

         /* VideoJS - Mode plein écran */
         .vjs-fullscreen .player-wrapper {
            margin-bottom: 0;
         }

         /* Masquer les éléments redondants */
         .video-js .vjs-remaining-time,
         .video-js .vjs-progress-control.vjs-control,
         .video-js > .vjs-progress-control {
            display: none;
         }

         /* Loading overlay */
         .loading-overlay {
            opacity: 0;
            transition: opacity 0.3s ease;
         }
         
         .loading-overlay.ready {
            opacity: 1;
         }

         .video-resize-handle {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 15px;
            height: 15px;
            cursor: se-resize;
            background-color: rgba(255, 255, 255, 0.5);
            border-radius: 50%;
         }

      /* Pour le conteneur vidéo en mode overlay */
      .video-container-overlay {
         position: relative;
         resize: both;
         overflow: auto;
      }
      `;
   }
}
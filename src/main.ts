import { Plugin, Notice, ItemView, PluginSettingTab, Setting, Menu, WorkspaceLeaf } from 'obsidian';
import { ViewPlugin, Decoration, WidgetType } from '@codemirror/view';
import videojs from 'video.js';
import 'videojs-youtube';
import { DisplayVideoParams, VideoMode } from './types';
import { Settings } from './settings';
import { VideoPlayer } from './videoPlayer';
import { Store } from './store';
import { PlayerViewAndMode } from './playerViewAndMode';

// ---------- VIEW ----------
interface IPlayerContainer {
   plugin: Plugin;
   Settings: Settings;
   PlayerViewAndMode: PlayerViewAndMode;
   t: (key: string) => string;
   videoId: string | null;
   timestamp: number;
   activeLeafId: string | null;
   VideoPlayer: VideoPlayer | null;
}

class PlayerContainer extends ItemView implements IPlayerContainer {
   plugin: Plugin;
   Settings: Settings;
   PlayerViewAndMode: PlayerViewAndMode;
   t: (key: string) => string;
   videoId: string | null;
   timestamp: number;
   activeLeafId: string | null;
   VideoPlayer: VideoPlayer | null;
   static videoPlayer: VideoPlayer | null;

   constructor(leaf: WorkspaceLeaf, activeLeafId: string | null, plugin: Plugin) {
      super(leaf);
      const { Settings, PlayerViewAndMode, t } = Store.get();
      if (!Settings || !PlayerViewAndMode) throw new Error("Settings or PlayerViewAndMode not initialized");
      
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
      if (!PlayerContainer.videoPlayer && Settings) {
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

   async setState(state: { type: string; state: { videoId: string; timestamp: number } }) {
      await this.onOpen();
   }

   async onOpen() {
      const container = this.containerEl.children[1] as HTMLElement;
      if (!container) {
         return;
      }

      try {
         container.empty();
         container.style.background = 'var(--background-primary)';
         
         const { Settings } = Store.get();
         if (!Settings) return;
         
         const videoId = Settings.lastVideoId;
         const timestamp = Settings.lastTimestamp || 0;
         
         const playerSection = document.createElement('div');
         playerSection.style.cssText = `
               width: 100%;
               height: ${Settings.viewHeight || 60}%;
               min-height: 100px;
               position: relative;
               display: flex;
               flex-direction: column;
         `;
         container.appendChild(playerSection);

         try {
               if (this.VideoPlayer && videoId) {
                  await this.VideoPlayer.initializePlayer(videoId, playerSection, timestamp);
               }
         } catch (error) {
               console.error("Erreur lors de l'initialisation du player:", error);
               if (this.VideoPlayer && videoId) {
                  this.VideoPlayer.createFallbackPlayer(videoId, playerSection, timestamp);
               }
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
               mode: this.Settings.currentMode || 'sidebar' as VideoMode,
               onResize: (height: number) => {
                  playerSection.style.height = `${height}%`;
                  this.Settings.viewHeight = height;
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
         if (this.VideoPlayer && this.videoId) {
               this.VideoPlayer.createFallbackPlayer(this.videoId, container, this.timestamp);
         }
      }
   }

   createControls(container: HTMLElement) {
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
         if (PlayerViewAndMode) {
            await PlayerViewAndMode.closePreviousVideos();
         }
      });

      controlsContainer.appendChild(closeButton);
      return controlsContainer;
   }

   createVideoContainer() {
      const mode = this.Settings.currentMode;
      const defaultHeight = mode === 'overlay' 
         ? this.Settings.overlayHeight 
         : this.Settings.viewHeight;

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
         mode: this.Settings.currentMode || 'sidebar' as VideoMode,
         onResize: (height: number) => {
               videoContainer.style.height = `${height}%`;
         }
      });
   
      return videoContainer;
   }

   async onClose() {
      if (this.VideoPlayer) {
         try {
               if (this.VideoPlayer.player && typeof this.VideoPlayer.player.dispose === 'function') {
                  const playerElement = this.VideoPlayer.player.el();
                  if (playerElement && playerElement.parentNode) {
                     this.VideoPlayer.player.dispose();
                  }
               }

               const leaves = this.app.workspace.getLeavesOfType('youtube-player');
               if (leaves.length <= 1 && !this.Settings.isChangingMode) {
                  this.Settings.isVideoOpen = false;
               }
               
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
                  this.Settings.viewHeight = clampedHeight;
                  this.Settings.overlayHeight = clampedHeight;
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

   async setupLocalVideo(path) {
      const { app } = Store.get();
      if (!app) throw new Error("App not initialized");
      const url = await app.vault.adapter.getResourcePath(path);
   }
}

// Fonction utilitaire pour nettoyer le videoId
function cleanVideoId(videoId: string): string {
    // Retirer les paramètres d'URL (tout ce qui suit ?)
    return videoId.split('?')[0];
}



export default class TubeFlows extends Plugin {
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
                  // Rinitialiser l'activeLeafId pour forcer la cration d'une nouvelle vue
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
            this.app.workspace.off('leaf-closed', this.handleLeafClosed);
            
            // Fermer proprement les vues
            await PlayerViewAndMode.closePreviousVideos();
         }

         // Nettoyer le Store en dernier
         Store.destroy();
      } catch (error) {
         console.warn("Erreur lors du déchargement:", error);
      }
   }

   private handleLeafClosed = () => {
      const { PlayerViewAndMode } = Store.get();
      if (PlayerViewAndMode) {
         PlayerViewAndMode.closePreviousVideos();
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
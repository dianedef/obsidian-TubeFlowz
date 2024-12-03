import { App, ItemView, Plugin, WorkspaceLeaf, Menu, Notice } from 'obsidian';
import { ViewPlugin } from '@codemirror/view';
import { SettingsService } from './services/settings/SettingsService';
import { SettingsTab } from './services/settings/SettingsTab';
import { PlayerViewAndMode } from './views/ViewAndMode';
import VideoPlayer from './views/VideoPlayer';
import { VideoMode } from './types';
import { Hotkeys } from './services/hotkeys/HotkeysService';
import { extractVideoId, cleanVideoId, getHeight, saveHeight } from './utils';
import { createDecorations } from './services/DecorationsService';
import { registerStyles } from './services/RegisterStylesService';
import { TranslationsService, TranslationKey } from './services/translations/TranslationsService';

interface IPlayerContainer {
   plugin: Plugin;
   settings: SettingsService;
   playerViewAndMode: PlayerViewAndMode;
   translationService: TranslationsService;
   videoId: string | null;
   timestamp: number;
   activeLeafId: string | null;
   videoPlayer: VideoPlayer | null;
}

class PlayerContainer extends ItemView implements IPlayerContainer {
   plugin: Plugin;
   settings: SettingsService;
   playerViewAndMode: PlayerViewAndMode;
   translationService: TranslationsService;
   videoId: string | null = null;
   timestamp: number = 0;
   activeLeafId: string | null = null;
   videoPlayer: VideoPlayer | null = null;
   isInitialized: boolean = false;
   resizeHandle: HTMLElement;

   constructor(leaf: WorkspaceLeaf, activeLeafId: string | null, plugin: Plugin, settings: SettingsService, playerViewAndMode: PlayerViewAndMode) {
      super(leaf);
      
      this.plugin = plugin;
      this.settings = settings;
      this.playerViewAndMode = playerViewAndMode;
      this.translationService = new TranslationsService();
      
      this.videoId = this.settings.lastVideoId;
      this.timestamp = this.settings.lastTimestamp || 0;
      this.activeLeafId = activeLeafId;
      
      // Initialiser comme une note Markdown vide
      this.contentEl.addClass('markdown-source-view');
      this.contentEl.addClass('mod-cm6');
      this.contentEl.style.background = 'var(--background-primary)';
      this.contentEl.empty();

      // Utiliser le singleton VideoPlayer
      this.videoPlayer = VideoPlayer.getInstance(this.settings);

      // Créer la poignée de redimensionnement une seule fois
      this.resizeHandle = document.createElement('div');
      this.resizeHandle.className = 'youtube-resize-handle';
   }

   t(key: TranslationKey): string {
      return this.translationService.translate(key);
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

   async setState(state: { type: string; state?: { videoId: string; timestamp: number } }) {
      
      // Vérifier si state existe et contient les propriétés nécessaires
      if (state?.state?.videoId) {
         this.settings.lastVideoId = state.state.videoId;
         this.settings.lastTimestamp = state.state.timestamp || 0;
         
         // Mettre à jour l'état local pour la vue actuelle
         this.videoId = state.state.videoId;
         this.timestamp = state.state.timestamp || 0;
      }
   }

   async onOpen() {
      const container = this.containerEl;
      const playerSection = document.createElement('div');
      playerSection.style.cssText = `
         width: 100%;
         height: ${getHeight(this.settings.currentMode)}%;
         min-height: 100px;
         position: relative;
         display: flex;
         flex-direction: column;
      `;
      
      try {
         // Initialiser le VideoPlayer si nécessaire
         if (!this.videoPlayer) {
            this.videoPlayer = VideoPlayer.getInstance(this.settings);
         }

         container.empty();
         
         container.style.background = 'var(--background-primary)';
         
         const settings = this.settings;
         if (!settings) return;
         
         // Utiliser soit les valeurs de l'état, soit celles des settings
         const videoId = this.videoId || settings.lastVideoId;
         const timestamp = this.timestamp || settings.lastTimestamp || 0;
         
         container.appendChild(playerSection);

         try {
            if (this.videoPlayer && videoId) {
               await this.videoPlayer.initializePlayer(videoId, playerSection, timestamp);
               this.isInitialized = true;
            }
         } catch (error) {
            console.error("Erreur lors de l'initialisation du player:", error);
            // Créer un message d'erreur visuel
            const errorContainer = document.createElement('div');
            errorContainer.style.cssText = `
               padding: 20px;
               color: var(--text-error);
               text-align: center;
            `;
            errorContainer.textContent = this.t('error.playerInit');
            playerSection.appendChild(errorContainer);
            
            if (this.videoPlayer) {
               this.videoPlayer.createFallbackPlayer(this.videoId || '', playerSection, this.timestamp);
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
         playerSection.appendChild(this.resizeHandle);

         // Créer la section pour la note markdown
         const markdownSection = document.createElement('div');
         markdownSection.className = 'markdown-section';

         container.appendChild(markdownSection);

         // Gérer le resize
         this.createResizer({
               container: container,
               targetElement: playerSection,
               handle: this.resizeHandle,
               mode: this.settings.currentMode,
               onResize: async (height: number) => {
                  playerSection.style.height = `${height}%`;
                  await saveHeight(height, this.settings.currentMode);
               }
         });
      } catch (error) {
         console.error("Erreur lors de l'initialisation du player:", error);
         // Créer un message d'erreur visuel
         const errorContainer = document.createElement('div');
         errorContainer.style.cssText = `
               padding: 20px;
               color: var(--text-error);
               text-align: center;
         `;
         errorContainer.textContent = this.t('error.playerInit');
         playerSection.appendChild(errorContainer);
         
         if (this.videoPlayer) {
               this.videoPlayer.createFallbackPlayer(this.videoId || '', playerSection, this.timestamp);
         }
         this.isInitialized = false;
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
         const playerViewAndMode = this.playerViewAndMode;
         if (playerViewAndMode) {
            await playerViewAndMode.closePreviousVideos();
         }
      });

      controlsContainer.appendChild(closeButton);
      return controlsContainer;
   }

   createVideoContainer() {
      const mode = this.settings.currentMode;
      const defaultHeight = mode === 'overlay' 
         ? this.settings.overlayHeight 
         : this.settings.viewHeight;

      const videoContainer = document.createElement('div');
      videoContainer.style.cssText = `
         width: 100%;
         height: ${defaultHeight || 60}%; 
         min-height: 100px;
         position: relative;
      `;
      
      // Réutiliser la poignée de redimensionnement existante
      videoContainer.appendChild(this.resizeHandle);
      
      this.createResizer({
         container: this.containerEl,
         targetElement: videoContainer,
         handle: this.resizeHandle,
         mode: this.settings.currentMode || 'sidebar' as VideoMode,
         onResize: (height: number) => {
               videoContainer.style.height = `${height}%`;
         }
      });
   
      return videoContainer;
   }

   async onClose() {
      if (this.videoPlayer) {
         try {
            if (this.videoPlayer.Player && typeof this.videoPlayer.Player.dispose === 'function') {
               const playerElement = this.videoPlayer.Player?.el();
               if (playerElement?.parentNode) {
                  this.videoPlayer.Player.dispose();
               }
            }

            const leaves = this.app?.workspace.getLeavesOfType('youtube-player') || [];
            if (leaves.length <= 1 && this.settings?.isChangingMode === false) {
               if (this.settings) {
                  this.settings.isVideoOpen = false;
               }
               VideoPlayer.destroyInstance();
            }
            
            this.videoPlayer = null;
            this.isInitialized = false;
            
         } catch (error) {
               console.warn("Erreur lors de la fermeture du player:", error);
         }
      }
   }

   createResizer(options: {
      container: HTMLElement;
      targetElement: HTMLElement;
      handle: HTMLElement;
      mode: VideoMode;
      onResize: (height: number) => void;
      minHeight?: number;
      maxHeight?: number;
   }) {
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
      let rafId: number | null = null;
      let lastSaveTime = Date.now();

      const updateSize = (newHeight: number) => {
         if (rafId) cancelAnimationFrame(rafId);
         
         rafId = requestAnimationFrame(() => {
               const clampedHeight = Math.min(Math.max(newHeight, minHeight), maxHeight);
               
               if (mode === 'overlay') {
                  // Pour l'overlay, mise à jour directe
                  targetElement.style.height = `${clampedHeight}%`;
                  const editorEl = targetElement.closest('.workspace-leaf')?.querySelector('.cm-editor') as HTMLElement;
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
               
               // Appeler le callback onResize avec throttling
               const now = Date.now();
               if (now - lastSaveTime >= 300) {
                  onResize(clampedHeight);
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
         
         const handleMouseMove = (e: MouseEvent) => {
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

   async setupLocalVideo(path: string) {
      if (!this.app) throw new Error("App not initialized");
      const url = await this.app.vault.adapter.getResourcePath(path);
   }
}

export default class TubeFlows extends Plugin {
   private settings!: SettingsService;
   private playerViewAndMode!: PlayerViewAndMode;
   private translationService!: TranslationsService;
   private hotkeys!: Hotkeys;

   constructor(app: App, manifest: any) {
      super(app, manifest);
   }

   async onload() {
      console.log("Chargement du plugin YouTubeFlow");

      // Initialisation des services dans le bon ordre
      this.settings = new SettingsService(this);
      await this.settings.loadSettings();
      
      this.translationService = new TranslationsService();
      
      this.playerViewAndMode = new PlayerViewAndMode(
         this.app, 
         this.settings
      );
      
      // Initialiser Hotkeys après les autres services
      this.hotkeys = new Hotkeys(this, this.settings);
      
      // registerHotkeys
      this.hotkeys.registerHotkeys();

      // registerView
      this.registerView(
         'youtube-player',
         (leaf) => new PlayerContainer(
            leaf, 
            this.settings?.activeLeafId ?? null, 
            this,
            this.settings,
            this.playerViewAndMode
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

      // Ajouter un seul bouton dans la sidebar qui ouvre un menu
      const ribbonIcon = this.addRibbonIcon('video', 'YouTube Flow', (evt) => {});
      ribbonIcon.addEventListener('mouseenter', (evt) => {
         const menu = new Menu();
         
         menu.addItem((item) => {
            item.setTitle("YouTube Tab")
               .setIcon("tab")
               .onClick(async () => {
                  const overlay = document.querySelector('.youtube-overlay');
                  if (overlay) {
                     const height = parseFloat((overlay as HTMLElement).style.height);
                     if (!isNaN(height)) {
                        this.settings.viewHeight = height;
                        this.settings.overlayHeight = height;
                        await this.settings.save();
                     }
                  }
                  await this.playerViewAndMode.closePreviousVideos();
                  this.playerViewAndMode.activeLeafId = null;
                  await this.playerViewAndMode.displayVideo({
                     videoId: this.settings.lastVideoId,
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
                  const overlay = document.querySelector('.youtube-overlay');
                  if (overlay) {
                     const height = parseFloat((overlay as HTMLElement).style.height);
                     if (!isNaN(height)) {
                        this.settings.viewHeight = height;
                        this.settings.overlayHeight = height;
                        await this.settings.save();
                     }
                  }
                  await this.playerViewAndMode.closePreviousVideos();
                  this.playerViewAndMode.activeLeafId = null;
                  await this.playerViewAndMode.displayVideo({
                     videoId: this.settings.lastVideoId,
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
                  const videoContainer = document.querySelector('.youtube-player div[style*="height"]');
                  if (videoContainer) {
                     const height = parseFloat((videoContainer as HTMLElement).style.height);
                     if (!isNaN(height)) {
                        this.settings.viewHeight = height;
                        this.settings.overlayHeight = height;
                        await this.settings.save();
                     }
                  }
                  await this.playerViewAndMode.closePreviousVideos();
                  this.playerViewAndMode.activeLeafId = null;
                  await this.playerViewAndMode.displayVideo({
                     videoId: this.settings.lastVideoId,
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

         // Gérer la fermeture du menu
         const handleMouseLeave = (e: MouseEvent) => {
            const target = e.relatedTarget as Node;
            const isOverIcon = ribbonIcon.contains(target);
            const menuDom = (menu as any).dom as HTMLElement;
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
         const menuDom = (menu as any).dom as HTMLElement;
         if (menuDom) {
            menuDom.addEventListener('mouseleave', handleMouseLeave);
         }
      });

      // SettingsTab
      this.addSettingTab(new SettingsTab(this.app, this, this.settings));

      // Créer la "décoration" des liens YouTube dans les fichiers Markdown
      this.registerEditorExtension([
         ViewPlugin.define(view => ({
            decorations: createDecorations(view, this.settings),
            update(update) {
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
         name: 'Ouvrir dans la barre latérale',
         callback: async () => {
            const clipText = await navigator.clipboard.readText();
            await this.handleYouTubeLink(clipText, 'sidebar');
         }
      });

      this.addCommand({
         id: 'open-youtube-tab',
         name: 'Ouvrir dans un nouvel onglet',
         callback: async () => {
            const clipText = await navigator.clipboard.readText();
            await this.handleYouTubeLink(clipText, 'tab');
         }
      });

      this.addCommand({
         id: 'open-youtube-overlay',
         name: 'Ouvrir en superposition',
         callback: async () => {
            const clipText = await navigator.clipboard.readText();
            await this.handleYouTubeLink(clipText, 'overlay');
         }
      });
   }

   // handleYouTubeLink
   async handleYouTubeLink(url: string, videoMode: VideoMode = 'sidebar') {
      const videoId = extractVideoId(url);
      if (!videoId) {
         new Notice("URL YouTube invalide");
         return;
      }
      const cleanedId = cleanVideoId(videoId);
      if (this.settings && this.playerViewAndMode) {
         await this.playerViewAndMode.displayVideo({
            videoId: cleanedId || this.settings.lastVideoId,
            mode: videoMode,
            timestamp: 0,
         });
      }
   }

   async onunload() {
      try {
         // S'assurer que toutes les vues sont fermées avant la désactivation
         if (this.playerViewAndMode) {
            // Désactiver les écouteurs d'événements
            this.app.workspace.off('leaf-closed', this.handleLeafClosed);
            
            // Fermer proprement les vues
            await this.playerViewAndMode.closePreviousVideos();
         }
      } catch (error) {
         console.warn("Erreur lors du déchargement:", error);
      }
   }

   private handleLeafClosed = () => {
      if (this.playerViewAndMode) {
         this.playerViewAndMode.closePreviousVideos();
      }
   }
}
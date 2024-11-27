const { Plugin, Notice, Modal, ItemView, WorkspaceLeaf, MarkdownView, PluginSettingTab, Setting, Menu } = require('obsidian');
const { EditorView, ViewPlugin, Decoration, WidgetType } = require('@codemirror/view');
const { EditorState } = require('@codemirror/state');
const { syntaxTreeAvailable } = require('@codemirror/language');

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
      
      // Fermer les overlays existants et restaurer les éditeurs
      const overlays = document.querySelectorAll('.youtube-overlay');
      overlays.forEach(overlay => {
         // Trouver l'éditeur associé à cet overlay
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

      // Fermer les vues YouTube normales
      const leaves = this.plugin.app.workspace.getLeavesOfType('youtube-player');
      for (const leaf of leaves) {
         if (leaf && !leaf.detached) {
            leaf.detach();
         }
      }

      this.activeView = null;
      this.activeLeafId = null;
      
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

      // Récupérer la zone d'édition
      const editorEl = activeLeaf.view.containerEl.querySelector('.cm-editor');
      if (!editorEl) return;

      // Ajuster la taille de la zone d'édition pour faire de la place pour la vidéo
      editorEl.style.height = '40%';
      editorEl.style.position = 'relative';
      editorEl.style.top = '60%';  // Déplacer l'éditeur en bas

      // Créer un conteneur pour la vidéo
      const overlayContainer = activeLeaf.view.containerEl.createDiv('youtube-overlay');
      overlayContainer.style.cssText = `
         position: absolute;
         top: 0;
         left: 0;
         width: 100%;
         height: 60%;
         background: var(--background-primary);
         z-index: 100;
         display: flex;
         flex-direction: column;
         align-items: center;
      `;

      // Ajouter un bouton pour fermer l'overlay
      const closeButton = overlayContainer.createDiv('youtube-overlay-close');
      closeButton.innerHTML = '✕';
      
      // Créer l'iframe YouTube
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
         // Restaurer la taille originale de l'éditeur
         editorEl.style.height = '100%';
         editorEl.style.top = '0';
         this.plugin.settingsManager.settings.isVideoOpen = false;
         await this.plugin.settingsManager.save();
      });

      // Mettre à jour les settings
      this.activeLeafId = activeLeaf.id;
      this.plugin.settingsManager.settings.lastVideoId = videoId;
      this.plugin.settingsManager.settings.isVideoOpen = true;
      await this.plugin.settingsManager.save();

      // Gérer la fermeture de la leaf
      this.registerOverlayCleanup(activeLeaf, overlayContainer, editorEl);
   }

   registerOverlayCleanup(leaf, overlayContainer, editorEl) {
      const cleanup = () => {
         overlayContainer.remove();
         if (editorEl) {
            editorEl.style.height = '100%';
            editorEl.style.top = '0';
         }
         this.plugin.settingsManager.settings.isVideoOpen = false;
         this.plugin.settingsManager.save();
      };

      leaf.on('unload', cleanup);
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
      
// Créer le menu de sélection du mode d'affichage par défaut
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
// Créer la décoration des boutons
      this.registerEditorExtension([
         EditorView.decorations.of(view => {
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
                        decorations.push(Decoration.widget({
                           widget: new YouTubeWidget(videoId, this),
                           side: 1
                        }).range(endPos));
                     }
                  }
               }
               
               pos = line.to + 1;
            }
            
            return Decoration.set(decorations);
         })
      ]);

      this.registerStyles();
   }
   async onunload() {
      await this.videoManager.closePreviousVideos();
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
      `;
   }
}

function createDecorations(view, plugin) {
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
                  widget: new YouTubeWidget(videoId, plugin),
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
   constructor(videoId, plugin) {
      super();
      this.videoId = videoId;
      this.plugin = plugin;
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
         if (this.plugin?.videoManager) {
            this.plugin.videoManager.displayVideo(
               this.videoId,
               this.plugin.settingsManager.settings.currentMode || 'sidebar'
            );
         }
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
   constructor(plugin) {
      this.plugin = plugin;
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
   constructor(plugin) {
         this.plugin = plugin;
   }
   registerHotkeys() {
      // Raccourci pour ouvrir la vidéo en cours dans une modale
      this.plugin.addCommand({
         id: 'open-youtube-modal',
         name: 'Ouvrir la vidéo dans une modale',
         hotkeys: [{ modifiers: ['Alt'], key: 'y' }],
         callback: () => {
               const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
               if (activeView) {
                  const cursor = activeView.editor.getCursor();
                  const line = activeView.editor.getLine(cursor.line);
                  const urlMatch = line.match(/(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[^&\s]+)/);
                  if (urlMatch) {
                     const videoId = this.plugin.player.getVideoId(urlMatch[1]);
                     if (videoId) {
                           new YouTubeModal(this.plugin.app, videoId).open();
                     }
                  }
               }
         }
      });
   }
   registerHotkeys() {
      this.plugin.addCommand({
         id: 'play-pause',
         name: 'Lecture/Pause',
         hotkeys: [{ modifiers: ['Shift'], key: ' ' }],
         callback: () => this.plugin.player.player?.getPlayerState() === 1 
               ? this.plugin.player.pause() 
               : this.plugin.player.play()
      });

      this.plugin.addCommand({
         id: 'write-timestamp',
         name: 'Écrire le timestamp',
         hotkeys: [{ modifiers: ['Alt'], key: 't' }],
         callback: () => this.writeTimestamp()
      });

      this.plugin.addCommand({
         id: 'next-video',
         name: 'Vidéo suivante',
         hotkeys: [{ modifiers: ['Ctrl'], key: 'ArrowRight' }],
         callback: () => this.plugin.player.nextVideo()
      });

      this.plugin.addCommand({
         id: 'previous-video',
         name: 'Vidéo précédente',
         hotkeys: [{ modifiers: ['Ctrl'], key: 'ArrowLeft' }],
         callback: () => this.plugin.player.previousVideo()
      });

      this.plugin.addCommand({
         id: 'normal-speed',
         name: 'Vitesse normale',
         hotkeys: [{ modifiers: ['Ctrl'], key: '1' }],
         callback: () => this.plugin.player.setPlaybackSpeed(1.0)
      });

      this.plugin.addCommand({
         id: 'increase-speed',
         name: 'Augmenter la vitesse',
         hotkeys: [{ modifiers: ['Ctrl'], key: '2' }],
         callback: () => this.plugin.player.setPlaybackSpeed(1.5)
      });

      this.plugin.addCommand({
         id: 'decrease-speed',
         name: 'Diminuer la vitesse',
         hotkeys: [{ modifiers: ['Ctrl'], key: '3' }],
         callback: () => this.plugin.player.setPlaybackSpeed(0.75)
      });

      this.plugin.addCommand({
         id: 'seek-forward',
         name: 'Avancer de 10s',
         hotkeys: [{ modifiers: ['Shift'], key: 'ArrowRight' }],
         callback: () => this.plugin.player.seekForward()
      });

      this.plugin.addCommand({
         id: 'seek-backward',
         name: 'Reculer de 10s',
         hotkeys: [{ modifiers: ['Shift'], key: 'ArrowLeft' }],
         callback: () => this.plugin.player.seekBackward()
      });
   }
   writeTimestamp() {
      if (!this.plugin.player.player) return;
      const time = Math.floor(this.plugin.player.player.getCurrentTime());
      const timestamp = this.formatTimestamp(time);
      
      const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
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
   constructor(plugin) {
      this.plugin = plugin;
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

   // À appeler dans SplitView.open() après la création de l'iframe
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

            // Ajouter un bouton de suppression
            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '❌';
            removeBtn.style.marginLeft = 'auto';
            removeBtn.onclick = (e) => {
               e.stopPropagation();  // Empêcher le clic de propager à l'item
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
      // this.plugin.settingsManager.settings.playlist = this.playlist;
      // await this.plugin.settingsManager.save();
   }

   async loadPlaylist() {
      // TODO: Charger la playlist depuis les settings du plugin
      // if (this.plugin.settingsManager.settings.playlist) {
      //     this.playlist = this.plugin.settingsManager.settings.playlist;
      //     this.updatePlaylistUI();
      // }
   }

   togglePlaylist() {
      const isVisible = this.playlistContainer.style.transform !== 'translateX(100%)';
      this.playlistContainer.style.transform = isVisible ? 'translateX(100%)' : 'translateX(0)';
   }
}

module.exports = YouTubeFlowPlugin;

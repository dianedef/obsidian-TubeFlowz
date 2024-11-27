const { Plugin, Notice, Modal, ItemView, WorkspaceLeaf, MarkdownView, PluginSettingTab, Setting } = require('obsidian');
const { EditorView, ViewPlugin, Decoration, WidgetType } = require('@codemirror/view');

class SettingsManager {
   constructor() {
         this.settings = {
            lastVideoId: null,
            isVideoOpen: false,
            playlist: [],
            openInSidebar: true
         };
   }

   async load(plugin) {
      console.log("=== Début load settings ===");
      const savedData = await plugin.loadData() || {};
      
      this.settings = {
         ...this.settings,
         ...savedData
      };
      
      this.plugin = plugin;
      console.log("Settings finaux après load:", this.settings);
   }

   async save() {
      if (!this.plugin) return;
      console.log("Sauvegarde des settings:", this.settings);
      await this.plugin.saveData(this.settings);
   }

   async getVideoState() {
      return {
         lastVideoId: this.settings.lastVideoId,
         isVideoOpen: this.settings.isVideoOpen,
         openInSidebar: this.settings.openInSidebar
      };
   }
}

class YouTubeFlowPlugin extends Plugin {
   async onload() {
      console.log('Chargement du plugin YouTube Flow...');
      
      this.settingsManager = new SettingsManager();
      await this.settingsManager.load(this);
      
      // Attendre que l'application soit prête
      this.app.workspace.onLayoutReady(async () => {
         console.log("Layout ready, checking state:", this.settingsManager.settings);
         
         // Vérifier si une vue existe déjà
         const existingLeaf = this.settingsManager.settings.openInSidebar 
            ? this.app.workspace.getLeavesOfType('youtube-player')[0]
            : SplitView.activeLeaf;

         // Si la vidéo était fermée, fermer aussi le panneau s'il existe
         if (!this.settingsManager.settings.isVideoOpen && existingLeaf) {
            console.log("Fermeture du panneau existant car vidéo fermée");
            existingLeaf.detach();
            return;
         }

         // Restaurer uniquement si la vidéo était ouverte
         if (this.settingsManager.settings.isVideoOpen && 
             this.settingsManager.settings.lastVideoId) {
            console.log("Restauration de la vue vidéo...");
            new SplitView(
               this.app, 
               this.settingsManager.settings.lastVideoId, 
               this.settingsManager,
               this
            ).open();
         } else {
            console.log("Pas de restauration nécessaire:", {
               isVideoOpen: this.settingsManager.settings.isVideoOpen,
               existingLeaf: !!existingLeaf
            });
         }
      });

      this.addSettingTab(new YouTubeFlowSettingTab(this.app, this));

      this.registerEditorExtension([
         this.createSparkleDecoration()
      ]);
   }

   createSparkleDecoration() {
      const plugin = this;
      console.log("settingsManager:", this.settingsManager);

      return ViewPlugin.fromClass(class {
         constructor(view) {
               this.app = plugin.app;
               // Parse initial à l'ouverture du fichier
               this.decorations = this.buildDecorations(view);
         }

         update(update) {
               // Ne parse que lors d'un collage ou d'une ouverture de fichier
               if (update.docChanged) {
                  const transaction = update.transactions[0];
                  
                  // Debug: voir les types de transactions disponibles
                  console.log("Transaction:", {
                     type: transaction?.annotation?.type,
                     annotations: transaction?.annotations,
                     transaction: transaction,
                     userEvent: transaction?.annotations?.[0]?.value
                  });
                  
                  // Vérifier si c'est un collage ou une ouverture de fichier
                  const isPaste = transaction?.annotations?.[0]?.value === "paste";
                  const isFileOpen = transaction?.annotations?.[0]?.value === "load";
                  
                  if (isPaste || isFileOpen) {
                     console.log("Parsing triggered by:", isPaste ? "paste" : "file open");
                     this.decorations = this.buildDecorations(update.view);
                  }
               }
         }

         buildDecorations(view) {
            const decorations = [];
            console.log("settingsManager:", plugin.settingsManager);

            
            const activeFile = this.app.workspace.getActiveFile();
            console.log("Fichier actif:", activeFile?.path);
            
            if (!activeFile) {
               console.log("Aucun fichier actif");
               return Decoration.none;
            }
            
            const docContent = view.state.doc.toString();
            const markdownLinkRegex = /\[([^\]]+)\]\(([^\)]+)\)/g;
            let match;
            
            while ((match = markdownLinkRegex.exec(docContent)) !== null) {
               const fullMatch = match[0];
               const linkText = match[1];
               const url = match[2];
               const pos = match.index + fullMatch.length;
               
   // Vérifier si c'est un lien YouTube
               const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/;
               const youtubeMatch = url.match(youtubeRegex);
               
               if (youtubeMatch) {
                  const videoId = youtubeMatch[1];
                  
   // Ajouter la décoration mark pour le lien YouTube
                  decorations.push(Decoration.mark({
                     class: "youtube-link",
                     attributes: {
                        "data-video-id": videoId
                     }
                  }).range(match.index, match.index + fullMatch.length));
                  
                  const sparkleDecoration = Decoration.widget({
                     widget: new class extends WidgetType {
                        constructor() {
                           super();
                           this.videoId = videoId;
                           this.app = plugin.app;
                        }
   // Ajouter le widget sparkle
                        toDOM() {
                           const sparkle = document.createElement('span');
                           sparkle.innerHTML = '▶️ Ouvrir le player ✨';
                           sparkle.setAttribute('aria-label', 'Play YouTube video');
                           sparkle.className = 'youtube-sparkle-decoration';
                           sparkle.style.display = 'inline-block';
                           sparkle.style.marginLeft = '2px';
                           sparkle.style.cursor = 'pointer';
                        // eventlistener                          
                           sparkle.addEventListener('click', (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              new SplitView(
                                 this.app, 
                                 this.videoId, 
                                 plugin.settingsManager,
                                 plugin
                              ).open();
                        });
                           
                           return sparkle;
                        }
                        
                        eq(other) { return this.videoId === other.videoId; }
                        destroy() { }
                        estimatedHeight = -1;
                        ignoreEvent() { return false; }
                     },
                     side: 1,
                     block: false,
                     startSide: 1,
                     endSide: 1
                  });
                  
                  decorations.push(sparkleDecoration.range(pos));
               }
            }
            
            console.log("Nombre total de décorations:", decorations.length);
            return Decoration.set(decorations, true);
         }
      }, {
         decorations: v => v.decorations,
      });
   }
}

class SplitView {
   static activeLeaf = null;
   static activeView = null;

   constructor(app, videoId, settingsManager, plugin) {
      this.app = app;
      this.videoId = videoId;
      this.settingsManager = settingsManager;
      this.plugin = plugin;
   }

   async open() {
      console.log("=== Début open() ===");
      console.log("Mode:", this.settingsManager.settings.openInSidebar ? "sidebar" : "tab");

      let leaf;
      if (this.settingsManager.settings.openInSidebar) {
         // Mode sidebar
         const existingLeaf = this.app.workspace.getLeavesOfType('youtube-player')[0];
         if (existingLeaf && !existingLeaf.detached) {
            console.log("Réutilisation du leaf sidebar existant");
            leaf = existingLeaf;
         } else {
            console.log("Création d'un nouveau leaf sidebar");
            leaf = this.app.workspace.getRightLeaf(false);
            await leaf.setViewState({
               type: 'youtube-player',
               active: true,
               icon: 'play-circle',
               title: 'YouTube Player'
            });
         }
      } else {
         // Mode onglet
         if (SplitView.activeLeaf && !SplitView.activeLeaf.detached) {
            console.log("Réutilisation du leaf tab existant");
            leaf = SplitView.activeLeaf;
         } else {
            const activeLeaf = this.app.workspace.activeLeaf;
            if (activeLeaf) {
               console.log("Création d'un nouveau leaf tab");
               leaf = this.app.workspace.splitActiveLeaf('vertical');
            }
         }
      }

      if (!leaf) {
         console.error("Impossible de créer un leaf");
         return;
      }

      // Mise à jour des références
      SplitView.activeLeaf = leaf;
      SplitView.activeView = leaf.view;
      this.leaf = leaf;

      // Configuration de la vue
      const container = leaf.view.containerEl.children[0];
      if (!container) {
         console.error("Container non trouvé");
         return;
      }
      
      container.empty();
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.height = '100%';
      container.style.position = 'relative'; // Important pour le bouton de fermeture
      
      this.createVideoIframe(container);

      // Sauvegarder l'état initial
      this.settingsManager.settings.lastVideoId = this.videoId;
      this.settingsManager.settings.isVideoOpen = true;
      await this.settingsManager.save();

      // Créer le gestionnaire de fermeture
      const handleClose = async () => {
         console.log("=== Événement de fermeture déclenché ===");
         this.settingsManager.settings.isVideoOpen = false;
         await this.settingsManager.save();
         SplitView.activeLeaf = null;
         SplitView.activeView = null;
         console.log("État après fermeture:", this.settingsManager.settings);
      };

      // Supprimer les anciens écouteurs
      leaf.off('unload');
      leaf.off('detach');
      leaf.off('resize');
      leaf.off('hide');

      // Ajouter tous les écouteurs possibles
      leaf.on('unload', handleClose);
      leaf.on('detach', handleClose);
      leaf.on('hide', handleClose);
      
      // Écouter les événements de workspace
      this.app.workspace.on('layout-change', () => {
         if (!this.app.workspace.getLeavesOfType('youtube-player').length) {
            handleClose();
         }
      });

      // Ajouter le bouton de fermeture en mode sidebar
      if (this.settingsManager.settings.openInSidebar && container) {
         const closeButton = document.createElement('button');
         closeButton.innerHTML = '❌';
         closeButton.className = 'youtube-close-button';
         closeButton.style.cssText = `
            position: absolute;
            top: 5px;
            right: 5px;
            z-index: 1000;
            background: transparent;
            border: none;
            cursor: pointer;
            padding: 5px;
         `;
         closeButton.onclick = async () => {
            await handleClose();
            leaf.detach();
         };
         container.appendChild(closeButton);
      }
   }

   createVideoIframe(container) {
      console.log("=== Début createVideoIframe() ===");
      const iframe = document.createElement('iframe');
      iframe.setAttribute('src', `https://www.youtube.com/embed/${this.videoId}`);
      iframe.setAttribute('width', '100%');
      iframe.setAttribute('height', '100%');
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allowfullscreen', 'true');
      container.appendChild(iframe);
      console.log("Iframe créée et ajoutée au container");
      console.log("=== Fin createVideoIframe() ===");
   }

   async onClose() {
      console.log("=== Début onClose() ===");
      if (this.leaf) {
         this.settingsManager.settings.isVideoOpen = false;
         await this.settingsManager.save();
         this.leaf.detach();
         SplitView.activeLeaf = null;
         SplitView.activeView = null;
         console.log("Vue fermée et état sauvegardé:", this.settingsManager.settings);
      }
      console.log("=== Fin onClose() ===");
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

// Nouvelle classe pour les paramètres
class YouTubeFlowSettingTab extends PluginSettingTab {
   constructor(app, plugin) {
      super(app, plugin);
      this.plugin = plugin;
   }

   display() {
      const {containerEl} = this;
      containerEl.empty();

      new Setting(containerEl)
         .setName('Mode d\'affichage')
         .setDesc('Choisir où afficher les vidéos YouTube')
         .addDropdown(dropdown => dropdown
               .addOption('sidebar', 'Panneau latéral')
               .addOption('tab', 'Nouvel onglet')
               .setValue(this.plugin.settingsManager.settings.openInSidebar ? 'sidebar' : 'tab')
               .onChange(async (value) => {
                  this.plugin.settingsManager.settings.openInSidebar = (value === 'sidebar');
                  await this.plugin.settingsManager.save();
               }));
   }
}

module.exports = YouTubeFlowPlugin;
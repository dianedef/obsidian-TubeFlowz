const { Plugin, Notice, Modal, ItemView, WorkspaceLeaf, MarkdownView } = require('obsidian');
const { EditorView, ViewPlugin, Decoration, WidgetType } = require('@codemirror/view');

class YouTubeFlowPlugin extends Plugin {
   DEFAULT_SETTINGS = {
      lastVideoId: null,
      isVideoOpen: false
   }
   
   async onload() {
      await this.loadSettings();

      if (this.settings.isVideoOpen) {
         new SplitView(this.app, this.settings.lastVideoId, this).open();
      }


      this.settings = Object.assign({}, this.DEFAULT_SETTINGS, await this.loadData());

   // Si une vidéo était ouverte lors du dernier chargement, la rouvrir
      if (this.settings.isVideoOpen) {
         new SplitView(this.app, this.settings.lastVideoId, this).open();
      }

      console.log('Chargement du plugin YouTube Flow...');

      this.registerEditorExtension([
         this.createSparkleDecoration()
      ]);

      // Enregistrer la vue personnalisée AVANT tout le reste
      this.registerView(
         'youtube-player',
         (leaf) => {
            console.log("Création d'une nouvelle vue YouTube");
            return new YouTubeView(leaf);
         }
      );

   /*       // Charger l'API YouTube
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      
      this.player = new YouTubePlayer(this);
      this.hotkeys = new HotkeyManager(this);
      this.hotkeys.registerHotkeys(); */
   }

   createSparkleDecoration() {
      const plugin = this;
      return ViewPlugin.fromClass(class {
         constructor(view) {
               this.app = plugin.app;
               this.decorations = this.buildDecorations(view);
         }

         update(update) {
               if (update.docChanged) {
                  this.decorations = this.buildDecorations(update.view);
               }
         }

         buildDecorations(view) {
            const decorations = [];
            const plugin = this;
            
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
                  console.log("Lien YouTube trouvé:", {
                     texte: linkText,
                     url: url,
                     videoId: videoId,
                     position: pos
                  });
                  
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
                           this.plugin = plugin;
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
                              new SplitView(this.app, this.videoId, this.plugin).open();
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
   async loadSettings() {
      this.settings = Object.assign({}, this.DEFAULT_SETTINGS, await this.loadData());
   }

      async saveSettings(data) {
         console.log("Sauvegarde des paramètres:", data);
         this.settings = Object.assign({}, this.settings, data);
         await this.saveData(this.settings);
      } 
   }
class SplitView extends Plugin {
   static activeView = null;

   constructor(app, videoId, plugin) {
      super(app);
      this.videoId = videoId;
      this.leaf = null;
      this.plugin = plugin;
   }
/* 
si on réouvre l'app alors on a un lastvieoId et un open yes 
 */
   async open() {
      console.log("Ouvrir la vidéo:", this.lastVideoId);
   // Charger l'état de la vidéo
      this.plugin.settings.isVideoOpen ? this.videoId = this.plugin.settings.lastVideoId : this.videoId;
      this.plugin.settings.isVideoOpen = true;
      await this.plugin.saveSettings();
   // Réutiliser la vue existante si elle existe
      if (SplitView.activeView) {
         const container = SplitView.activeView.containerEl.children[0];
         container.empty();
         
         const iframe = document.createElement('iframe');
         iframe.setAttribute('src', `https://www.youtube.com/embed/${this.videoId}`);
         iframe.setAttribute('width', '100%');
         iframe.setAttribute('height', '100%');
         iframe.setAttribute('frameborder', '0');
         iframe.setAttribute('allowfullscreen', 'true');
         
         container.appendChild(iframe);
         return;
      }
   // Sinon créer une nouvelle vue avec un conteneur, une hauteur et l'iframe YouTube
      const newLeaf = this.app.workspace.splitActiveLeaf('vertical');
      SplitView.activeView = newLeaf.view;
      this.leaf = newLeaf;
      
      const container = newLeaf.view.containerEl.children[0];
      container.empty();
      
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.height = '100%';
      
      const iframe = document.createElement('iframe');
      iframe.setAttribute('src', `https://www.youtube.com/embed/${this.videoId}`);
      iframe.setAttribute('width', '100%');
      iframe.setAttribute('height', '100%');
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allowfullscreen', 'true');
      
      container.appendChild(iframe);
   }

   onClose() {
      if (this.leaf) {
   // Mettre à jour l'état lors de la fermeture
      this.plugin.settings.isVideoOpen = false;
      this.plugin.saveSettings();

         SplitView.activeView = null;
         this.leaf.detach();
      }
      super.onClose();
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

module.exports = YouTubeFlowPlugin;
const { Plugin, Notice, Modal, ItemView } = require('obsidian');
const { EditorView, ViewPlugin, Decoration } = require('@codemirror/view');

class YouTubeModal extends Modal {
   constructor(app, videoId) {
      super(app);
      this.videoId = videoId;
      this.leaf = null;
   }
   async onOpen() {
      console.log("Tentative d'ouverture de la modale YouTube");
      
      try {
         const leaf = this.app.workspace.getLeaf('split');
         console.log("Leaf obtenu:", leaf);
         
         if (!leaf) {
            console.error("Impossible d'obtenir un leaf");
            return;
         }
         
         this.leaf = leaf;
         
         await this.leaf.setViewState({
            type: 'youtube-player',
            active: true,
            state: {}
         });
         console.log("ViewState défini");

         this.leaf.resize(40);
         console.log("Leaf redimensionné");

         if (this.leaf.view instanceof YouTubeView) {
            console.log("Vue YouTube trouvée, définition du videoId:", this.videoId);
            this.leaf.view.setVideoId(this.videoId);
         } else {
            console.error("La vue n'est pas une YouTubeView:", this.leaf.view);
         }
      } catch (error) {
         console.error("Erreur complète lors de la création du split:", error);
      }
   }  

   createPlayer(container) {
      // Attendre que l'API YouTube soit chargée
      if (typeof YT === 'undefined' || !YT.Player) {
         setTimeout(() => this.createPlayer(container), 100);
         return;
      }

      new YT.Player(container, {
         height: '360',
         width: '640',
         videoId: this.videoId,
         playerVars: {
               autoplay: 1,
               modestbranding: 1,
               rel: 0
         }
      });
   }

   onClose() {
      if (this.leaf) {
         this.leaf.detach();
      }
      super.onClose();
   }
}
class UIController {
   constructor(plugin) {
      this.plugin = plugin;
   }
   addYouTubeButton(link) {
      console.log('Ajout du bouton YouTube pour:', link.href);
      
      // Ajouter un écouteur d'événement sur le lien
      link.addEventListener('click', (e) => {
         console.log('Clic sur le lien YouTube:', link.href);
         new YouTubeModal(this.plugin.app, this.plugin.player.getVideoId(link.href)).open();
      });

      const button = document.createElement('button');
      button.className = 'youtube-flow-button';
      button.innerHTML = '▶';
      button.onclick = (e) => {
         e.preventDefault();
         e.stopPropagation(); // Empêcher la propagation de l'événement
         console.log('Clic sur le bouton YouTube');
         const videoId = this.plugin.player.getVideoId(link.href);
         if (videoId) {
               new YouTubeModal(this.plugin.app, videoId).open();
         } else {
               new Notice('ID de vidéo YouTube invalide');
         }
      };
      link.parentElement?.insertBefore(button, link.nextSibling);
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
class YouTubeUtils {
   static getVideoId(url) {
      const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/;
      const match = url.match(regex);
      return match ? match[1] : '';
   }
}
// Plugin de vue pour les liens YouTube
const youtubeViewPlugin = ViewPlugin.fromClass(class {
   constructor(view) {
      this.decorations = this.buildDecorations(view);
   }

   update(update) {
      if (update.docChanged || update.viewportChanged) {
         this.decorations = this.buildDecorations(update.view);
      }
   }

   buildDecorations(view) {
      let decorations = [];
      
      for (const { from, to } of view.visibleRanges) {
         const text = view.state.doc.sliceString(from, to);
         const youtubeRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[^&\s]+)/g;
         
         let match;
         while ((match = youtubeRegex.exec(text)) !== null) {
               const start = from + match.index;
               const end = start + match[0].length;
               
               decorations.push(Decoration.mark({
                  class: "youtube-link",
                  attributes: {
                     "data-video-id": YouTubeUtils.getVideoId(match[0])
                  }
               }).range(start, end));
         }
      }
      
      return Decoration.set(decorations);
   }

   getVideoId(url) {
      const regex = /(?:youtube\.com\/watch\?v=|youtu.be\/)([^&\s]+)/;
      const match = url.match(regex);
         return match ? match[1] : '';
      }
   }, {
   decorations: v => v.decorations,
   eventHandlers: {
      mousedown: (e, view) => {
         console.log("Click détecté seeeur:", e.target);
         if (e.target.classList.contains("youtube-link")) {
            e.preventDefault();
            e.stopPropagation();
            
            const videoId = e.target.getAttribute("data-video-id");
            console.log("Video ID:", videoId);
            if (videoId) {
               new YouTubeModal(app, videoId).open();
            }
            return true;
         }
      }
   }
});

class YouTubeFlowPlugin extends Plugin {
   async onload() {
      console.log('Chargement du plugin YouTube Flow...');

      // Enregistrer la vue personnalisée AVANT tout le reste
      this.registerView(
         'youtube-player',
         (leaf) => {
            console.log("Création d'une nouvelle vue YouTube");
            return new YouTubeView(leaf);
         }
      );

      // Tester immédiatement la création d'une vue
      try {
         const leaf = this.app.workspace.getLeaf('split');
         console.log("Test de création leaf:", leaf);
         
         await leaf.setViewState({
            type: 'youtube-player',
            active: true,
            state: {}
         });
         
         console.log("Vue YouTube créée avec succès");
      } catch (error) {
         console.error("Erreur lors du test de création de la vue:", error);
      }

      // Charger l'API YouTube
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      
      // Initialiser les composants
      this.ui = new UIController(this);
      this.player = new YouTubePlayer(this);
      this.hotkeys = new HotkeyManager(this);

      // Initialiser les raccourcis
      this.hotkeys.registerHotkeys();

      // Vérifier que nous avons accès à CodeMirror
      if (!window.CodeMirror) {
         console.error('CodeMirror non disponible');
         return;
      }

      // Enregistrer le plugin de vue
      this.registerEditorExtension([youtubeViewPlugin]);

      new Notice('Plugin YouTube Flow activé !');
      console.log('Plugin YouTube Flow chargé avec succès');
   }


   onunload() {
      console.log('Déchargement du plugin YouTube Flow');
   }
}
class YouTubeView extends ItemView {
   constructor(leaf) {
      super(leaf);
      this.videoId = null;
   }

   getViewType() {
      return 'youtube-player';
   }

   getDisplayText() {
      return 'YouTube Player';
   }

   async onOpen() {
      const {contentEl} = this;
      contentEl.empty();
      contentEl.addClass('youtube-flow-container');
      
      const container = contentEl.createDiv('youtube-flow-player');
      
      // Si on a un videoId, on crée le player
      if (this.videoId) {
         if (typeof YT === 'undefined' || !YT.Player) {
            setTimeout(() => this.createPlayer(container), 100);
            return;
         }

         new YT.Player(container, {
            height: '360',
            width: '640',
            videoId: this.videoId,
            playerVars: {
               autoplay: 1,
               modestbranding: 1,
               rel: 0
            }
         });
      }
   }

   // Méthode pour mettre à jour la vidéo
   setVideoId(videoId) {
      this.videoId = videoId;
      this.onOpen(); // Recharger la vue avec la nouvelle vidéo
   }
} 
module.exports = YouTubeFlowPlugin;
import { Plugin, Modal, Notice } from 'obsidian';

// Classe pour la modale YouTube
class YouTubeModal extends Modal {
   constructor(app, videoId) {
      super(app);
      this.videoId = videoId;
   }

   onOpen() {
      console.log('Ouverture de la modale avec videoId:', this.videoId);
      const {contentEl} = this;
      contentEl.empty();
      
      const container = contentEl.createDiv('youtube-flow-player');
      this.createPlayer(container);
   }

   createPlayer(container) {
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
      const {contentEl} = this;
      contentEl.empty();
   }
}

// Classe pour gérer l'interface utilisateur
class UIController {
   constructor(plugin) {
      this.plugin = plugin;
   }

   addYouTubeButton(link) {
      console.log('Ajout du bouton YouTube pour:', link.href);
      const button = document.createElement('button');
      button.className = 'youtube-flow-button';
      button.innerHTML = '▶';
      button.onclick = (e) => {
         e.preventDefault();
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

// Classe pour gérer le lecteur YouTube
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

// Classe pour gérer les raccourcis clavier
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

// Classe principale du plugin
export default class YouTubeFlowPlugin extends Plugin {
   async onload() {
      console.log('Chargement du plugin YouTube Flow...');

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

      // Post-processeur Markdown pour ajouter les boutons YouTube
      this.registerMarkdownPostProcessor((el) => {
         console.log('Traitement du contenu Markdown');
         const links = el.querySelectorAll('a');
         links.forEach(link => {
               if (this.isYouTubeLink(link.href)) {
                  console.log('Lien YouTube trouvé:', link.href);
                  this.ui.addYouTubeButton(link);
               }
         });
      });

      new Notice('Plugin YouTube Flow activé !');
      console.log('Plugin YouTube Flow chargé avec succès');
   }

   isYouTubeLink(url) {
      const isYT = url?.includes('youtube.com/watch') || url?.includes('youtu.be/');
      console.log('Vérification du lien YouTube:', url, isYT);
      return isYT;
   }

   onunload() {
      console.log('Déchargement du plugin YouTube Flow');
   }
}

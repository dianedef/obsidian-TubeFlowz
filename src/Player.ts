import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import '@videojs/themes/dist/forest/index.css';

interface PlayerOptions {
   container: HTMLElement;
   videoId: string;
   onReady?: () => void;
   onError?: (error: any) => void;
}

export const createYouTubePlayer = async (options: PlayerOptions) => {
   const { container, videoId, onReady, onError } = options;

   try {
      // Nettoyer le conteneur
      container.innerHTML = '';

      // Créer l'élément vidéo
      const videoElement = document.createElement('video');
      videoElement.className = 'video-js vjs-theme-forest';
      container.appendChild(videoElement);

      // Configuration du player
      const playerOptions = {
         controls: true,
         fluid: true,
         techOrder: ['youtube'],
         sources: [{
               type: 'video/youtube',
               src: `https://www.youtube.com/watch?v=${videoId}`
         }],
         youtube: {
               iv_load_policy: 3,
               modestbranding: 1,
               rel: 0,
               showinfo: 0,
               controls: 1,
               playsinline: 1,
               enablejsapi: 1,
               origin: window.location.origin
         }
      };

      // Créer le player
      const player = videojs(videoElement, playerOptions);

      // Événements du player
      player.ready(() => {
         console.log('Player prêt');
         onReady?.();
      });

      player.on('error', (error) => {
         console.error('Erreur du player:', error);
         onError?.(error);
      });

      return player;

   } catch (error) {
      console.error('Erreur lors de la création du player:', error);
      onError?.(error);
      throw error;
   }
};
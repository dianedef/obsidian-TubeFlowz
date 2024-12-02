export function registerStyles() {
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
      .youtube-resize-handle {
         position: absolute;
         bottom: -6px;
         left: 0;
         width: 100%;
         height: 12px;
         background: transparent;
         cursor: ns-resize;
         z-index: 102;
      }

      .youtube-resize-handle:hover {
         background: var(--interactive-accent);
         opacity: 0.3;
      }

      .youtube-resize-handle:active {
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
export function registerStyles() {
   document.head.appendChild(document.createElement('style')).textContent = `
      /* ===== Structure de base ===== */
      .youtube-flow-container {
         position: relative;
         width: 100%;
         height: 100%;
         display: flex;
         flex-direction: column;
      }

      .youtube-player-wrapper {
         flex: 1;
         display: flex;
         flex-direction: column;
         position: relative;
         overflow: hidden;
         height: 100% !important;
         min-height: 100% !important;
      }

      /* ===== VideoJS - Structure de base ===== */
      .video-js {
         display: flex !important;
         flex-direction: column !important;
         width: 100% !important;
         height: 100% !important;
      }

      .video-js > div:first-child {
         flex: 1 !important;
         position: relative !important;
         min-height: 0 !important;
      }

      .vjs-tech {
         width: 100% !important;
         height: 100% !important;
         position: relative !important;
      }

      /* ===== Barre de contrôle ===== */
      .vjs-control-bar {
         height: 60px !important;
         background: var(--background-secondary) !important;
         display: flex !important;
         align-items: center !important;
         padding: 0 10px !important;
      }

      .vjs-control {
         display: flex !important;
         align-items: center !important;
         height: 40px !important;
      }

      /* ===== Volume Panel ===== */
      .vjs-volume-panel {
         display: flex !important;
         flex-direction: row !important;
         align-items: center !important;
         width: auto !important;
      }

      .vjs-volume-control {
         width: 80px !important;
         height: 100% !important;
      }

      /* ===== Progress Control ===== */
      .vjs-progress-control {
         position: absolute !important;
         top: 0 !important;
         left: 0 !important;
         width: 100% !important;
         height: 4px !important;
         background: var(--background-modifier-border) !important;
         cursor: pointer !important;
         transition: height 0.2s !important;
      }

      .vjs-progress-control:hover {
         height: 8px !important;
      }

      .vjs-play-progress {
         background: var(--interactive-accent) !important;
         height: 100% !important;
         max-height: 4px !important;
      }

      .vjs-progress-control:hover .vjs-play-progress {
         max-height: 8px !important;
      }

      .vjs-progress-holder {
         position: relative !important;
         height: 6px !important;
         width: 100% !important;
         display: flex !important;
         align-items: center !important;
         cursor: pointer !important;
         transition: height 0.2s !important;
      }

      /* ===== Time Controls ===== */
      .vjs-time-control {
         display: flex !important;
         align-items: center !important;
         min-width: 50px !important;
         padding: 0 8px !important;
         font-size: 13px !important;
      }

      .vjs-current-time,
      .vjs-duration,
      .vjs-time-divider {
         display: flex !important;
         align-items: center !important;
      }

      .vjs-time-divider {
         padding: 0 3px !important;
      }

      /* ===== Tooltips ===== */
      .vjs-time-tooltip {
         background: var(--background-secondary) !important;
         padding: 2px 5px !important;
         border-radius: 3px !important;
         font-size: 12px !important;
         white-space: nowrap !important;
         opacity: 0;
         transition: opacity 0.2s;
      }

      .vjs-progress-control:hover .vjs-time-tooltip {
         opacity: 1;
      }

      /* ===== Fullscreen Controls ===== */
      .vjs-fullscreen-control {
         cursor: pointer !important;
         width: 40px !important;
         height: 40px !important;
         display: flex !important;
         align-items: center !important;
         justify-content: center !important;
         opacity: 0.8 !important;
         transition: opacity 0.2s ease !important;
      }

      .vjs-fullscreen-control:hover {
         opacity: 1 !important;
      }

      .video-js.vjs-fullscreen {
         position: fixed !important;
         top: 0 !important;
         left: 0 !important;
         width: 100vw !important;
         height: 100vh !important;
         z-index: 9999 !important;
      }

      /* ===== Custom Controls ===== */
      .youtube-view-controls {
         position: absolute;
         top: 10px;
         right: 10px;
         z-index: 101;
         display: flex;
         gap: 5px;
      }

      .youtube-view-close {
         cursor: pointer;
         padding: 5px;
         background: var(--background-secondary);
         border-radius: 3px;
         opacity: 0.8;
      }

      .youtube-view-close:hover {
         opacity: 1;
      }

      /* ===== Resize Handle ===== */
      .youtube-resize-handle {
         position: absolute;
         bottom: 0;
         left: 0;
         width: 100%;
         height: 12px;
         cursor: ns-resize;
         z-index: 102;
         background: transparent;
         transition: background-color 0.2s;
      }

      .youtube-resize-handle:hover {
         background: var(--interactive-accent);
         opacity: 0.3;
      }

      /* ===== Hide Elements ===== */
      .vjs-poster,
      .vjs-loading-spinner,
      .vjs-big-play-button,
      .vjs-control-text[role="presentation"] {
         display: none !important;
      }

      /* ===== Overlay Mode ===== */
      .youtube-overlay {
         position: absolute;
         top: 0;
         left: 0;
         width: 100%;
         height: 100%;
         background: var(--background-primary);
         z-index: 100;
      }
   `;
}
export function registerStyles() {
const styleEl = document.createElement('style');
styleEl.id = 'youtube-player-styles';
styleEl.textContent = `
    /* ===== Décorations ===== */
    .youtube-sparkle-decoration {
        cursor: pointer;
        user-select: none;
        pointer-events: all;
        background: none;
        border: none;
        padding: 2px;
        margin-left: 4px;
        position: relative;
        display: inline-block;
        opacity: 0.8;
        transition: opacity 0.2s ease-in-out;
    }

    .youtube-sparkle-decoration:hover {
        opacity: 1;
    }

    .youtube-link {
        color: var(--text-accent);
        text-decoration: none;
    }

    .youtube-link:hover {
        text-decoration: underline;
    }

    /* ===== Structure de base ===== */


    /* Conteneur principal */
    .youtube-player-container {
        width: 100%;
        height: 100%;
        background: var(--background-primary);
        padding: 10px;
    }

    /* Conteneur du player */
    .youtube-player-embed {
        width: 100%;
        position: relative;
        background: var(--background-secondary);
    }

    /* Player video.js */
    .video-js {
        width: 100% !important;
        height: 100% !important;
        background-color: var(--background-secondary) !important;
    }

    /* Barre de progression */
    .vjs-progress-control {
        width: 100% !important;
        height: 5px !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        background: rgba(255, 255, 255, 0.2) !important;
    }

    .vjs-play-progress {
        background-color: var(--interactive-accent) !important;
    }

    /* Boutons spécifiques */
    .vjs-playback-rate,
    .vjs-volume-panel,
    .vjs-picture-in-picture-control,
    .vjs-fullscreen-control {
        margin-left: 5px !important;
    }

    /* Temps */
    .vjs-current-time,
    .vjs-time-divider,
    .vjs-duration {
        padding: 0 5px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-width: 40px !important;
    }
    
    /* ===== Barre de contrôle ===== */
    .vjs-control-bar {
        width: 100% !important;
        position: absolute !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        height: 60px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 0 10px !important;
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

document.head.appendChild(styleEl);
}

export function unregisterStyles() {
const styleEl = document.getElementById('youtube-player-styles');
if (styleEl) {
    styleEl.remove();
}
} 
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
 
    /* Barre de progression */
    .vjs-progress-control {
        width: 100%;
        height: 3px;
        position: absolute;
        top: 12px;
        left: 0;
        right: 0;
        background: var(--background-modifier-border);
        transition: height 0.2s ease;
        cursor: pointer;
        z-index: 101;
    }

    .vjs-progress-control:hover {
        height: 6px;
    }

    /* Barre de chargement (buffer) */
    .vjs-load-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: var(--background-modifier-success-hover);
        opacity: 0.2;
    }

    /* Barre de lecture */
    .vjs-play-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        background: var(--interactive-accent);
    }

    /* Curseur de temps */
    .vjs-play-progress:before {
        content: '●';
        font-size: 8px;
        position: absolute;
        right: -4px;
        top: -2px;
        color: var(--interactive-accent);
        text-shadow: 0 0 3px rgba(0,0,0,0.5);
        transform: scale(0);
        transition: transform 0.2s ease;
    }

    .vjs-progress-control:hover .vjs-play-progress:before {
        transform: scale(1);
    }

    /* Boutons spécifiques */
    .vjs-playback-rate,
    .vjs-volume-panel,
    .vjs-picture-in-picture-control,
    .vjs-fullscreen-control {
        margin-left: 5px;
    }

    /* Temps */
    .vjs-current-time,
    .vjs-time-divider,
    .vjs-duration {
        padding: 0 5px;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 40px;
    }
    
    /* ===== Barre de contrôle ===== */
    .vjs-control-bar {
        width: 100%;
        position: relative;
        background: none;
        height: 30px;
        min-height: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 5px;
    }
    .vjs-progress-control {
        position: absolute;
        top: -10px;
        left: 0;
        right: 0;
        width: 100%;
        height: 3px;
        background: var(--background-modifier-border);
        transition: height 0.2s ease;
        cursor: pointer;
    }

    /* ===== Resize Handle ===== */
    .youtube-resize-handle {
        position: absolute;
        bottom: 0;
        left: 0;
        z-index: 999;
        width: 100%;
        height: 12px;
        cursor: ns-resize;
        background: transparent;
        transition: background-color 0.2s;
        opacity: 0;
        pointer-events: auto;
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
        display: none;
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

    /* Structure du player */
    .youtube-player-container {
        position: relative;
        width: 100%;
        display: flex;
        flex-direction: column;
    }

    .youtube-player-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
        width: 100%;
        background: var(--background-secondary);
        min-height: 0;
    }

    .youtube-video-container {
        flex: 1;
        width: 100%;
        position: relative;
        min-height: 0;
    }

    .youtube-controls-container {
        width: 100%;
        background: var(--background-secondary-alt);
        padding: 5px 0;
    }

    .video-js {
        min-height: 0 !important;
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
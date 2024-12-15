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
        opacity: 0.6;
        transition: opacity 0.2s ease-in-out;
    }

    .youtube-sparkle-decoration:hover {
        opacity: 1;
    }

    .youtube-link {
        color: var(--text-accent);
        text-decoration: none;
    }

    /* ===== Structure de base ===== */

    /* Barre de chargement (buffer) */
    .vjs-load-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 12px;
        background: var(--background-modifier-success-hover);
        opacity: 0.2;
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
        height: 40px;
        min-height: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 5px;
    }

    /* Boutons de la barre de contrôle */
    .vjs-control-bar .vjs-control,
    .vjs-control-bar .vjs-button,
    .vjs-control-bar .vjs-playback-rate {
        font-size: 16px;
        cursor: pointer;
    }

    /* Barre de progression */
    .vjs-progress-control {
        position: relative;
        width: 100%;
        height:30px;
        background: var(--background-modifier-border);
        cursor: pointer;
        z-index: 101;
        margin-bottom: 5px;
        padding: 0;
    }

    /* Barre de chargement (buffer) */
    .vjs-load-progress {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background: var(--background-modifier-success-hover);
        opacity: 0.2;
    }

    /* Barre de lecture */
    .vjs-play-progress {
        position: absolute;
        left: 0;
        top: 0;
        height: 100%;
        background: var(--interactive-accent);
        width: 0;
        opacity: 0.5;
    }

    /* État initial de la barre de progression */
    .vjs-progress-holder {
        position: relative;
        height: 30px;
    }
    
    .video-js:not(.vjs-has-started) .vjs-play-progress {
        width: 0 !important;
    }
        

    /* Tooltip de temps */
    .vjs-mouse-display {
        display: none;
        position: absolute;
        z-index: 102;
    }
    .vjs-progress-control:hover .vjs-mouse-display {
        display: block;
    }

    /* Tooltip de la barre de progression uniquement */
    .vjs-progress-holder .vjs-time-tooltip {
        position: absolute;
        top: -30px;
        transform: translateX(-50%);
        background: var(--background-secondary-alt);
        color: var(--text-normal);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.9em;
        white-space: nowrap;
        display: none;
    }

    /* N'afficher le tooltip que lors du survol et du mouvement de la souris */
    .vjs-progress-control:hover .vjs-mouse-display .vjs-time-tooltip {
        display: block;
    }

    /* Masquer spécifiquement le tooltip de durée totale */
    .vjs-progress-holder .vjs-play-progress .vjs-time-tooltip {
        display: none !important;
    }

    /* Masquer tous les autres tooltips */
    .vjs-control-bar .vjs-time-tooltip:not(.vjs-progress-holder .vjs-time-tooltip) {
        display: none;
    }

    /* Temps */
    .vjs-current-time,
    .vjs-time-divider,
    .vjs-duration {
        padding: 0 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: unset;
    }

    /* ===== Resize Handle ===== */
    .youtube-resize-handle {
        position: absolute;
        bottom: -10px;
        left: 0;
        z-index: 999;
        width: 100%;
        height: 16px;
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
    .vjs-remaining-time,
    .vjs-load-progress div,
    .vjs-load-progress span {
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
        display: flex;
        flex-direction: column;
        gap: 5px;
        padding: 0 0 10px 0;
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
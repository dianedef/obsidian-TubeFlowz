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
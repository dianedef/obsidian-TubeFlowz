import { vi } from 'vitest';
import { App, WorkspaceLeaf, View } from 'obsidian';

// Mock Obsidian avant les imports
vi.mock('obsidian', () => ({
    ItemView: class {
        containerEl: HTMLElement;
        constructor() {
            this.containerEl = document.createElement('div');
        }
        onOpen() { return Promise.resolve(); }
        onClose() { return Promise.resolve(); }
        getViewType() { return 'youtube-player'; }
        getDisplayText() { return 'YouTube Player'; }
    },
    Plugin: class {
        app: any;
        manifest: any;
        constructor(app: any, manifest: any) {
            this.app = app;
            this.manifest = manifest;
        }
        registerInterval(id: number) { return id; }
        registerHoverLinkSource(id: string, info: any) {}
    }
}));

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PlayerView } from '../../views/PlayerView';
import PlayerService from '../../services/player/PlayerService';
import { PlayerUI } from '../../views/PlayerUI';
import { SettingsService } from '../../services/settings/SettingsService';
import { ViewModeService } from '../../services/viewMode/ViewModeService';
import { VIEW_MODES } from '../../types/ISettings';
import { MockPlugin, obsidianMock } from '../setup';
import { eventBus } from '../../core/EventBus';
import { PlayerErrorCode } from '../../types/IErrors';
import { IPlayerState } from '../../types/IPlayer';

describe('PlayerView Integration Tests', () => {
    let playerView: PlayerView;
    let playerService: PlayerService;
    let playerUI: PlayerUI;
    let settings: SettingsService;
    let viewModeService: ViewModeService;
    let mockLeaf: any;
    let mockPlugin: MockPlugin;
    let containerDiv: HTMLDivElement;

    beforeEach(async () => {
        // Réinitialiser le DOM
        document.body.innerHTML = '';
        containerDiv = document.createElement('div');
        document.body.appendChild(containerDiv);

        mockLeaf = {
            view: {},
            id: 'test-leaf',
            containerEl: containerDiv,
            getViewState: vi.fn(),
            setViewState: vi.fn(),
            detach: vi.fn(),
            empty: vi.fn()
        };

        // Add empty and detach methods to containerEl
        containerDiv.empty = function() {
            while (this.firstChild) {
                this.removeChild(this.firstChild);
            }
        };
        containerDiv.detach = function() {
            this.remove();
        };

        // Extend workspace mock
        obsidianMock.workspace = {
            ...obsidianMock.workspace,
            onLayoutReady: vi.fn(),
            changeLayout: vi.fn(),
            getLayout: vi.fn(),
            createLeafInParent: vi.fn(),
            getRightLeaf: vi.fn().mockReturnValue({
                setViewState: vi.fn(),
                getViewState: vi.fn(),
                view: {},
                containerEl: containerDiv
            }),
            getLeaf: vi.fn().mockReturnValue({
                setViewState: vi.fn(),
                getViewState: vi.fn(),
                view: {},
                containerEl: containerDiv
            }),
            iterateLeaves: vi.fn(),
            getActiveLeaf: vi.fn(),
            setActiveLeaf: vi.fn(),
            getLeafById: vi.fn(),
            getLeftLeaf: vi.fn(),
            createLeafBySplit: vi.fn(),
            splitLeaf: vi.fn(),
            duplicateLeaf: vi.fn(),
            getWindow: vi.fn(),
            getActiveViewOfType: vi.fn(),
            getActiveFile: vi.fn(),
            setActiveFile: vi.fn(),
            openLinkText: vi.fn(),
            getLinkpath: vi.fn(),
            getActiveEditor: vi.fn(),
            activeEditor: null,
            activeLeaf: {
                view: {
                    getViewType: vi.fn()
                }
            },
            containerEl: containerDiv
        };

        mockPlugin = new MockPlugin(obsidianMock, {
            id: 'test-plugin',
            name: 'Test Plugin',
            version: '1.0.0'
        });

        settings = new SettingsService(mockPlugin);
        await settings.initialize();
        
        // Configurer les settings par défaut
        settings.lastVideoId = 'dQw4w9WgXcQ';
        settings.lastTimestamp = 0;
        settings.volume = 1;
        settings.isMuted = false;
        settings.playbackRate = 1;
        settings.defaultViewMode = VIEW_MODES.Tab;

        playerService = PlayerService.getInstance(mockPlugin.app, settings);
        playerUI = PlayerUI.getInstance(settings, playerService);
        viewModeService = new ViewModeService(mockPlugin, VIEW_MODES.Tab);

        playerView = new PlayerView(mockLeaf);
        containerDiv = playerView.containerEl;

        // Assigner les services à la vue
        (playerView as any).playerService = playerService;
        (playerView as any).playerUI = playerUI;
        (playerView as any).viewModeService = viewModeService;
        (playerView as any).settings = settings;
    });

    afterEach(async () => {
        vi.clearAllMocks();
        if (playerView) {
            await playerView.onClose();
        }
        containerDiv.remove();
    });

    it('should initialize correctly', async () => {
        expect(playerView).toBeDefined();
        expect(playerView).toBeInstanceOf(PlayerView);

        // S'assurer que le container est accessible
        expect(containerDiv).toBeDefined();
        expect(playerView.containerEl).toBeDefined();

        // Configurer les settings avec un videoId par défaut
        const mockSettings = {
            lastVideoId: 'dQw4w9WgXcQ',
            getCurrentLanguage: () => 'fr'
        };
        (playerView as any).settings = mockSettings;

        // Initialiser la vue
        await playerView.onOpen();
        
        // Attendre que le DOM soit mis à jour
        await new Promise(resolve => setTimeout(resolve, 100));

        // Vérifier que le container a été initialisé
        expect(containerDiv.children.length).toBeGreaterThan(0);
        expect(containerDiv.querySelector('.video-js')).toBeTruthy();

        // Vérifier que le player est initialisé
        const playerUI = (playerView as any).playerUI;
        expect(playerUI).toBeDefined();
        expect(playerUI.Player).toBeDefined();
    });

    it('should handle view mode changes', async () => {
        // Initialiser la vue
        await playerView.onOpen();

        // Configurer le mock pour retourner une vue existante
        const mockWorkspace = (mockPlugin.app as any).workspace;
        mockWorkspace.getActiveViewOfType.mockReturnValue(playerView);

        // Changer le mode
        await viewModeService.setMode(VIEW_MODES.Sidebar);
        
        // Vérifier que le mode a été changé
        expect(viewModeService.getCurrentMode()).toBe(VIEW_MODES.Sidebar);
        expect(mockWorkspace.getRightLeaf).toHaveBeenCalled();
        expect(mockWorkspace.revealLeaf).toHaveBeenCalled();
    });

    it('should handle resize events', async () => {
        const mockResizeCallback = vi.fn();
        eventBus.on('view:resize', mockResizeCallback);

        // Simuler un ResizeObserver
        const resizeCallback = vi.fn().mockImplementation((entries) => {
            for (const entry of entries) {
                const height = entry.contentRect.height;
                eventBus.emit('view:resize', height);
            }
        });
        const resizeObserver = new ResizeObserver(resizeCallback);

        // Observer le container
        resizeObserver.observe(containerDiv);

        // Simuler un changement de taille
        containerDiv.style.height = '500px';
        
        // Déclencher manuellement le callback
        resizeCallback([{
            contentRect: { height: 500, width: 800 },
            target: containerDiv,
            borderBoxSize: [],
            contentBoxSize: [],
            devicePixelContentBoxSize: []
        }]);

        // Ajouter un délai pour permettre au ResizeObserver de réagir
        await new Promise(resolve => setTimeout(resolve, 100));
        expect(mockResizeCallback).toHaveBeenCalledWith(500);

        // Cleanup
        resizeObserver.disconnect();
    });

    it('should handle player service interactions', async () => {
        await expect(playerView.onOpen()).resolves.not.toThrow();
        const videoId = 'test-video-id';
        const playerState: IPlayerState = {
            videoId,
            timestamp: 0,
            currentTime: 0,
            volume: 1,
            playbackRate: 1,
            isMuted: false,
            isPlaying: false,
            error: null,
            mode: VIEW_MODES.Tab,
            fromUserClick: false,
            autoplay: false,
            isPaused: true,
            isStopped: false,
            isLoading: false,
            isError: false,
            containerId: 'player-container',
            height: 360,
            controls: true,
            loop: false
        };
        await playerService.loadVideo(playerState);
        const state = playerService.getCurrentState();
        expect(state.videoId).toBe(videoId);
    });
}); 
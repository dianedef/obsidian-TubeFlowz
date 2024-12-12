import { vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../../types/ISettings';
import { VideoId } from '../../types/IBase';

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
    }
}));

import PlayerService from '../../services/PlayerService';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PlayerView } from '../../views/PlayerView';
import { PlayerUI } from '../../views/PlayerUI';
import { SettingsService } from '../../services/settings/SettingsService';
import { ViewModeService } from '../../services/ViewModeService';
import { VIEW_MODES } from '../../types/ISettings';
import { MockPlugin, obsidianMock } from '../setup';
import { eventBus } from '../../services/EventBus';
import { IPlayerOptions } from '../../types/IPlayer';

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
            id: 'test-leaf',
            containerEl: containerDiv,
            view: {
                getViewType: vi.fn(),
                app: {
                    workspace: {
                        on: vi.fn(),
                        off: vi.fn(),
                        getActiveViewOfType: vi.fn(),
                        getLeaf: vi.fn(),
                        getLeavesOfType: vi.fn().mockReturnValue([])
                    },
                    vault: {
                        on: vi.fn(),
                        off: vi.fn(),
                        adapter: {
                            exists: vi.fn().mockResolvedValue(true),
                            read: vi.fn().mockResolvedValue(''),
                            write: vi.fn().mockResolvedValue(undefined)
                        }
                    },
                    metadataCache: {
                        on: vi.fn(),
                        off: vi.fn()
                    },
                    fileManager: {
                        processFrontMatter: vi.fn()
                    },
                    lastEvent: null,
                    keymap: {
                        pushScope: vi.fn(),
                        popScope: vi.fn()
                    },
                    scope: {
                        register: vi.fn(),
                        unregister: vi.fn()
                    }
                },
                icon: 'icon',
                navigation: false
            },
            parent: null,
            openFile: vi.fn(),
            open: vi.fn(),
            detach: vi.fn(),
            setViewState: vi.fn(),
            getViewState: vi.fn(),
            setPinned: vi.fn(),
            setEphemeral: vi.fn(),
            togglePinned: vi.fn(),
            setDraggedFile: vi.fn(),
            setGroupMember: vi.fn(),
            setGroup: vi.fn(),
            setRoot: vi.fn()
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
                    getViewType: vi.fn(),
                    app: {
                        keymap: {
                            pushScope: vi.fn(),
                            popScope: vi.fn()
                        },
                        scope: {
                            register: vi.fn(),
                            unregister: vi.fn()
                        }
                    },
                    icon: 'icon',
                    navigation: false,
                    leaf: {}
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
        
        // S'assurer que les settings sont initialisés avec les valeurs par défaut
        Object.assign(settings.getSettings(), {
            ...DEFAULT_SETTINGS,
            currentMode: VIEW_MODES.Tab  // Override spécifique pour le test
        });
        await settings.save();

        // Utiliser les settings et non le service
        playerService = PlayerService.getInstance(mockPlugin.app, settings.getSettings());
        playerUI = PlayerUI.getInstance(settings, playerService);
        viewModeService = new ViewModeService(mockPlugin, VIEW_MODES.Tab);

        playerView = new PlayerView(mockLeaf, playerService, playerUI, settings, viewModeService);
        containerDiv = playerView.containerEl as HTMLDivElement;

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
        const videoId = 'test-video-id' as VideoId;
        const playerOptions: IPlayerOptions = {
            // Configuration de la vidéo
            videoId,
            timestamp: 0,
            
            // Options d'affichage
            mode: VIEW_MODES.Tab,
            height: 360,
            containerId: 'player-container',
            
            // Options de comportement
            autoplay: false,
            controls: true,
            loop: false,
            isMuted: false,
            volume: 1,
            playbackRate: 1,
            
            // Options de langue
            language: 'en',
            
            // Options techniques
            techOrder: ['youtube'],
            youtube: {
                iv_load_policy: 3,
                modestbranding: 1,
                rel: 0,
                endscreen: 0,
                controls: 0,
                ytControls: 0,
                preload: 'auto',
                showinfo: 0,
                fs: 0,
                playsinline: 1,
                disablekb: 1,
                enablejsapi: 1,
                origin: window.location.origin
            }
        };
        await playerService.loadVideo(playerOptions);
        const state = playerService.getCurrentState();
        expect(state.videoId).toBe(videoId);
    });
}); 
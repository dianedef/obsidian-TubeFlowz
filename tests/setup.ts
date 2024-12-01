import { vi } from 'vitest';
import '@testing-library/dom';
import { App, Plugin } from 'obsidian';
import { PlayerSettings, PluginWithSettings, VideoMode, PlaybackMode } from '../src/types.d';

declare global {
    interface Window {
        videojs: any;
        ResizeObserver: typeof ResizeObserver;
    }
    var mockVideoJS: any;
    var mockPlayer: any;
    var mockApp: App;
    var mockPlugin: PluginWithSettings;
}

// Mock de ResizeObserver
class MockResizeObserver {
    constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
        this.observe = vi.fn();
        this.unobserve = vi.fn();
        this.disconnect = vi.fn();
    }
    callback: ResizeObserverCallback;
    observe: ReturnType<typeof vi.fn>;
    unobserve: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
}

// Définir le type global de ResizeObserver
const MockResizeObserverSpy = vi.fn().mockImplementation((callback) => new MockResizeObserver(callback));
window.ResizeObserver = MockResizeObserverSpy as unknown as typeof ResizeObserver;

// Mock des paramètres par défaut
const defaultSettings: PlayerSettings = {
    lastVideoId: null,
    isVideoOpen: null,
    playlist: [],
    currentMode: 'sidebar' as VideoMode,
    viewHeight: 50,
    playbackMode: 'default' as PlaybackMode,
    favoriteSpeed: 2,
    isMuted: false,
    showYoutubeRecommendations: false,
    playbackRate: 1,
    volume: 1,
    isPlaying: false,
    activeLeafId: 'saved-leaf-id',
    overlayHeight: 50
};

// Mock des APIs Obsidian
const mockWorkspace = {
    on: vi.fn(),
    off: vi.fn(),
    activeLeaf: {
        id: 'test-leaf-id',
        view: {
            containerEl: {
                createDiv: (className: string) => {
                    const div = document.createElement('div');
                    div.className = className;
                    return div;
                }
            }
        }
    },
    getLeavesOfType: vi.fn().mockReturnValue([]),
    getRightLeaf: vi.fn().mockReturnValue({
        id: 'new-leaf-id',
        setViewState: vi.fn().mockResolvedValue(undefined),
        view: {}
    }),
    getLeaf: vi.fn().mockReturnValue({
        id: 'new-leaf-id',
        setViewState: vi.fn().mockResolvedValue(undefined),
        view: {}
    }),
    revealLeaf: vi.fn()
};

const mockApp = {
    workspace: mockWorkspace,
} as unknown as App;

const mockPlugin: PluginWithSettings = {
    app: mockApp,
    loadData: vi.fn().mockResolvedValue({ settings: defaultSettings }),
    saveData: vi.fn().mockResolvedValue(undefined),
    settings: defaultSettings,
    registerView: vi.fn(),
    addRibbonIcon: vi.fn().mockReturnValue({
        addEventListener: vi.fn()
    }),
    manifest: {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        minAppVersion: '0.15.0'
    },
    onload: async () => {},
    onunload: async () => {},
    addStatusBarItem: () => document.createElement('div'),
    addCommand: () => {},
    addSettingTab: () => {},
    saveSettings: async () => {},
    loadSettings: async () => {}
} as unknown as PluginWithSettings;

vi.mock('obsidian', () => ({
    App: vi.fn(() => mockApp),
    Plugin: vi.fn(() => mockPlugin),
    ItemView: vi.fn(),
    MarkdownView: vi.fn(),
    Notice: vi.fn(),
    Editor: vi.fn(),
    Menu: vi.fn().mockImplementation(() => ({
        addItem: vi.fn().mockReturnThis(),
        showAtMouseEvent: vi.fn()
    }))
}));

// Mock de VideoJS
const eventHandlers: { [key: string]: Function[] } = {};

const mockPlayer = {
    el: vi.fn(() => document.createElement('div')),
    src: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    paused: vi.fn(() => false),
    currentTime: vi.fn(() => 0),
    volume: vi.fn(() => 1),
    muted: vi.fn(() => false),
    playbackRate: vi.fn((rate?: number) => rate ?? 1),
    dispose: vi.fn(),
    on: vi.fn((event: string, handler: Function) => {
        if (!eventHandlers[event]) {
            eventHandlers[event] = [];
        }
        eventHandlers[event].push(handler);
    }),
    dispatchEvent: (event: Event) => {
        const handlers = eventHandlers[event.type];
        if (handlers) {
            handlers.forEach(handler => handler());
        }
    }
};

const mockVideoJS = vi.fn((element: HTMLElement) => mockPlayer);

// Mock de video.js
window.videojs = mockVideoJS;

vi.mock('video.js', () => ({
    default: mockVideoJS,
    __esModule: true,
}));

// Exposer le mock pour les tests
globalThis.mockVideoJS = mockVideoJS;
globalThis.mockPlayer = mockPlayer;

// Exposer le mock d'Obsidian pour les tests
globalThis.mockApp = mockApp;
globalThis.mockPlugin = mockPlugin; 
import { vi } from 'vitest';
import sinon from 'sinon';
import { App, Plugin, MarkdownPostProcessor, Command, EditorSuggest, HoverLinkSource } from 'obsidian';
import { Extension } from '@codemirror/state';

// Interface simplifiée pour VideoJS
export interface VideoJsPlayer {
    on: sinon.SinonStub;
    off: sinon.SinonStub;
    one: sinon.SinonStub;
    trigger: sinon.SinonStub;
    play: sinon.SinonStub;
    pause: sinon.SinonStub;
    paused: sinon.SinonStub;
    src: sinon.SinonStub;
    currentTime: sinon.SinonStub;
    duration: sinon.SinonStub;
    volume: sinon.SinonStub;
    muted: sinon.SinonStub;
    playbackRate: sinon.SinonStub;
    videoHeight: sinon.SinonStub;
    videoWidth: sinon.SinonStub;
    dispose: sinon.SinonStub;
    error: sinon.SinonStub;
    el: sinon.SinonStub;
    controlBar: {
        progressControl: {
            seekBar: {
                update: sinon.SinonStub;
            };
        };
    };
}

// Type pour les appels de méthode
export interface MethodCall {
    args: any[];
}

// Créer un mock VideoJS avec Sinon
const createVideoJSMock = () => {
    const playerStub = {
        on: sinon.stub().returnsThis(),
        off: sinon.stub().returnsThis(),
        one: sinon.stub().returnsThis(),
        trigger: sinon.stub().returnsThis(),
        play: sinon.stub().resolves(),
        pause: sinon.stub().returnsThis(),
        paused: sinon.stub().returns(true),
        src: sinon.stub().resolves(),
        currentTime: sinon.stub().returnsThis(),
        duration: sinon.stub().returns(0),
        volume: sinon.stub().returnsThis(),
        muted: sinon.stub().returns(false),
        playbackRate: sinon.stub().returnsThis(),
        videoHeight: sinon.stub().returns(720),
        videoWidth: sinon.stub().returns(1280),
        dispose: sinon.stub(),
        error: sinon.stub().returns(null),
        el: sinon.stub().returns(document.createElement('div')),
        controlBar: {
            progressControl: {
                seekBar: {
                    update: sinon.stub()
                }
            }
        }
    } as VideoJsPlayer;

    const videojsMock = Object.assign(sinon.stub().returns(playerStub), {
        getPlayer: sinon.stub().returns(playerStub),
        VERSION: '8.0.0',
        options: {},
        getComponent: sinon.stub(),
        registerComponent: sinon.stub(),
        registerPlugin: sinon.stub(),
        deregisterPlugin: sinon.stub(),
        players: {},
        hooks: sinon.stub(),
        browser: {},
        dom: {},
        middleware: {
            use: sinon.stub()
        },
        log: {
            error: sinon.stub(),
            warn: sinon.stub(),
            debug: sinon.stub()
        }
    });

    return {
        videojs: videojsMock,
        player: playerStub
    };
};

// Mock Obsidian App
const createObsidianMock = () => {
    const mock = {
        workspace: {
            on: sinon.stub(),
            off: sinon.stub(),
            getActiveViewOfType: sinon.stub(),
            getLeaf: sinon.stub(),
            getLeavesOfType: sinon.stub().returns([]),
            activeLeaf: {
                view: {
                    getViewType: sinon.stub()
                }
            }
        },
        vault: {
            on: sinon.stub(),
            off: sinon.stub(),
            adapter: {
                exists: sinon.stub().resolves(true),
                read: sinon.stub().resolves(''),
                write: sinon.stub().resolves()
            }
        },
        keymap: {},
        scope: {},
        metadataCache: {
            on: sinon.stub(),
            off: sinon.stub()
        },
        fileManager: {
            processFrontMatter: sinon.stub()
        }
    };

    return mock as unknown as App;
};

// Créer et exporter les mocks
export const videojsMock = createVideoJSMock();
export const obsidianMock = createObsidianMock();

// Configuration globale pour les tests
vi.mock('video.js', () => ({
    default: videojsMock.videojs
}));

// Mock console.log pour les tests de debug
vi.spyOn(console, 'log').mockImplementation(() => {});

// Mock ResizeObserver avec une classe
class MockResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
}

global.ResizeObserver = MockResizeObserver;

// Configurer le mock VideoJS global
const { videojs: videojsInstance } = createVideoJSMock();
(window as any).videojs = videojsInstance;

// Mock ItemView class
export class MockItemView {
    containerEl: HTMLElement;
    plugin: any;
    Settings: any;
    PlayerViewAndMode: any;
    t: (key: string) => string;
    activeLeafId: string | null;
    VideoPlayer: any;

    constructor() {
        this.containerEl = document.createElement('div');
        this.Settings = {};
        this.PlayerViewAndMode = {
            mode: 'sidebar',
            viewType: 'youtube-player',
            displayText: 'YouTube Player'
        };
        this.t = (key: string) => key;
        this.activeLeafId = null;
        this.VideoPlayer = null;
    }

    onOpen() {
        return Promise.resolve();
    }

    onClose() {
        return Promise.resolve();
    }

    getViewType() {
        return 'youtube-player';
    }

    getDisplayText() {
        return 'YouTube Player';
    }
}

// Mock Plugin class
export class MockPlugin {
    app: App;
    manifest: any;
    settings: any;
    children: any[];

    constructor(app: App) {
        this.app = app;
        this.manifest = {
            id: 'test-plugin',
            name: 'Test Plugin',
            version: '1.0.0'
        };
        this.settings = {};
        this.children = [];
    }

    // Méthodes de base
    load() { return Promise.resolve(); }
    unload() { return Promise.resolve(); }
    addChild(child: any) { this.children.push(child); }
    removeChild(child: any) { this.children = this.children.filter(c => c !== child); }
    register() {}

    // Méthodes requises
    onload() {}
    onunload() {}
    addRibbonIcon() { return document.createElement('div'); }
    addStatusBarItem() { return document.createElement('div'); }
    addCommand(): Command { 
        return { 
            id: 'test',
            name: 'Test Command',
            checkCallback: () => true,
            hotkeys: []
        }; 
    }
    addSettingTab() {}
    registerView() {}
    registerExtensions() {}
    registerMarkdownPostProcessor(processor: MarkdownPostProcessor): MarkdownPostProcessor {
        return processor;
    }
    registerMarkdownCodeBlockProcessor(language: string, processor: MarkdownPostProcessor): MarkdownPostProcessor {
        return processor;
    }
    registerCodeMirror() {}
    registerEditorExtension(extension: Extension) {}
    registerObsidianProtocolHandler() {}
    registerDomEvent() { return { unsubscribe: () => {} }; }
    registerEvent() { return { unsubscribe: () => {} }; }
    registerInterval() { return { unsubscribe: () => {} }; }
    removeCommand() {}
    registerHoverLinkSource(source: HoverLinkSource) { return { unsubscribe: () => {} }; }
    registerEditorSuggest(suggest: EditorSuggest<any>) {}
    onUserEnable() {}

    async loadData() {
        return this.settings;
    }

    async saveData(data: any) {
        this.settings = data;
        return Promise.resolve();
    }
}

// Configuration globale pour les tests
vi.mock('obsidian', () => ({
    ItemView: MockItemView,
    Plugin: MockPlugin,
    WorkspaceLeaf: class WorkspaceLeaf {
        view: any;
        containerEl: HTMLElement;
        constructor() {
            this.containerEl = document.createElement('div');
        }
    }
}));

// Extension des méthodes Obsidian pour HTMLElement
const extendHTMLElement = () => {
    HTMLElement.prototype.empty = function() {
        while (this.firstChild) {
            this.removeChild(this.firstChild);
        }
    };

    HTMLElement.prototype.addClass = function(className: string) {
        this.classList.add(className);
    };

    HTMLElement.prototype.removeClass = function(className: string) {
        this.classList.remove(className);
    };
};

// Appliquer les extensions
extendHTMLElement(); 
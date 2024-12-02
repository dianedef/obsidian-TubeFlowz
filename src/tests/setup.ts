import { vi } from 'vitest';
import sinon from 'sinon';
import type { App } from 'obsidian';

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

    const videojsMock = sinon.stub().returns(playerStub);
    Object.assign(videojsMock, {
        getPlayer: sinon.stub().returns(playerStub)
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
window.videojs = videojsMock.videojs; 
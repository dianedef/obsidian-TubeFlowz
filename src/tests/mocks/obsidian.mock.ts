import sinon from 'sinon';
import type { App } from 'obsidian';

// Mock Obsidian App
export const createObsidianMock = () => {
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
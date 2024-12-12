import { vi } from 'vitest';

// Mock de base pour Obsidian
const mockApp = {
    workspace: {
        activeLeaf: null,
        getRightLeaf: vi.fn(),
        getLeaf: vi.fn(),
        createLeafBySplit: vi.fn(),
        revealLeaf: vi.fn(),
        getLeavesOfType: vi.fn(),
        getActiveViewOfType: vi.fn(),
        on: vi.fn(),
        off: vi.fn()
    }
};

class MockWorkspaceLeaf {
    view: any;
    parent: any;
    
    constructor() {
        this.view = null;
        this.parent = null;
    }

    getViewState() {
        return {
            type: 'youtube-player',
            state: {}
        };
    }

    setViewState(state: any) {
        return Promise.resolve();
    }

    detach() {
        return Promise.resolve();
    }
}

// Mock global pour Obsidian
vi.mock('obsidian', () => ({
    Plugin: class MockPlugin {
        app: any;
        constructor() {
            this.app = mockApp;
        }
        registerView() {}
        addRibbonIcon() {
            return document.createElement('div');
        }
    },
    ItemView: class MockItemView {
        leaf: any;
        constructor(leaf: any) {
            this.leaf = leaf;
        }
        onOpen() {}
        onClose() {}
    },
    WorkspaceLeaf: MockWorkspaceLeaf,
    addIcon: vi.fn(),
    Menu: class MockMenu {
        addItem() {
            return this;
        }
        showAtPosition() {}
    }
})); 
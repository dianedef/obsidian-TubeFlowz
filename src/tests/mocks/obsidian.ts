import { vi } from 'vitest';

// Mock des types et classes d'Obsidian
export class Plugin {
    app: any;
    constructor() {
        this.app = {
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
    }
}

export class WorkspaceLeaf {
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

export class ItemView {
    leaf: any;
    constructor(leaf: any) {
        this.leaf = leaf;
    }
    onOpen() {}
    onClose() {}
}

export class Menu {
    addItem() {
        return this;
    }
    showAtPosition() {}
}

export const addIcon = vi.fn();

// Types nécessaires
export type WorkspaceSplit = any;
export type App = any; 
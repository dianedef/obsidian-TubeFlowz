import { vi } from 'vitest';

// Mock des types et classes d'Obsidian
export class WorkspaceLeaf {
    view: any;
    parent: any;
    id: string;
    setViewState: (state: any) => Promise<void>;
    getViewState: () => any;
    detach: () => Promise<void>;
    
    constructor() {
        this.view = null;
        this.parent = null;
        this.id = Math.random().toString();

        this.setViewState = vi.fn(async (state: any) => {
            this.view = {
                leaf: this,
                getViewType: () => state.type,
                containerEl: document.createElement('div'),
                state: state.state || {},
                onOpen: () => Promise.resolve(),
                onClose: () => Promise.resolve(),
                ...state
            };
            return Promise.resolve();
        });

        this.getViewState = vi.fn(() => {
            if (!this.view) return null;
            return {
                type: this.view?.getViewType?.() || 'youtube-player',
                state: this.view?.state || {},
                active: true
            };
        });

        this.detach = vi.fn(async () => {
            const oldView = this.view;
            this.view = null;
            return Promise.resolve();
        });
    }
}

export class Plugin {
    app: any;
    private leaves: Map<string, WorkspaceLeaf>;

    constructor() {
        this.leaves = new Map();

        const self = this;
        const workspace = {
            activeLeaf: null,
            getRightLeaf: vi.fn().mockImplementation(() => {
                const key = 'right';
                if (!self.leaves.has(key)) {
                    const leaf = new WorkspaceLeaf();
                    self.leaves.set(key, leaf);
                }
                return self.leaves.get(key);
            }),
            getLeaf: vi.fn().mockImplementation(() => {
                const key = 'split';
                if (!self.leaves.has(key)) {
                    const leaf = new WorkspaceLeaf();
                    self.leaves.set(key, leaf);
                }
                return self.leaves.get(key);
            }),
            createLeafBySplit: vi.fn().mockImplementation(() => {
                const key = 'overlay';
                if (!self.leaves.has(key)) {
                    const leaf = new WorkspaceLeaf();
                    self.leaves.set(key, leaf);
                }
                return self.leaves.get(key);
            }),
            revealLeaf: vi.fn(),
            getLeavesOfType: vi.fn().mockReturnValue([]),
            getActiveViewOfType: vi.fn(),
            on: vi.fn(),
            off: vi.fn()
        };

        this.app = {
            workspace
        };
    }

    // Méthode utilitaire pour les tests
    getLeaves(): Map<string, WorkspaceLeaf> {
        return this.leaves;
    }
}

export class ItemView {
    leaf: WorkspaceLeaf;
    containerEl: HTMLElement;

    constructor(leaf: WorkspaceLeaf) {
        this.leaf = leaf;
        this.containerEl = document.createElement('div');
    }

    getViewType(): string {
        return 'youtube-player';
    }

    onOpen() {
        return Promise.resolve();
    }

    onClose() {
        return Promise.resolve();
    }
}

export class Menu {
    dom: HTMLElement;
    
    constructor() {
        this.dom = document.createElement('div');
    }

    addItem(cb: (item: any) => any) {
        const item = {
            setTitle: () => item,
            setIcon: () => item,
            onClick: (cb: () => void) => {
                return item;
            }
        };
        cb(item);
        return this;
    }

    showAtPosition(position: { x: number, y: number }) {}
    hide() {}
}

export const addIcon = vi.fn();

// Types nécessaires
export type WorkspaceSplit = any;
export type App = any; 
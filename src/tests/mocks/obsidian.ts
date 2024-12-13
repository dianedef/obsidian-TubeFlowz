import { vi } from 'vitest';

// Mock de ResizeObserver
class MockResizeObserver {
    callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
    }

    observe(target: Element) {
        // Simule une observation initiale
        this.callback([{
            target,
            contentRect: {
                width: 100,
                height: 100,
                x: 0,
                y: 0,
                top: 0,
                right: 100,
                bottom: 100,
                left: 0
            } as DOMRectReadOnly,
            borderBoxSize: [],
            contentBoxSize: [],
            devicePixelContentBoxSize: []
        }], this);
    }

    unobserve() {}
    disconnect() {}
}

// Ajoute ResizeObserver au global
global.ResizeObserver = MockResizeObserver as any;

// Types pour les méthodes DOM d'Obsidian
interface DomElementInfo {
    text?: string;
    cls?: string;
}

declare global {
    interface HTMLElement {
        empty(): void;
        createDiv(options: { cls: string }): HTMLDivElement;
        createEl<K extends keyof HTMLElementTagNameMap>(
            tag: K,
            options?: DomElementInfo
        ): HTMLElementTagNameMap[K];
        createSpan(options: { text: string }): HTMLSpanElement;
    }
}

// Mock des méthodes DOM d'Obsidian
HTMLElement.prototype.empty = function() {
    while (this.firstChild) {
        this.removeChild(this.firstChild);
    }
};

HTMLElement.prototype.createDiv = function({ cls }: { cls: string }) {
    const div = document.createElement('div');
    div.className = cls;
    this.appendChild(div);
    return div;
};

HTMLElement.prototype.createEl = function<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    options?: DomElementInfo
): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    if (options?.text) el.textContent = options.text;
    if (options?.cls) el.className = options.cls;
    this.appendChild(el);
    return el;
};

HTMLElement.prototype.createSpan = function({ text }: { text: string }) {
    const span = document.createElement('span');
    span.textContent = text;
    this.appendChild(span);
    return span;
};

// Mock des classes d'Obsidian
export class PluginSettingTab {
    app: any;
    plugin: Plugin;
    containerEl: HTMLElement;

    constructor(app: any, plugin: Plugin) {
        this.app = app;
        this.plugin = plugin;
        this.containerEl = document.createElement('div');
    }

    display() {
        this.containerEl.empty();
    }

    hide() {
        this.containerEl.empty();
    }
}

export class WorkspaceLeaf {
    view: any;
    parent: any;
    id: string;

    constructor() {
        this.view = null;
        this.parent = null;
        this.id = Math.random().toString();
    }

    getViewState() {
        return {
            type: 'youtube-player',
            state: {}
        };
    }

    setViewState(state: any) {
        this.view = {
            leaf: this,
            getViewType: () => state.type,
            containerEl: document.createElement('div'),
            state: state.state || {},
            onOpen: () => Promise.resolve(),
            onClose: () => Promise.resolve()
        };
        return Promise.resolve();
    }

    detach() {
        this.view = null;
        return Promise.resolve();
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
            onClick: (cb: () => void) => item
        };
        cb(item);
        return this;
    }

    showAtPosition(position: { x: number, y: number }) {}
    showAtMouseEvent(event: MouseEvent) {}
    hide() {}
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
            getMostRecentLeaf: vi.fn().mockImplementation(() => {
                const key = 'active';
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
            detachLeavesOfType: vi.fn(),
            on: vi.fn(),
            off: vi.fn()
        };

        this.app = { workspace };
    }

    loadData() {
        return Promise.resolve({ viewHeight: '60vh' });
    }

    saveData() {
        return Promise.resolve();
    }

    addRibbonIcon(icon: string, title: string, callback: (evt: MouseEvent) => any) {
        const el = document.createElement('div');
        el.addEventListener('click', callback);
        return el;
    }

    registerView() {}

    registerEditorExtension() {}

    // Méthode utilitaire pour les tests
    getLeaves(): Map<string, WorkspaceLeaf> {
        return this.leaves;
    }
}

export const addIcon = vi.fn();
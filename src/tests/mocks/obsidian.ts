import { vi } from 'vitest';

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

    constructor() {
        const workspace = {
            activeLeaf: null,
            getRightLeaf: vi.fn().mockReturnValue(new WorkspaceLeaf()),
            getLeaf: vi.fn().mockReturnValue(new WorkspaceLeaf()),
            getMostRecentLeaf: vi.fn().mockReturnValue(new WorkspaceLeaf()),
            createLeafBySplit: vi.fn().mockReturnValue(new WorkspaceLeaf()),
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
        return Promise.resolve({ playerHeight: '60vh' });
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
}

export const addIcon = vi.fn();
// Mock pour le package Obsidian
export class App {
    workspace = {
        getActiveViewOfType: () => null,
        on: () => ({ unsubscribe: () => {} }),
        off: () => {}
    };
    vault = {
        getConfig: () => ({}),
        setConfig: () => {}
    };
}

export class Component {
    registerEvent() {}
    unload() {}
}

export class Plugin extends Component {
    app: App;
    manifest: any;

    constructor(app: App, manifest: any) {
        super();
        this.app = app;
        this.manifest = manifest;
    }
}

export class MarkdownView {
    app: App;
    file: any;

    constructor(leaf: any) {
        this.app = leaf.app;
        this.file = leaf.file;
    }
}

export class Notice {
    constructor(message: string, timeout?: number) {
        console.log(`[Notice] ${message}`);
    }
}

export class Modal {
    app: App;
    constructor(app: App) {
        this.app = app;
    }
    open() {}
    close() {}
}

export class Setting {
    constructor(containerEl: HTMLElement) {}
    setName(name: string) { return this; }
    setDesc(desc: string) { return this; }
    addText(cb: (text: any) => any) { return this; }
    addToggle(cb: (toggle: any) => any) { return this; }
    addDropdown(cb: (dropdown: any) => any) { return this; }
} 
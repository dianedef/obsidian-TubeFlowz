import { App, Plugin, WorkspaceLeaf } from 'obsidian';
import { eventBus } from './EventBus';
import type { VideoMode } from '../types';

export interface PluginState {
    videoId: string | null;
    timestamp: number;
    mode: VideoMode;
    isPlaying: boolean;
}

export class TubeFlowsPlugin extends Plugin {
    private state: PluginState = {
        videoId: null,
        timestamp: 0,
        mode: 'sidebar',
        isPlaying: false
    };

    constructor(app: App, manifest: any) {
        super(app, manifest);
        this.initializeEventListeners();
    }

    private initializeEventListeners(): void {
        // Écouter les événements vidéo
        eventBus.on('video:load', (videoId: string) => {
            this.state.videoId = videoId;
            this.saveData(this.state);
        });

        eventBus.on('video:timeUpdate', (time: number) => {
            this.state.timestamp = time;
            this.saveData(this.state);
        });

        eventBus.on('view:modeChange', (mode) => {
            this.state.mode = mode;
            this.saveData(this.state);
        });
    }

    async onload(): Promise<void> {
        console.log('Loading TubeFlows plugin');

        // Charger l'état précédent
        const savedState = await this.loadData();
        if (savedState) {
            this.state = { ...this.state, ...savedState };
        }

        // Initialiser les composants principaux
        this.initializeComponents();

        // Ajouter les commandes
        this.addCommands();

        // Ajouter les raccourcis clavier
        this.registerHotkeys();
    }

    private initializeComponents(): void {
        // Cette méthode sera implémentée pour initialiser
        // les différents composants (VideoPlayer, Settings, etc.)
    }

    private addCommands(): void {
        // Cette méthode sera implémentée pour ajouter
        // les commandes Obsidian
    }

    private registerHotkeys(): void {
        // Cette méthode sera implémentée pour gérer
        // les raccourcis clavier
    }

    async onunload(): Promise<void> {
        console.log('Unloading TubeFlows plugin');
        eventBus.clear();
        await this.saveData(this.state);
    }

    // Méthodes publiques pour interagir avec le plugin
    public async loadVideo(videoId: string, mode: VideoMode = 'sidebar'): Promise<void> {
        this.state.mode = mode;
        eventBus.emit('video:load', videoId);
    }

    public getState(): PluginState {
        return { ...this.state };
    }
} 
import { App, Plugin } from 'obsidian';
import { PluginSettings } from './types';
import { PlaybackMode, PlaybackRate, VideoMode, Volume } from '../../types';

const DEFAULT_VIDEO_ID = 'dQw4w9WgXcQ';

const DEFAULT_SETTINGS: PluginSettings = {
    lastVideoId: DEFAULT_VIDEO_ID,
    isVideoOpen: false,
    isChangingMode: false,
    playlist: [],
    currentMode: 'sidebar' as VideoMode,
    viewHeight: 60,
    overlayHeight: 60,
    isPlaying: false,
    activeLeafId: null,
    overlayLeafId: null,
    favoriteSpeed: 2 as PlaybackRate,
    lastTimestamp: 0,
    showYoutubeRecommendations: false,
    isMuted: false,
    playbackRate: 1 as PlaybackRate,
    volume: 1 as Volume,
    playbackMode: 'stream' as PlaybackMode,
    language: 'en'
};

export class SettingsService {
    private plugin: Plugin;
    private settings: PluginSettings;

    constructor(plugin: Plugin) {
        this.plugin = plugin;
        this.settings = DEFAULT_SETTINGS;
    }

    get isPlaying(): boolean {
        return this.settings.isPlaying;
    }

    set isPlaying(value: boolean) {
        this.settings.isPlaying = value;
        this.save();
    }

    // Getters et setters pour toutes les propriétés
    get lastVideoId(): string {
        return this.settings.lastVideoId || DEFAULT_VIDEO_ID;
    }

    set lastVideoId(value: string) {
        this.settings.lastVideoId = value;
        this.save();
    }

    get currentMode(): VideoMode {
        return this.settings.currentMode;
    }

    set currentMode(value: VideoMode) {
        this.settings.currentMode = value;
        this.save();
    }

    get viewHeight(): number {
        return this.settings.viewHeight;
    }

    set viewHeight(value: number) {
        this.settings.viewHeight = value;
        this.save();
    }

    get overlayHeight(): number {
        return this.settings.overlayHeight;
    }

    set overlayHeight(value: number) {
        this.settings.overlayHeight = value;
        this.save();
    }

    get activeLeafId(): string | null {
        return this.settings.activeLeafId;
    }

    set activeLeafId(value: string | null) {
        this.settings.activeLeafId = value;
        this.save();
    }

    get isVideoOpen(): boolean {
        return this.settings.isVideoOpen;
    }

    set isVideoOpen(value: boolean) {
        this.settings.isVideoOpen = value;
        this.save();
    }

    get playbackMode(): PlaybackMode {
        return this.settings.playbackMode;
    }

    set playbackMode(value: PlaybackMode) {
        this.settings.playbackMode = value;
        this.save();
    }

    get volume(): number {
        return this.settings.volume;
    }

    set volume(value: number) {
        this.settings.volume = Math.max(0, Math.min(1, value)) as Volume;
        this.save();
    }

    get isMuted(): boolean {
        return this.settings.isMuted || this.settings.volume === 0;
    }

    set isMuted(value: boolean) {
        this.settings.isMuted = value;
        this.save();
    }

    get playbackRate(): number {
        return this.settings.playbackRate;
    }

    set playbackRate(value: number) {
        this.settings.playbackRate = Math.max(0.25, Math.min(16, value)) as PlaybackRate;
        this.save();
    }

    get favoriteSpeed(): number {
        return this.settings.favoriteSpeed;
    }

    set favoriteSpeed(value: number) {
        this.settings.favoriteSpeed = Math.max(0.25, Math.min(16, value)) as PlaybackRate;
        this.save();
    }

    get showYoutubeRecommendations(): boolean {
        return this.settings.showYoutubeRecommendations;
    }

    set showYoutubeRecommendations(value: boolean) {
        this.settings.showYoutubeRecommendations = value;
        this.save();
    }

    get lastTimestamp(): number {
        return this.settings.lastTimestamp;
    }

    set lastTimestamp(value: number) {
        this.settings.lastTimestamp = value;
        this.save();
    }

    get isChangingMode(): boolean {
        return this.settings.isChangingMode;
    }

    set isChangingMode(value: boolean) {
        this.settings.isChangingMode = value;
        this.save();
    }

    // Méthodes pour la gestion des settings
    async loadSettings() {
        try {
            const savedData = await this.plugin.loadData();
            if (savedData) {
                this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData);
            }
        } catch (error) {
            console.error("Erreur lors du chargement des paramètres:", error);
            this.settings = Object.assign({}, DEFAULT_SETTINGS);
        }
    }

    async save() {
        try {
            await this.plugin.saveData(this.settings);
        } catch (error) {
            console.error("Erreur lors de la sauvegarde des paramètres:", error);
            throw error;
        }
    }

    // Méthode pour obtenir tous les settings (lecture seule)
    getSettings(): Readonly<PluginSettings> {
        return Object.freeze({ ...this.settings });
    }

    // Ajouter une méthode pour obtenir la langue courante d'Obsidian
    getCurrentLanguage(): string {
        // Récupérer la langue de l'interface d'Obsidian
        const htmlLang = document.documentElement.lang;
        // Mettre à jour les settings si la langue a changé
        const newLang = htmlLang?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
        if (this.settings.language !== newLang) {
            this.settings.language = newLang;
            this.save();
        }
        return newLang;
    }
} 
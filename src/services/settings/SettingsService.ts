import { App, Plugin } from 'obsidian';
import { PluginSettings, DEFAULT_SETTINGS, ViewMode, PlaybackMode, PlaybackRate, Volume, createVolume, createPlaybackRate } from '../../types/settings';
import { createVideoId } from '../../types/video';

export class SettingsService {
    private plugin: Plugin;
    private settings: PluginSettings;

    constructor(plugin: Plugin) {
        this.plugin = plugin;
        this.settings = DEFAULT_SETTINGS;
    }

    public getPlugin(): Plugin {
        return this.plugin;
    }

    public getSettings(): PluginSettings {
        return this.settings;
    }

    get isPlaying(): boolean {
        return this.settings.isPlaying;
    }

    set isPlaying(value: boolean) {
        this.settings.isPlaying = value;
        this.save();
    }

    get lastVideoId(): string | null {
        return this.settings.lastVideoId;
    }

    set lastVideoId(value: string | null) {
        this.settings.lastVideoId = value ? createVideoId(value) : null;
        this.save();
    }

    get currentMode(): ViewMode {
        return this.settings.currentMode;
    }

    set currentMode(value: ViewMode) {
        this.settings.currentMode = value;
        this.save();
    }

    get viewHeight(): number {
        return this.settings.viewHeight;
    }

    set viewHeight(value: number) {
        this.settings.viewHeight = Math.max(0, Math.min(100, value));
        this.save();
    }

    get overlayHeight(): number {
        return this.settings.overlayHeight;
    }

    set overlayHeight(value: number) {
        this.settings.overlayHeight = Math.max(0, Math.min(100, value));
        this.save();
    }

    get activeLeafId(): string | null {
        return this.settings.activeLeafId;
    }

    set activeLeafId(value: string | null) {
        this.settings.activeLeafId = value;
        this.save();
    }

    get overlayLeafId(): string | null {
        return this.settings.overlayLeafId;
    }

    set overlayLeafId(value: string | null) {
        this.settings.overlayLeafId = value;
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

    get volume(): Volume {
        return this.settings.volume;
    }

    set volume(value: number) {
        this.settings.volume = createVolume(Math.max(0, Math.min(1, value)));
        this.save();
    }

    get isMuted(): boolean {
        return this.settings.isMuted;
    }

    set isMuted(value: boolean) {
        this.settings.isMuted = value;
        this.save();
    }

    get playbackRate(): PlaybackRate {
        return this.settings.playbackRate;
    }

    set playbackRate(value: number) {
        this.settings.playbackRate = createPlaybackRate(Math.max(0.25, Math.min(16, value)));
        this.save();
    }

    get favoriteSpeed(): PlaybackRate {
        return this.settings.favoriteSpeed;
    }

    set favoriteSpeed(value: number) {
        this.settings.favoriteSpeed = createPlaybackRate(Math.max(0.25, Math.min(16, value)));
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

    get playlist(): Array<{id: string, title: string, timestamp: number}> {
        return this.settings.playlist;
    }

    set playlist(value: Array<{id: string, title: string, timestamp: number}>) {
        this.settings.playlist = value;
        this.save();
    }

    async loadSettings() {
        try {
            const savedData = await this.plugin.loadData();
            if (savedData) {
                if (typeof savedData.volume === 'number') {
                    savedData.volume = createVolume(savedData.volume);
                }
                if (typeof savedData.playbackRate === 'number') {
                    savedData.playbackRate = createPlaybackRate(savedData.playbackRate);
                }
                if (typeof savedData.favoriteSpeed === 'number') {
                    savedData.favoriteSpeed = createPlaybackRate(savedData.favoriteSpeed);
                }
                if (typeof savedData.viewHeight === 'number') {
                    savedData.viewHeight = Math.max(0, Math.min(100, savedData.viewHeight));
                }
                if (typeof savedData.overlayHeight === 'number') {
                    savedData.overlayHeight = Math.max(0, Math.min(100, savedData.overlayHeight));
                }
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

    getCurrentLanguage(): string {
        const htmlLang = document.documentElement.lang;
        const newLang = htmlLang?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
        if (this.settings.language !== newLang) {
            this.settings.language = newLang;
            this.save();
        }
        return newLang;
    }
} 
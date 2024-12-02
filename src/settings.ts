import { Store } from './store';
import { VideoMode, PlaybackMode, Volume, PlaybackRate, isValidVolume, isValidPlaybackRate } from './types.d';
import { App, Plugin, PluginSettingTab, Setting, DropdownComponent } from 'obsidian';

export interface PluginSettings {
   lastVideoId: string | null;
   lastTimestamp: number;
   isVideoOpen: boolean;
   currentMode: VideoMode;
   isChangingMode: boolean;
   activeLeafId: string | null;
   overlayLeafId: string | null;
   viewHeight: number;
   overlayHeight: number;
   showYoutubeRecommendations: boolean;
   playbackMode: PlaybackMode;
   favoriteSpeed: number;
   isMuted: boolean;
   playbackRate: PlaybackRate;
   volume: Volume;
   playlist: Array<{
      id: string;
      title: string;
      timestamp: number;
   }>;
}

export class SettingsTab extends PluginSettingTab {
   private Settings: Settings;

   constructor(app: App, plugin: Plugin) {
      super(app, plugin);
      const { Settings } = Store.get();
      if (!Settings) {
         throw new Error("Settings n'est pas initialisé");
      }
      this.Settings = Settings;
   }

   display(): void {
      const { containerEl } = this;
      containerEl.empty();
      
      // Créer le menu de sélection du mode d'affichage par défaut
      new Setting(containerEl)
         .setName('Mode d\'affichage par défaut')
         .setDesc('Choisissez comment les vidéos s\'ouvriront par défaut')
         .addDropdown((dropdown: DropdownComponent) => dropdown
            .addOption('tab', 'Onglet')
            .addOption('sidebar', 'Barre latérale')
            .addOption('overlay', 'Superposition')
            .setValue(this.Settings.getSettings().currentMode)
            .onChange(async (value: string) => {
               const settings = this.Settings.getSettings();
               settings.currentMode = value as VideoMode;
               await this.Settings.save();
            }));

      // Setting pour le mode de lecture
      new Setting(containerEl)
         .setName('Mode de lecture')
         .setDesc('Choisir entre streaming ou téléchargement')
         .addDropdown((dropdown: DropdownComponent) => dropdown
            .addOption('stream', 'Streaming')
            .addOption('download', 'Téléchargement')
            .setValue(this.Settings.playbackMode)
            .onChange(async (value: string) => {
               this.Settings.playbackMode = value as PlaybackMode;
               await this.Settings.save();
            }));

      // Setting pour la vitesse favorite
      new Setting(containerEl)
         .setName('Vitesse de lecture favorite')
         .setDesc('Définir la vitesse qui sera utilisée avec le raccourci Ctrl+4')
         .addDropdown((dropdown: DropdownComponent) => {
            // Ajouter les options de vitesse courantes
            const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5, 8, 10, 16];
            speeds.forEach(speed => {
               dropdown.addOption(speed.toString(), `${speed}x`);
            });
            return dropdown
               .setValue(this.Settings.getSettings().favoriteSpeed.toString())
               .onChange(async (value: string) => {
                  const settings = this.Settings.getSettings();
                  settings.favoriteSpeed = parseFloat(value);
                  await this.Settings.save();
               });
         });

      new Setting(containerEl)
         .setName('Recommandations YouTube')
         .setDesc('Afficher les recommandations YouTube à la fin des vidéos')
         .addToggle(toggle => toggle
            .setValue(this.Settings.getSettings().showYoutubeRecommendations)
            .onChange(async (value) => {
               const settings = this.Settings.getSettings();
               settings.showYoutubeRecommendations = value;
               await this.Settings.save();
               
               // Il faut recharger le player pour que les changements prennent effet
               const { VideoPlayer } = Store.get();
               if (VideoPlayer?.Player) {
                  VideoPlayer.Player.src({
                     type: 'video/youtube',
                     src: VideoPlayer.Player.currentSrc()
                  });
               }
            }));
   }
}

const DEFAULT_SETTINGS: PluginSettings = {
   lastVideoId: null,
   isVideoOpen: false,
   playlist: [],
   currentMode: 'sidebar',
   viewHeight: 60,
   overlayHeight: 60,
   isChangingMode: false,
   activeLeafId: null,
   overlayLeafId: null,
   favoriteSpeed: 2 as PlaybackRate,
   lastTimestamp: 0,
   showYoutubeRecommendations: false,
   isMuted: false,
   playbackRate: 1 as PlaybackRate,
   volume: 1 as Volume,
   playbackMode: 'stream'
};

export class Settings {
   private plugin: Plugin;
   private settings: PluginSettings;

   constructor(plugin: Plugin) {
      this.plugin = plugin;
      this.settings = Object.assign({}, DEFAULT_SETTINGS);
   }

   // Getters et setters pour toutes les propriétés
   get lastVideoId(): string | null {
      return this.settings.lastVideoId;
   }

   set lastVideoId(value: string | null) {
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

   get isPlaying(): boolean {
      return this.settings.isPlaying;
   }

   set isPlaying(value: boolean) {
      this.settings.isPlaying = value;
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
} 
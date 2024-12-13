import { App, Plugin, PluginSettingTab, Setting} from 'obsidian';
import { ViewModeService } from './ViewModeService';

export interface DefaultSettings {
   language: string;
   lastVideoId: string;
   lastTimestamp: number;
   isVideoOpen: boolean;
   currentMode: ViewMode;
   isChangingMode: boolean;
   activeLeafId: string | null;
   overlayLeafId: string | null;
   isPlaying: boolean;
   playbackMode: PlaybackMode;
   playbackRate: number;
   favoriteSpeed: PlaybackRate;
   volume: number;
   isMuted: boolean;
   viewHeight: string;
   overlayHeight: string;
   showYoutubeRecommendations: boolean;
   playlist: Array<{
      id: string;
      title: string;
      timestamp: number;
   }>;
}

export type ViewMode = 'tab' | 'sidebar' | 'overlay';
export type PlaybackMode = 'stream' | 'download';
export type PlaybackRate = 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5 | 1.75 | 2 | 2.5 | 3 | 4 | 5 | 8 | 10 | 16;

export const DEFAULT_SETTINGS: DefaultSettings = {
   language: 'fr',
   lastVideoId: 'jNQXAC9IVRw',
   lastTimestamp: 0,
   isVideoOpen: false,
   currentMode: 'tab',
   isChangingMode: false,
   activeLeafId: null,
   overlayLeafId: null,
   isPlaying: false,
   playbackMode: 'stream',
   playbackRate: 1,
   favoriteSpeed: 2,
   volume: 1,
   isMuted: false,
   viewHeight: '60vh',
   overlayHeight: '60vh',
   showYoutubeRecommendations: false,
   playlist: []
};

export class Settings {
   private static plugin: Plugin;
   private static settings: DefaultSettings;

   static initialize(plugin: Plugin) {
      this.plugin = plugin;
   }

   static async loadSettings(): Promise<DefaultSettings> {
      const savedData = await this.plugin.loadData();
      this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData || {});
      return this.settings;
   }

   static async saveSettings(settings: Partial<DefaultSettings>) {
      this.settings = Object.assign(this.settings || DEFAULT_SETTINGS, settings);
      await this.plugin.saveData(this.settings);
   }

   static async refresh() {
      if (this.plugin && 'refresh' in this.plugin) {
         await (this.plugin as any).refresh();
      }
   }

   static async getViewHeight(): Promise<string> {
      const data = await this.plugin.loadData();
      return data?.viewHeight || DEFAULT_SETTINGS.viewHeight;
   }

   static async getShowYoutubeRecommendations(): Promise<boolean> {
      const data = await this.plugin.loadData();
      return data?.showYoutubeRecommendations || DEFAULT_SETTINGS.showYoutubeRecommendations;
   }
   
   static async setViewHeight(height: string) {
      await this.saveSettings({ viewHeight: height });
   }
}

export class SettingsTab extends PluginSettingTab {
   plugin: Plugin;
   settings: Settings;

   constructor(app: App, plugin: Plugin, settings: Settings, private viewModeService: ViewModeService) {
      super(app, plugin);
      this.plugin = plugin;
      this.settings = settings;
   }

   display(): void {
      const { containerEl } = this;
      containerEl.empty();

      // Mode d'affichage par défaut
      new Setting(containerEl)
         .setName('Mode d\'affichage par défaut')
         .setDesc('Choisissez comment la vidéo doit s\'afficher par défaut')
         .addDropdown(dropdown => dropdown
            .addOption('tab', 'Onglet')
            .addOption('sidebar', 'Barre latérale')
            .addOption('overlay', 'Superposition')
            .setValue(this.settings.currentMode)
            .onChange(async (value) => {
               this.settings.currentMode = value as ViewMode;
               console.log(this.settings.currentMode);
               await Settings.saveSettings({ currentMode: value as ViewMode });
               console.log(this.viewModeService);
               await this.viewModeService.setView(value as ViewMode);
            }));

      // Mode de lecture
      new Setting(containerEl)
         .setName('Mode de lecture')
         .setDesc('Choisissez comment les vidéos doivent être lues')
         .addDropdown(dropdown => dropdown
            .addOption('stream', 'Streaming')
            .addOption('download', 'Téléchargement')
            .setValue(this.settings.playbackMode)
            .onChange(async (value) => {
               this.settings.playbackMode = value as PlaybackMode;
               await Settings.saveSettings({ playbackMode: value as PlaybackMode });
               await Settings.refresh();
            }));

      // Vitesse favorite
      new Setting(containerEl)
         .setName('Vitesse favorite')
         .setDesc('Vitesse de lecture accessible rapidement avec Ctrl+4')
         .addDropdown(dropdown => {
            const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5, 8, 10, 16];
            speeds.forEach(speed => {
               dropdown.addOption(speed.toString(), `${speed}x`);
            });
            return dropdown
               .setValue(this.settings.favoriteSpeed.toString())
               .onChange(async (value) => {
                  const speed = parseFloat(value) as PlaybackRate;
                  this.settings.favoriteSpeed = speed;
                  await Settings.saveSettings({ favoriteSpeed: speed });
               });
         });

      // Recommandations YouTube
      new Setting(containerEl)
         .setName('Recommandations YouTube')
         .setDesc('Afficher les recommandations YouTube à la fin des vidéos')
         .addToggle(toggle => toggle
            .setValue(this.settings.showYoutubeRecommendations)
            .onChange(async (value) => {
               this.settings.showYoutubeRecommendations = value;
               await Settings.saveSettings({ showYoutubeRecommendations: value });
            }));
   }
}

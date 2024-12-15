import { App, Plugin, PluginSettingTab, Setting} from 'obsidian';
import { ViewMode } from './ViewMode';
import { Translations } from './Translations';

export interface DefaultSettings {
   language: string;
   lastVideoId: string;
   lastTimestamp: number;
   isVideoOpen: boolean;
   currentMode: TViewMode;
   isChangingMode: boolean;
   activeLeafId: string | null;
   overlayLeafId: string | null;
   isPlaying: boolean;
   playbackMode: TPlaybackMode;
   playbackRate: number;
   favoriteSpeed: TPlaybackRate;
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

export type TViewMode = 'tab' | 'sidebar' | 'overlay';
export type TPlaybackMode = 'stream' | 'download';
export type TPlaybackRate = 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5 | 1.75 | 2 | 2.5 | 3 | 4 | 5 | 8 | 10 | 16;

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

   static getSettings(): DefaultSettings {
      return this.settings;
   }
}

export class SettingsTab extends PluginSettingTab {
   plugin: Plugin;
   settings: DefaultSettings;

   constructor(
      app: App, 
      plugin: Plugin, 
      settings: DefaultSettings, 
      private viewMode: ViewMode,
      private translations: Translations
   ) {
      super(app, plugin);
      this.plugin = plugin;
      this.settings = settings;
   }

   display(): void {
      const { containerEl } = this;
      containerEl.empty();

      // Mode d'affichage par défaut
      new Setting(containerEl)
         .setName(this.translations.t('settings.defaultViewMode'))
         .setDesc(this.translations.t('settings.defaultViewModeDesc'))
         .addDropdown(dropdown => dropdown
            .addOption('tab', this.translations.t('settings.tab'))
            .addOption('sidebar', this.translations.t('settings.sidebar'))
            .addOption('overlay', this.translations.t('settings.overlay'))
            .setValue(this.settings.currentMode)
            .onChange(async (value) => {
               this.settings.currentMode = value as TViewMode;
               await Settings.saveSettings({ currentMode: value as TViewMode });
               await this.viewMode.setView(value as TViewMode);
            }));

      // Mode de lecture
      new Setting(containerEl)
         .setName(this.translations.t('settings.playbackMode'))
         .setDesc(this.translations.t('settings.playbackModeDesc'))
         .addDropdown(dropdown => dropdown
            .addOption('stream', this.translations.t('settings.stream'))
            .addOption('download', this.translations.t('settings.download'))
            .setValue(this.settings.playbackMode)
            .onChange(async (value) => {
               this.settings.playbackMode = value as TPlaybackMode;
               await Settings.saveSettings({ playbackMode: value as TPlaybackMode });
               await Settings.refresh();
            }));

      // Vitesse favorite
      new Setting(containerEl)
         .setName(this.translations.t('settings.favoriteSpeed'))
         .setDesc(this.translations.t('settings.favoriteSpeedDesc'))
         .addDropdown(dropdown => {
            const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5, 8, 10, 16];
            speeds.forEach(speed => {
               dropdown.addOption(speed.toString(), `${speed}x`);
            });
            return dropdown
               .setValue(this.settings.favoriteSpeed.toString())
               .onChange(async (value) => {
                  const speed = parseFloat(value) as TPlaybackRate;
                  this.settings.favoriteSpeed = speed;
                  await Settings.saveSettings({ favoriteSpeed: speed });
               });
         });
         
      // Note sur les raccourcis clavier
      containerEl.createEl('div', {
         cls: 'setting-item-description',
         text: this.translations.t('settings.hotkeysFocusNote')
      }).style.marginBottom = '1em';

      // Recommandations YouTube
      new Setting(containerEl)
         .setName(this.translations.t('settings.showRecommendations'))
         .setDesc(this.translations.t('settings.showRecommendationsDesc'))
         .addToggle(toggle => toggle
            .setValue(this.settings.showYoutubeRecommendations)
            .onChange(async (value) => {
               this.settings.showYoutubeRecommendations = value;
               await Settings.saveSettings({ showYoutubeRecommendations: value });
            }));

   }
}

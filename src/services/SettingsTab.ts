import { App, Plugin, PluginSettingTab, Setting, DropdownComponent } from 'obsidian';
import { SettingsService } from './SettingsService';
import { PlaybackMode, ViewMode } from '../types/ISettings';
import PlayerService from './PlayerService';
import { TranslationsService } from './TranslationsService';

export class SettingsTab extends PluginSettingTab {
   private settings: SettingsService;
   private playerService: PlayerService;
   private translations: TranslationsService;

   constructor(app: App, plugin: Plugin, settings: SettingsService, playerService: PlayerService) {
      super(app, plugin);
      this.settings = settings;
      this.playerService = playerService;
      this.translations = TranslationsService.getInstance();
   }

   display(): void {
      const { containerEl } = this;
      containerEl.empty();
      
      // Créer le menu de sélection du mode d'affichage par défaut
      new Setting(containerEl)
         .setName(this.translations.t('settings.defaultViewMode'))
         .setDesc(this.translations.t('settings.defaultViewModeDesc'))
         .addDropdown((dropdown: DropdownComponent) => dropdown
            .addOption('tab', this.translations.t('settings.tab'))
            .addOption('sidebar', this.translations.t('settings.sidebar'))
            .addOption('overlay', this.translations.t('settings.overlay'))
            .setValue(this.settings.getSettings().currentMode)
            .onChange(async (value: string) => {
               this.settings.getSettings().currentMode = value as ViewMode;
               await this.settings.save();
            }));

      // Setting pour le mode de lecture
      new Setting(containerEl)
         .setName(this.translations.t('settings.playbackMode'))
         .setDesc(this.translations.t('settings.playbackModeDesc'))
         .addDropdown((dropdown: DropdownComponent) => dropdown
            .addOption('stream', this.translations.t('settings.stream'))
            .addOption('download', this.translations.t('settings.download'))
            .setValue(this.settings.getSettings().playbackMode)
            .onChange(async (value: string) => {
               this.settings.getSettings().playbackMode = value as PlaybackMode;
               await this.settings.save();
            }));

      // Setting pour la vitesse favorite
      new Setting(containerEl)
         .setName(this.translations.t('settings.favoriteSpeed'))
         .setDesc(this.translations.t('settings.favoriteSpeedDesc'))
         .addDropdown((dropdown: DropdownComponent) => {
            const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5, 8, 10, 16];
            speeds.forEach(speed => {
               dropdown.addOption(speed.toString(), `${speed}x`);
            });
            return dropdown
               .setValue(this.settings.getSettings().favoriteSpeed.toString())
               .onChange(async (value: string) => {
                  this.settings.getSettings().favoriteSpeed = parseFloat(value);
                  await this.settings.save();
               });
         });

      new Setting(containerEl)
         .setName(this.translations.t('settings.showRecommendations'))
         .setDesc(this.translations.t('settings.showRecommendationsDesc'))
         .addToggle(toggle => toggle
            .setValue(this.settings.getSettings().showYoutubeRecommendations)
            .onChange(async (value) => {
               this.settings.getSettings().showYoutubeRecommendations = value;
               await this.settings.save();
            }));
   }
} 
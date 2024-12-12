import { App, Plugin, PluginSettingTab, Setting, DropdownComponent } from 'obsidian';
import { SettingsService } from './SettingsService';
import { PlaybackMode } from '../types/ISettings';
import PlayerService from './PlayerService';

export class SettingsTab extends PluginSettingTab {
   private Settings: SettingsService;
   private playerService: PlayerService;

   constructor(app: App, plugin: Plugin, settings: SettingsService, playerService: PlayerService) {
      super(app, plugin);
      this.Settings = settings;
      this.playerService = playerService;
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
            .setValue(this.Settings.currentMode)
            .onChange(async (value: string) => {
               this.Settings.currentMode = value as VideoMode;
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
               .setValue(this.Settings.favoriteSpeed.toString())
               .onChange(async (value: string) => {
                  this.Settings.favoriteSpeed = parseFloat(value);
                  await this.Settings.save();
               });
         });

      new Setting(containerEl)
         .setName('Recommandations YouTube')
         .setDesc('Afficher les recommandations YouTube à la fin des vidéos')
         .addToggle(toggle => toggle
            .setValue(this.Settings.showYoutubeRecommendations)
            .onChange(async (value) => {
               this.Settings.showYoutubeRecommendations = value;
               await this.Settings.save();
            }));
   }
} 
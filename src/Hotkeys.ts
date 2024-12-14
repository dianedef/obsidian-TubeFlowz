import { Plugin, Notice } from 'obsidian';
import { Settings } from './Settings';
import { Translations } from './Translations';
import { YouTube } from './YouTube';
import { CommandError, CommandErrorCode } from '../types/IErrors';

export class Hotkeys {
   constructor(
      private plugin: Plugin,
      private settings: Settings,
      private youtube: YouTube,
      private translations: Translations
   ) {}

   private handleCommandError(error: unknown) {
      if (error instanceof CommandError) {
         console.error('[Hotkeys]', error);
         new Notice(this.translations.t(`errors.${error.code}`));
         throw error;
      }
      throw error;
   }

   registerHotkeys() {
      // Lecture/Pause
      this.plugin.addCommand({
         id: 'youtube-play-pause',
         name: this.translations.t('commands.playPause'),
         icon: 'play',
         editorCallback: () => {
            try {
               this.youtube.togglePlayPause();
            } catch (error) {
               this.handleCommandError(error);
            }
         },
         hotkeys: [{ modifiers: [], key: this.settings.getSettings().hotkeys?.togglePlay || 'space' }]
      });

      // Reculer de 10 secondes
      this.plugin.addCommand({
         id: 'youtube-seek-backward',
         name: this.translations.t('commands.seekBackward'),
         icon: 'arrow-left',
         editorCallback: () => {
            try {
               this.youtube.seekBackward(10);
            } catch (error) {
               this.handleCommandError(error);
            }
         },
         hotkeys: [{ modifiers: [], key: this.settings.getSettings().hotkeys?.rewind || 'arrowleft' }]
      });

      // Avancer de 10 secondes
      this.plugin.addCommand({
         id: 'youtube-seek-forward',
         name: this.translations.t('commands.seekForward'),
         icon: 'arrow-right',
         editorCallback: () => {
            try {
               this.youtube.seekForward(10);
            } catch (error) {
               this.handleCommandError(error);
            }
         },
         hotkeys: [{ modifiers: [], key: this.settings.getSettings().hotkeys?.forward || 'arrowright' }]
      });

      // Vitesse de lecture
      this.plugin.addCommand({
         id: 'youtube-speed-up',
         name: this.translations.t('commands.speedUp'),
         icon: 'fast-forward',
         editorCallback: () => {
            try {
               this.youtube.increasePlaybackRate();
            } catch (error) {
               this.handleCommandError(error);
            }
         },
         hotkeys: [{ modifiers: ['Shift'], key: this.settings.getSettings().hotkeys?.speedUp || '>' }]
      });

      // Muet/Son
      this.plugin.addCommand({
         id: 'youtube-toggle-mute',
         name: this.translations.t('commands.toggleMute'),
         icon: 'volume-x',
         editorCallback: () => {
            try {
               this.youtube.toggleMute();
            } catch (error) {
               this.handleCommandError(error);
            }
         },
         hotkeys: [{ modifiers: ['Shift'], key: this.settings.getSettings().hotkeys?.toggleMute || 'm' }]
      });

      // Plein écran
      this.plugin.addCommand({
         id: 'youtube-toggle-fullscreen',
         name: this.translations.t('commands.toggleFullscreen'),
         icon: 'maximize',
         editorCallback: () => {
            try {
               this.youtube.toggleFullscreen();
            } catch (error) {
               this.handleCommandError(error);
            }
         },
         hotkeys: [{ modifiers: ['Shift'], key: this.settings.settings?.hotkeys?.toggleFullscreen || 'f' }]
      });

      // Vitesse favorite
      this.plugin.addCommand({
         id: 'youtube-favorite-speed',
         name: this.translations.t('commands.favoriteSpeed'),
         icon: 'fast-forward',
         editorCallback: () => {
            try {
               const favoriteSpeed = this.settings.getSettings().favoriteSpeed || 2;
               this.youtube.setPlaybackRate(favoriteSpeed);
            } catch (error) {
               this.handleCommandError(error);
            }
         },
         hotkeys: [{ modifiers: ['Ctrl'], key: '4' }]
      });

      // Augmenter le volume
      this.plugin.addCommand({
         id: 'youtube-volume-up',
         name: 'Augmenter le volume',
         icon: 'volume-2',
         editorCallback: () => {
            try {
               this.youtube.increaseVolume(0.1);
            } catch (error) {
               this.handleCommandError(error);
            }
         },
         hotkeys: [{ modifiers: ['Shift'], key: 'ArrowUp' }]
      });

      // Diminuer le volume
      this.plugin.addCommand({
         id: 'youtube-volume-down',
         name: 'Diminuer le volume',
         icon: 'volume-1',
         editorCallback: () => {
            try {
               this.youtube.decreaseVolume(0.1);
            } catch (error) {
               this.handleCommandError(error);
            }
         },
         hotkeys: [{ modifiers: ['Shift'], key: 'ArrowDown' }]
      });
   }
}

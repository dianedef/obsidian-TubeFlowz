import { Plugin, Notice } from 'obsidian';
import { Settings } from './Settings';
import { Translations } from './Translations';
import { YouTube } from './YouTube';
import { CommandError, CommandErrorCode } from './types/IErrors';

export class Hotkeys {
   constructor(
      private plugin: Plugin,
      private settings: typeof Settings,
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
      const youtube = this.youtube;

      // Lecture/Pause
      this.plugin.addCommand({
         id: 'youtube-play-pause',
         name: this.translations.t('commands.playPause'),
         icon: 'play',
         callback: () => {
            try {
               youtube.togglePlayPause();
            } catch (error) {
               this.handleCommandError(error);
            }
         },
         hotkeys: [{ modifiers: ["Shift"], key: " " }]
      });

      // Reculer de 10 secondes
      this.plugin.addCommand({
         id: 'youtube-seek-backward',
         name: this.translations.t('commands.seekBackward'),
         icon: 'arrow-left',
         callback: () => {
            try {
               youtube.seekBackward(10);
            } catch (error) {
               this.handleCommandError(error);
            }
         },
         hotkeys: [{ modifiers: ['Ctrl'], key: 'ArrowLeft' }]
      });

      // Avancer de 10 secondes
      this.plugin.addCommand({
         id: 'youtube-seek-forward',
         name: this.translations.t('commands.seekForward'),
         icon: 'arrow-right',
         callback: () => {
            try {
               youtube.seekForward(10);
            } catch (error) {
               this.handleCommandError(error);
            }
         },
         hotkeys: [{ modifiers: ['Ctrl'], key: 'ArrowRight' }]
      });

      // Augmenter la vitesse
      this.plugin.addCommand({
         id: 'youtube-speed-up',
         name: this.translations.t('commands.speedUp'),
         icon: 'fast-forward',
         callback: () => {
            try {
               youtube.increasePlaybackRate();
            } catch (error) {
               this.handleCommandError(error);
            }
         },
         hotkeys: [{ modifiers: ['Ctrl'], key: '3' }]
      });

      // Vitesse normale
      this.plugin.addCommand({
         id: 'youtube-default-speed',
         name: this.translations.t('commands.defaultSpeed'),
         icon: 'refresh-cw',
         callback: () => {
            try {
               youtube.setPlaybackRate(1);
            } catch (error) {
               this.handleCommandError(error);
            }
         },
         hotkeys: [{ modifiers: ['Ctrl'], key: '2' }]
      });

      // Diminuer la vitesse
      this.plugin.addCommand({
         id: 'youtube-speed-down',
         name: this.translations.t('commands.speedDown'),
         icon: 'rewind',
         callback: () => {
            try {
               youtube.decreasePlaybackRate();
            } catch (error) {
               this.handleCommandError(error);
            }
         },
         hotkeys: [{ modifiers: ['Ctrl'], key: '1' }]
      });

      // Muet/Son
      this.plugin.addCommand({
         id: 'youtube-toggle-mute',
         name: this.translations.t('commands.toggleMute'),
         icon: 'volume-x',
         callback: () => {
            try {
               youtube.toggleMute();
            } catch (error) {
               this.handleCommandError(error);
            }
         },
         hotkeys: [{ modifiers: ['Alt'], key: 'm' }]
      });

      // Plein écran
      this.plugin.addCommand({
         id: 'youtube-toggle-fullscreen',
         name: this.translations.t('commands.toggleFullscreen'),
         icon: 'maximize',
         callback: () => {
            try {
               youtube.toggleFullscreen();
            } catch (error) {
               this.handleCommandError(error);
            }
         },
         hotkeys: [{ modifiers: ['Alt'], key: 'a' }]
      });

      // Vitesse favorite
      this.plugin.addCommand({
         id: 'youtube-favorite-speed',
         name: this.translations.t('commands.favoriteSpeed'),
         icon: 'star',
         callback: () => {
            try {
               const settings = this.settings.getSettings();
               const favoriteSpeed = settings.favoriteSpeed || 2;
               youtube.setPlaybackRate(favoriteSpeed);
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
         callback: () => {
            try {
               youtube.increaseVolume(0.1);
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
         callback: () => {
            try {
               youtube.decreaseVolume(0.1);
            } catch (error) {
               this.handleCommandError(error);
            }
         },
         hotkeys: [{ modifiers: ['Shift'], key: 'ArrowDown' }]
      });

      // Insérer un timestamp
      this.plugin.addCommand({
         id: 'youtube-insert-timestamp',
         name: this.translations.t('commands.insertTimestamp'),
         icon: 'clock',
         callback: () => {
            try {
               console.log('YouTube: Insert timestamp command triggered', youtube.getCurrentTimestamp());
               const timestamp = youtube.getCurrentTimestamp();
               const videoId = youtube.getCurrentVideoId();

               // Créer le lien YouTube avec timestamp
               const youtubeLink = `https://youtu.be/${videoId}?t=${timestamp.seconds}`;
               
               // Insérer dans l'éditeur actif
               const editor = this.plugin.app.workspace.activeEditor;
               if (editor?.editor) {
                  editor.editor.replaceSelection(`[${timestamp.displayTimestamp}](${youtubeLink})`);
               }
            } catch (error) {
               this.handleCommandError(error);
            }
         },
         hotkeys: [{ modifiers: ["Alt"], key: "t" }]
      });
   }
}

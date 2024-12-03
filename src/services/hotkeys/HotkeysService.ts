import { Plugin, Notice } from 'obsidian';
import { SettingsService } from '../settings/SettingsService';
import { TranslationsService } from '../translations/TranslationsService';
import VideoPlayerUI from '../../views/VideoPlayerUI';
import { CommandError, CommandErrorCode } from '../../types/errors';
import { PlaybackRate } from '../../types';

export class Hotkeys {
   constructor(
      private plugin: Plugin,
      private settings: SettingsService,
      private videoPlayer: VideoPlayerUI,
      private translations: TranslationsService
   ) {}

   private handleCommandError(error: CommandError) {
      console.error('[HotkeysService]', error);
      new Notice(this.translations.translate(`errors.${error.code}`));
   }

   registerHotkeys() {
      // Lecture/Pause
      this.plugin.addCommand({
         id: 'youtube-play-pause',
         name: this.translations.translate('commands.playPause'),
         icon: 'play',
         editorCallback: () => {
            try {
               if (!this.videoPlayer?.Player) {
                  throw new CommandError(CommandErrorCode.NO_PLAYER, 'No video player available');
               }
               if (this.videoPlayer.Player.paused()) {
                  this.videoPlayer.Player.play();
               } else {
                  this.videoPlayer.Player.pause();
               }
            } catch (error) {
               this.handleCommandError(error as CommandError);
            }
         },
         hotkeys: [{ modifiers: [], key: this.settings.getSettings().hotkeys?.togglePlay || 'space' }]
      });

      // Reculer de 10 secondes
      this.plugin.addCommand({
         id: 'youtube-seek-backward',
         name: this.translations.translate('commands.seekBackward'),
         icon: 'arrow-left',
         editorCallback: () => {
            try {
               if (!this.videoPlayer?.Player) {
                  throw new CommandError(CommandErrorCode.NO_PLAYER, 'No video player available');
               }
               const currentTime = this.videoPlayer.Player.currentTime();
               if (typeof currentTime !== 'number') {
                  throw new CommandError(CommandErrorCode.INVALID_STATE, 'Cannot get current time');
               }
               this.videoPlayer.Player.currentTime(Math.max(0, currentTime - 10));
            } catch (error) {
               this.handleCommandError(error as CommandError);
            }
         },
         hotkeys: [{ modifiers: [], key: this.settings.getSettings().hotkeys?.rewind || 'arrowleft' }]
      });

      // Avancer de 10 secondes
      this.plugin.addCommand({
         id: 'youtube-seek-forward',
         name: this.translations.translate('commands.seekForward'),
         icon: 'arrow-right',
         editorCallback: () => {
            try {
               if (!this.videoPlayer?.Player) {
                  throw new CommandError(CommandErrorCode.NO_PLAYER, 'No video player available');
               }
               const currentTime = this.videoPlayer.Player.currentTime();
               const duration = this.videoPlayer.Player.duration();
               if (typeof currentTime !== 'number' || typeof duration !== 'number') {
                  throw new CommandError(CommandErrorCode.INVALID_STATE, 'Cannot get current time or duration');
               }
               this.videoPlayer.Player.currentTime(Math.min(duration, currentTime + 10));
            } catch (error) {
               this.handleCommandError(error as CommandError);
            }
         },
         hotkeys: [{ modifiers: [], key: this.settings.getSettings().hotkeys?.forward || 'arrowright' }]
      });

      // Augmenter la vitesse
      this.plugin.addCommand({
         id: 'youtube-speed-up',
         name: this.translations.translate('commands.speedUp'),
         icon: 'fast-forward',
         editorCallback: () => {
            try {
               if (!this.videoPlayer?.Player) {
                  throw new CommandError(CommandErrorCode.NO_PLAYER, 'No video player available');
               }
               const currentRate = this.videoPlayer.Player.playbackRate();
               if (typeof currentRate !== 'number') {
                  throw new CommandError(CommandErrorCode.INVALID_STATE, 'Cannot get current playback rate');
               }
               const newRate = Math.min(16, currentRate + 0.25) as PlaybackRate;
               this.videoPlayer.Player.playbackRate(newRate);
            } catch (error) {
               this.handleCommandError(error as CommandError);
            }
         },
         hotkeys: [{ modifiers: ['Shift'], key: this.settings.getSettings().hotkeys?.speedUp || '>' }]
      });

      // Diminuer la vitesse
      this.plugin.addCommand({
         id: 'youtube-speed-down',
         name: this.translations.translate('commands.speedDown'),
         icon: 'rewind',
         editorCallback: () => {
            try {
               if (!this.videoPlayer?.Player) {
                  throw new CommandError(CommandErrorCode.NO_PLAYER, 'No video player available');
               }
               const currentRate = this.videoPlayer.Player.playbackRate();
               if (typeof currentRate !== 'number') {
                  throw new CommandError(CommandErrorCode.INVALID_STATE, 'Cannot get current playback rate');
               }
               const newRate = Math.max(0.25, currentRate - 0.25) as PlaybackRate;
               this.videoPlayer.Player.playbackRate(newRate);
            } catch (error) {
               this.handleCommandError(error as CommandError);
            }
         },
         hotkeys: [{ modifiers: ['Shift'], key: this.settings.getSettings().hotkeys?.speedDown || '<' }]
      });

      // Réinitialiser la vitesse
      this.plugin.addCommand({
         id: 'youtube-speed-reset',
         name: this.translations.translate('commands.speedReset'),
         icon: 'refresh-cw',
         editorCallback: () => {
            try {
               if (!this.videoPlayer?.Player) {
                  throw new CommandError(CommandErrorCode.NO_PLAYER, 'No video player available');
               }
               this.videoPlayer.Player.playbackRate(1);
            } catch (error) {
               this.handleCommandError(error as CommandError);
            }
         },
         hotkeys: [{ modifiers: ['Shift'], key: this.settings.getSettings().hotkeys?.speedReset || '0' }]
      });

      // Muet/Son
      this.plugin.addCommand({
         id: 'youtube-toggle-mute',
         name: this.translations.translate('commands.toggleMute'),
         icon: 'volume-x',
         editorCallback: () => {
            try {
               if (!this.videoPlayer?.Player) {
                  throw new CommandError(CommandErrorCode.NO_PLAYER, 'No video player available');
               }
               this.videoPlayer.Player.muted(!this.videoPlayer.Player.muted());
            } catch (error) {
               this.handleCommandError(error as CommandError);
            }
         },
         hotkeys: [{ modifiers: ['Shift'], key: this.settings.getSettings().hotkeys?.toggleMute || 'm' }]
      });

      // Vitesse préférée
      this.plugin.addCommand({
         id: 'youtube-set-favorite-speed',
         name: this.translations.translate('commands.setFavoriteSpeed'),
         icon: 'star',
         editorCallback: () => {
            try {
               if (!this.videoPlayer?.Player) {
                  throw new CommandError(CommandErrorCode.NO_PLAYER, 'No video player available');
               }
               const favoriteSpeed = this.settings.getSettings().favoriteSpeed;
               this.videoPlayer.Player.playbackRate(favoriteSpeed);
            } catch (error) {
               this.handleCommandError(error as CommandError);
            }
         },
         hotkeys: [{ modifiers: ['Shift'], key: this.settings.getSettings().hotkeys?.favoriteSpeed || 'f' }]
      });

      // Plein écran
      this.plugin.addCommand({
         id: 'youtube-toggle-fullscreen',
         name: this.translations.translate('commands.toggleFullscreen'),
         icon: 'maximize',
         editorCallback: () => {
            try {
               if (!this.videoPlayer?.Player) {
                  throw new CommandError(CommandErrorCode.NO_PLAYER, 'No video player available');
               }
               const isFullscreen = this.videoPlayer.Player.isFullscreen();
               this.videoPlayer.Player.requestFullscreen(!isFullscreen);
            } catch (error) {
               this.handleCommandError(error as CommandError);
            }
         },
         hotkeys: [{ modifiers: ['Shift'], key: this.settings.getSettings().hotkeys?.toggleFullscreen || 'f' }]
      });

      // Insérer le timestamp
      this.plugin.addCommand({
         id: 'youtube-insert-timestamp',
         name: this.translations.translate('commands.insertTimestamp'),
         icon: 'clock',
         editorCallback: (editor) => {
            try {
               if (!this.videoPlayer?.Player) {
                  throw new CommandError(CommandErrorCode.NO_PLAYER, 'No video player available');
               }
               const currentTime = this.videoPlayer.Player.currentTime();
               if (typeof currentTime !== 'number') {
                  throw new CommandError(CommandErrorCode.INVALID_STATE, 'Cannot get current time');
               }
               // Format pour l'affichage (HH:MM:SS)
               const displayTimestamp = new Date(currentTime * 1000).toISOString().substr(11, 8);
               // Arrondir les secondes pour le lien YouTube
               const youtubeSeconds = Math.floor(currentTime);
               // Récupérer l'ID de la vidéo actuelle
               const videoId = this.videoPlayer.getCurrentVideoId();
               if (!videoId) {
                  throw new CommandError(CommandErrorCode.INVALID_STATE, 'Cannot get video ID');
               }
               // Créer le lien YouTube avec timestamp
               const youtubeLink = `https://www.youtube.com/watch?v=${videoId}&t=${youtubeSeconds}s`;
               // Insérer le lien formaté en Markdown
               editor.replaceSelection(`\n[${displayTimestamp}](${youtubeLink})`);
            } catch (error) {
               this.handleCommandError(error as CommandError);
            }
         },
         hotkeys: [{ modifiers: ['Shift'], key: this.settings.getSettings().hotkeys?.insertTimestamp || 't' }]
      });
   }
}

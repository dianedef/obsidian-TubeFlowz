import { Plugin } from 'obsidian';
import VideoPlayer from '../../views/VideoPlayer';
import { SettingsService } from '../settings/SettingsService';

export class Hotkeys {
   private plugin: Plugin;
   private videoPlayer: VideoPlayer | null;
   private settings: SettingsService;

   constructor(plugin: Plugin, settings: SettingsService) {
      this.plugin = plugin;
      this.settings = settings;
      this.videoPlayer = VideoPlayer.getInstance(settings);
   }

   registerHotkeys() {
      // Raccourci pour play/pause
      this.plugin.addCommand({
         id: 'youtube-play-pause',
         name: 'Play/Pause',
         callback: () => {
               if (this.videoPlayer) {
                  this.videoPlayer.togglePlayPause();
               }
         }
      });

      // Raccourci pour reculer de 10 secondes
      this.plugin.addCommand({
         id: 'youtube-rewind',
         name: 'Reculer de 10 secondes',
         callback: () => {
               if (this.videoPlayer) {
                  this.videoPlayer.rewind();
               }
         }
      });

      // Raccourci pour avancer de 10 secondes
      this.plugin.addCommand({
         id: 'youtube-forward',
         name: 'Avancer de 10 secondes',
         callback: () => {
               if (this.videoPlayer) {
                  this.videoPlayer.forward();
               }
         }
      });

      // Raccourci pour augmenter la vitesse
      this.plugin.addCommand({
         id: 'youtube-speed-up',
         name: 'Augmenter la vitesse',
         callback: () => {
               if (this.videoPlayer) {
                  this.videoPlayer.increaseSpeed();
               }
         }
      });

      // Raccourci pour diminuer la vitesse
      this.plugin.addCommand({
         id: 'youtube-speed-down',
         name: 'Diminuer la vitesse',
         callback: () => {
               if (this.videoPlayer) {
                  this.videoPlayer.decreaseSpeed();
               }
         }
      });

      // Raccourci pour réinitialiser la vitesse
      this.plugin.addCommand({
         id: 'youtube-speed-reset',
         name: 'Réinitialiser la vitesse',
         callback: () => {
               if (this.videoPlayer) {
                  this.videoPlayer.resetSpeed();
               }
         }
      });
   }
}

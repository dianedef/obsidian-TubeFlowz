import { Plugin } from 'obsidian';
import { Store } from './store';

export class Hotkeys {
   private plugin: Plugin;

   constructor(plugin: Plugin) {
      console.log("Initialisation des Hotkeys");
      this.plugin = plugin;
   }

   registerHotkeys(): void {
      try {
         // Contrôles de lecture
         this.plugin.addCommand({
            id: 'youtube-play-pause',
            name: 'YouTube - Lecture/Pause',
            hotkeys: [{ modifiers: ['Shift'], key: 'Space' }],
            callback: () => {
               console.log("Raccourci play/pause activé");
               const store = Store.get();
               console.log("État du store:", store);
               const { VideoPlayer } = store;
               console.log("VideoPlayer récupéré:", VideoPlayer);
               if (!VideoPlayer?.Player) {
                  return;
               }
               if (VideoPlayer.Player.paused()) {
                  VideoPlayer.Player.play();
               } else {
                  VideoPlayer.Player.pause();
               }
            }
         });

         // Contrôles de vitesse
         this.plugin.addCommand({
            id: 'youtube-speed-increase',
            name: 'YouTube - Augmenter la vitesse',
            hotkeys: [{ modifiers: ['Mod'], key: '3' }],
            callback: () => {
               console.log("Raccourci augmentation vitesse activé");
               const { VideoPlayer } = Store.get();
               if (!VideoPlayer?.Player) {
                  return;
               }
               const currentRate = VideoPlayer.Player.playbackRate();
               if (currentRate === undefined) {
                  console.error("Impossible de récupérer la vitesse de lecture actuelle");
                  return;
               }
               const newRate = Math.min(currentRate + 0.25, 16);
               VideoPlayer.Player.playbackRate(newRate);
            }
         });

         this.plugin.addCommand({
            id: 'youtube-speed-decrease',
            name: 'YouTube - Diminuer la vitesse',
            hotkeys: [{ modifiers: ['Mod'], key: '1' }],
            callback: () => {
               console.log("Raccourci diminution vitesse activé");
               const { VideoPlayer } = Store.get();
               if (!VideoPlayer?.Player) {
                  return;
               }
               const currentRate = VideoPlayer.Player.playbackRate();
               if (currentRate === undefined) {
                  console.error("Impossible de récupérer la vitesse de lecture actuelle");
                  return;
               }
               const newRate = Math.max(currentRate - 0.25, 0.25);
               VideoPlayer.Player.playbackRate(newRate);
            }
         });

         // Vitesse normale (x1)
         this.plugin.addCommand({
            id: 'youtube-speed-normal',
            name: 'YouTube - Vitesse normale (x1)',
            hotkeys: [{ modifiers: ['Mod'], key: '2' }],
            callback: () => {
               console.log("Raccourci vitesse normale activé");
               const { VideoPlayer } = Store.get();
               if (!VideoPlayer?.Player) {
                  return;
               }
               VideoPlayer.Player.playbackRate(1);
            }
         });

         // Vitesse favorite
         this.plugin.addCommand({
            id: 'youtube-speed-favorite',
            name: 'YouTube - Vitesse favorite',
            hotkeys: [{ modifiers: ['Mod'], key: '4' }],
            callback: () => {
               console.log("Raccourci vitesse favorite activé");
               const { VideoPlayer, Settings } = Store.get();
               if (!VideoPlayer?.Player) {
                  return;
               }
               const favoriteSpeed = Settings?.getSettings().favoriteSpeed || 2;
               VideoPlayer.Player.playbackRate(favoriteSpeed);
            }
         });

         console.log("Enregistrement des raccourcis clavier terminé avec succès");
      } catch (error) {
         console.error("Erreur lors de l'enregistrement des raccourcis clavier:", error);
      }
   }
}

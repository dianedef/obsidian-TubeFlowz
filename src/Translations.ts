export type TranslationKey = 
   // Commands
   | 'commands.playPause'
   | 'commands.seekBackward'
   | 'commands.seekForward'
   | 'commands.speedUp'
   | 'commands.favoriteSpeed'
   | 'commands.toggleMute'
   | 'commands.toggleFullscreen'
   // Errors
   | 'errors.NO_PLAYER'
   // Settings
   | 'settings.defaultViewMode'
   | 'settings.defaultViewModeDesc'
   | 'settings.tab'
   | 'settings.sidebar'
   | 'settings.overlay'
   | 'settings.playbackMode'
   | 'settings.playbackModeDesc'
   | 'settings.stream'
   | 'settings.download'
   | 'settings.favoriteSpeed'
   | 'settings.favoriteSpeedDesc'
   | 'settings.showRecommendations'
   | 'settings.showRecommendationsDesc';

export const translations: { [lang: string]: Record<TranslationKey, string> } = {
   en: {
      // Commands
      'commands.playPause': 'Play/Pause',
      'commands.seekBackward': 'Seek Backward',
      'commands.seekForward': 'Seek Forward',
      'commands.speedUp': 'Speed Up',
      'commands.favoriteSpeed': 'Favorite Speed',
      'commands.toggleMute': 'Toggle Mute',
      'commands.toggleFullscreen': 'Toggle Fullscreen',
      // Errors
      'errors.NO_PLAYER': 'No video player available',
      // Settings
      'settings.defaultViewMode': 'Default View Mode',
      'settings.defaultViewModeDesc': 'Choose how videos will open by default',
      'settings.tab': 'Tab',
      'settings.sidebar': 'Sidebar',
      'settings.overlay': 'Overlay',
      'settings.playbackMode': 'Playback Mode',
      'settings.playbackModeDesc': 'Choose between streaming or download',
      'settings.stream': 'Stream',
      'settings.download': 'Download',
      'settings.favoriteSpeed': 'Favorite Playback Speed',
      'settings.favoriteSpeedDesc': 'Speed that will be used with Ctrl+4',
      'settings.showRecommendations': 'YouTube Recommendations',
      'settings.showRecommendationsDesc': 'Show YouTube recommendations at the end of videos'
   },
   fr: {
      // Commands
      'commands.playPause': 'Lecture/Pause',
      'commands.seekBackward': 'Reculer',
      'commands.seekForward': 'Avancer',
      'commands.speedUp': 'Augmenter la vitesse',
      'commands.favoriteSpeed': 'Vitesse favorite',
      'commands.toggleMute': 'Activer/Désactiver le son',
      'commands.toggleFullscreen': 'Plein écran',
      // Errors
      'errors.NO_PLAYER': 'Aucun lecteur vidéo disponible',
      // Settings
      'settings.defaultViewMode': 'Mode d\'affichage par défaut',
      'settings.defaultViewModeDesc': 'Choisissez comment les vidéos s\'ouvriront par défaut',
      'settings.tab': 'Onglet',
      'settings.sidebar': 'Barre latérale',
      'settings.overlay': 'Superposition',
      'settings.playbackMode': 'Mode de lecture',
      'settings.playbackModeDesc': 'Choisir entre streaming ou téléchargement',
      'settings.stream': 'Streaming',
      'settings.download': 'Téléchargement',
      'settings.favoriteSpeed': 'Vitesse de lecture favorite',
      'settings.favoriteSpeedDesc': 'Vitesse qui sera utilisée avec Ctrl+4',
      'settings.showRecommendations': 'Recommandations YouTube',
      'settings.showRecommendationsDesc': 'Afficher les recommandations YouTube à la fin des vidéos'
   }
};

export class Translations {
   private currentLang: string;

   constructor(initialLang: string = 'fr') {
      this.currentLang = initialLang;
   }

   setLanguage(lang: string): void {
      this.currentLang = lang;
   }

   t(key: TranslationKey): string {
      return translations[this.currentLang]?.[key] || translations['en'][key] || key;
   }
}

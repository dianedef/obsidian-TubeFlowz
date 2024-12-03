export type TranslationKey = 
   | 'player.title'
   | 'player.close'
   | 'player.error'
   | 'menu.tab'
   | 'menu.sidebar'
   | 'menu.overlay'
   | 'error.invalidUrl'
   | 'error.playerInit'
   | 'error.fallback'
   | 'errors.NO_PLAYER'
   | 'errors.INVALID_STATE'
   | 'errors.PLAYBACK_ERROR'
   | 'commands.playPause'
   | 'commands.seekBackward'
   | 'commands.seekForward'
   | 'commands.speedUp'
   | 'commands.speedDown'
   | 'commands.speedReset'
   | 'commands.toggleMute'
   | 'commands.setFavoriteSpeed'
   | 'commands.toggleFullscreen'
   | 'commands.insertTimestamp';

export type Translations = {
   [key in TranslationKey]: string;
};

export const translations: { [lang: string]: Translations } = {
   en: {
      'player.title': 'YouTube Player',
      'player.close': 'Close',
      'player.error': 'Error loading video player',
      'menu.tab': 'YouTube Tab',
      'menu.sidebar': 'YouTube Sidebar',
      'menu.overlay': 'YouTube Overlay',
      'error.invalidUrl': 'Invalid YouTube URL',
      'error.playerInit': 'Error initializing player',
      'error.fallback': 'Using fallback player',
      'errors.NO_PLAYER': 'No player available',
      'errors.INVALID_STATE': 'Invalid state',
      'errors.PLAYBACK_ERROR': 'Playback error',
      'commands.playPause': 'Play/Pause',
      'commands.seekBackward': 'Seek backward',
      'commands.seekForward': 'Seek forward',
      'commands.speedUp': 'Speed up',
      'commands.speedDown': 'Speed down',
      'commands.speedReset': 'Speed reset',
      'commands.toggleMute': 'Toggle mute',
      'commands.setFavoriteSpeed': 'Set favorite speed',
      'commands.toggleFullscreen': 'Toggle fullscreen',
      'commands.insertTimestamp': 'Insert timestamp'
   },
   fr: {
      'player.title': 'Lecteur YouTube',
      'player.close': 'Fermer',
      'player.error': 'Erreur lors du chargement du lecteur',
      'menu.tab': 'Onglet YouTube',
      'menu.sidebar': 'Barre latérale YouTube',
      'menu.overlay': 'Superposition YouTube',
      'error.invalidUrl': 'URL YouTube invalide',
      'error.playerInit': 'Erreur lors de l\'initialisation du lecteur',
      'error.fallback': 'Utilisation du lecteur de secours',
      'errors.NO_PLAYER': 'Aucun lecteur disponible',
      'errors.INVALID_STATE': 'État invalide',
      'errors.PLAYBACK_ERROR': 'Erreur de lecture',
      'commands.playPause': 'Lecture/Pause',
      'commands.seekBackward': 'Revenir en arrière',
      'commands.seekForward': 'Avancer',
      'commands.speedUp': 'Accélérer',
      'commands.speedDown': 'Ralentir',
      'commands.speedReset': 'Réinitialiser la vitesse',
      'commands.toggleMute': 'Désactiver/activer le silence',
      'commands.setFavoriteSpeed': 'Définir la vitesse préférée',
      'commands.toggleFullscreen': 'Passer en plein écran',
      'commands.insertTimestamp': 'Insérer l\'horodatage'
   }
}; 

export class TranslationsService {
   private currentLang: string;

   constructor() {
      this.currentLang = document.documentElement.lang || 'en';
   }

   translate(key: TranslationKey): string {
      return translations[this.currentLang]?.[key] || translations['en'][key] || key;
   }
} 
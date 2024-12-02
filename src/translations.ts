export type TranslationKey = 
   | 'player.title'
   | 'player.close'
   | 'player.error'
   | 'menu.tab'
   | 'menu.sidebar'
   | 'menu.overlay'
   | 'error.invalidUrl'
   | 'error.playerInit'
   | 'error.fallback';

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
      'error.fallback': 'Using fallback player'
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
      'error.fallback': 'Utilisation du lecteur de secours'
   }
}; 
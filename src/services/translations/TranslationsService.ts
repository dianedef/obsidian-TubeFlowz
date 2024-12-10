export type TranslationKey = 
    // YouTube errors
    | 'error.youtube.invalidParameter'
    | 'error.youtube.html5Error'
    | 'error.youtube.videoNotFound'
    | 'error.youtube.notEmbeddable'
    | 'error.youtube.videoRemoved'
    // Player errors
    | 'error.player.aborted'
    | 'error.player.network'
    | 'error.player.decode'
    | 'error.player.notSupported'
    | 'error.player.encrypted'
    // Cache errors
    | 'error.cache.storageFull'
    | 'error.cache.invalidData'
    | 'error.cache.expired'
    | 'error.cache.corrupted'
    | 'error.cache.notFound'
    // Config errors
    | 'error.config.invalidSettings'
    | 'error.config.missingRequired'
    | 'error.config.typeMismatch'
    | 'error.config.validationFailed'
    | 'error.config.initialization'
    | 'error.config.invalidParameter';

export const translations: { [lang: string]: Record<TranslationKey, string> } = {
    en: {
        // YouTube errors
        'error.youtube.invalidParameter': 'Invalid YouTube parameter',
        'error.youtube.html5Error': 'HTML5 player error',
        'error.youtube.videoNotFound': 'Video not found',
        'error.youtube.notEmbeddable': 'Video cannot be embedded',
        'error.youtube.videoRemoved': 'Video has been removed',
        // Player errors
        'error.player.aborted': 'Playback aborted',
        'error.player.network': 'Network error occurred',
        'error.player.decode': 'Media decoding error',
        'error.player.notSupported': 'Media format not supported',
        'error.player.encrypted': 'Media is encrypted',
        // Cache errors
        'error.cache.storageFull': 'Storage is full',
        'error.cache.invalidData': 'Invalid cache data',
        'error.cache.expired': 'Cache data has expired',
        'error.cache.corrupted': 'Cache data is corrupted',
        'error.cache.notFound': 'Cache data not found',
        // Config errors
        'error.config.invalidSettings': 'Invalid settings',
        'error.config.missingRequired': 'Required setting missing',
        'error.config.typeMismatch': 'Setting type mismatch',
        'error.config.validationFailed': 'Settings validation failed',
        'error.config.initialization': 'Initialization error',
        'error.config.invalidParameter': 'Invalid parameter'
    },
    fr: {
        // YouTube errors
        'error.youtube.invalidParameter': 'Paramètre YouTube invalide',
        'error.youtube.html5Error': 'Erreur du lecteur HTML5',
        'error.youtube.videoNotFound': 'Vidéo non trouvée',
        'error.youtube.notEmbeddable': 'La vidéo ne peut pas être intégrée',
        'error.youtube.videoRemoved': 'La vidéo a été supprimée',
        // Player errors
        'error.player.aborted': 'Lecture interrompue',
        'error.player.network': 'Erreur réseau',
        'error.player.decode': 'Erreur de décodage',
        'error.player.notSupported': 'Format non supporté',
        'error.player.encrypted': 'Média crypté',
        // Cache errors
        'error.cache.storageFull': 'Le stockage est plein',
        'error.cache.invalidData': 'Données du cache invalides',
        'error.cache.expired': 'Données du cache expirées',
        'error.cache.corrupted': 'Données du cache corrompues',
        'error.cache.notFound': 'Données non trouvées dans le cache',
        // Config errors
        'error.config.invalidSettings': 'Configuration invalide',
        'error.config.missingRequired': 'Paramètre requis manquant',
        'error.config.typeMismatch': 'Type de paramètre incorrect',
        'error.config.validationFailed': 'Échec de la validation',
        'error.config.initialization': 'Erreur d\'initialisation',
        'error.config.invalidParameter': 'Paramètre invalide'
    }
};

export class TranslationsService {
   private currentLang: string;

   constructor() {
      this.currentLang = document.documentElement.lang || 'en';
   }

   t(key: TranslationKey): string {
      return translations[this.currentLang]?.[key] || translations['en'][key] || key;
   }
} 
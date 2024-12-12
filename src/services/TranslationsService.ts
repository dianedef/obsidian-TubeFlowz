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
    | 'error.player.containerNotInitialized'
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
    | 'error.config.invalidParameter'
    // Volume and playback errors
    | 'error.player.invalidVolume'
    | 'error.player.invalidPlaybackRate'
    | 'error.player.loadError'
    // Messages UI
    | 'player.title'
    | 'messages.sidebarCreateError'
    | 'messages.initializationError';

// Mapping entre les codes d'erreur et les clés de traduction
export const ERROR_MESSAGE_KEYS: Record<string, TranslationKey> = {
    // YouTube errors
    VIDEO_NOT_FOUND: 'error.youtube.videoNotFound',
    VIDEO_NOT_EMBEDDABLE: 'error.youtube.notEmbeddable',
    VIDEO_REMOVED: 'error.youtube.videoRemoved',
    INVALID_PARAMETER: 'error.youtube.invalidParameter',
    HTML5_ERROR: 'error.youtube.html5Error',
    // Player errors
    MEDIA_ERR_ABORTED: 'error.player.aborted',
    MEDIA_ERR_NETWORK: 'error.player.network',
    MEDIA_ERR_DECODE: 'error.player.decode',
    MEDIA_ERR_SRC_NOT_SUPPORTED: 'error.player.notSupported',
    MEDIA_ERR_ENCRYPTED: 'error.player.encrypted',
    CONTAINER_NOT_INITIALIZED: 'error.player.containerNotInitialized',
    // Cache errors
    STORAGE_FULL: 'error.cache.storageFull',
    INVALID_DATA: 'error.cache.invalidData',
    EXPIRED: 'error.cache.expired',
    CORRUPTED: 'error.cache.corrupted',
    CACHE_NOT_FOUND: 'error.cache.notFound',
    // Config errors
    INVALID_SETTINGS: 'error.config.invalidSettings',
    MISSING_REQUIRED: 'error.config.missingRequired',
    TYPE_MISMATCH: 'error.config.typeMismatch',
    VALIDATION_FAILED: 'error.config.validationFailed',
    INITIALIZATION_ERROR: 'error.config.initialization',
    INVALID_CONFIG_PARAMETER: 'error.config.invalidParameter',
    // Volume and playback errors
    INVALID_VOLUME: 'error.player.invalidVolume',
    INVALID_PLAYBACK_RATE: 'error.player.invalidPlaybackRate',
    LOAD_ERROR: 'error.player.loadError',
    // Messages UI
    PLAYER_TITLE: 'player.title',
    MESSAGES_SIDEBAR_CREATE_ERROR: 'messages.sidebarCreateError',
    MESSAGES_INITIALIZATION_ERROR: 'messages.initializationError'
} as const;

export const translations: { [lang: string]: Record<TranslationKey, string> } = {
    en: {
        // YouTube errors
        'error.youtube.videoNotFound': 'Video not found',
        'error.youtube.notEmbeddable': 'Video cannot be embedded',
        'error.youtube.videoRemoved': 'Video has been removed',
        'error.youtube.invalidParameter': 'Invalid parameter',
        'error.youtube.html5Error': 'HTML5 playback error',
        // Player errors
        'error.player.aborted': 'Playback aborted',
        'error.player.network': 'Network error',
        'error.player.decode': 'Decoding error',
        'error.player.notSupported': 'Source not supported',
        'error.player.encrypted': 'Media is encrypted',
        'error.player.containerNotInitialized': 'Container not initialized',
        'error.player.invalidVolume': 'Invalid volume value',
        'error.player.invalidPlaybackRate': 'Invalid playback rate',
        'error.player.loadError': 'Failed to load video',
        // Cache errors
        'error.cache.storageFull': 'Storage is full',
        'error.cache.invalidData': 'Invalid data',
        'error.cache.expired': 'Data has expired',
        'error.cache.corrupted': 'Data is corrupted',
        'error.cache.notFound': 'Cache not found',
        // Config errors
        'error.config.invalidSettings': 'Invalid settings',
        'error.config.missingRequired': 'Missing required settings',
        'error.config.typeMismatch': 'Type mismatch',
        'error.config.validationFailed': 'Validation failed',
        'error.config.initialization': 'Initialization error',
        'error.config.invalidParameter': 'Invalid configuration parameter',
        // Messages UI
        'player.title': 'YouTube Player',
        'messages.sidebarCreateError': 'Failed to create sidebar',
        'messages.initializationError': 'Failed to initialize player'
    },
    fr: {
        // YouTube errors
        'error.youtube.videoNotFound': 'Vidéo YouTube non trouvée',
        'error.youtube.notEmbeddable': 'La vidéo ne peut pas être intégrée',
        'error.youtube.videoRemoved': 'La vidéo a été supprimée',
        'error.youtube.invalidParameter': 'Paramètre invalide',
        'error.youtube.html5Error': 'Erreur HTML5 lors de la lecture',
        // Player errors
        'error.player.aborted': 'Lecture interrompue',
        'error.player.network': 'Erreur réseau lors de la lecture',
        'error.player.decode': 'Erreur de décodage',
        'error.player.notSupported': 'Source non supportée',
        'error.player.encrypted': 'Média crypté',
        'error.player.containerNotInitialized': 'Conteneur non initialisé',
        'error.player.invalidVolume': 'Valeur de volume invalide',
        'error.player.invalidPlaybackRate': 'Vitesse de lecture invalide',
        'error.player.loadError': 'Échec du chargement de la vidéo',
        // Cache errors
        'error.cache.storageFull': 'Stockage plein',
        'error.cache.invalidData': 'Données invalides',
        'error.cache.expired': 'Données expirées',
        'error.cache.corrupted': 'Données corrompues',
        'error.cache.notFound': 'Cache non trouvé',
        // Config errors
        'error.config.invalidSettings': 'Paramètres invalides',
        'error.config.missingRequired': 'Paramètres requis manquants',
        'error.config.typeMismatch': 'Type incompatible',
        'error.config.validationFailed': 'Échec de la validation',
        'error.config.initialization': 'Erreur d\'initialisation',
        'error.config.invalidParameter': 'Paramètre de configuration invalide',
        // Messages UI
        'player.title': 'Lecteur YouTube',
        'messages.sidebarCreateError': 'Échec de création de la barre latérale',
        'messages.initializationError': 'Échec d\'initialisation du lecteur'
    }
};

export class TranslationsService {
    private static instance: TranslationsService;
    private currentLang: string;

    private constructor() {
        this.currentLang = document.documentElement.lang || 'en';
    }

    static getInstance(): TranslationsService {
        if (!this.instance) {
            this.instance = new TranslationsService();
        }
        return this.instance;
    }

    t(key: TranslationKey): string {
        return translations[this.currentLang]?.[key] || translations['en'][key] || key;
    }

    getErrorMessage(errorCode: keyof typeof ERROR_MESSAGE_KEYS): string {
        const translationKey = ERROR_MESSAGE_KEYS[errorCode];
        return translationKey ? this.t(translationKey) : errorCode;
    }
} 


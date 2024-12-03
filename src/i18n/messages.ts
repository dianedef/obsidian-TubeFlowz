// Messages d'erreur pour différentes langues
export const errorMessages = {
    en: {
        // YouTube errors
        VIDEO_NOT_FOUND: 'Video not found',
        VIDEO_NOT_EMBEDDABLE: 'Video cannot be embedded',
        VIDEO_REMOVED: 'Video has been removed',
        INVALID_PARAMETER: 'Invalid parameter',
        HTML5_ERROR: 'HTML5 playback error',

        // Player errors
        MEDIA_ERR_ABORTED: 'Playback aborted',
        MEDIA_ERR_NETWORK: 'Network error',
        MEDIA_ERR_DECODE: 'Decoding error',
        MEDIA_ERR_SRC_NOT_SUPPORTED: 'Format not supported',
        MEDIA_ERR_ENCRYPTED: 'Media is encrypted',
        CONTAINER_NOT_INITIALIZED: 'Container not initialized',

        // Cache errors
        STORAGE_FULL: 'Storage is full',
        INVALID_DATA: 'Invalid data',
        EXPIRED: 'Data has expired',
        CORRUPTED: 'Data is corrupted',
        CACHE_NOT_FOUND: 'Cache not found',

        // Config errors
        INVALID_SETTINGS: 'Invalid settings',
        MISSING_REQUIRED: 'Missing required settings',
        TYPE_MISMATCH: 'Type mismatch',
        VALIDATION_FAILED: 'Validation failed',
        INITIALIZATION_ERROR: 'Initialization error',
        INVALID_CONFIG_PARAMETER: 'Invalid configuration parameter',

        // Volume and playback errors
        INVALID_VOLUME: 'Invalid volume value',
        INVALID_PLAYBACK_RATE: 'Invalid playback rate',
        LOAD_ERROR: 'Failed to load video'
    },
    fr: {
        // YouTube errors
        VIDEO_NOT_FOUND: 'Vidéo YouTube non trouvée',
        VIDEO_NOT_EMBEDDABLE: 'La vidéo ne peut pas être intégrée',
        VIDEO_REMOVED: 'La vidéo a été supprimée',
        INVALID_PARAMETER: 'Paramètre invalide',
        HTML5_ERROR: 'Erreur HTML5 lors de la lecture',

        // Player errors
        MEDIA_ERR_ABORTED: 'Lecture interrompue',
        MEDIA_ERR_NETWORK: 'Erreur réseau lors de la lecture',
        MEDIA_ERR_DECODE: 'Erreur de décodage',
        MEDIA_ERR_SRC_NOT_SUPPORTED: 'Format non supporté',
        MEDIA_ERR_ENCRYPTED: 'Média crypté',
        CONTAINER_NOT_INITIALIZED: 'Conteneur non initialisé',

        // Cache errors
        STORAGE_FULL: 'Stockage plein',
        INVALID_DATA: 'Données invalides',
        EXPIRED: 'Données expirées',
        CORRUPTED: 'Données corrompues',
        CACHE_NOT_FOUND: 'Cache non trouvé',

        // Config errors
        INVALID_SETTINGS: 'Paramètres invalides',
        MISSING_REQUIRED: 'Paramètres requis manquants',
        TYPE_MISMATCH: 'Type incompatible',
        VALIDATION_FAILED: 'Échec de la validation',
        INITIALIZATION_ERROR: 'Erreur d\'initialisation',
        INVALID_CONFIG_PARAMETER: 'Paramètre de configuration invalide',

        // Volume and playback errors
        INVALID_VOLUME: 'Valeur de volume invalide',
        INVALID_PLAYBACK_RATE: 'Vitesse de lecture invalide',
        LOAD_ERROR: 'Échec du chargement de la vidéo'
    }
};

// Type pour les clés de messages
export type MessageKey = keyof typeof errorMessages.en;

// Objet constant pour les clés de messages
export const MESSAGE_KEYS = {
    // YouTube errors
    VIDEO_NOT_FOUND: 'VIDEO_NOT_FOUND' as MessageKey,
    VIDEO_NOT_EMBEDDABLE: 'VIDEO_NOT_EMBEDDABLE' as MessageKey,
    VIDEO_REMOVED: 'VIDEO_REMOVED' as MessageKey,
    INVALID_PARAMETER: 'INVALID_PARAMETER' as MessageKey,
    HTML5_ERROR: 'HTML5_ERROR' as MessageKey,

    // Player errors
    MEDIA_ERR_ABORTED: 'MEDIA_ERR_ABORTED' as MessageKey,
    MEDIA_ERR_NETWORK: 'MEDIA_ERR_NETWORK' as MessageKey,
    MEDIA_ERR_DECODE: 'MEDIA_ERR_DECODE' as MessageKey,
    MEDIA_ERR_SRC_NOT_SUPPORTED: 'MEDIA_ERR_SRC_NOT_SUPPORTED' as MessageKey,
    MEDIA_ERR_ENCRYPTED: 'MEDIA_ERR_ENCRYPTED' as MessageKey,
    CONTAINER_NOT_INITIALIZED: 'CONTAINER_NOT_INITIALIZED' as MessageKey,

    // Cache errors
    STORAGE_FULL: 'STORAGE_FULL' as MessageKey,
    INVALID_DATA: 'INVALID_DATA' as MessageKey,
    EXPIRED: 'EXPIRED' as MessageKey,
    CORRUPTED: 'CORRUPTED' as MessageKey,
    CACHE_NOT_FOUND: 'CACHE_NOT_FOUND' as MessageKey,

    // Config errors
    INVALID_SETTINGS: 'INVALID_SETTINGS' as MessageKey,
    MISSING_REQUIRED: 'MISSING_REQUIRED' as MessageKey,
    TYPE_MISMATCH: 'TYPE_MISMATCH' as MessageKey,
    VALIDATION_FAILED: 'VALIDATION_FAILED' as MessageKey,
    INITIALIZATION_ERROR: 'INITIALIZATION_ERROR' as MessageKey,
    INVALID_CONFIG_PARAMETER: 'INVALID_CONFIG_PARAMETER' as MessageKey,

    // Volume and playback errors
    INVALID_VOLUME: 'INVALID_VOLUME' as MessageKey,
    INVALID_PLAYBACK_RATE: 'INVALID_PLAYBACK_RATE' as MessageKey,
    LOAD_ERROR: 'LOAD_ERROR' as MessageKey,

    // UI errors
    VIDEO_ID_MISSING: 'INVALID_PARAMETER' as MessageKey,
    SIDEBAR_CREATE_ERROR: 'MEDIA_ERR_ABORTED' as MessageKey,
    VIDEO_LOAD_ERROR: 'LOAD_ERROR' as MessageKey,
    RESIZE_ERROR: 'MEDIA_ERR_ABORTED' as MessageKey,
    FULLSCREEN_ERROR: 'MEDIA_ERR_ABORTED' as MessageKey
} as const;

// Fonction pour obtenir un message traduit
export function getErrorMessage(key: MessageKey, lang: 'en' | 'fr' = 'en'): string {
    return errorMessages[lang][key] || errorMessages.en[key];
} 
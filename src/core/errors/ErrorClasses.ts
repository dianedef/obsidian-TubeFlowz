import {
    AppErrorCode,
    YouTubeErrorCode,
    PlayerErrorCode,
    CacheErrorCode,
    ConfigErrorCode,
    type BaseError,
    type YouTubeError,
    type PlayerError,
    type CacheError,
    type ConfigError
} from '../../types/errors';

// Classe de base abstraite pour toutes les erreurs
abstract class BaseAppError extends Error implements BaseError {
    readonly timestamp: number;

    constructor(
        message: string,
        readonly code: AppErrorCode,
        readonly details?: Record<string, unknown>
    ) {
        super(message);
        this.name = this.constructor.name;
        this.timestamp = Date.now();
    }
}

// Classe pour les erreurs YouTube
export class YouTubeAppError extends BaseAppError implements YouTubeError {
    constructor(
        message: string,
        readonly code: YouTubeErrorCode,
        readonly videoId?: string,
        readonly playerState?: number,
        details?: Record<string, unknown>
    ) {
        super(message, AppErrorCode.API, details);
    }

    static fromErrorCode(code: YouTubeErrorCode, videoId?: string): YouTubeAppError {
        const messages: Record<YouTubeErrorCode, string> = {
            [YouTubeErrorCode.INVALID_PARAMETER]: 'Paramètre invalide pour la vidéo YouTube',
            [YouTubeErrorCode.HTML5_ERROR]: 'Erreur HTML5 lors de la lecture',
            [YouTubeErrorCode.VIDEO_NOT_FOUND]: 'Vidéo YouTube non trouvée',
            [YouTubeErrorCode.VIDEO_NOT_EMBEDDABLE]: 'La vidéo ne peut pas être intégrée',
            [YouTubeErrorCode.VIDEO_REMOVED]: 'La vidéo a été supprimée'
        };

        return new YouTubeAppError(messages[code], code, videoId);
    }
}

// Classe pour les erreurs du lecteur
export class PlayerAppError extends BaseAppError implements PlayerError {
    constructor(
        message: string,
        readonly code: PlayerErrorCode,
        readonly mediaError?: MediaError,
        readonly currentTime?: number,
        details?: Record<string, unknown>
    ) {
        super(message, AppErrorCode.INITIALIZATION, details);
    }

    static fromErrorCode(code: PlayerErrorCode, currentTime?: number): PlayerAppError {
        const messages: Record<PlayerErrorCode, string> = {
            [PlayerErrorCode.MEDIA_ERR_ABORTED]: 'La lecture a été interrompue',
            [PlayerErrorCode.MEDIA_ERR_NETWORK]: 'Erreur réseau lors de la lecture',
            [PlayerErrorCode.MEDIA_ERR_DECODE]: 'Erreur de décodage du média',
            [PlayerErrorCode.MEDIA_ERR_SRC_NOT_SUPPORTED]: 'Format de média non supporté',
            [PlayerErrorCode.MEDIA_ERR_ENCRYPTED]: 'Le média est crypté'
        };

        return new PlayerAppError(messages[code], code, undefined, currentTime);
    }
}

// Classe pour les erreurs de cache
export class CacheAppError extends BaseAppError implements CacheError {
    constructor(
        message: string,
        readonly code: CacheErrorCode,
        readonly key?: string,
        readonly size?: number,
        details?: Record<string, unknown>
    ) {
        super(message, AppErrorCode.INITIALIZATION, details);
    }

    static fromErrorCode(code: CacheErrorCode, key?: string, size?: number): CacheAppError {
        const messages: Record<CacheErrorCode, string> = {
            [CacheErrorCode.STORAGE_FULL]: 'Le stockage est plein',
            [CacheErrorCode.INVALID_DATA]: 'Données invalides dans le cache',
            [CacheErrorCode.EXPIRED]: 'Les données du cache ont expiré',
            [CacheErrorCode.CORRUPTED]: 'Les données du cache sont corrompues'
        };

        return new CacheAppError(messages[code], code, key, size);
    }
}

// Classe pour les erreurs de configuration
export class ConfigAppError extends BaseAppError implements ConfigError {
    constructor(
        message: string,
        readonly code: ConfigErrorCode,
        readonly setting?: string,
        readonly expectedType?: string,
        readonly receivedType?: string,
        details?: Record<string, unknown>
    ) {
        super(message, AppErrorCode.INVALID_PARAMETER, details);
    }

    static fromErrorCode(
        code: ConfigErrorCode,
        setting?: string,
        expectedType?: string,
        receivedType?: string
    ): ConfigAppError {
        const messages: Record<ConfigErrorCode, string> = {
            [ConfigErrorCode.INVALID_SETTINGS]: 'Configuration invalide',
            [ConfigErrorCode.MISSING_REQUIRED]: 'Paramètre requis manquant',
            [ConfigErrorCode.TYPE_MISMATCH]: 'Type de paramètre incorrect',
            [ConfigErrorCode.VALIDATION_FAILED]: 'Échec de la validation'
        };

        return new ConfigAppError(messages[code], code, setting, expectedType, receivedType);
    }
}

// Fonction utilitaire pour créer des erreurs à partir des codes
export const createError = {
    youtube: YouTubeAppError.fromErrorCode,
    player: PlayerAppError.fromErrorCode,
    cache: CacheAppError.fromErrorCode,
    config: ConfigAppError.fromErrorCode
}; 
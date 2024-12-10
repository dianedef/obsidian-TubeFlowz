import {
    AppErrorCode,
    YouTubeErrorCode,
    PlayerErrorCode,
    CacheErrorCode,
    ConfigErrorCode,
    type IBaseError,
    type IYouTubeError,
    type IPlayerError,
    type ICacheError,
    type IConfigError
} from '../../types/IErrors';

// Classe de base abstraite pour toutes les erreurs
abstract class BaseAppError extends Error implements IBaseError {
    readonly timestamp: number;

    constructor(
        readonly code: AppErrorCode | YouTubeErrorCode | PlayerErrorCode | CacheErrorCode | ConfigErrorCode,
        message: string,
        readonly details?: Record<string, unknown>
    ) {
        super(message);
        this.name = this.constructor.name;
        this.timestamp = Date.now();
    }
}

// Classe pour les erreurs YouTube
export class YouTubeAppError extends BaseAppError implements IYouTubeError {
    constructor(
        readonly code: YouTubeErrorCode,
        message: string,
        details?: Record<string, unknown>
    ) {
        super(code, message, details);
    }

    static fromErrorCode(code: YouTubeErrorCode, videoId?: string): YouTubeAppError {
        const messages: Record<YouTubeErrorCode, string> = {
            [YouTubeErrorCode.INVALID_PARAMETER]: 'error.youtube.invalidParameter',
            [YouTubeErrorCode.HTML5_ERROR]: 'error.youtube.html5Error',
            [YouTubeErrorCode.VIDEO_NOT_FOUND]: 'error.youtube.videoNotFound',
            [YouTubeErrorCode.VIDEO_NOT_EMBEDDABLE]: 'error.youtube.notEmbeddable',
            [YouTubeErrorCode.VIDEO_REMOVED]: 'error.youtube.videoRemoved'
        };

        return new YouTubeAppError(code, messages[code]);
    }
}

// Classe pour les erreurs du lecteur
export class PlayerAppError extends BaseAppError implements IPlayerError {
    constructor(
        message: string,
        readonly code: PlayerErrorCode,
        readonly mediaError?: MediaError,
        readonly currentTime?: number,
        details?: Record<string, unknown>
    ) {
        super(code, message, details);
    }

    static fromErrorCode(code: PlayerErrorCode, currentTime?: number): PlayerAppError {
        const messages: Record<PlayerErrorCode, string> = {
            [PlayerErrorCode.MEDIA_ERR_ABORTED]: 'error.player.aborted',
            [PlayerErrorCode.MEDIA_ERR_NETWORK]: 'error.player.network',
            [PlayerErrorCode.MEDIA_ERR_DECODE]: 'error.player.decode',
            [PlayerErrorCode.MEDIA_ERR_SRC_NOT_SUPPORTED]: 'error.player.notSupported',
            [PlayerErrorCode.MEDIA_ERR_ENCRYPTED]: 'error.player.encrypted'
        };

        return new PlayerAppError(code, messages[code]);
    }
}

// Classe pour les erreurs de cache
export class CacheAppError extends BaseAppError implements ICacheError {
    constructor(
        message: string,
        readonly code: CacheErrorCode,
        readonly key?: string,
        readonly size?: number,
        details?: Record<string, unknown>
    ) {
        super(code, message, details);
    }

    static fromErrorCode(code: CacheErrorCode, key?: string, size?: number): CacheAppError {
        const messages: Record<CacheErrorCode, string> = {
            [CacheErrorCode.STORAGE_FULL]: 'error.cache.storageFull',
            [CacheErrorCode.INVALID_DATA]: 'error.cache.invalidData',
            [CacheErrorCode.EXPIRED]: 'error.cache.expired',
            [CacheErrorCode.CORRUPTED]: 'error.cache.corrupted',
            [CacheErrorCode.NOT_FOUND]: 'error.cache.notFound'
        };

        return new CacheAppError(code, messages[code]);
    }
}

// Classe pour les erreurs de configuration
export class ConfigAppError extends BaseAppError implements IConfigError {
    constructor(
        message: string,
        readonly code: ConfigErrorCode,
        readonly setting?: string,
        readonly expectedType?: string,
        readonly receivedType?: string,
        details?: Record<string, unknown>
    ) {
        super(code, message, details);
    }

    static fromErrorCode(
        code: ConfigErrorCode,
        setting?: string,
        expectedType?: string,
        receivedType?: string
    ): ConfigAppError {
        const messages: Record<ConfigErrorCode, string> = {
            [ConfigErrorCode.INVALID_SETTINGS]: 'error.config.invalidSettings',
            [ConfigErrorCode.MISSING_REQUIRED]: 'error.config.missingRequired',
            [ConfigErrorCode.TYPE_MISMATCH]: 'error.config.typeMismatch',
            [ConfigErrorCode.VALIDATION_FAILED]: 'error.config.validationFailed',
            [ConfigErrorCode.INITIALIZATION]: 'error.config.initialization',
            [ConfigErrorCode.INVALID_PARAMETER]: 'error.config.invalidParameter'
        };

        return new ConfigAppError(code, messages[code]);
    }
}

// Fonction utilitaire pour créer des erreurs à partir des codes
export const createError = {
    youtube: YouTubeAppError.fromErrorCode,
    player: PlayerAppError.fromErrorCode,
    cache: CacheAppError.fromErrorCode,
    config: ConfigAppError.fromErrorCode
}; 
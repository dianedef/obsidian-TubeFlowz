import { type TranslationKey, TranslationsService, ERROR_MESSAGE_KEYS } from '../../src-ancien/services/TranslationsService';

// Codes d'erreur génériques de l'application
export enum AppErrorCode {
    // Erreurs générales
    UNKNOWN = 'UNKNOWN_ERROR',
    INITIALIZATION = 'INITIALIZATION_ERROR',
    INVALID_STATE = 'INVALID_STATE',
    INVALID_PARAMETER = 'INVALID_PARAMETER',
    
    // Erreurs réseau
    NETWORK = 'NETWORK_ERROR',
    API = 'API_ERROR',
    TIMEOUT = 'TIMEOUT_ERROR',
    
    // Erreurs de ressources
    NOT_FOUND = 'NOT_FOUND',
    ALREADY_EXISTS = 'ALREADY_EXISTS',
    
    // Erreurs de permission
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN'
}

// Interface de base pour toutes les erreurs de l'application
export interface IBaseError extends Error {
    readonly code: AppErrorCode | YouTubeErrorCode | PlayerErrorCode | CacheErrorCode | ConfigErrorCode;
    readonly timestamp: number;
    readonly details?: Record<string, unknown>;
}

// Classes d'erreur personnalisées
export abstract class AppBaseError extends Error implements IBaseError {
    readonly timestamp: number;
    readonly details?: Record<string, unknown>;

    constructor(
        readonly code: AppErrorCode | YouTubeErrorCode | PlayerErrorCode | CacheErrorCode | ConfigErrorCode,
        messageKey: TranslationKey,
        details?: Record<string, unknown>,
        lang: string = 'en'
    ) {
        const translationService = TranslationsService.getInstance();
        translationService.setLanguage(lang);
        super(translationService.t(messageKey));
        this.timestamp = Date.now();
        this.details = details;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

// Interface et classe pour les erreurs YouTube
export enum YouTubeErrorCode {
    VIDEO_NOT_FOUND = 100,
    VIDEO_NOT_EMBEDDABLE = 101,
    VIDEO_REMOVED = 150,
    PLAYBACK_DISABLED = 1150,
    INVALID_PARAMETER = 2,
    HTML5_ERROR = 5
}

export interface IYouTubeError extends IBaseError {
    readonly code: YouTubeErrorCode;
    readonly videoId?: string;
    readonly playerState?: number;
}

export class YouTubeAppError extends AppBaseError implements IYouTubeError {
    constructor(
        readonly code: YouTubeErrorCode,
        messageKey: TranslationKey,
        public readonly videoId?: string,
        public readonly playerState?: number,
        lang: string = 'en'
    ) {
        super(code, messageKey, { videoId, playerState }, lang);
        this.name = 'YouTubeError';
    }
}

// Interface et classe pour les erreurs de lecture vidéo
export enum PlayerErrorCode {
    MEDIA_ERR_ABORTED = 1,
    MEDIA_ERR_NETWORK = 2,
    MEDIA_ERR_DECODE = 3,
    MEDIA_ERR_SRC_NOT_SUPPORTED = 4,
    MEDIA_ERR_ENCRYPTED = 5
}

export interface IPlayerError extends IBaseError {
    readonly code: PlayerErrorCode;
    readonly mediaError?: MediaError;
    readonly currentTime?: number;
}

export class PlayerAppError extends AppBaseError implements IPlayerError {
    constructor(
        readonly code: PlayerErrorCode,
        messageKey: TranslationKey,
        public readonly mediaError?: MediaError,
        public readonly currentTime?: number,
        lang: string = 'en'
    ) {
        super(code, messageKey, { mediaError, currentTime }, lang);
        this.name = 'PlayerError';
    }
}

// Interface et classe pour les erreurs de cache
export enum CacheErrorCode {
    STORAGE_FULL = 'STORAGE_FULL',
    INVALID_DATA = 'INVALID_DATA',
    EXPIRED = 'EXPIRED',
    CORRUPTED = 'CORRUPTED',
    NOT_FOUND = 'NOT_FOUND'
}

export interface ICacheError extends IBaseError {
    readonly code: CacheErrorCode;
    readonly key?: string;
    readonly size?: number;
}

export class CacheAppError extends AppBaseError implements ICacheError {
    constructor(
        readonly code: CacheErrorCode,
        messageKey: TranslationKey,
        public readonly key?: string,
        public readonly size?: number,
        lang: string = 'en'
    ) {
        super(code, messageKey, { key, size }, lang);
        this.name = 'CacheError';
    }
}

// Interface et classe pour les erreurs de configuration
export enum ConfigErrorCode {
    INVALID_SETTINGS = 'INVALID_SETTINGS',
    MISSING_REQUIRED = 'MISSING_REQUIRED',
    TYPE_MISMATCH = 'TYPE_MISMATCH',
    VALIDATION_FAILED = 'VALIDATION_FAILED',
    INITIALIZATION = 'INITIALIZATION',
    INVALID_PARAMETER = 'INVALID_PARAMETER'
}

export interface IConfigError extends IBaseError {
    readonly code: ConfigErrorCode;
    readonly setting?: string;
    readonly expectedType?: string;
    readonly receivedType?: string;
}

export class ConfigAppError extends AppBaseError implements IConfigError {
    constructor(
        readonly code: ConfigErrorCode,
        messageKey: TranslationKey,
        public readonly setting?: string,
        public readonly expectedType?: string,
        public readonly receivedType?: string,
        lang: string = 'en'
    ) {
        super(code, messageKey, { setting, expectedType, receivedType }, lang);
        this.name = 'ConfigError';
    }
}

// Type union pour toutes les erreurs possibles
export type AppError = YouTubeAppError | PlayerAppError | CacheAppError | ConfigAppError;

// Type guard functions pour vérifier le type d'erreur
export const isYouTubeError = (error: unknown): error is YouTubeAppError => {
    return error instanceof YouTubeAppError;
};

export const isPlayerError = (error: unknown): error is PlayerAppError => {
    return error instanceof PlayerAppError;
};

export const isCacheError = (error: unknown): error is CacheAppError => {
    return error instanceof CacheAppError;
};

export const isConfigError = (error: unknown): error is ConfigAppError => {
    return error instanceof ConfigAppError;
};

export enum CommandErrorCode {
    NO_PLAYER = 'NO_PLAYER',
    INVALID_STATE = 'INVALID_STATE',
    PLAYBACK_ERROR = 'PLAYBACK_ERROR'
}

export class CommandError extends Error {
    constructor(
        public code: CommandErrorCode,
        public message: string,
        public details?: any
    ) {
        super(message);
        this.name = 'CommandError';
    }
}

export type MessageKey = keyof typeof ERROR_MESSAGE_KEYS;

// Factory pour créer les erreurs
export const createError = {
    youtube: (code: YouTubeErrorCode, videoId?: string, playerState?: number, lang: string = 'fr') => {
        const messageKeyMap: Record<YouTubeErrorCode, TranslationKey> = {
            [YouTubeErrorCode.VIDEO_NOT_FOUND]: 'error.youtube.videoNotFound',
            [YouTubeErrorCode.VIDEO_NOT_EMBEDDABLE]: 'error.youtube.notEmbeddable',
            [YouTubeErrorCode.VIDEO_REMOVED]: 'error.youtube.videoRemoved',
            [YouTubeErrorCode.PLAYBACK_DISABLED]: 'error.youtube.playbackDisabled',
            [YouTubeErrorCode.INVALID_PARAMETER]: 'error.youtube.invalidParameter',
            [YouTubeErrorCode.HTML5_ERROR]: 'error.youtube.html5Error'
        };
        return new YouTubeAppError(code, messageKeyMap[code], videoId, playerState, lang);
    },
    player: (code: PlayerErrorCode, currentTime?: number, lang: string = 'fr') => {
        const messageKeyMap: Record<PlayerErrorCode, TranslationKey> = {
            [PlayerErrorCode.MEDIA_ERR_ABORTED]: 'error.player.aborted',
            [PlayerErrorCode.MEDIA_ERR_NETWORK]: 'error.player.network',
            [PlayerErrorCode.MEDIA_ERR_DECODE]: 'error.player.decode',
            [PlayerErrorCode.MEDIA_ERR_SRC_NOT_SUPPORTED]: 'error.player.notSupported',
            [PlayerErrorCode.MEDIA_ERR_ENCRYPTED]: 'error.player.encrypted'
        };
        return new PlayerAppError(code, messageKeyMap[code], undefined, currentTime, lang);
    },
    cache: (code: CacheErrorCode, key?: string, size?: number, lang: string = 'fr') => {
        return new CacheAppError(code, ERROR_MESSAGE_KEYS[code], key, size, lang);
    },
    config: (code: ConfigErrorCode, setting?: string, expectedType?: string, receivedType?: string, lang: string = 'fr') => {
        return new ConfigAppError(code, ERROR_MESSAGE_KEYS[code], setting, expectedType, receivedType, lang);
    }
}; 
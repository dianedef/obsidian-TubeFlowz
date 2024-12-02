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
export interface BaseError extends Error {
    readonly code: AppErrorCode;
    readonly timestamp: number;
    readonly details?: Record<string, unknown>;
}

// Interface pour les erreurs YouTube
export enum YouTubeErrorCode {
    INVALID_PARAMETER = 2,
    HTML5_ERROR = 5,
    VIDEO_NOT_FOUND = 100,
    VIDEO_NOT_EMBEDDABLE = 101,
    VIDEO_REMOVED = 150
}

export interface YouTubeError extends BaseError {
    readonly code: YouTubeErrorCode;
    readonly videoId?: string;
    readonly playerState?: number;
}

// Interface pour les erreurs de lecture vidéo
export enum PlayerErrorCode {
    MEDIA_ERR_ABORTED = 1,
    MEDIA_ERR_NETWORK = 2,
    MEDIA_ERR_DECODE = 3,
    MEDIA_ERR_SRC_NOT_SUPPORTED = 4,
    MEDIA_ERR_ENCRYPTED = 5
}

export interface PlayerError extends BaseError {
    readonly code: PlayerErrorCode;
    readonly mediaError?: MediaError;
    readonly currentTime?: number;
}

// Interface pour les erreurs de cache
export enum CacheErrorCode {
    STORAGE_FULL = 'STORAGE_FULL',
    INVALID_DATA = 'INVALID_DATA',
    EXPIRED = 'EXPIRED',
    CORRUPTED = 'CORRUPTED',
    NOT_FOUND = 'NOT_FOUND'
}

export interface CacheError extends BaseError {
    readonly code: CacheErrorCode;
    readonly key?: string;
    readonly size?: number;
}

// Interface pour les erreurs de configuration
export enum ConfigErrorCode {
    INVALID_SETTINGS = 'INVALID_SETTINGS',
    MISSING_REQUIRED = 'MISSING_REQUIRED',
    TYPE_MISMATCH = 'TYPE_MISMATCH',
    VALIDATION_FAILED = 'VALIDATION_FAILED',
    INITIALIZATION = 'INITIALIZATION',
    INVALID_PARAMETER = 'INVALID_PARAMETER'
}

export interface ConfigError extends BaseError {
    readonly code: ConfigErrorCode;
    readonly setting?: string;
    readonly expectedType?: string;
    readonly receivedType?: string;
}

// Type union pour toutes les erreurs possibles
export type AppError = YouTubeError | PlayerError | CacheError | ConfigError;

// Type guard functions pour vérifier le type d'erreur
export const isYouTubeError = (error: unknown): error is YouTubeError => {
    return error instanceof Error && 'code' in error && typeof (error as YouTubeError).code === 'number';
};

export const isPlayerError = (error: unknown): error is PlayerError => {
    return error instanceof Error && 'code' in error && typeof (error as PlayerError).code === 'number';
};

export const isCacheError = (error: unknown): error is CacheError => {
    return error instanceof Error && 'code' in error && typeof (error as CacheError).code === 'string';
};

export const isConfigError = (error: unknown): error is ConfigError => {
    return error instanceof Error && 'code' in error && typeof (error as ConfigError).code === 'string';
}; 
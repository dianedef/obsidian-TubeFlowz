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
} from '../types/IErrors';
import { TranslationsService } from '../services/TranslationsService';

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
        const translationService = TranslationsService.getInstance();
        return new YouTubeAppError(
            code,
            translationService.getErrorMessage(code),
            { videoId }
        );
    }
}

// Classe pour les erreurs du lecteur
export class PlayerAppError extends BaseAppError implements IPlayerError {
    constructor(
        readonly code: PlayerErrorCode,
        message: string,
        readonly currentTime?: number,
        details?: Record<string, unknown>
    ) {
        super(code, message, details);
    }

    static fromErrorCode(code: PlayerErrorCode, currentTime?: number): PlayerAppError {
        const translationService = TranslationsService.getInstance();
        return new PlayerAppError(
            code,
            translationService.getErrorMessage(code),
            currentTime
        );
    }
}

// Classe pour les erreurs de cache
export class CacheAppError extends BaseAppError implements ICacheError {
    constructor(
        readonly code: CacheErrorCode,
        message: string,
        readonly key?: string,
        readonly size?: number,
        details?: Record<string, unknown>
    ) {
        super(code, message, details);
    }

    static fromErrorCode(code: CacheErrorCode, key?: string, size?: number): CacheAppError {
        const translationService = TranslationsService.getInstance();
        return new CacheAppError(
            code,
            translationService.getErrorMessage(code),
            key,
            size
        );
    }
}

// Classe pour les erreurs de configuration
export class ConfigAppError extends BaseAppError implements IConfigError {
    constructor(
        readonly code: ConfigErrorCode,
        message: string,
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
        const translationService = TranslationsService.getInstance();
        return new ConfigAppError(
            code,
            translationService.getErrorMessage(code),
            setting,
            expectedType,
            receivedType
        );
    }
}

// Fonction utilitaire pour créer des erreurs à partir des codes
export const createError = {
    youtube: YouTubeAppError.fromErrorCode,
    player: PlayerAppError.fromErrorCode,
    cache: CacheAppError.fromErrorCode,
    config: ConfigAppError.fromErrorCode
}; 
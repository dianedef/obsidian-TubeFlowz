import { describe, it, expect } from 'vitest';
import {
    YouTubeErrorCode,
    PlayerErrorCode,
    CacheErrorCode,
    ConfigErrorCode,
    isYouTubeError,
    isPlayerError,
    isCacheError,
    isConfigError,
    YouTubeAppError,
    PlayerAppError,
    CacheAppError,
    ConfigAppError
} from '../types/IErrors';

describe('Error Types', () => {
    describe('Type Guards', () => {
        it('should correctly identify YouTube errors', () => {
            const youtubeError = new YouTubeAppError(
                YouTubeErrorCode.VIDEO_NOT_FOUND,
                'VIDEO_NOT_FOUND',
                'abc123',
                0,
                'en'
            );
            
            const genericError = new Error('Generic error');
            
            expect(isYouTubeError(youtubeError)).toBe(true);
            expect(isYouTubeError(genericError)).toBe(false);
        });

        it('should correctly identify Player errors', () => {
            const playerError = new PlayerAppError(
                PlayerErrorCode.MEDIA_ERR_NETWORK,
                'MEDIA_ERR_NETWORK',
                undefined,
                123.45,
                'en'
            );
            
            expect(isPlayerError(playerError)).toBe(true);
            expect(isPlayerError(new Error())).toBe(false);
        });

        it('should correctly identify Cache errors', () => {
            const cacheError = new CacheAppError(
                CacheErrorCode.STORAGE_FULL,
                'STORAGE_FULL',
                'testKey',
                1024,
                'en'
            );
            
            expect(isCacheError(cacheError)).toBe(true);
            expect(isCacheError(new Error())).toBe(false);
        });

        it('should correctly identify Config errors', () => {
            const configError = new ConfigAppError(
                ConfigErrorCode.TYPE_MISMATCH,
                'TYPE_MISMATCH',
                'volume',
                'number',
                'string',
                'en'
            );
            
            expect(isConfigError(configError)).toBe(true);
            expect(isConfigError(new Error())).toBe(false);
        });
    });

    describe('Error Properties', () => {
        it('should have correct YouTube error properties', () => {
            const youtubeError = new YouTubeAppError(
                YouTubeErrorCode.VIDEO_NOT_FOUND,
                'VIDEO_NOT_FOUND',
                'abc123',
                0,
                'en'
            );

            expect(youtubeError).toHaveProperty('code', YouTubeErrorCode.VIDEO_NOT_FOUND);
            expect(youtubeError).toHaveProperty('timestamp');
            expect(youtubeError).toHaveProperty('videoId', 'abc123');
            expect(youtubeError).toHaveProperty('playerState', 0);
            expect(youtubeError).toHaveProperty('name', 'YouTubeError');
            expect(youtubeError.message).toBe('Video not found');
        });

        it('should have correct Player error properties', () => {
            const playerError = new PlayerAppError(
                PlayerErrorCode.MEDIA_ERR_NETWORK,
                'MEDIA_ERR_NETWORK',
                undefined,
                123.45,
                'en'
            );

            expect(playerError).toHaveProperty('code', PlayerErrorCode.MEDIA_ERR_NETWORK);
            expect(playerError).toHaveProperty('timestamp');
            expect(playerError).toHaveProperty('currentTime', 123.45);
            expect(playerError).toHaveProperty('name', 'PlayerError');
            expect(playerError.message).toBe('Network error');
        });

        it('should have correct Cache error properties', () => {
            const cacheError = new CacheAppError(
                CacheErrorCode.STORAGE_FULL,
                'STORAGE_FULL',
                'testKey',
                1024,
                'en'
            );

            expect(cacheError).toHaveProperty('code', CacheErrorCode.STORAGE_FULL);
            expect(cacheError).toHaveProperty('timestamp');
            expect(cacheError).toHaveProperty('key', 'testKey');
            expect(cacheError).toHaveProperty('size', 1024);
            expect(cacheError).toHaveProperty('name', 'CacheError');
            expect(cacheError.message).toBe('Storage is full');
        });

        it('should have correct Config error properties', () => {
            const configError = new ConfigAppError(
                ConfigErrorCode.TYPE_MISMATCH,
                'TYPE_MISMATCH',
                'volume',
                'number',
                'string',
                'en'
            );

            expect(configError).toHaveProperty('code', ConfigErrorCode.TYPE_MISMATCH);
            expect(configError).toHaveProperty('timestamp');
            expect(configError).toHaveProperty('setting', 'volume');
            expect(configError).toHaveProperty('expectedType', 'number');
            expect(configError).toHaveProperty('receivedType', 'string');
            expect(configError).toHaveProperty('name', 'ConfigError');
            expect(configError.message).toBe('Type mismatch');
        });
    });

    describe('Error Codes', () => {
        it('should have all required YouTube error codes', () => {
            expect(YouTubeErrorCode.INVALID_PARAMETER).toBe(2);
            expect(YouTubeErrorCode.HTML5_ERROR).toBe(5);
            expect(YouTubeErrorCode.VIDEO_NOT_FOUND).toBe(100);
            expect(YouTubeErrorCode.VIDEO_NOT_EMBEDDABLE).toBe(101);
            expect(YouTubeErrorCode.VIDEO_REMOVED).toBe(150);
        });

        it('should have all required Player error codes', () => {
            expect(PlayerErrorCode.MEDIA_ERR_ABORTED).toBe(1);
            expect(PlayerErrorCode.MEDIA_ERR_NETWORK).toBe(2);
            expect(PlayerErrorCode.MEDIA_ERR_DECODE).toBe(3);
            expect(PlayerErrorCode.MEDIA_ERR_SRC_NOT_SUPPORTED).toBe(4);
            expect(PlayerErrorCode.MEDIA_ERR_ENCRYPTED).toBe(5);
        });

        it('should have all required Cache error codes', () => {
            expect(CacheErrorCode.STORAGE_FULL).toBe('STORAGE_FULL');
            expect(CacheErrorCode.INVALID_DATA).toBe('INVALID_DATA');
            expect(CacheErrorCode.EXPIRED).toBe('EXPIRED');
            expect(CacheErrorCode.CORRUPTED).toBe('CORRUPTED');
        });

        it('should have all required Config error codes', () => {
            expect(ConfigErrorCode.INVALID_SETTINGS).toBe('INVALID_SETTINGS');
            expect(ConfigErrorCode.MISSING_REQUIRED).toBe('MISSING_REQUIRED');
            expect(ConfigErrorCode.TYPE_MISMATCH).toBe('TYPE_MISMATCH');
            expect(ConfigErrorCode.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
        });
    });

    describe('Internationalization', () => {
        it('should handle French error messages', () => {
            const youtubeError = new YouTubeAppError(
                YouTubeErrorCode.VIDEO_NOT_FOUND,
                'VIDEO_NOT_FOUND',
                'abc123',
                0,
                'fr'
            );
            expect(youtubeError.message).toBe('Vidéo YouTube non trouvée');
        });

        it('should fallback to English for unknown language', () => {
            const playerError = new PlayerAppError(
                PlayerErrorCode.MEDIA_ERR_NETWORK,
                'MEDIA_ERR_NETWORK',
                undefined,
                123.45,
                'en'
            );
            expect(playerError.message).toBe('Network error');
        });
    });
}); 
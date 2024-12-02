import { describe, it, expect } from 'vitest';
import {
    AppErrorCode,
    YouTubeErrorCode,
    PlayerErrorCode,
    CacheErrorCode,
    ConfigErrorCode,
    isYouTubeError,
    isPlayerError,
    isCacheError,
    isConfigError,
    type YouTubeError,
    type PlayerError,
    type CacheError,
    type ConfigError
} from '../types/errors';

describe('Error Types', () => {
    describe('Type Guards', () => {
        it('should correctly identify YouTube errors', () => {
            const youtubeError: YouTubeError = {
                name: 'YouTubeError',
                message: 'Video not found',
                code: YouTubeErrorCode.VIDEO_NOT_FOUND,
                timestamp: Date.now(),
                videoId: 'abc123'
            };
            
            const genericError = new Error('Generic error');
            
            expect(isYouTubeError(youtubeError)).toBe(true);
            expect(isYouTubeError(genericError)).toBe(false);
        });

        it('should correctly identify Player errors', () => {
            const playerError: PlayerError = {
                name: 'PlayerError',
                message: 'Network error',
                code: PlayerErrorCode.MEDIA_ERR_NETWORK,
                timestamp: Date.now(),
                currentTime: 123.45
            };
            
            expect(isPlayerError(playerError)).toBe(true);
            expect(isPlayerError(new Error())).toBe(false);
        });

        it('should correctly identify Cache errors', () => {
            const cacheError: CacheError = {
                name: 'CacheError',
                message: 'Storage is full',
                code: CacheErrorCode.STORAGE_FULL,
                timestamp: Date.now(),
                size: 1024
            };
            
            expect(isCacheError(cacheError)).toBe(true);
            expect(isCacheError(new Error())).toBe(false);
        });

        it('should correctly identify Config errors', () => {
            const configError: ConfigError = {
                name: 'ConfigError',
                message: 'Invalid setting type',
                code: ConfigErrorCode.TYPE_MISMATCH,
                timestamp: Date.now(),
                setting: 'volume',
                expectedType: 'number',
                receivedType: 'string'
            };
            
            expect(isConfigError(configError)).toBe(true);
            expect(isConfigError(new Error())).toBe(false);
        });
    });

    describe('Error Properties', () => {
        it('should have correct YouTube error properties', () => {
            const youtubeError: YouTubeError = {
                name: 'YouTubeError',
                message: 'Video not found',
                code: YouTubeErrorCode.VIDEO_NOT_FOUND,
                timestamp: Date.now(),
                videoId: 'abc123',
                playerState: 0
            };

            expect(youtubeError).toHaveProperty('code');
            expect(youtubeError).toHaveProperty('timestamp');
            expect(youtubeError).toHaveProperty('videoId');
            expect(youtubeError).toHaveProperty('playerState');
        });

        it('should have correct Player error properties', () => {
            const playerError: PlayerError = {
                name: 'PlayerError',
                message: 'Network error',
                code: PlayerErrorCode.MEDIA_ERR_NETWORK,
                timestamp: Date.now(),
                currentTime: 123.45
            };

            expect(playerError).toHaveProperty('code');
            expect(playerError).toHaveProperty('timestamp');
            expect(playerError).toHaveProperty('currentTime');
        });

        it('should have correct Cache error properties', () => {
            const cacheError: CacheError = {
                name: 'CacheError',
                message: 'Storage is full',
                code: CacheErrorCode.STORAGE_FULL,
                timestamp: Date.now(),
                key: 'testKey',
                size: 1024
            };

            expect(cacheError).toHaveProperty('code');
            expect(cacheError).toHaveProperty('timestamp');
            expect(cacheError).toHaveProperty('key');
            expect(cacheError).toHaveProperty('size');
        });

        it('should have correct Config error properties', () => {
            const configError: ConfigError = {
                name: 'ConfigError',
                message: 'Invalid setting type',
                code: ConfigErrorCode.TYPE_MISMATCH,
                timestamp: Date.now(),
                setting: 'volume',
                expectedType: 'number',
                receivedType: 'string'
            };

            expect(configError).toHaveProperty('code');
            expect(configError).toHaveProperty('timestamp');
            expect(configError).toHaveProperty('setting');
            expect(configError).toHaveProperty('expectedType');
            expect(configError).toHaveProperty('receivedType');
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
}); 
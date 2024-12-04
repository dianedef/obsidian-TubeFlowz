import { describe, it, expect } from 'vitest';
import {
    YouTubeAppError,
    PlayerAppError,
    CacheAppError,
    ConfigAppError,
    createError
} from '../core/errors/ErrorClasses';
import {
    YouTubeErrorCode,
    PlayerErrorCode,
    CacheErrorCode,
    ConfigErrorCode
} from '../types/IErrors';

describe('Error Classes', () => {
    describe('YouTubeAppError', () => {
        it('should create YouTube error with constructor', () => {
            const error = new YouTubeAppError(
                'Test error',
                YouTubeErrorCode.VIDEO_NOT_FOUND,
                'abc123'
            );

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(YouTubeAppError);
            expect(error.message).toBe('Test error');
            expect(error.code).toBe(YouTubeErrorCode.VIDEO_NOT_FOUND);
            expect(error.videoId).toBe('abc123');
            expect(error.timestamp).toBeTypeOf('number');
        });

        it('should create YouTube error with factory method', () => {
            const error = createError.youtube(YouTubeErrorCode.VIDEO_NOT_FOUND, 'abc123');

            expect(error).toBeInstanceOf(YouTubeAppError);
            expect(error.code).toBe(YouTubeErrorCode.VIDEO_NOT_FOUND);
            expect(error.videoId).toBe('abc123');
            expect(error.message).toBe('Vidéo YouTube non trouvée');
        });
    });

    describe('PlayerAppError', () => {
        it('should create Player error with constructor', () => {
            const error = new PlayerAppError(
                'Test error',
                PlayerErrorCode.MEDIA_ERR_NETWORK,
                undefined,
                123.45
            );

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(PlayerAppError);
            expect(error.message).toBe('Test error');
            expect(error.code).toBe(PlayerErrorCode.MEDIA_ERR_NETWORK);
            expect(error.currentTime).toBe(123.45);
            expect(error.timestamp).toBeTypeOf('number');
        });

        it('should create Player error with factory method', () => {
            const error = createError.player(PlayerErrorCode.MEDIA_ERR_NETWORK, 123.45);

            expect(error).toBeInstanceOf(PlayerAppError);
            expect(error.code).toBe(PlayerErrorCode.MEDIA_ERR_NETWORK);
            expect(error.currentTime).toBe(123.45);
            expect(error.message).toBe('Erreur réseau lors de la lecture');
        });
    });

    describe('CacheAppError', () => {
        it('should create Cache error with constructor', () => {
            const error = new CacheAppError(
                'Test error',
                CacheErrorCode.STORAGE_FULL,
                'testKey',
                1024
            );

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(CacheAppError);
            expect(error.message).toBe('Test error');
            expect(error.code).toBe(CacheErrorCode.STORAGE_FULL);
            expect(error.key).toBe('testKey');
            expect(error.size).toBe(1024);
            expect(error.timestamp).toBeTypeOf('number');
        });

        it('should create Cache error with factory method', () => {
            const error = createError.cache(CacheErrorCode.STORAGE_FULL, 'testKey', 1024);

            expect(error).toBeInstanceOf(CacheAppError);
            expect(error.code).toBe(CacheErrorCode.STORAGE_FULL);
            expect(error.key).toBe('testKey');
            expect(error.size).toBe(1024);
            expect(error.message).toBe('Le stockage est plein');
        });
    });

    describe('ConfigAppError', () => {
        it('should create Config error with constructor', () => {
            const error = new ConfigAppError(
                'Test error',
                ConfigErrorCode.TYPE_MISMATCH,
                'volume',
                'number',
                'string'
            );

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(ConfigAppError);
            expect(error.message).toBe('Test error');
            expect(error.code).toBe(ConfigErrorCode.TYPE_MISMATCH);
            expect(error.setting).toBe('volume');
            expect(error.expectedType).toBe('number');
            expect(error.receivedType).toBe('string');
            expect(error.timestamp).toBeTypeOf('number');
        });

        it('should create Config error with factory method', () => {
            const error = createError.config(
                ConfigErrorCode.TYPE_MISMATCH,
                'volume',
                'number',
                'string'
            );

            expect(error).toBeInstanceOf(ConfigAppError);
            expect(error.code).toBe(ConfigErrorCode.TYPE_MISMATCH);
            expect(error.setting).toBe('volume');
            expect(error.expectedType).toBe('number');
            expect(error.receivedType).toBe('string');
            expect(error.message).toBe('Type de paramètre incorrect');
        });
    });

    describe('Error Details', () => {
        it('should handle additional details in errors', () => {
            const details = { additionalInfo: 'test info' };
            const error = new YouTubeAppError(
                'Test error',
                YouTubeErrorCode.VIDEO_NOT_FOUND,
                'abc123',
                0,
                details
            );

            expect(error.details).toEqual(details);
        });
    });
}); 
import { describe, it, expect } from 'vitest';
import {
    YouTubeAppError,
    PlayerAppError,
    CacheAppError,
    ConfigAppError,
    createError,
    YouTubeErrorCode,
    PlayerErrorCode,
    CacheErrorCode,
    ConfigErrorCode
} from "../types/IErrors";
import { TranslationsService } from '../services/TranslationsService';

describe('Error Classes', () => {
    beforeAll(() => {
        TranslationsService.initialize('fr');
    });

    describe('YouTubeAppError', () => {
        it('should create YouTube error with constructor', () => {
            const error = new YouTubeAppError(
                YouTubeErrorCode.VIDEO_NOT_FOUND,
                'error.youtube.videoNotFound',
                'abc123',
                0,
                'fr'
            );

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(YouTubeAppError);
            expect(error.message).toBe('Vidéo YouTube non trouvée');
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
                PlayerErrorCode.MEDIA_ERR_NETWORK,
                'error.player.network',
                undefined,
                123.45,
                'fr'
            );

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(PlayerAppError);
            expect(error.message).toBe('Erreur réseau lors de la lecture');
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
                CacheErrorCode.STORAGE_FULL,
                'error.cache.storageFull',
                'testKey',
                1024,
                'fr'
            );

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(CacheAppError);
            expect(error.message).toBe('Stockage plein');
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
            expect(error.message).toBe('Stockage plein');
        });
    });

    describe('ConfigAppError', () => {
        it('should create Config error with constructor', () => {
            const error = new ConfigAppError(
                ConfigErrorCode.TYPE_MISMATCH,
                'error.config.typeMismatch',
                'volume',
                'number',
                'string',
                'fr'
            );

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(ConfigAppError);
            expect(error.message).toBe('Type incompatible');
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
            expect(error.message).toBe('Type incompatible');
        });
    });
}); 
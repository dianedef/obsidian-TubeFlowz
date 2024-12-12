import { describe, it, expect } from 'vitest';
import {
    YouTubeErrorCode,
    PlayerErrorCode,
    YouTubeAppError,
    PlayerAppError
} from '../types/IErrors';
import { TranslationsService } from '../services/TranslationsService';

describe('Error Types', () => {
    beforeAll(() => {
        TranslationsService.initialize('en');
    });

    describe('Error Properties', () => {
        it('should have correct YouTube error properties', () => {
            const youtubeError = new YouTubeAppError(
                YouTubeErrorCode.VIDEO_NOT_FOUND,
                'error.youtube.videoNotFound',
                'abc123',
                0,
                'en'
            );

            expect(youtubeError).toHaveProperty('code', YouTubeErrorCode.VIDEO_NOT_FOUND);
            expect(youtubeError).toHaveProperty('videoId', 'abc123');
            expect(youtubeError).toHaveProperty('playerState', 0);
            expect(youtubeError.message).toBe('Video not found');
        });

        it('should have correct Player error properties', () => {
            const playerError = new PlayerAppError(
                PlayerErrorCode.MEDIA_ERR_NETWORK,
                'error.player.network',
                undefined,
                123.45,
                'en'
            );

            expect(playerError).toHaveProperty('code', PlayerErrorCode.MEDIA_ERR_NETWORK);
            expect(playerError).toHaveProperty('currentTime', 123.45);
            expect(playerError.message).toBe('Network error');
        });
    });

    describe('Internationalization', () => {
        it('should handle French error messages', () => {
            const youtubeError = new YouTubeAppError(
                YouTubeErrorCode.VIDEO_NOT_FOUND,
                'error.youtube.videoNotFound',
                'abc123',
                0,
                'fr'
            );
            expect(youtubeError.message).toBe('Vidéo YouTube non trouvée');
        });

        it('should fallback to English for unknown language', () => {
            const playerError = new PlayerAppError(
                PlayerErrorCode.MEDIA_ERR_NETWORK,
                'error.player.network',
                undefined,
                123.45,
                'xx'
            );
            expect(playerError.message).toBe('Network error');
        });
    });
}); 
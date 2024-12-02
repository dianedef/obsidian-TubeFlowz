import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { YouTubeService } from '../../services/youtube/YouTubeService';
import { eventBus } from '../../core/EventBus';
import { Volume, PlaybackRate, createVolume, createPlaybackRate } from '../../types/settings';
import { videojsMock, obsidianMock } from '../setup';
import type { VideoJsPlayer, MethodCall } from '../setup';

describe('EventBus Integration Tests', () => {
    let service: YouTubeService;
    let container: HTMLElement;
    let player: VideoJsPlayer;

    beforeEach(async () => {
        document.body.innerHTML = '';
        container = document.createElement('div');
        document.body.appendChild(container);
        service = YouTubeService.getInstance(obsidianMock);
        player = videojsMock.player;
        await service.initialize(container);
    });

    afterEach(() => {
        service.destroy();
        eventBus.clear();
    });

    describe('YouTubeService and EventBus Integration', () => {
        it('should propagate video load events', async () => {
            let receivedVideoId: string | null = null;
            eventBus.on('video:load', (videoId) => {
                receivedVideoId = videoId;
            });

            await service.loadVideo('test123');
            expect(receivedVideoId).toBe('test123');
        });

        it('should propagate volume changes', async () => {
            let receivedVolume: { volume: Volume; isMuted: boolean } | null = null;
            eventBus.on('video:volumeChange', (payload) => {
                receivedVolume = payload;
            });

            const rawVolume = 0.5;
            const volumeValue = createVolume(rawVolume);
            player.volume.callsFake(() => rawVolume);
            player.muted.callsFake(() => false);
            
            service.setVolume(volumeValue);
            
            // Déclencher l'événement volumechange
            const callback = player.on.getCalls().find((call: MethodCall) => call.args[0] === 'volumechange')?.args[1];
            if (callback) callback();

            expect(receivedVolume).toEqual({
                volume: volumeValue,
                isMuted: false
            });
        });

        it('should propagate playback rate changes', async () => {
            let receivedRate: PlaybackRate | null = null;
            eventBus.on('video:rateChange', (rate) => {
                receivedRate = rate;
            });

            const rawRate = 1.5;
            const rateValue = createPlaybackRate(rawRate);
            player.playbackRate.callsFake(() => rawRate);
            
            service.setPlaybackRate(rateValue);
            
            // Déclencher l'événement ratechange
            const callback = player.on.getCalls().find((call: MethodCall) => call.args[0] === 'ratechange')?.args[1];
            if (callback) callback();

            expect(receivedRate).toBe(rateValue);
        });

        it('should handle multiple event subscriptions', async () => {
            const events: string[] = [];
            
            eventBus.on('video:play', () => events.push('play'));
            eventBus.on('video:pause', () => events.push('pause'));
            
            service.play();
            const playCallback = player.on.getCalls().find((call: MethodCall) => call.args[0] === 'play')?.args[1];
            if (playCallback) playCallback();
            
            service.pause();
            const pauseCallback = player.on.getCalls().find((call: MethodCall) => call.args[0] === 'pause')?.args[1];
            if (pauseCallback) pauseCallback();

            expect(events).toEqual(['play', 'pause']);
        });

        it('should maintain event order', async () => {
            const events: string[] = [];
            
            eventBus.on('video:load', () => events.push('load'));
            eventBus.on('video:play', () => events.push('play'));
            eventBus.on('video:pause', () => events.push('pause'));
            
            await service.loadVideo('test123');
            
            service.play();
            const playCallback = player.on.getCalls().find((call: MethodCall) => call.args[0] === 'play')?.args[1];
            if (playCallback) playCallback();
            
            service.pause();
            const pauseCallback = player.on.getCalls().find((call: MethodCall) => call.args[0] === 'pause')?.args[1];
            if (pauseCallback) pauseCallback();

            expect(events).toEqual(['load', 'play', 'pause']);
        });

        it('should clean up event listeners', async () => {
            const events: string[] = [];
            
            eventBus.on('video:play', () => events.push('play'));
            
            service.play();
            const playCallback = player.on.getCalls().find((call: MethodCall) => call.args[0] === 'play')?.args[1];
            if (playCallback) playCallback();
            
            expect(events).toEqual(['play']);
            
            events.length = 0;
            eventBus.clear();
            
            service.play();
            if (playCallback) playCallback();
            
            expect(events).toEqual([]);
        });
    });
}); 
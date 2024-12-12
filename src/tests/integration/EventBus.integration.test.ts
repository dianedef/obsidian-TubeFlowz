import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { YouTubeService } from '../../services/YouTubeService';
import { eventBus } from '../../services/EventBus';
import { Volume, PlaybackRate, createVolume, createPlaybackRate } from '../../types/ISettings';
import { videojsMock, obsidianMock } from '../setup';
import type { VideoJsPlayer, MethodCall } from '../setup';

describe('EventBus Integration Tests', () => {
    let service: YouTubeService;
    let player: VideoJsPlayer;
    let container: HTMLElement;

    beforeEach(async () => {
        document.body.innerHTML = '';
        container = document.createElement('div');
        document.body.appendChild(container);
        service = YouTubeService.getInstance(obsidianMock);
        player = videojsMock.player;
        
        // Configurer le mock de ready
        player.ready.callsFake((callback) => {
            callback();
            return player;
        });
        
        (service as any).container = container;
        await service.initialize();
        
        // Réinitialiser eventBus
        eventBus.clear();
    });

    afterEach(async () => {
        await service.dispose();
        eventBus.clear();
    });

    it('should propagate video load events', async () => {
        const videoId = 'test123';
        let receivedVideoId: string | null = null;
        
        const handler = (data: string) => {
            receivedVideoId = data;
        };
        
        eventBus.on('video:load', handler);
        await service.handleLoadVideo(videoId);
        
        expect(receivedVideoId).toBe(videoId);
    });

    it('should propagate playback rate changes', async () => {
        const rawRate = 1.5;
        let receivedRate: number | null = null;
        
        const handler = (data: number) => {
            receivedRate = data;
        };
        
        eventBus.on('video:rateChange', handler);
        player.playbackRate.returns(rawRate);
        service.setPlaybackRate(createPlaybackRate(rawRate));

        expect(receivedRate).toBe(rawRate);
    });

    it('should handle multiple event subscriptions', async () => {
        const events: string[] = [];
        
        const playHandler = () => events.push('play');
        const pauseHandler = () => events.push('pause');
        
        eventBus.on('video:play', playHandler);
        eventBus.on('video:pause', pauseHandler);
        
        // Simuler play
        service.play();
        const playCallback = player.on.getCalls()
            .find((call: MethodCall) => call.args[0] === 'play')?.args[1];
        if (playCallback) playCallback();
        
        // Simuler pause
        service.pause();
        const pauseCallback = player.on.getCalls()
            .find((call: MethodCall) => call.args[0] === 'pause')?.args[1];
        if (pauseCallback) pauseCallback();

        expect(events).toEqual(['play', 'pause']);
        
        eventBus.off('video:play', playHandler);
        eventBus.off('video:pause', pauseHandler);
    });

    it('should maintain event order', async () => {
        const events: string[] = [];
        
        const loadHandler = () => events.push('load');
        const playHandler = () => events.push('play');
        const pauseHandler = () => events.push('pause');
        
        eventBus.on('video:load', loadHandler);
        eventBus.on('video:play', playHandler);
        eventBus.on('video:pause', pauseHandler);
        
        // Simuler load
        await service.loadVideo('test123');
        
        // Simuler play
        service.play();
        const playCallback = player.on.getCalls()
            .find((call: MethodCall) => call.args[0] === 'play')?.args[1];
        if (playCallback) playCallback();
        
        // Simuler pause
        service.pause();
        const pauseCallback = player.on.getCalls()
            .find((call: MethodCall) => call.args[0] === 'pause')?.args[1];
        if (pauseCallback) pauseCallback();

        expect(events).toEqual(['load', 'play', 'pause']);
        
        eventBus.off('video:load', loadHandler);
        eventBus.off('video:play', playHandler);
        eventBus.off('video:pause', pauseHandler);
    });

    it('should clean up event listeners', async () => {
        const events: string[] = [];
        
        const playHandler = () => events.push('play');
        eventBus.on('video:play', playHandler);
        
        // Simuler play avant dispose
        service.play();
        const playCallback = player.on.getCalls()
            .find((call: MethodCall) => call.args[0] === 'play')?.args[1];
        if (playCallback) playCallback();

        expect(events).toEqual(['play']);

        // Nettoyer les événements
        events.length = 0;
        await service.dispose();

        // Simuler play après dispose
        service.play();
        if (playCallback) playCallback();

        // Aucun événement ne devrait être émis après dispose
        expect(events).toEqual([]);
        
        eventBus.off('video:play', playHandler);
    });
}); 
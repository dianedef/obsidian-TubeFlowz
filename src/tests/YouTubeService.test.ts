import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { YouTubeService } from '../services/youtube/YouTubeService';
import { eventBus } from '../core/EventBus';
import { createVolume, createPlaybackRate } from '../types/settings';
import { videojsMock, obsidianMock } from './setup';
import type { VideoJsPlayer, MethodCall } from './setup';
import sinon from 'sinon';

describe('YouTubeService', () => {
    let service: YouTubeService;
    let container: HTMLElement;
    let player: VideoJsPlayer;
    let eventSpy: any;

    beforeEach(async () => {
        // Réinitialiser le DOM
        document.body.innerHTML = '';
        container = document.createElement('div');
        document.body.appendChild(container);

        // Réinitialiser le service et les mocks
        service = YouTubeService.getInstance(obsidianMock);
        player = videojsMock.player;
        
        // Créer un spy pour eventBus.emit
        eventSpy = vi.spyOn(eventBus, 'emit');
        
        // Initialiser le service
        await service.initialize(container);
        
        // Réinitialiser l'historique des appels
        eventSpy.mockClear();
    });

    afterEach(() => {
        service.destroy();
        eventBus.clear();
        vi.clearAllMocks();
    });

    describe('Initialization', () => {
        it('should create a singleton instance', () => {
            const instance1 = YouTubeService.getInstance(obsidianMock);
            const instance2 = YouTubeService.getInstance(obsidianMock);
            expect(instance1).toBe(instance2);
        });

        it('should initialize with a container', async () => {
            const newService = YouTubeService.getInstance(obsidianMock);
            await newService.initialize(container);
            expect(container.querySelector('.video-js')).toBeTruthy();
            expect(videojsMock.videojs.called).toBeTruthy();
        });

        it('should throw if initialized without container', async () => {
            const newService = YouTubeService.getInstance(obsidianMock);
            await expect(newService.initialize(null))
                .rejects.toThrow('Playback aborted');
        });

        it('should setup event listeners on initialization', async () => {
            const newService = YouTubeService.getInstance(obsidianMock);
            await newService.initialize(container);
            
            expect(player.on.calledWith('play')).toBeTruthy();
            expect(player.on.calledWith('pause')).toBeTruthy();
            expect(player.on.calledWith('timeupdate')).toBeTruthy();
            expect(player.on.calledWith('volumechange')).toBeTruthy();
            expect(player.on.calledWith('ratechange')).toBeTruthy();
            expect(player.on.calledWith('error')).toBeTruthy();
        });
    });

    describe('Video Controls', () => {
        it('should load video with correct URL', async () => {
            const videoId = 'test123';
            await service.loadVideo(videoId);
            
            expect(player.src.calledWith({
                type: 'video/youtube',
                src: `https://www.youtube.com/watch?v=${videoId}`
            })).toBeTruthy();
            
            expect(eventSpy).toHaveBeenCalledWith('video:load', videoId);
        });

        it('should load video with timestamp', async () => {
            const videoId = 'test123';
            const timestamp = 30;
            await service.loadVideo(videoId, timestamp);
            
            expect(player.currentTime.calledWith(timestamp)).toBeTruthy();
        });

        it('should handle volume changes', () => {
            const rawVolume = 0.5;
            const volumeValue = createVolume(rawVolume);
            service.setVolume(volumeValue);
            
            // Pour YouTube, le volume est converti en 0 ou 1
            const youtubeVolume = rawVolume > 0 ? 1 : 0;
            expect(player.volume.calledWith(rawVolume)).toBeTruthy();
            
            // Simuler un changement de volume
            player.volume.callsFake(() => rawVolume);
            player.muted.callsFake(() => false);
            
            // Déclencher l'événement après avoir configuré les retours
            const callback = player.on.getCalls().find((call: MethodCall) => call.args[0] === 'volumechange')?.args[1];
            if (callback) callback();
            
            expect(eventSpy).toHaveBeenCalledWith('video:volumeChange', {
                volume: volumeValue,
                isMuted: false
            });
        });

        it('should handle volume being set to zero', () => {
            const rawVolume = 0;
            const volumeValue = createVolume(rawVolume);
            service.setVolume(volumeValue);
            
            // Vérifie que le volume YouTube est bien 0
            expect(player.volume.calledWith(0)).toBeTruthy();
            
            // Simuler un changement de volume
            player.volume.callsFake(() => rawVolume);
            player.muted.callsFake(() => false);
            
            // Déclencher l'événement après avoir configuré les retours
            const callback = player.on.getCalls().find((call: MethodCall) => call.args[0] === 'volumechange')?.args[1];
            if (callback) callback();
            
            expect(eventSpy).toHaveBeenCalledWith('video:volumeChange', {
                volume: volumeValue,
                isMuted: false
            });
        });

        it('should handle playback rate changes', () => {
            const rawRate = 1.5;
            const rateValue = createPlaybackRate(rawRate);
            service.setPlaybackRate(rateValue);
            
            expect(player.playbackRate.calledWith(rawRate)).toBeTruthy();
            
            // Simuler un changement de vitesse
            player.playbackRate.callsFake(() => rawRate);
            
            // Déclencher l'événement après avoir configuré les retours
            const callback = player.on.getCalls().find((call: MethodCall) => call.args[0] === 'ratechange')?.args[1];
            if (callback) callback();
            
            expect(eventSpy).toHaveBeenCalledWith('video:rateChange', rateValue);
        });

        it('should handle play/pause', () => {
            service.play();
            expect(player.play.called).toBeTruthy();
            
            // Déclencher l'événement play
            const playCallback = player.on.getCalls().find((call: MethodCall) => call.args[0] === 'play')?.args[1];
            if (playCallback) playCallback();
            
            expect(eventSpy).toHaveBeenCalledWith('video:play');
            
            service.pause();
            expect(player.pause.called).toBeTruthy();
            
            // Déclencher l'événement pause
            const pauseCallback = player.on.getCalls().find((call: MethodCall) => call.args[0] === 'pause')?.args[1];
            if (pauseCallback) pauseCallback();
            
            expect(eventSpy).toHaveBeenCalledWith('video:pause');
        });
    });

    describe('Error Handling', () => {
        it('should handle player errors', () => {
            const mockError = {
                code: 2,
                message: 'Network error',
                type: 'MEDIA_ERR_NETWORK'
            };

            player.error.callsFake(() => mockError);
            
            // Déclencher l'événement error
            const callback = player.on.getCalls().find((call: MethodCall) => call.args[0] === 'error')?.args[1];
            if (callback) callback();

            expect(eventSpy).toHaveBeenCalledWith('video:error', {
                code: '2',
                message: 'Network error',
                type: 'MEDIA_ERR_NETWORK'
            });
        });

        it('should handle video load errors', async () => {
            player.src.rejects(new Error('Failed to load'));
            await expect(service.loadVideo('test123')).rejects.toThrow('Failed to load video');
        });
    });

    describe('Cleanup', () => {
        it('should clean up resources on destroy', () => {
            service.destroy();
            
            expect(player.dispose.called).toBeTruthy();
            expect((service as any).player).toBeNull();
            expect((service as any).container).toBeNull();
            expect((service as any).resizeObserver).toBeNull();
        });
    });

    describe('Video Quality', () => {
        it('should handle quality changes', () => {
            // Simuler un changement de qualité
            player.videoHeight.returns(720);
            
            // Déclencher l'événement qualitychange
            const callback = player.on.getCalls().find((call: MethodCall) => call.args[0] === 'qualitychange')?.args[1];
            if (callback) callback();
            
            expect(eventSpy).toHaveBeenCalledWith('video:qualityChange', '720p');
        });

        it('should default to auto quality when height is not available', () => {
            // Simuler l'absence de hauteur vidéo
            player.videoHeight.returns(0);
            
            // Déclencher l'événement qualitychange
            const callback = player.on.getCalls().find((call: MethodCall) => call.args[0] === 'qualitychange')?.args[1];
            if (callback) callback();
            
            expect(eventSpy).toHaveBeenCalledWith('video:qualityChange', 'auto');
        });
    });
}); 
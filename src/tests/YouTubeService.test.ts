import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { YouTubeService } from '../services/YouTubeService';
import { eventBus } from '../services/EventBus';
import { createVolume, createPlaybackRate } from '../types/ISettings';
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
        
        // Définir le container
        (service as any).container = container;
        
        // Configurer le mock de ready
        player.ready.callsFake((callback) => {
            callback();
            return player;
        });
        
        // Initialiser le service
        await service.initialize();
        
        // Réinitialiser l'historique des appels
        eventSpy.mockClear();
    });

    afterEach(async () => {
        await service.dispose();
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
            (newService as any).container = container;
            await newService.initialize();
            expect(container.querySelector('.video-js')).toBeTruthy();
            expect(videojsMock.videojs.called).toBeTruthy();
        });

        it('should throw if initialized without container', async () => {
            const newService = YouTubeService.getInstance(obsidianMock);
            (newService as any).container = null;
            await expect(newService.initialize())
                .rejects.toThrow('Playback aborted');
        });

        it('should setup event listeners on initialization', async () => {
            const newService = YouTubeService.getInstance(obsidianMock);
            (newService as any).container = container;
            await newService.initialize();
            
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
        it('should handle player errors', async () => {
            const mockError = {
                code: 2,
                type: 'MEDIA_ERR_NETWORK'
            };

            // Configurer le mock avant l'initialisation
            player.error = sinon.stub().returns(mockError);
            
            // Initialiser le service avec le player
            await service.initialize();

            // Vérifier que le player est initialisé
            expect((service as any).player).toBeDefined();
            
            // Simuler une erreur
            const errorCallback = player.on.getCalls()
                .find((call: MethodCall) => call.args[0] === 'error')
                ?.args[1];
            
            if (!errorCallback) {
                throw new Error('Error callback not found');
            }

            // Déclencher l'erreur
            errorCallback();

            // Vérifier que l'événement a été émis
            expect(eventSpy).toHaveBeenCalledWith('video:error', {
                code: '2',
                type: 'MEDIA_ERR_NETWORK'
            });
        });

        it('should handle video load errors', async () => {
            player.src.rejects(new Error('Failed to load'));
            await expect(service.loadVideo('test123')).rejects.toThrow('Source not supported');
        });
    });

    describe('Cleanup', () => {
        it('should clean up resources on destroy', () => {
            service.dispose();
            
            expect(player.dispose.called).toBeTruthy();
            expect((service as any).player).toBeNull();
            expect((service as any).container).toBeNull();
        });
    });
}); 
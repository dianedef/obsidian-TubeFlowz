import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventBus } from '../core/EventBus';

describe('EventBus', () => {
    let eventBus: EventBus;
    let consoleSpy: any;

    beforeEach(() => {
        eventBus = EventBus.getInstance();
        consoleSpy = vi.spyOn(console, 'log');
    });

    afterEach(() => {
        eventBus.clear();
        consoleSpy.mockReset();
    });

    describe('Singleton Pattern', () => {
        it('should return the same instance', () => {
            const instance1 = EventBus.getInstance();
            const instance2 = EventBus.getInstance();
            expect(instance1).toBe(instance2);
        });
    });

    describe('Event Subscription', () => {
        it('should add event listener', () => {
            const callback = vi.fn();
            eventBus.on('video:play', callback);
            eventBus.emit('video:play');
            expect(callback).toHaveBeenCalled();
        });

        it('should handle multiple listeners for same event', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();
            eventBus.on('video:play', callback1);
            eventBus.on('video:play', callback2);
            eventBus.emit('video:play');
            expect(callback1).toHaveBeenCalled();
            expect(callback2).toHaveBeenCalled();
        });

        it('should pass arguments to listeners', () => {
            const callback = vi.fn();
            const videoId = 'test123';
            eventBus.on('video:load', callback);
            eventBus.emit('video:load', videoId);
            expect(callback).toHaveBeenCalledWith(videoId);
        });

        it('should remove event listener', () => {
            const callback = vi.fn();
            eventBus.on('video:play', callback);
            eventBus.off('video:play', callback);
            eventBus.emit('video:play');
            expect(callback).not.toHaveBeenCalled();
        });
    });

    describe('Event Emission', () => {
        it('should emit event to all listeners', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();
            eventBus.on('video:play', callback1);
            eventBus.on('video:play', callback2);
            eventBus.emit('video:play');
            expect(callback1).toHaveBeenCalled();
            expect(callback2).toHaveBeenCalled();
        });

        it('should handle events with no listeners', () => {
            expect(() => {
                eventBus.emit('video:play');
            }).not.toThrow();
        });

        it('should pass multiple arguments', () => {
            const callback = vi.fn();
            const volume = 0.5;
            const isMuted = false;
            eventBus.on('video:volumeChange', callback);
            eventBus.emit('video:volumeChange', { volume, isMuted });
            expect(callback).toHaveBeenCalledWith({ volume, isMuted });
        });

        it('should maintain event isolation', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();
            eventBus.on('video:play', callback1);
            eventBus.on('video:pause', callback2);
            eventBus.emit('video:play');
            expect(callback1).toHaveBeenCalled();
            expect(callback2).not.toHaveBeenCalled();
        });

        it('should handle rapid event emissions', () => {
            const callback = vi.fn();
            eventBus.on('video:timeUpdate', callback);
            for (let i = 0; i < 10; i++) {
                eventBus.emit('video:timeUpdate', i);
            }
            expect(callback).toHaveBeenCalledTimes(10);
        });
    });

    describe('Error Handling', () => {
        it('should handle errors in event handlers gracefully', () => {
            const errorCallback = () => {
                throw new Error('Test error');
            };
            eventBus.on('video:play', errorCallback);
            expect(() => {
                eventBus.emit('video:play');
            }).not.toThrow();
        });
    });

    describe('Debug Mode', () => {
        beforeEach(() => {
            consoleSpy.mockReset();
        });

        it('should log events when debug mode is enabled', () => {
            eventBus.enableDebug();
            const callback = vi.fn();
            eventBus.on('video:play', callback);
            eventBus.emit('video:play');
            
            expect(consoleSpy).toHaveBeenCalledWith('[EventBus] Subscribed to video:play');
            expect(consoleSpy).toHaveBeenCalledWith('[EventBus] Emitting video:play');
        });

        it('should not log events when debug mode is not enabled', () => {
            // S'assurer que le mode debug est désactivé
            (eventBus as any).debug = false;
            
            const callback = vi.fn();
            eventBus.on('video:play', callback);
            eventBus.emit('video:play');
            
            expect(consoleSpy).not.toHaveBeenCalled();
        });
    });

    describe('Clear Events', () => {
        it('should remove all event listeners', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();
            eventBus.on('video:play', callback1);
            eventBus.on('video:pause', callback2);
            eventBus.clear();
            eventBus.emit('video:play');
            eventBus.emit('video:pause');
            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).not.toHaveBeenCalled();
        });
    });
}); 
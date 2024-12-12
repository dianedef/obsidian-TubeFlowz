import { describe, it, expect, vi } from 'vitest';
import { eventBus } from '../services/EventBus';

describe('EventBus', () => {
    describe('Event Subscription', () => {
        it('should emit and receive events', () => {
            const callback = vi.fn();
            eventBus.on('video:play', callback);
            eventBus.emit('video:play');
            expect(callback).toHaveBeenCalled();
        });

        it('should pass data to event listeners', () => {
            const callback = vi.fn();
            const data = { timestamp: 123 };
            eventBus.on('video:seek', callback);
            eventBus.emit('video:seek', data);
            expect(callback).toHaveBeenCalledWith(data);
        });
    });
}); 
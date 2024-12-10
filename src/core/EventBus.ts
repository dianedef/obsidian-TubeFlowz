import { IEventMap } from '../types/index';

export class EventBus {
    private static instance: EventBus;
    private events: Map<keyof IEventMap, Set<Function>>;
    private debug: boolean = false;

    private constructor() {
        this.events = new Map();
    }

    public static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }

    public enableDebug(): void {
        this.debug = true;
    }

    public on<K extends keyof IEventMap>(event: K, handler: IEventMap[K]): void {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event)?.add(handler);
        
        if (this.debug) {
            console.log(`[EventBus] Subscribed to ${String(event)}`);
        }
    }

    public off<K extends keyof IEventMap>(event: K, handler: IEventMap[K]): void {
        this.events.get(event)?.delete(handler);
        
        if (this.debug) {
            console.log(`[EventBus] Unsubscribed from ${String(event)}`);
        }
    }

    public emit<K extends keyof IEventMap>(event: K, ...args: Parameters<IEventMap[K]>): void {
        if (this.debug) {
            console.log(`[EventBus] Emitting ${String(event)}`, ...args);
        }

        this.events.get(event)?.forEach(callback => {
            try {
                const result = callback(...args);
                if (result instanceof Promise) {
                    result.catch(error => {
                        console.error(`[EventBus] Async error in event handler for ${String(event)}:`, error);
                    });
                }
            } catch (error) {
                console.error(`[EventBus] Error in event handler for ${String(event)}:`, error);
            }
        });
    }

    public clear(): void {
        this.events.clear();
        
        if (this.debug) {
            console.log('[EventBus] Cleared all events');
        }
    }
}

// Export une instance unique
export const eventBus = EventBus.getInstance(); 
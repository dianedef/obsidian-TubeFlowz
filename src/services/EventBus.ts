import { IEventMap } from '../types/index';

export class EventBus {
    private static instance: EventBus;
    private handlers: Map<keyof IEventMap, Set<Function>>;
    private debug: boolean = false;

    private constructor() {
        this.handlers = new Map();
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

    public on<K extends keyof IEventMap>(event: K, handler: IEventMap[K]): () => void {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        this.handlers.get(event)?.add(handler);
        
        if (this.debug) {
            console.log(`[EventBus] Subscribed to ${String(event)}`);
        }

        return () => {
            this.handlers.get(event)?.delete(handler);
        };
    }

    public emit<K extends keyof IEventMap>(event: K, ...args: Parameters<IEventMap[K]>): void {
        if (this.debug) {
            console.log(`[EventBus] Emitting ${String(event)}`, ...args);
        }

        this.handlers.get(event)?.forEach(callback => {
            try {
                callback(...args);
            } catch (error) {
                console.error(`[EventBus] Error in handler for ${String(event)}:`, error);
            }
        });
    }

    public clear(): void {
    }
}
export const eventBus = EventBus.getInstance(); 
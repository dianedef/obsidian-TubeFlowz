import type { VideoJsPlayer } from 'video.js';
import { Volume, PlaybackRate, ViewMode } from '../types/ISettings';
import { EventMap } from '../types/index';

// Types d'événements spécifiques
interface VolumeChangePayload {
    volume: Volume;
    isMuted: boolean;
}

interface PlayerErrorPayload {
    code: string;
    message: string;
    type: string;
}

export class EventBus {
    private static instance: EventBus;
    private events: Map<keyof EventMap, Set<Function>>;
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

    public on<K extends keyof EventMap>(event: K, callback: (data: EventMap[K]) => void): void {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event)?.add(callback);
        
        if (this.debug) {
            console.log(`[EventBus] Subscribed to ${String(event)}`);
        }
    }

    public off<K extends keyof EventMap>(event: K, callback: (data: EventMap[K]) => void): void {
        this.events.get(event)?.delete(callback);
        
        if (this.debug) {
            console.log(`[EventBus] Unsubscribed from ${String(event)}`);
        }
    }

    public emit<K extends keyof EventMap>(event: K, ...args: Parameters<EventMap[K]>): void {
        if (this.debug) {
            console.log(`[EventBus] Emitting ${String(event)}`, ...args);
        }

        this.events.get(event)?.forEach(callback => {
            try {
                callback(...args);
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
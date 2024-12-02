import type { VideoJsPlayer } from 'video.js';
import { Volume, PlaybackRate, ViewMode } from '../types/settings';

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

// Map des événements avec leurs types
type EventMap = {
    // Événements vidéo de base
    'video:load': (videoId: string) => void;
    'video:play': () => void;
    'video:pause': () => void;
    'video:ended': () => void;
    'video:timeUpdate': (time: number) => void;
    'video:ready': (player: VideoJsPlayer) => void;
    
    // Événements de contrôle
    'video:volumeChange': (payload: VolumeChangePayload) => void;
    'video:rateChange': (rate: PlaybackRate) => void;
    'video:qualityChange': (quality: string) => void;
    'video:error': (error: PlayerErrorPayload) => void;
    
    // Événements de vue
    'view:resize': (height: number) => void;
    'view:modeChange': (mode: ViewMode) => void;
    
    // Événements de playlist
    'playlist:update': () => void;
    'playlist:add': (videoId: string) => void;
    'playlist:remove': (videoId: string) => void;
    
    // Événements de paramètres
    'settings:update': () => void;
    'settings:save': () => void;
};

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

    public on<K extends keyof EventMap>(event: K, callback: EventMap[K]): void {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event)?.add(callback);
        
        if (this.debug) {
            console.log(`[EventBus] Subscribed to ${String(event)}`);
        }
    }

    public off<K extends keyof EventMap>(event: K, callback: EventMap[K]): void {
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
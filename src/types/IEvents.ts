import { IPlayerState } from './IPlayer';
import { Volume, PlaybackRate } from './IBase';
import type { IVideoJsPlayer } from 'video.js';
import { ViewMode } from './ISettings';

// Types pour les événements de l'application
export type AppEventType = 
   | 'app:ready'
   | 'app:error'
   | 'app:themeChange'
   | 'app:settingsChange';

export interface IAppReadyPayload {
   version: string;
   timestamp: number;
}

export interface IAppErrorPayload {
   error: Error;
   context?: string;
}

export interface IAppThemeChangePayload {
   theme: 'light' | 'dark';
   customColors?: {
      primary?: string;
      secondary?: string;
      text?: string;
      background?: string;
   };
}

export interface IAppSettingsChangePayload {
   key: string;
   oldValue: unknown;
   newValue: unknown;
}

export type AppEventPayload =
   | IAppReadyPayload
   | IAppErrorPayload
   | IAppThemeChangePayload
   | IAppSettingsChangePayload;

export interface IAppEvent<T extends AppEventPayload> {
   type: AppEventType;
   payload: T;
   timestamp: number;
}

// Types pour les événements vidéo
export interface IEventMap {
   'video:stateChange': (state: IPlayerState) => void | Promise<void>;
   'video:load': (videoId: string) => void | Promise<void>;
   'video:play': () => void | Promise<void>;
   'video:pause': () => void | Promise<void>;
   'video:ended': () => void | Promise<void>;
   'video:timeUpdate': (time: number) => void | Promise<void>;
   'video:ready': (player: IVideoJsPlayer) => void | Promise<void>;
   'video:volumeChange': (payload: IVolumeChangePayload) => void | Promise<void>;
   'video:rateChange': (rate: PlaybackRate) => void | Promise<void>;
   'video:qualityChange': (quality: string) => void | Promise<void>;
   'video:error': (error: IPlayerErrorPayload) => void | Promise<void>;
   'view:resize': (height: number) => void | Promise<void>;
   'view:modeChange': (mode: ViewMode) => void | Promise<void>;
   'playlist:update': () => void | Promise<void>;
   'playlist:add': (videoId: string) => void | Promise<void>;
   'playlist:remove': (videoId: string) => void | Promise<void>;
   'settings:update': () => void | Promise<void>;
   'settings:save': () => void | Promise<void>;
}

export interface IVolumeChangePayload {
   volume: Volume;
   isMuted: boolean;
}

export interface IPlayerErrorPayload {
   code: string;
   message: string;
   type: string;
} 

export type EventCallback<T> = T extends (...args: infer P) => void | Promise<void> 
    ? (...args: P) => void | Promise<void> 
    : never;
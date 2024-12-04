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
   'video:stateChange': (state: IPlayerState) => void;
   'video:load': (videoId: string) => Promise<void>;
   'video:play': () => void;
   'video:pause': () => void;
   'video:ended': () => void;
   'video:timeUpdate': (time: number) => void;
   'video:ready': (player: IVideoJsPlayer) => void;
   'video:volumeChange': (payload: IVolumeChangePayload) => void;
   'video:rateChange': (rate: PlaybackRate) => void;
   'video:qualityChange': (quality: string) => void;
   'video:error': (error: IPlayerErrorPayload) => void;
   'view:resize': (height: number) => void;
   'view:modeChange': (mode: ViewMode) => void;
   'playlist:update': () => void;
   'playlist:add': (videoId: string) => void;
   'playlist:remove': (videoId: string) => void;
   'settings:update': () => void;
   'settings:save': () => void;
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
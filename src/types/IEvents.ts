import { IPlayerState } from './IPlayer';
import { Volume, PlaybackRate } from './IBase';
import type { IVideoJsPlayer } from 'video.js';
import { ViewMode } from './ISettings';


// Types pour les événements vidéo
export interface IEventMap {
   'video:stateChange': (state: IPlayerState) => void;
   'video:load': (videoId: string) => void;
   'video:play': () => void;
   'video:pause': () => void;
   'video:ended': () => void;
   'video:timeUpdate': (time: number) => void;
   'video:ready': (player: IVideoJsPlayer) => void;
   'video:volumeChange': (payload: IVolumeChangePayload) => void;
   'video:rateChange': (rate: PlaybackRate) => void;
   'video:qualityChange': (quality: string) => void;
   'video:error': (error: IPlayerErrorPayload) => void;
   
   // Événements de vue
   'view:resize': (height: number) => void;
   'view:modeChange': (mode: ViewMode) => void;
   'view:ready': () => void;
   'view:close': () => void;
   
   // Événements de player
   'player:init': () => void;
   'player:initComplete': () => void;
   'player:destroy': () => void;
   'player:initialized': () => void;
   'player:disposed': () => void;
   
   // Autres événements
   'plugin:loaded': () => void;
   'plugin:layout-ready': () => void;
   'plugin:unloading': () => void;
   'plugin:unloaded': () => void;
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

export type EventCallback<T> = T extends (...args: any[]) => any ? T : never;
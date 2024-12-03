import { IPlayerState, IPlayerOptions } from './IPlayer';

export interface IPlayerService {
   // Gestion du cycle de vie
   initialize(container: HTMLElement): Promise<void>;
   dispose(): Promise<void>;
   
   // Contrôles du player
   play(): Promise<void>;
   pause(): Promise<void>;
   seekTo(time: number): Promise<void>;
   setVolume(volume: number): Promise<void>;
   setPlaybackRate(rate: number): Promise<void>;
   getCurrentTime(): Promise<number>;
   
   // Gestion de l'état
   getState(): IPlayerState;
   setState(state: Partial<IPlayerState>): Promise<void>;
   loadVideo(options: IPlayerOptions): Promise<void>;
   
   // Événements
   on(event: string, callback: (state: IPlayerState) => void): void;
   off(event: string, callback: (state: IPlayerState) => void): void;
} 
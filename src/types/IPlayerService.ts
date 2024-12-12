import { IPlayerState } from './IPlayer';

export interface IPlayerService {
   isInitialized: boolean;
   // Gestion du cycle de vie
   initialize(container: HTMLElement): Promise<void>;
   dispose(): Promise<void>;
   
   getCurrentTime(): number;
   getCurrentVideoId(): string;
   
   handleLoadVideo(options: Partial<IPlayerState>): Promise<void>;
   
   // État du player
   isReady(): boolean;
} 
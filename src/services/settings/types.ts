import { ViewMode, PlaybackMode, Volume, PlaybackRate } from '../../types/settings';

export interface PluginSettings {
   lastVideoId: string | null;
   lastTimestamp: number;
   isVideoOpen: boolean;
   currentMode: ViewMode;
   isChangingMode: boolean;
   activeLeafId: string | null;
   overlayLeafId: string | null;
   viewHeight: number;
   overlayHeight: number;
   showYoutubeRecommendations: boolean;
   playbackMode: PlaybackMode;
   favoriteSpeed: number;
   isMuted: boolean;
   isPlaying: boolean;
   playbackRate: PlaybackRate;
   volume: Volume;
   playlist: Array<{
      id: string;
      title: string;
      timestamp: number;
   }>;
} 
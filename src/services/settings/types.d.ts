export interface PluginSettings {
    lastVideoId: string;
    isVideoOpen: boolean;
    isChangingMode: boolean;
    playlist: string[];
    currentMode: VideoMode;
    viewHeight: number;
    overlayHeight: number;
    isPlaying: boolean;
    activeLeafId: string | null;
    overlayLeafId: string | null;
    favoriteSpeed: PlaybackRate;
    lastTimestamp: number;
    showYoutubeRecommendations: boolean;
    isMuted: boolean;
    playbackRate: PlaybackRate;
    volume: Volume;
    playbackMode: PlaybackMode;
    language: string;
} 
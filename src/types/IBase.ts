// Types de base avec sécurité de type
export type Volume = number & { readonly _brand: unique symbol };
export type PlaybackRate = number & { readonly _brand: unique symbol };
export type VideoId = string & { readonly _brand: unique symbol };
export type Timestamp = number & { readonly _brand: unique symbol };

// Type Guards
export const isValidVolume = (value: unknown): value is Volume => {
   return typeof value === 'number' && value >= 0 && value <= 1;
};

export const isValidPlaybackRate = (value: unknown): value is PlaybackRate => {
   return typeof value === 'number' && value >= 0.25 && value <= 16;
};

export const isValidVideoId = (value: string): value is VideoId => {
   return /^[a-zA-Z0-9_-]{11}$/.test(value);
};

// Créateurs de types
export const createVolume = (value: unknown): Volume => {
   if (!isValidVolume(value)) {
      throw new Error(`Invalid volume value: ${value}`);
   }
   return value as Volume;
};

export const createPlaybackRate = (value: unknown): PlaybackRate => {
   if (!isValidPlaybackRate(value)) {
      throw new Error(`Invalid playback rate value: ${value}`);
   }
   return value as PlaybackRate;
};

export const createVideoId = (value: string): VideoId | null => {
   return isValidVideoId(value) ? value as VideoId : null;
}; 
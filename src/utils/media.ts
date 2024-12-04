import { Volume, PlaybackRate } from '../types/ISettings';

/**
 * Crée un objet Volume valide
 * @param value Valeur du volume entre 0 et 1
 * @returns Un objet Volume typé
 */
export function createVolume(value: number): Volume {
    const validValue = Math.max(0, Math.min(1, value));
    return validValue as Volume;
}

/**
 * Crée un objet PlaybackRate valide
 * @param value Valeur de la vitesse de lecture (0.25 à 16)
 * @returns Un objet PlaybackRate typé
 */
export function createPlaybackRate(value: number): PlaybackRate {
    const validValue = Math.max(0.25, Math.min(16, value));
    return validValue as PlaybackRate;
} 
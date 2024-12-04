import { ViewMode, VIEW_MODES } from '../types/ISettings';
import { PluginSettings, DEFAULT_SETTINGS, Volume, PlaybackRate } from '../types/ISettings';
import { Plugin } from 'obsidian';

export type CleanVideoId = string & { _brand: 'CleanVideoId' };

export function cleanVideoId(videoId: string): CleanVideoId {
    // Nettoyer l'ID vidéo des paramètres et caractères spéciaux
   const cleaned = videoId.replace(/[&?].*$/, '').trim();
   return cleaned as CleanVideoId;
}

export function extractVideoId(url: string): string | null {
    // Patterns possibles pour les URLs YouTube
    const patterns = [
        // youtu.be/ID
        /youtu\.be\/([^?&#]+)/,
        // youtube.com/watch?v=ID
        /youtube\.com\/watch\?v=([^&#]+)/,
        // youtube.com/v/ID
        /youtube\.com\/v\/([^&#]+)/,
        // youtube.com/embed/ID
        /youtube\.com\/embed\/([^&#]+)/,
        // ID brut (si déjà un ID)
        /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
}

/**
 * Sauvegarde la hauteur pour un mode donné
 * @param height La nouvelle hauteur en pourcentage
 * @param mode Le mode pour lequel sauvegarder la hauteur
 * @param plugin Le plugin Obsidian
 */
export async function saveHeight(height: number, mode: ViewMode, plugin: Plugin): Promise<void> {
    const settings = await plugin.loadData() as PluginSettings;
    if (mode === VIEW_MODES.Overlay) {
        settings.overlayHeight = height;
    } else {
        settings.viewHeight = height;
    }
    await plugin.saveData(settings);
}

/**
 * Récupère la hauteur pour un mode donné
 * @param mode Le mode pour lequel récupérer la hauteur
 * @param settings Les paramètres du plugin
 * @returns La hauteur en pourcentage
 */
export function getHeight(mode: ViewMode, settings: PluginSettings): number {
    // Utiliser les valeurs par défaut si non définies
    const defaultHeight = mode === VIEW_MODES.Overlay 
        ? DEFAULT_SETTINGS.overlayHeight 
        : DEFAULT_SETTINGS.viewHeight;

    // Récupérer la valeur appropriée selon le mode
    const height = mode === VIEW_MODES.Overlay
        ? settings.overlayHeight ?? defaultHeight
        : settings.viewHeight ?? defaultHeight;

    // S'assurer que la valeur est dans les limites
    return Math.min(Math.max(height, 20), 90);
}

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


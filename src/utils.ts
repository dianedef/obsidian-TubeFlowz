import { VideoMode } from './types';
import { PluginSettings, DEFAULT_SETTINGS } from './types/settings';
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
export async function saveHeight(height: number, mode: VideoMode, plugin: Plugin): Promise<void> {
    const settings = await plugin.loadData() as PluginSettings;
    if (mode === 'overlay') {
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
export function getHeight(mode: VideoMode, settings: PluginSettings): number {
    if (mode === 'overlay') {
        return settings.overlayHeight || DEFAULT_SETTINGS.overlayHeight;
    }
    return settings.viewHeight || DEFAULT_SETTINGS.viewHeight;
}

/**
 * Sauvegarde la hauteur actuelle d'un élément
 * @param element L'élément dont on veut sauvegarder la hauteur
 * @param mode Le mode actuel
 * @param plugin Le plugin Obsidian
 * @returns true si la sauvegarde a réussi, false sinon
 */
export async function saveElementHeight(element: HTMLElement | null, mode: VideoMode, plugin: Plugin): Promise<boolean> {
    if (!element) return false;

    const height = parseFloat(element.style.height);
    if (isNaN(height)) return false;

    await saveHeight(height, mode, plugin);
    return true;
}

/**
 * Trouve et sauvegarde la hauteur du conteneur vidéo actuel
 * @param mode Le mode actuel
 * @param plugin Le plugin Obsidian
 * @returns true si la sauvegarde a réussi, false sinon
 */
export async function saveCurrentVideoHeight(mode: VideoMode, plugin: Plugin): Promise<boolean> {
    const selector = mode === 'overlay' 
        ? '.youtube-overlay' 
        : '.youtube-player div[style*="height"]';
    
    const container = document.querySelector(selector);
    return saveElementHeight(container as HTMLElement, mode, plugin);
}


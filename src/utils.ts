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

import { VideoMode } from './types';
import { Store } from '../archive/store';

/**
 * Sauvegarde la hauteur pour un mode donné
 * @param height La nouvelle hauteur en pourcentage
 * @param mode Le mode pour lequel sauvegarder la hauteur
 */
export async function saveHeight(height: number, mode: VideoMode): Promise<void> {
    const { Settings } = Store.get();
    if (!Settings) return;

    if (mode === 'overlay') {
        Settings.overlayHeight = height;
    } else {
        Settings.viewHeight = height;
    }
    
    await Settings.save();
}

/**
 * Récupère la hauteur pour un mode donné
 * @param mode Le mode pour lequel récupérer la hauteur
 * @returns La hauteur en pourcentage
 */
export function getHeight(mode: VideoMode): number {
    const { Settings } = Store.get();
    if (!Settings) return 60; // Hauteur par défaut

    return mode === 'overlay' ? Settings.overlayHeight : Settings.viewHeight;
}

/**
 * Sauvegarde la hauteur actuelle d'un élément
 * @param element L'élément dont on veut sauvegarder la hauteur
 * @param mode Le mode actuel
 * @returns true si la sauvegarde a réussi, false sinon
 */
export async function saveElementHeight(element: HTMLElement | null, mode: VideoMode): Promise<boolean> {
    if (!element) return false;

    const height = parseFloat(element.style.height);
    if (isNaN(height)) return false;

    await saveHeight(height, mode);
    return true;
}

/**
 * Trouve et sauvegarde la hauteur du conteneur vidéo actuel
 * @param mode Le mode actuel
 * @returns true si la sauvegarde a réussi, false sinon
 */
export async function saveCurrentVideoHeight(mode: VideoMode): Promise<boolean> {
    const selector = mode === 'overlay' 
        ? '.youtube-overlay' 
        : '.youtube-player div[style*="height"]';
    
    const container = document.querySelector(selector);
    return saveElementHeight(container as HTMLElement, mode);
}


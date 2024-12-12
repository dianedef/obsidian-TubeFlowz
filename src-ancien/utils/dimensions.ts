import { Plugin } from 'obsidian';
import { ViewMode, VIEW_MODES } from '../types/ISettings';
import { PluginSettings, DEFAULT_SETTINGS } from '../types/ISettings';

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
    console.log("[dimensions dans saveHeight] Hauteur sauvegardée:", height, "pour le mode", mode);
}

/**
 * Récupère la hauteur pour un mode donné
 * @param mode Le mode pour lequel récupérer la hauteur
 * @param settings Les paramètres du plugin
 * @returns La hauteur en pourcentage
 */
export function getHeight(mode: ViewMode, settings: PluginSettings): number {
    const defaultHeight = mode === VIEW_MODES.Overlay 
        ? DEFAULT_SETTINGS.overlayHeight 
        : DEFAULT_SETTINGS.viewHeight;

    const height = mode === VIEW_MODES.Overlay
        ? settings.overlayHeight ?? defaultHeight
        : settings.viewHeight ?? defaultHeight;

    console.log("[dimensions dans getHeight] Hauteur récupérée:", height, "pour le mode", mode);
    return Math.min(Math.max(height, 20), 90);
} 
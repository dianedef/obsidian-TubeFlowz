export type CleanVideoId = string & { _brand: 'CleanVideoId' };

/**
 * Nettoie un ID vidéo YouTube des paramètres et caractères spéciaux
 * @param videoId L'ID vidéo à nettoyer
 * @returns L'ID vidéo nettoyé
 */
export function cleanVideoId(videoId: string): CleanVideoId {
    const cleaned = videoId.replace(/[&?].*$/, '').trim();
    return cleaned as CleanVideoId;
}

/**
 * Extrait l'ID vidéo d'une URL YouTube
 * @param url L'URL YouTube à analyser
 * @returns L'ID vidéo ou null si non trouvé
 */
export function extractVideoId(url: string): string | null {
    const patterns = [
        /youtu\.be\/([^?&#]+)/,
        /youtube\.com\/watch\?v=([^&#]+)/,
        /youtube\.com\/v\/([^&#]+)/,
        /youtube\.com\/embed\/([^&#]+)/,
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
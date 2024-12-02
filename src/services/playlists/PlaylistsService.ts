import { App } from 'obsidian';
import { createError } from '../../core/errors/ErrorClasses';
import { ConfigErrorCode, CacheErrorCode } from '../../types/errors';
import { eventBus } from '../../core/EventBus';
import { cleanVideoId, type CleanVideoId } from '../../utils';

interface PlaylistItem {
    videoId: CleanVideoId;
    title: string;
    addedAt: string;
}

export class PlaylistsService {
    private static instance: PlaylistsService;
    private playlist: PlaylistItem[] = [];
    private playlistContainer!: HTMLElement;
    private playlistList!: HTMLElement;

    private constructor(private app: App) {}

    public static getInstance(app: App): PlaylistsService {
        if (!PlaylistsService.instance) {
            PlaylistsService.instance = new PlaylistsService(app);
        }
        return PlaylistsService.instance;
    }

    public async initialize(): Promise<void> {
        try {
            await this.createPlaylistUI();
            eventBus.emit('playlist:ready');
        } catch (error) {
            throw createError.config(
                ConfigErrorCode.INITIALIZATION,
                'playlist-service'
            );
        }
    }

    private async createPlaylistUI(): Promise<void> {
        try {
            this.playlistContainer = document.createElement('div');
            this.playlistContainer.className = 'playlist-container';
            this.playlistContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: var(--background-primary);
                z-index: 9999;
                overflow-y: auto;
            `;

            this.playlistList = document.createElement('div');
            this.playlistList.className = 'playlist-list';
            this.playlistList.style.cssText = `
                list-style: none;
                padding: 0;
                margin: 0;
            `;

            this.playlistContainer.appendChild(this.playlistList);
            this.app.workspace.getRightLeaf(true).appendChild(this.playlistContainer);
        } catch (error) {
            throw createError.config(
                ConfigErrorCode.INITIALIZATION,
                'playlist-ui'
            );
        }
    }

    public addVideo(videoId: string, title: string): void {
        try {
            if (!videoId || !title) {
                throw createError.config(
                    ConfigErrorCode.MISSING_REQUIRED,
                    !videoId ? 'videoId' : 'title'
                );
            }

            const cleanedId = cleanVideoId(videoId);
            
            // Vérifier si la vidéo existe déjà
            const exists = this.playlist.some(item => item.videoId === cleanedId);
            if (exists) {
                throw createError.cache(
                    CacheErrorCode.ALREADY_EXISTS,
                    cleanedId
                );
            }

            this.playlist.push({
                videoId: cleanedId,
                title,
                addedAt: new Date().toISOString()
            });

            this.updatePlaylistUI();
            eventBus.emit('playlist:add', cleanedId);
        } catch (error) {
            if (error instanceof Error) throw error;
            throw createError.cache(CacheErrorCode.INVALID_DATA, videoId);
        }
    }

    public removeVideo(videoId: string): void {
        try {
            if (!videoId) {
                throw createError.config(
                    ConfigErrorCode.MISSING_REQUIRED,
                    'videoId'
                );
            }

            const cleanedId = cleanVideoId(videoId);
            const initialLength = this.playlist.length;
            this.playlist = this.playlist.filter(video => video.videoId !== cleanedId);

            if (this.playlist.length === initialLength) {
                throw createError.cache(
                    CacheErrorCode.NOT_FOUND,
                    cleanedId
                );
            }

            this.updatePlaylistUI();
            eventBus.emit('playlist:remove', cleanedId);
        } catch (error) {
            if (error instanceof Error) throw error;
            throw createError.cache(CacheErrorCode.INVALID_DATA, videoId);
        }
    }

    private updatePlaylistUI(): void {
        try {
            this.playlistList.innerHTML = '';
            this.playlist.forEach((video) => {
                const li = document.createElement('li');
                li.className = 'playlist-item';
                li.style.cssText = `
                    padding: 10px;
                    border-bottom: 1px solid var(--background-secondary);
                    cursor: pointer;
                `;
                li.textContent = video.title;
                li.addEventListener('click', () => {
                    eventBus.emit('video:request', {
                        videoId: video.videoId,
                        timestamp: 0
                    });
                });
                this.playlistList.appendChild(li);
            });
            
            eventBus.emit('playlist:update', this.playlist);
        } catch (error) {
            throw createError.config(
                ConfigErrorCode.INITIALIZATION,
                'playlist-ui-update'
            );
        }
    }

    public getPlaylist(): PlaylistItem[] {
        return [...this.playlist];
    }

    public close(): void {
        try {
            this.app.workspace.getRightLeaf(true).removeChild(this.playlistContainer);
            eventBus.emit('playlist:close');
        } catch (error) {
            throw createError.config(
                ConfigErrorCode.INITIALIZATION,
                'playlist-close'
            );
        }
    }

    public destroy(): void {
        this.playlist = [];
        this.close();
        PlaylistsService.instance = null as any;
    }
}

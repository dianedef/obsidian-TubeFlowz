import { App } from 'obsidian';
import { Store } from './store';
import { cleanVideoId } from './utils';

// ---------- PLAYLISTS ----------
interface Playlists {
app: App;
settings: any;
playlist: Array<{
    videoId: string;
    title: string;
    addedAt: string;
}>;
playlistContainer: HTMLDivElement;
playlistList: HTMLDivElement;
}

class Playlists implements Playlists {
app: App;
settings: any;
playlist: Array<{
    videoId: string;
    title: string;
    addedAt: string;
}> = [];
playlistContainer: HTMLDivElement;
playlistList: HTMLDivElement;

constructor() {
    const { app, Settings } = Store.get();
    if (!app) throw new Error("App not initialized");
    this.app = app;
    this.settings = Settings?.settings;
    
    this.playlist = [];
    this.createPlaylistUI();
}

createPlaylistUI() {
    const { app } = Store.get();
    if (!app) throw new Error("App not initialized");

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
    app.workspace.getRightLeaf(true).appendChild(this.playlistContainer);
}

addVideo(videoId: string, title: string) {
    const cleanedId = cleanVideoId(videoId);
    this.playlist.push({ videoId: cleanedId, title, addedAt: new Date().toISOString() });
    this.updatePlaylistUI();
}

removeVideo(videoId: string) {
    const cleanedId = cleanVideoId(videoId);
    this.playlist = this.playlist.filter(video => video.videoId !== cleanedId);
    this.updatePlaylistUI();
}

updatePlaylistUI() {
    this.playlistList.innerHTML = '';
    this.playlist.forEach((video, index) => {
        const li = document.createElement('li');
        li.className = 'playlist-item';
        li.style.cssText = `
            padding: 10px;
            border-bottom: 1px solid var(--background-secondary);
            cursor: pointer;
        `;
        li.textContent = video.title;
        li.addEventListener('click', () => {
            const { PlayerViewAndMode, Settings } = Store.get();
            if (PlayerViewAndMode) {
                PlayerViewAndMode.displayVideo({
                    videoId: video.videoId,
                    mode: Settings?.settings?.currentMode || 'sidebar',
                    timestamp: 0,
                    fromUserClick: true
                });
            }
        });
        this.playlistList.appendChild(li);
    });
}

close() {
    const { app } = Store.get();
    if (app) {
        app.workspace.getRightLeaf(true).removeChild(this.playlistContainer);
    }
}
}

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlayerContainer } from '../../views/PlayerContainer';
import { YouTubeService } from '../../services/youtube/YouTubeService';
import { eventBus } from '../../core/EventBus';
import { videojsMock, obsidianMock } from '../setup';
import { ViewMode } from '../../types/settings';

describe('PlayerContainer Integration', () => {
    let container: PlayerContainer;
    let mockLeaf: any;
    let mockPlugin: any;

    beforeEach(() => {
        document.body.innerHTML = '';
        
        // Mock du WorkspaceLeaf
        mockLeaf = {
            containerEl: document.createElement('div')
        };

        // Mock du Plugin
        mockPlugin = {
            app: obsidianMock
        };

        container = new PlayerContainer(mockLeaf, mockPlugin);
    });

    afterEach(() => {
        container.onClose();
        eventBus.clear();
        vi.clearAllMocks();
    });

    describe('View Modes', () => {
        it('should initialize in sidebar mode by default', async () => {
            await container.onOpen();
            expect(container.containerEl.classList.contains('youtube-player-sidebar')).toBeTruthy();
        });

        it('should switch to tab mode', async () => {
            await container.setMode(ViewMode.Tab);
            expect(container.containerEl.classList.contains('youtube-player-tab')).toBeTruthy();
        });

        it('should switch to overlay mode', async () => {
            await container.setMode(ViewMode.Overlay);
            expect(container.containerEl.classList.contains('youtube-player-overlay')).toBeTruthy();
        });

        it('should maintain video playback when switching modes', async () => {
            await container.loadVideo('test123');
            const spy = vi.spyOn(YouTubeService.prototype, 'loadVideo');
            await container.setMode(ViewMode.Tab);
            expect(spy).toHaveBeenCalledWith('test123', 0);
        });
    });

    describe('Resize Handling', () => {
        it('should handle resize events', async () => {
            await container.onOpen();
            const resizeHandle = container.containerEl.querySelector('.youtube-resize-handle');
            expect(resizeHandle).toBeTruthy();

            // Simuler un événement de redimensionnement
            const mousedown = new MouseEvent('mousedown', {
                clientY: 100
            });
            const mousemove = new MouseEvent('mousemove', {
                clientY: 150
            });
            const mouseup = new MouseEvent('mouseup');

            resizeHandle?.dispatchEvent(mousedown);
            document.dispatchEvent(mousemove);
            document.dispatchEvent(mouseup);

            const playerSection = container.containerEl.querySelector('.youtube-player-section');
            expect(playerSection?.style.height).toBeTruthy();
        });

        it('should respect minimum and maximum height constraints', async () => {
            await container.onOpen();
            const playerSection = container.containerEl.querySelector('.youtube-player-section');
            
            // Simuler un redimensionnement extrême
            const height = playerSection?.style.height;
            expect(parseFloat(height || '0')).toBeGreaterThanOrEqual(20);
            expect(parseFloat(height || '0')).toBeLessThanOrEqual(90);
        });
    });

    describe('Error Handling', () => {
        it('should show error message on initialization failure', async () => {
            vi.spyOn(YouTubeService.prototype, 'initialize').mockRejectedValueOnce(new Error('Test error'));
            await container.onOpen();
            const errorMessage = container.containerEl.querySelector('.error-message');
            expect(errorMessage).toBeTruthy();
        });

        it('should recover from errors when loading new video', async () => {
            vi.spyOn(YouTubeService.prototype, 'initialize').mockRejectedValueOnce(new Error('Test error'));
            await container.onOpen();
            
            // Reset mock and try loading new video
            vi.spyOn(YouTubeService.prototype, 'initialize').mockResolvedValueOnce(undefined);
            await container.loadVideo('newVideo');
            
            const errorMessage = container.containerEl.querySelector('.error-message');
            expect(errorMessage).toBeFalsy();
        });
    });
}); 
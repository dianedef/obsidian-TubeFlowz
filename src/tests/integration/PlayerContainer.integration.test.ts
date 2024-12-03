import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlayerView } from '../../views/PlayerView';
import PlayerService from '../../services/player/PlayerService';
import { PlayerUI } from '../../views/PlayerUI';
import { SettingsService } from '../../services/settings/SettingsService';
import { ViewModeService } from '../../services/viewMode/ViewModeService';
import { VIEW_MODES } from '../../types/settings';
import { MockPlugin, obsidianMock } from '../setup';
import { eventBus } from '../../core/EventBus';
import { PlayerErrorCode } from '../../types/errors';

describe('PlayerView Integration Tests', () => {
    let playerView: PlayerView;
    let playerService: PlayerService;
    let playerUI: PlayerUI;
    let settings: SettingsService;
    let viewModeService: ViewModeService;
    let mockLeaf: any;
    let mockPlugin: MockPlugin;

    beforeEach(() => {
        // Mock des méthodes d'Obsidian
        vi.mock('obsidian', () => {
            return {
                requestUrl: vi.fn(),
                Plugin: MockPlugin,
                ItemView: vi.fn()
            };
        });

        mockPlugin = new MockPlugin(obsidianMock);
        mockLeaf = {
            view: {},
            id: 'test-leaf',
            containerEl: document.createElement('div'),
            getViewState: vi.fn(),
            setViewState: vi.fn(),
            detach: vi.fn(),
            empty: vi.fn()
        };

        settings = new SettingsService(mockPlugin);
        playerService = PlayerService.getInstance(settings.getSettings());
        playerUI = new PlayerUI(settings);
        viewModeService = new ViewModeService(mockPlugin, VIEW_MODES.Tab);

        playerView = new PlayerView(
            mockLeaf,
            playerService,
            playerUI,
            settings,
            viewModeService
        );
    });

    afterEach(async () => {
        vi.clearAllMocks();
        if (playerView) {
            await playerView.onClose();
        }
    });

    it('should initialize correctly', async () => {
        expect(playerView).toBeDefined();
        expect(playerView).toBeInstanceOf(PlayerView);
        await expect(playerView.onOpen()).resolves.not.toThrow();
        expect(mockLeaf.containerEl.children.length).toBeGreaterThan(0);
    });

    it('should handle view mode changes', async () => {
        await expect(playerView.onOpen()).resolves.not.toThrow();
        await viewModeService.setMode(VIEW_MODES.Sidebar);
        expect(viewModeService.getCurrentMode()).toBe(VIEW_MODES.Sidebar);
        
        await viewModeService.setMode(VIEW_MODES.Tab);
        expect(viewModeService.getCurrentMode()).toBe(VIEW_MODES.Tab);
    });

    it('should handle player service interactions', async () => {
        await expect(playerView.onOpen()).resolves.not.toThrow();
        const videoId = 'test-video-id';
        await playerService.loadVideo(videoId);
        const state = playerService.getCurrentState();
        expect(state.videoId).toBe(videoId);
    });

    it('should handle resize events', async () => {
        await expect(playerView.onOpen()).resolves.not.toThrow();
        const mockResizeCallback = vi.fn();
        eventBus.on('view:resize', mockResizeCallback);

        // Simuler un ResizeObserver
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const height = entry.contentRect.height;
                eventBus.emit('view:resize', height);
            }
        });

        // Observer le container
        resizeObserver.observe(mockLeaf.containerEl);

        // Simuler un changement de taille
        Object.defineProperty(mockLeaf.containerEl, 'clientHeight', { value: 500 });
        const resizeEvent = new Event('resize');
        mockLeaf.containerEl.dispatchEvent(resizeEvent);

        expect(mockResizeCallback).toHaveBeenCalled();
        
        // Cleanup
        resizeObserver.disconnect();
        eventBus.off('view:resize', mockResizeCallback);
    });
}); 
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hotkeys } from '../services/HotkeysService';
import PlayerService from '../services/PlayerService';
import { SettingsService } from '../services/SettingsService';
import { TranslationsService } from '../services/TranslationsService';
import { CommandError } from '../types/IErrors';
import { Plugin, Command } from 'obsidian';
import { DEFAULT_SETTINGS, IPluginSettings } from '../types/ISettings';

// Création d'une classe MockPlugin pour les tests
class MockPlugin {
    public commands: Command[] = [];
    
    addCommand(command: Command) {
        this.commands.push(command);
        return this;
    }

    // Autres méthodes du Plugin mock nécessaires
    app = {
        workspace: {
            getActiveFile: () => null,
        },
    };
    manifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        minAppVersion: '0.15.0',
    };
    saveData = async () => {};
    loadData = async () => ({});
}

describe('HotkeysService', () => {
    let plugin: MockPlugin;
    let hotkeys: Hotkeys;
    let playerService: PlayerService;
    let settingsService: SettingsService;
    let translationsService: TranslationsService;
    let mockSettings: IPluginSettings;

    beforeEach(() => {
        plugin = new MockPlugin();
        settingsService = new SettingsService(plugin as unknown as Plugin);
        
        // Créer des settings mockés
        mockSettings = {
            ...DEFAULT_SETTINGS,
            lastVideoId: 'test-video-id',
            lastTimestamp: 0,
            volume: 1,
            playbackRate: 1,
            isMuted: false,
            isPlaying: false,
            currentMode: 'tab',
            viewHeight: 480,
            language: 'fr'
        };
        
        // Mock getSettings
        vi.spyOn(settingsService, 'getSettings').mockReturnValue(mockSettings);
        
        translationsService = new TranslationsService(plugin as unknown as Plugin);
        
        // Initialiser le PlayerService avec les settings mockés
        playerService = PlayerService.getInstance(mockSettings);
        
        hotkeys = new Hotkeys(plugin as unknown as Plugin, settingsService, playerService, translationsService);

        // Mock des méthodes du PlayerService
        vi.spyOn(playerService, 'isReady').mockReturnValue(false);
    });

    afterEach(() => {
        vi.clearAllMocks();
        // Réinitialiser le singleton
        (PlayerService as any).instance = null;
    });

    test('should throw CommandError when trying to insert timestamp without player', () => {
        hotkeys.registerHotkeys();
        const command = plugin.commands.find((cmd) => cmd.id === 'youtube-insert-timestamp');
        expect(command).toBeDefined();
        expect(() => command?.editorCallback({})).toThrow(CommandError);
    });
});

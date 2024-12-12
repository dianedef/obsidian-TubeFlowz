import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TranslationsService } from '../services/TranslationsService';
import { SettingsTab } from '../services/SettingsTab';
import { Hotkeys } from '../services/HotkeysService';
import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { SettingsService } from '../services/SettingsService';
import PlayerService from '../services/PlayerService';

// Mock Setting class
class MockSetting {
    nameEl: HTMLElement;
    descEl: HTMLElement;
    private dropdown: any;

    constructor(public containerEl: HTMLElement) {
        this.nameEl = document.createElement('div');
        this.nameEl.className = 'setting-item-name';
        this.descEl = document.createElement('div');
        this.descEl.className = 'setting-item-description';
        containerEl.appendChild(this.nameEl);
        containerEl.appendChild(this.descEl);
    }

    setName(name: string) {
        this.nameEl.textContent = name;
        return this;
    }

    setDesc(desc: string) {
        this.descEl.textContent = desc;
        return this;
    }

    addDropdown(cb: (dropdown: any) => any) {
        const select = document.createElement('select');
        this.containerEl.appendChild(select);
        this.dropdown = {
            addOption: (value: string, display: string) => {
                const option = document.createElement('option');
                option.value = value;
                option.text = display;
                select.appendChild(option);
                return this.dropdown;
            },
            setValue: (value: string) => {
                select.value = value;
                return this.dropdown;
            },
            onChange: (callback: (value: string) => void) => {
                select.onchange = (e) => callback((e.target as HTMLSelectElement).value);
                return this.dropdown;
            }
        };
        cb(this.dropdown);
        return this;
    }

    addToggle(cb: (toggle: any) => any) {
        const toggle = {
            setValue: vi.fn().mockReturnThis(),
            onChange: vi.fn().mockReturnThis()
        };
        cb(toggle);
        return this;
    }
}

// Mock Obsidian
vi.mock('obsidian', () => {
    const MockSettingConstructor = function(containerEl: HTMLElement) {
        return new MockSetting(containerEl);
    };
    return {
        App: vi.fn(),
        Plugin: vi.fn(),
        PluginSettingTab: vi.fn().mockImplementation(function(app, plugin) {
            this.app = app;
            this.plugin = plugin;
            this.containerEl = document.createElement('div');
            this.display = vi.fn();
            this.hide = vi.fn();
        }),
        Setting: MockSettingConstructor
    };
});

describe('Translations Integration', () => {
    let app: App;
    let plugin: Plugin;
    let settings: SettingsService;
    let playerService: PlayerService;
    let container: HTMLDivElement;

    beforeEach(async () => {
        // Reset DOM
        container = document.createElement('div');
        document.body.appendChild(container);

        // Mock Obsidian App
        app = {
            locale: 'fr',
            workspace: {
                on: vi.fn(),
                off: vi.fn(),
                getLeaf: vi.fn(),
                getLeavesOfType: vi.fn().mockReturnValue([])
            }
        } as unknown as App;

        // Mock Plugin
        plugin = {
            app,
            manifest: {},
            loadData: vi.fn().mockResolvedValue({
                currentMode: 'tab',
                playbackMode: 'stream',
                favoriteSpeed: 1,
                showYoutubeRecommendations: true
            }),
            saveData: vi.fn().mockResolvedValue(undefined),
            registerEvent: vi.fn(),
            addCommand: vi.fn((command) => {
                if (!plugin.commands) {
                    plugin.commands = [];
                }
                plugin.commands.push(command);
            }),
            commands: []
        } as unknown as Plugin;

        // Initialize services
        settings = new SettingsService(plugin);
        await settings.loadSettings();
        playerService = PlayerService.getInstance(settings.getSettings());

        // Initialize TranslationsService with French
        TranslationsService.initialize('fr');
    });

    afterEach(() => {
        document.body.removeChild(container);
        vi.clearAllMocks();
        vi.resetModules();
    });

    describe('Settings Tab Translations', () => {
        it('should have settings labels in French', async () => {
            const settingsTab = new SettingsTab(app, plugin, settings, playerService);
            settingsTab.containerEl = container;
            await settingsTab.display();

            // Vérifier les traductions des paramètres
            const labels = container.querySelectorAll('.setting-item-name');
            expect(labels[0]?.textContent).toBe('Mode d\'affichage par défaut');
            expect(labels[1]?.textContent).toBe('Mode de lecture');
            expect(labels[2]?.textContent).toBe('Vitesse de lecture favorite');
            expect(labels[3]?.textContent).toBe('Recommandations YouTube');
        });

        it('should have dropdown options in French', async () => {
            const settingsTab = new SettingsTab(app, plugin, settings, playerService);
            settingsTab.containerEl = container;
            await settingsTab.display();

            // Vérifier les traductions des options
            const dropdowns = container.querySelectorAll('select');
            expect(dropdowns[0]?.options[0]?.text).toBe('Onglet');
            expect(dropdowns[0]?.options[1]?.text).toBe('Barre latérale');
            expect(dropdowns[0]?.options[2]?.text).toBe('Superposition');
            expect(dropdowns[1]?.options[0]?.text).toBe('Streaming');
            expect(dropdowns[1]?.options[1]?.text).toBe('Téléchargement');
        });
    });

    describe('Hotkeys Service Translations', () => {
        it('should have command names in French', () => {
            const hotkeys = new Hotkeys(plugin, settings, playerService, TranslationsService.getInstance());
            hotkeys.registerHotkeys();
            const commands = plugin.commands;

            expect(commands.find(cmd => cmd.id === 'youtube-play-pause')?.name).toBe('Lecture/Pause');
            expect(commands.find(cmd => cmd.id === 'youtube-seek-backward')?.name).toBe('Reculer');
            expect(commands.find(cmd => cmd.id === 'youtube-seek-forward')?.name).toBe('Avancer');
            expect(commands.find(cmd => cmd.id === 'youtube-speed-up')?.name).toBe('Augmenter la vitesse');
            expect(commands.find(cmd => cmd.id === 'youtube-speed-down')?.name).toBe('Diminuer la vitesse');
        });
    });
}); 
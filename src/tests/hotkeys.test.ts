import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { Hotkeys } from '../services/HotkeysService';
import { CommandError, CommandErrorCode } from '../types/IErrors';
import { SettingsService } from '../services/SettingsService';
import { TranslationsService } from '../services/TranslationsService';
import { PlayerService } from '../services/PlayerService';

// Mock Obsidian
vi.mock('obsidian', () => ({
    Notice: class {
        constructor(message: string) {
            console.log('Notice:', message);
        }
    }
}));

interface MockCommand {
   id: string;
   editorCallback: (editor?: any) => void;
}

describe('HotkeysService', () => {
   let hotkeys: Hotkeys;
   let mockPlugin: any;
   let mockSettings: SettingsService;
   let mockPlayerService: PlayerService;
   let mockTranslations: TranslationsService;
   let mockEditor: { replaceSelection: Mock };

   beforeEach(() => {
      mockPlugin = {
         addCommand: vi.fn()
      };
      
      mockSettings = {
         getSettings: () => ({
            favoriteSpeed: 1.5,
            hotkeys: {
               togglePlay: 'space',
               rewind: 'arrowleft',
               forward: 'arrowright',
               speedUp: '>',
               speedDown: '<',
               speedReset: '0',
               toggleMute: 'm',
               favoriteSpeed: 'f',
               toggleFullscreen: 'f',
               insertTimestamp: 't'
            }
         }),
      } as any;

      mockPlayerService = {
         isReady: vi.fn(() => true),
         isPaused: vi.fn(() => true),
         play: vi.fn(),
         pause: vi.fn(),
         getCurrentTime: vi.fn(() => 123), // 2 minutes et 3 secondes
         getDuration: vi.fn(() => 600), // 10 minutes
         seekTo: vi.fn(),
         getPlaybackRate: vi.fn(() => 1),
         setPlaybackRate: vi.fn(),
         toggleMute: vi.fn(),
         toggleFullscreen: vi.fn(),
         getCurrentVideoId: vi.fn(() => 'test-video-id')
      } as any;

      // Initialiser le service de traduction
      TranslationsService.initialize(mockSettings);
      mockTranslations = TranslationsService.getInstance();

      mockEditor = {
         replaceSelection: vi.fn()
      };

      hotkeys = new Hotkeys(
         mockPlugin,
         mockSettings,
         mockPlayerService,
         mockTranslations
      );
   });

   afterEach(() => {
      vi.clearAllMocks();
      // Réinitialiser l'instance du service de traduction
      (TranslationsService as any).instance = undefined;
   });

   it('should set favorite speed correctly', () => {
      hotkeys.registerHotkeys();
      
      const command = mockPlugin.addCommand.mock.calls.find((call: {0: MockCommand}) => 
         call[0].id === 'youtube-set-favorite-speed'
      )[0];
      command.editorCallback();
      
      expect(mockPlayerService.setPlaybackRate).toHaveBeenCalledWith(1.5);
   });

   it('should toggle fullscreen mode', () => {
      hotkeys.registerHotkeys();
      
      const command = mockPlugin.addCommand.mock.calls.find((call: {0: MockCommand}) => 
         call[0].id === 'youtube-toggle-fullscreen'
      )[0];
      command.editorCallback();
      
      expect(mockPlayerService.toggleFullscreen).toHaveBeenCalled();
   });

   it('should insert current timestamp as a clickable YouTube link', () => {
      hotkeys.registerHotkeys();
      
      const command = mockPlugin.addCommand.mock.calls.find((call: {0: MockCommand}) => 
         call[0].id === 'youtube-insert-timestamp'
      )[0];
      command.editorCallback(mockEditor);
      
      const expectedLink = '\n[00:02:03](https://www.youtube.com/watch?v=test-video-id&t=123s)';
      expect(mockEditor.replaceSelection).toHaveBeenCalledWith(expectedLink);
   });

   it('should handle missing video ID when inserting timestamp', () => {
      mockPlayerService.getCurrentVideoId = vi.fn(() => null);

      hotkeys.registerHotkeys();
      
      const command = mockPlugin.addCommand.mock.calls.find((call: {0: MockCommand}) => 
         call[0].id === 'youtube-insert-timestamp'
      )[0];
      
      expect(() => command.editorCallback(mockEditor)).toThrow();
   });

   describe('timestamp insertion with different durations', () => {
      const testCases = [
         { seconds: 30, expected: '00:00:30' },
         { seconds: 61, expected: '00:01:01' },
         { seconds: 3600, expected: '01:00:00' },
         { seconds: 7384, expected: '02:03:04' }, // 2h 3m 4s
         { seconds: 86399, expected: '23:59:59' } // 24h - 1s
      ];

      testCases.forEach(({ seconds, expected }) => {
         it(`should format ${seconds} seconds as ${expected}`, () => {
            mockPlayerService.getCurrentTime = vi.fn(() => seconds);
            
            hotkeys.registerHotkeys();
            const command = mockPlugin.addCommand.mock.calls.find((call: {0: MockCommand}) => 
               call[0].id === 'youtube-insert-timestamp'
            )[0];
            
            command.editorCallback(mockEditor);
            
            const expectedLink = `\n[${expected}](https://www.youtube.com/watch?v=test-video-id&t=${seconds}s)`;
            expect(mockEditor.replaceSelection).toHaveBeenCalledWith(expectedLink);
         });
      });
   });

   describe('error handling', () => {
      it('should handle undefined currentTime', () => {
         mockPlayerService.getCurrentTime = vi.fn(() => undefined);
         
         hotkeys.registerHotkeys();
         const command = mockPlugin.addCommand.mock.calls.find((call: {0: MockCommand}) => 
            call[0].id === 'youtube-insert-timestamp'
         )[0];
         
         expect(() => command.editorCallback(mockEditor)).toThrow(CommandError);
      });

      it('should handle null currentTime', () => {
         mockPlayerService.getCurrentTime = vi.fn(() => null);
         
         hotkeys.registerHotkeys();
         const command = mockPlugin.addCommand.mock.calls.find((call: {0: MockCommand}) => 
            call[0].id === 'youtube-insert-timestamp'
         )[0];
         
         expect(() => command.editorCallback(mockEditor)).toThrow(CommandError);
      });

      it('should handle player not ready', () => {
         mockPlayerService.isReady = vi.fn(() => false);
         
         hotkeys.registerHotkeys();
         const command = mockPlugin.addCommand.mock.calls.find((call: {0: MockCommand}) => 
            call[0].id === 'youtube-insert-timestamp'
         )[0];
         
         expect(() => command.editorCallback(mockEditor)).toThrow(CommandError);
      });
   });

   describe('error translations', () => {
      const errorCases = [
         { code: CommandErrorCode.NO_PLAYER, key: 'error.player.noPlayer', translation: 'Aucun lecteur disponible' },
         { code: CommandErrorCode.INVALID_STATE, key: 'error.player.invalidState', translation: 'État invalide' },
         { code: CommandErrorCode.PLAYBACK_ERROR, key: 'error.player.playbackError', translation: 'Erreur de lecture' }
      ];

      beforeEach(() => {
         mockPlugin.addCommand.mockClear();
      });

      errorCases.forEach(({ code, key, translation }) => {
         it(`should translate ${code} error correctly`, () => {
            // Configurer le mock selon le type d'erreur
            switch (code) {
               case CommandErrorCode.NO_PLAYER:
                  mockPlayerService.isReady = vi.fn(() => false);
                  break;
               case CommandErrorCode.INVALID_STATE:
                  mockPlayerService.getCurrentTime = vi.fn(() => 'not a number');
                  break;
               case CommandErrorCode.PLAYBACK_ERROR:
                  mockPlayerService.play = vi.fn(() => {
                     throw new CommandError(CommandErrorCode.PLAYBACK_ERROR, 'Playback failed');
                  });
                  break;
            }
            
            hotkeys = new Hotkeys(
               mockPlugin,
               mockSettings,
               mockPlayerService,
               mockTranslations
            );
            
            hotkeys.registerHotkeys();
            const commandId = code === CommandErrorCode.PLAYBACK_ERROR ? 'youtube-play-pause' : 'youtube-insert-timestamp';
            const command = mockPlugin.addCommand.mock.calls.find((call: {0: MockCommand}) => 
               call[0].id === commandId
            )[0];
            
            expect(() => command.editorCallback(mockEditor)).toThrow(CommandError);
         });
      });
   });
});

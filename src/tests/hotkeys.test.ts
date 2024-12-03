import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { Hotkeys } from '../services/hotkeys/HotkeysService';
import { CommandError, CommandErrorCode } from '../types/errors';

interface MockCommand {
   id: string;
   editorCallback: (editor?: any) => void;
}

describe('HotkeysService', () => {
   let hotkeys: Hotkeys;
   let mockPlugin: any;
   let mockSettings: any;
   let mockVideoPlayer: any;
   let mockTranslations: any;
   let mockEditor: { replaceSelection: Mock };

   beforeEach(() => {
      mockPlugin = {
         addCommand: vi.fn()
      };
      
      mockSettings = {
         getSettings: () => ({
            favoriteSpeed: 1.5,
            hotkeys: { favoriteSpeed: 'f' }
         })
      };

      mockVideoPlayer = {
         Player: {
            playbackRate: vi.fn(),
            requestFullscreen: vi.fn(),
            currentTime: vi.fn(() => 123), // 2 minutes et 3 secondes
         },
         getCurrentVideoId: vi.fn(() => 'test-video-id')
      };

      mockTranslations = {
         translate: vi.fn((key) => key)
      };

      mockEditor = {
         replaceSelection: vi.fn()
      };

      hotkeys = new Hotkeys(
         mockPlugin,
         mockSettings,
         mockVideoPlayer,
         mockTranslations
      );
   });

   it('should set favorite speed correctly', () => {
      hotkeys.registerHotkeys();
      
      const command = mockPlugin.addCommand.mock.calls.find((call: {0: MockCommand}) => 
         call[0].id === 'youtube-set-favorite-speed'
      )[0];
      command.editorCallback();
      
      expect(mockVideoPlayer.Player.playbackRate).toHaveBeenCalledWith(1.5);
   });

   it('should toggle fullscreen mode', () => {
      hotkeys.registerHotkeys();
      
      const command = mockPlugin.addCommand.mock.calls.find((call: {0: MockCommand}) => 
         call[0].id === 'youtube-toggle-fullscreen'
      )[0];
      command.editorCallback();
      
      expect(mockVideoPlayer.Player.requestFullscreen).toHaveBeenCalled();
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
      mockVideoPlayer.getCurrentVideoId = vi.fn(() => null);

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
            mockVideoPlayer.Player.currentTime = vi.fn(() => seconds);
            
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
         mockVideoPlayer.Player.currentTime = vi.fn(() => undefined);
         
         hotkeys.registerHotkeys();
         const command = mockPlugin.addCommand.mock.calls.find((call: {0: MockCommand}) => 
            call[0].id === 'youtube-insert-timestamp'
         )[0];
         
         expect(() => command.editorCallback(mockEditor)).toThrow(CommandError);
         expect(mockTranslations.translate).toHaveBeenCalledWith('errors.INVALID_STATE');
      });

      it('should handle null currentTime', () => {
         mockVideoPlayer.Player.currentTime = vi.fn(() => null);
         
         hotkeys.registerHotkeys();
         const command = mockPlugin.addCommand.mock.calls.find((call: {0: MockCommand}) => 
            call[0].id === 'youtube-insert-timestamp'
         )[0];
         
         expect(() => command.editorCallback(mockEditor)).toThrow(CommandError);
         expect(mockTranslations.translate).toHaveBeenCalledWith('errors.INVALID_STATE');
      });

      it('should handle missing Player object', () => {
         mockVideoPlayer.Player = null;
         
         hotkeys.registerHotkeys();
         const command = mockPlugin.addCommand.mock.calls.find((call: {0: MockCommand}) => 
            call[0].id === 'youtube-insert-timestamp'
         )[0];
         
         expect(() => command.editorCallback(mockEditor)).toThrow(CommandError);
         expect(mockTranslations.translate).toHaveBeenCalledWith('errors.NO_PLAYER');
      });
   });

   describe('error translations', () => {
      const errorCases = [
         { code: CommandErrorCode.NO_PLAYER, key: 'errors.NO_PLAYER', translation: 'Aucun lecteur disponible' },
         { code: CommandErrorCode.INVALID_STATE, key: 'errors.INVALID_STATE', translation: 'État invalide' },
         { code: CommandErrorCode.PLAYBACK_ERROR, key: 'errors.PLAYBACK_ERROR', translation: 'Erreur de lecture' }
      ];

      errorCases.forEach(({ code, key, translation }) => {
         it(`should translate ${code} error correctly`, () => {
            mockTranslations.translate = vi.fn((k) => k === key ? translation : k);
            mockVideoPlayer.Player = null;
            
            hotkeys.registerHotkeys();
            const command = mockPlugin.addCommand.mock.calls.find((call: {0: MockCommand}) => 
               call[0].id === 'youtube-insert-timestamp'
            )[0];
            
            expect(() => command.editorCallback(mockEditor)).toThrow(CommandError);
            expect(mockTranslations.translate).toHaveBeenCalledWith(key);
         });
      });
   });
});

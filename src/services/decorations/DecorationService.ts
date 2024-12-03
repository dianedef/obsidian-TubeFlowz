import { EditorView } from '@codemirror/view';
import { Decoration, WidgetType } from '@codemirror/view';
import { ViewMode, VIEW_MODES } from '../../types/settings';
import { extractVideoId, cleanVideoId, type CleanVideoId } from '../../utils';
import { SettingsService } from '../settings/SettingsService';
import PlayerService from '../player/PlayerService';

export default function createDecorations(view: EditorView, settings: SettingsService) {
   const decorations = [];
   const doc = view.state.doc;
   
   for (let pos = 0; pos < doc.length;) {
      const line = doc.lineAt(pos);
      const lineText = line.text;
      
      const linkRegex = /(?:\[([^\]]+)\]\(([^)]+)\)|(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+))/g;
      let match;
      
      while ((match = linkRegex.exec(lineText)) !== null) {
         const fullMatch = match[0];
         const url = match[2] || fullMatch;
         const startPos = line.from + match.index;
         const endPos = startPos + fullMatch.length;
         
         const videoId = extractVideoId(url);
         if (videoId) {
            const cleanedId = cleanVideoId(videoId);
            decorations.push(Decoration.mark({
               class: "youtube-link",
               attributes: {
                  "data-video-id": cleanedId
               },
               inclusive: false
            }).range(startPos, endPos));
            
            decorations.push(Decoration.widget({
               widget: new DecorationForUrl(cleanedId, settings),
               side: 1
            }).range(endPos));
         }
      }
      
      pos = line.to + 1;
   }
   
   return Decoration.set(decorations, true);
}

export class DecorationForUrl extends WidgetType {
   private videoId: CleanVideoId;
   private timestamp: number = 0;
   private settings: SettingsService;

   constructor(videoId: CleanVideoId, settings: SettingsService) {
      super();
      this.videoId = videoId;
      this.settings = settings;
   }
      
   toDOM(): HTMLElement {
      const sparkle = document.createElement('button');
      sparkle.textContent = '▶️▶️ Ouvrir le player ✨';
      sparkle.className = 'youtube-sparkle-decoration';
      sparkle.setAttribute('aria-label', 'Ouvrir le player YouTube');
      sparkle.setAttribute('data-video-id', this.videoId);
      sparkle.style.cssText = `
         cursor: pointer;
         user-select: none;
         pointer-events: all;
         background: none;
         border: none;
         padding: 2px;
         margin-left: 4px;
         position: relative;
         display: inline-block;
      `;
      
      sparkle.addEventListener('click', async (e: MouseEvent) => {
         e.preventDefault();
         e.stopPropagation();
         const playerService = PlayerService.getInstance(this.settings.getSettings());
         if (!playerService) {
            console.error("PlayerService non initialisé");
            return;
         }
         await playerService.loadVideo({
            videoId: this.videoId,
            mode: this.settings.currentMode || VIEW_MODES.Sidebar,
            timestamp: this.timestamp,
            fromUserClick: true
         });
      });
      
      return sparkle;
   }
}
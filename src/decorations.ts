import { EditorView } from '@codemirror/view';
import { Decoration, WidgetType } from '@codemirror/view';
import { Store } from './store';
import { VideoMode } from './types';
import { extractVideoId, cleanVideoId } from './utils';

export function createDecorations(view: EditorView) {
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
               widget: new DecorationForUrl(cleanedId),
               side: 1
            }).range(endPos));
         }
      }
      
      pos = line.to + 1;
   }
   
   return Decoration.set(decorations, true);
}

export class DecorationForUrl extends WidgetType {
   private videoId: string;
   private timestamp: number = 0;

   constructor(videoId: string) {
      super();
      this.videoId = videoId;
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
         const store = Store.get();
         if (!store.PlayerViewAndMode || !store.Settings) {
            console.error("Store non initialisé");
            return;
         }
         await store.PlayerViewAndMode.displayVideo({
            videoId: this.videoId,
            mode: store.Settings.currentMode || 'sidebar' as VideoMode,
            timestamp: this.timestamp,
            fromUserClick: true
         });
      });
      
      return sparkle;
   }
}
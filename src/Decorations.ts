import { EditorView, Decoration, WidgetType } from '@codemirror/view';

function extractVideoId(url: string): string | null {
   const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
   return match ? match[1] : null;
}

function cleanVideoId(id: string): string {
   return id.replace(/[^a-zA-Z0-9_-]/g, '');
}

class DecorationForUrl extends WidgetType {
   private videoId: string;

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
      
      sparkle.addEventListener('click', () => {
         // On utilisera cette fonction plus tard pour ouvrir le player
         console.log("Video ID à charger:", this.videoId);
      });
      
      return sparkle;
   }
}

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
               }
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
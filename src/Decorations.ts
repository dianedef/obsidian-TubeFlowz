import { EditorView, Decoration, WidgetType, ViewPlugin, DecorationSet } from '@codemirror/view';
import { RangeSetBuilder, Extension, Transaction, StateField, StateEffect } from '@codemirror/state';
import { YouTube } from './YouTube';
import { App, TFile } from 'obsidian';

function extractVideoId(url: string): string | null {
   const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
   return match ? match[1] : null;
}

function extractTimestamp(url: string): number | null {
   const match = url.match(/[?&]t=(\d+)/);
   if (match) {
      return parseInt(match[1], 10);
   }
   return null;
}

function cleanVideoId(id: string): string {
   return id.replace(/[^a-zA-Z0-9_-]/g, '');
}

class DecorationForUrl extends WidgetType {
   private videoId: string;
   private timestamp: number | null;
   private app: App;

   constructor(videoId: string, timestamp: number | null, app: App) {
      super();
      this.videoId = videoId;
      this.timestamp = timestamp;
      this.app = app;
   }
      
   toDOM(): HTMLElement {
      const sparkle = document.createElement('button');
      sparkle.textContent = '▶️▶️ Ouvrir le player ✨';
      sparkle.className = 'youtube-sparkle-decoration';
      sparkle.setAttribute('aria-label', 'Ouvrir le player YouTube');
      sparkle.setAttribute('data-video-id', this.videoId);
      if (this.timestamp !== null) {
         sparkle.setAttribute('data-timestamp', this.timestamp.toString());
      }
      
      sparkle.addEventListener('click', async () => {
         try {
            console.log('DecorationForUrl: Ouvrir le player YouTube avec id:', this.videoId, 'timestamp:', this.timestamp);
            const view = this.app.workspace.getLeavesOfType('youtube-player')[0]?.view as YouTube;
            await view.loadVideo(this.videoId, true, this.timestamp || undefined);
         } catch (error) {
            console.error('Erreur lors du chargement de la vidéo:', error);
         }
      });
      
      return sparkle;
   }
}

export function createDecorations(view: EditorView, app: App) {
   console.log("📍 Création des décorations...");
   const builder = new RangeSetBuilder<Decoration>();
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
         const timestamp = extractTimestamp(url);
         
         if (videoId) {
            const cleanedId = cleanVideoId(videoId);
            builder.add(startPos, endPos, Decoration.mark({
               class: "youtube-link",
               attributes: {
                  "data-video-id": cleanedId,
                  ...(timestamp !== null && { "data-timestamp": timestamp.toString() })
               }
            }));
            
            builder.add(endPos, endPos, Decoration.widget({
               widget: new DecorationForUrl(cleanedId, timestamp, app),
               side: 1
            }));
         }
      }
      
      pos = line.to + 1;   
   }
   
   const result = builder.finish();
   console.log("✅ Décorations créées");
   return result;
} 

export const youtubeDecorations = (app: App): Extension => {
   return ViewPlugin.fromClass(class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
         this.decorations = createDecorations(view, app);
      }

      update(update) {
         if (update.docChanged) {
            this.decorations = createDecorations(update.view, app);
         }
         return this.decorations;
      }
   }, {
      decorations: v => v.decorations
   });
}; 
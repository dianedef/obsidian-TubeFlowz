const { Plugin } = require('obsidian');
const { ViewPlugin, Decoration, WidgetType } = require('@codemirror/view');

class SparkleLinkPlugin extends Plugin {
   async onload() {
      this.registerEditorExtension([
         this.createSparkleDecorationPlugin()
      ]);
   }

   createSparkleDecorationPlugin() {
      const plugin = this;
      return ViewPlugin.fromClass(class {
         constructor(view) {
               this.app = plugin.app;
               this.decorations = this.buildDecorations(view);
         }

         update(update) {
               if (update.docChanged) {
                  this.decorations = this.buildDecorations(update.view);
               }
         }

         buildDecorations(view) {
               const decorations = [];
               
               // Obtenir le fichier actif via l'app
               const activeFile = this.app.workspace.getActiveFile();
               console.log("Fichier actif:", activeFile?.path);
               
               if (!activeFile) {
                  console.log("Aucun fichier actif");
                  return Decoration.none;
               }
               
               // Obtenir le contenu du document
               const docContent = view.state.doc.toString();
               console.log("Contenu du document:", docContent);
               
               // Rechercher les liens Markdown standard [texte](url)
               const markdownLinkRegex = /\[([^\]]+)\]\(([^\)]+)\)/g;
               let match;
               
               while ((match = markdownLinkRegex.exec(docContent)) !== null) {
                  const fullMatch = match[0];
                  const linkText = match[1];
                  const url = match[2];
                  const pos = match.index + fullMatch.length;
                  
                  console.log("Lien Markdown trouvé:", {
                     texte: linkText,
                     url: url,
                     position: pos
                  });
                  
                  // Création de la décoration avec la structure complète
                  const sparkleDecoration = Decoration.widget({
                        widget: new class extends WidgetType {
                           toDOM() {
                              const sparkle = document.createElement('span');
                              sparkle.innerHTML = '✨';
                              sparkle.setAttribute('aria-label', 'Sparkle decoration');
                              sparkle.className = 'sparkle-decoration';
                              sparkle.style.display = 'inline-block';
                              sparkle.style.marginLeft = '2px';
                              return sparkle;
                           }
                           
                           eq(other) { return true; }
                           
                           destroy() { }
                           
                           estimatedHeight = -1;
                           
                           ignoreEvent() { return true; }
                        },
                        side: 1,
                        block: false,
                        startSide: 1,
                        endSide: 1
                  });
                  
                  decorations.push(sparkleDecoration.range(pos));
               }
               
               console.log("Nombre total de décorations:", decorations.length);
               return Decoration.set(decorations, true);
         }
      }, {
         decorations: v => v.decorations
      });
   }
}

module.exports = SparkleLinkPlugin;
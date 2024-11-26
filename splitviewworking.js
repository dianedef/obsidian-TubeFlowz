const { Plugin, WorkspaceLeaf, MarkdownView } = require('obsidian');
class SplitViewPlugin extends Plugin {
   async onload() {
      console.log("SplitViewPlugin loaded");
      
      // Attendre que l'application soit prête
      this.app.workspace.onLayoutReady(async () => {
         await this.createVerticalSplit();
      });

      this.addCommand({
         id: 'create-vertical-split',
         name: 'Créer une vue divisée verticale',
         callback: () => this.createVerticalSplit()
      });
   }

   async createVerticalSplit() {
      // Créer une nouvelle feuille à droite
      const newLeaf = this.app.workspace.splitActiveLeaf('vertical');
      
      // Créer un conteneur pour l'iframe
      const container = newLeaf.view.containerEl.children[0];
      container.empty();
      
      // Ajouter un style pour contrôler la hauteur du conteneur
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.height = '100%';
      
      // Créer l'iframe pour YouTube
      const iframe = document.createElement('iframe');
      iframe.setAttribute('src', 'https://www.youtube.com/embed/Rkv4rrdFBU0');
      iframe.setAttribute('width', '100%');
      iframe.setAttribute('height', '100%');
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allowfullscreen', 'true');
      
      // Ajouter l'iframe au conteneur
      container.appendChild(iframe);
   }
}

module.exports = SplitViewPlugin;
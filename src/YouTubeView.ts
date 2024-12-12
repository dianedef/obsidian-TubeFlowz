import { ItemView, WorkspaceLeaf, Plugin } from 'obsidian';

export class YouTubeView extends ItemView {
   private isDragging: boolean = false;
   private startY: number = 0;
   private startHeight: number = 0;
   private resizeObserver: ResizeObserver | null = null;
   private playerContainer: HTMLElement | null = null;
   private plugin: Plugin;

   constructor(leaf: WorkspaceLeaf, plugin: Plugin) {
      super(leaf);
      this.plugin = plugin;
   }

   getViewType(): string {
      return "youtube-player";
   }

   getDisplayText(): string {
      return "YouTube Player";
   }

   async onOpen() {
      const container = this.containerEl;
      container.empty();
      
      const contentEl = container.createDiv({ cls: 'youtube-player-container' });
      contentEl.createEl('h4', { text: 'YouTube Player' });
      
      const playerEl = contentEl.createDiv({ cls: 'youtube-player-embed' });
      this.playerContainer = playerEl;

      // Récupérer la hauteur sauvegardée ou utiliser la valeur par défaut
      const savedHeight = await this.plugin.loadData();
      const height = savedHeight?.playerHeight || '60vh';
      
      playerEl.style.cssText = `
         width: 100%;
         height: ${height};
         background: var(--background-secondary);
         display: flex;
         align-items: center;
         justify-content: center;
         position: relative;
      `;
      
      playerEl.createSpan({ text: 'Prêt à lire une vidéo YouTube' });

      this.addResizeHandle(playerEl);
   }

   private addResizeHandle(container: HTMLElement): void {
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'youtube-resize-handle';
      container.appendChild(resizeHandle);

      resizeHandle.addEventListener('mousedown', (e: Event) => {
         if (e instanceof MouseEvent) {
            this.handleResizeStart(e);
         }
      });

      document.addEventListener('mousemove', (e: Event) => {
         if (e instanceof MouseEvent) {
            this.handleResizeMove(e);
         }
      });

      document.addEventListener('mouseup', () => {
         this.handleResizeEnd();
      });

      this.resizeObserver = new ResizeObserver(entries => {
         for (const entry of entries) {
            const height = entry.contentRect.height;
            if (height < 100) container.style.height = '100px';
            if (height > window.innerHeight * 0.9) {
               container.style.height = `${window.innerHeight * 0.9}px`;
            }
         }
      });
      this.resizeObserver.observe(container);
   }

   private handleResizeStart(e: MouseEvent): void {
      if (!this.playerContainer) return;
      this.isDragging = true;
      this.startY = e.clientY;
      this.startHeight = this.playerContainer.clientHeight;
   }

   private handleResizeMove(e: MouseEvent): void {
      if (!this.isDragging || !this.playerContainer) return;
      
      const delta = e.clientY - this.startY;
      let newHeight = this.startHeight + delta;
      
      newHeight = Math.max(100, Math.min(newHeight, window.innerHeight * 0.9));
      this.playerContainer.style.height = `${newHeight}px`;
   }

   private handleResizeEnd(): void {
      this.isDragging = false;
      if (this.playerContainer) {
         const height = this.playerContainer.style.height;
         this.plugin.saveData({ playerHeight: height });
      }
   }

   async onClose() {
      if (this.resizeObserver) {
         this.resizeObserver.disconnect();
      }
   }
} 
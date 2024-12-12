import { Plugin, addIcon, Menu } from 'obsidian';
import { EditorView, ViewPlugin, ViewUpdate, DecorationSet } from '@codemirror/view';
import { YOUTUBE_ICON } from './constants';
import { ViewModeService } from './ViewModeService';
import { YouTubeView } from './YouTubeView';
import { ViewMode } from './types';
import { registerStyles } from './RegisterStyles';
import { createDecorations } from './Decorations';

interface DecorationState {
   decorations: DecorationSet;
   settings: any;
   viewModeService: ViewModeService;
   update(update: ViewUpdate): void;
}

export default class YoutubeReaderPlugin extends Plugin {
   private viewModeService!: ViewModeService;

   async onload() {
      this.registerView(
         "youtube-player",
         (leaf) => {
            const view = new YouTubeView(leaf, this);
            return view;
         }
      );
      
      this.viewModeService = new ViewModeService(this);
      
      this.registerEditorExtension([
         ViewPlugin.define<DecorationState>(view => ({
            decorations: createDecorations(view),
            settings: this.settings,
            viewModeService: this.viewModeService,
            update(update: ViewUpdate) {
               if (update.docChanged || update.viewportChanged) {
                  this.decorations = createDecorations(update.view);
               }
            }
         }), {
            decorations: v => v.decorations
         })
      ]);

      addIcon('youtube', YOUTUBE_ICON);
      const ribbonIcon = this.addRibbonIcon('youtube', 'YouTube Reader', () => {});

      ribbonIcon.addEventListener('mouseenter', () => {
            const menu = new Menu();

            const createMenuItem = (title: string, icon: string, mode: ViewMode) => {
               menu.addItem((item) => {
                  item.setTitle(title)
                        .setIcon(icon)
                        .onClick(async () => {
                           await this.viewModeService.setView(mode);
                        });
               });
            };

            createMenuItem("YouTube Tab", "tab", "tab");
            createMenuItem("YouTube Sidebar", "layout-sidebar-right", "sidebar");
            createMenuItem("YouTube Overlay", "layout-top", "overlay");

            const iconRect = ribbonIcon.getBoundingClientRect();
            menu.showAtPosition({ 
               x: iconRect.left, 
               y: iconRect.top - 10
            });

            const handleMouseLeave = (e: MouseEvent) => {
               const target = e.relatedTarget as Node;
               const menuDom = (menu as any).dom;
               const isOverIcon = ribbonIcon.contains(target);
               const isOverMenu = menuDom && menuDom.contains(target);
               
               if (!isOverIcon && !isOverMenu) {
                  menu.hide();
                  ribbonIcon.removeEventListener('mouseleave', handleMouseLeave);
                  if (menuDom) {
                        menuDom.removeEventListener('mouseleave', handleMouseLeave);
                  }
               }
            };

            ribbonIcon.addEventListener('mouseleave', handleMouseLeave);
            const menuDom = (menu as any).dom;
            if (menuDom) {
               menuDom.addEventListener('mouseleave', handleMouseLeave);
            }
      });

      registerStyles();
   }

   onunload() {
      this.app.workspace.detachLeavesOfType("youtube-player");
   }
}

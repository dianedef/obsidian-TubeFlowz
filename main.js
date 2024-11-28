"use strict";var I=Object.defineProperty;var k=(u,e,s)=>e in u?I(u,e,{enumerable:!0,configurable:!0,writable:!0,value:s}):u[e]=s;var V=(u,e,s)=>(k(u,typeof e!="symbol"?e+"":e,s),s);const f=require("obsidian"),b=require("@codemirror/view");require("@codemirror/state");require("@codemirror/language");const h=class h{constructor(e){if(h.instance)return h.instance;this.app=e.app,this.plugin=e,this.settingsManager=null,this.videoManager=null,this.player=null,this.resizeHandler=null,h.instance=this}static async init(e){const s=new h(e);return s.settingsManager=new T,await s.settingsManager.load(),s.videoManager=new E,s.resizeHandler=new H,s}static get(){if(!h.instance)throw new Error("Store not initialized! Call Store.init(plugin) first");return h.instance}};V(h,"instance",null);let g=h;class T{constructor(){const{plugin:e}=g.get();this.youtubeFlowPlugin=e,this.settings={lastVideoId:"aZyghlNOmiU",isVideoOpen:null,playlist:[],currentMode:null,viewHeight:60,overlayHeight:60}}async load(){const e=await this.youtubeFlowPlugin.loadData()||{};this.settings={...this.settings,...e},console.log("Settings chargées:",this.settings)}async save(){await this.youtubeFlowPlugin.saveData(this.settings),console.log("Settings sauvegardées:",this.settings)}}class E{constructor(){const{app:e,settingsManager:s}=g.get();this.app=e,this.settingsManager=s,this.activeLeafId=s.settings.activeLeafId||null,this.activeView=null}async displayVideo(e,s){console.log(`displayVideo() ${e} en mode ${s}`),this.settingsManager.settings.isVideoOpen&&this.settingsManager.settings.currentMode!==s&&(console.log("Changement de mode détecté, fermeture des vues précédentes"),await this.closePreviousVideos(),this.activeLeafId=null),this.settingsManager.settings.isChangingMode=!0,this.settingsManager.settings.currentMode=s;let i=null;if(this.activeLeafId&&this.settingsManager.settings.currentMode===s&&(i=this.app.workspace.getLeavesOfType("youtube-player").find(a=>a.id===this.activeLeafId)),i&&this.settingsManager.settings.currentMode===s)console.log("Réutilisation de la leaf existante:",this.activeLeafId),await i.setViewState({type:"youtube-player",state:{videoId:e}});else switch(s){case"sidebar":await this.createSidebarView(e);break;case"tab":await this.createTabView(e);break;case"overlay":await this.createOverlayView(e);break}this.settingsManager.settings.lastVideoId=e,this.settingsManager.settings.isVideoOpen=!0,this.settingsManager.settings.activeLeafId=this.activeLeafId,this.settingsManager.settings.isChangingMode=!1,await this.settingsManager.save()}async restoreLastSession(){const e=this.settingsManager.settings;console.log("lancement de restoreLastSession",e),e.isVideoOpen&&e.lastVideoId&&e.currentMode?(await this.closePreviousVideos(),console.log("Restauration de la session avec:",{videoId:e.lastVideoId,mode:e.currentMode}),e.currentMode==="overlay"?setTimeout(()=>{this.displayVideo(e.lastVideoId,e.currentMode)},500):await this.displayVideo(e.lastVideoId,e.currentMode)):(e.isVideoOpen=!1,await this.settingsManager.save())}async closePreviousVideos(){console.log("=== Début closePreviousVideos ==="),document.querySelectorAll(".youtube-overlay").forEach(i=>{const t=i.closest(".workspace-leaf");if(t){const a=t.querySelector(".cm-editor");a&&(a.style.height="100%",a.style.top="0")}i.remove()});const s=this.app.workspace.getLeavesOfType("youtube-player");for(const i of s)i&&!i.detached&&i.detach();this.activeView=null,this.activeLeafId=null,this.settingsManager.settings.isVideoOpen=!1,console.log("État après fermeture:",{activeLeafId:this.activeLeafId}),await this.settingsManager.save()}async createSidebarView(e){const i=this.app.workspace.getLeavesOfType("youtube-player").find(a=>a.getViewState().type==="youtube-player"&&a.parent.type!=="split");let t;i?(t=i,await t.setViewState({type:"youtube-player",state:{videoId:e}})):(await this.closePreviousVideos(),t=this.app.workspace.getRightLeaf(!1),await t.setViewState({type:"youtube-player",state:{videoId:e}}),this.app.workspace.revealLeaf(t)),this.activeLeafId=t.id,this.activeView=t.view}async createTabView(e){const i=this.app.workspace.getLeavesOfType("youtube-player").find(a=>a.getViewState().type==="youtube-player"&&a.parent.type==="split");let t;i?(t=i,await t.setViewState({type:"youtube-player",state:{videoId:e}})):(await this.closePreviousVideos(),t=this.app.workspace.getLeaf("split"),await t.setViewState({type:"youtube-player",state:{videoId:e}})),this.activeLeafId=t.id,this.activeView=t.view,this.app.workspace.setActiveLeaf(t)}async createOverlayView(e){const s=this.app.workspace.activeLeaf;if(!s)return;const i=s.view.containerEl.querySelector(".youtube-overlay");if(i&&s.id===this.activeLeafId){const n=i.querySelector("iframe");if(n){n.src=`https://www.youtube.com/embed/${e}`;return}}this.activeLeafId=s.id,this.activeView=s.view,console.log("Nouvelle overlay créée avec ID:",this.activeLeafId);const t=s.view.containerEl.querySelector(".cm-editor");if(!t)return;this.settingsManager.settings.overlayLeafId=s.id;const a=this.settingsManager.settings.overlayHeight||60;t.style.height=`${100-a}%`,t.style.position="relative",t.style.top=`${a}%`;const l=s.view.containerEl.createDiv("youtube-overlay");l.style.cssText=`
         position: absolute;
         top: 0;
         left: 0;
         width: 100%;
         height: ${a}%;
         background: var(--background-primary);
         z-index: 100;
         display: flex;
         flex-direction: column;
         align-items: center;
      `;const r=l.createDiv("youtube-overlay-close");r.innerHTML="✕",r.style.cssText=`
         cursor: pointer;
         padding: 5px;
         background: var(--background-secondary);
         border-radius: 3px;
         opacity: 0.8;
      `;const{resizeHandler:c}=g.get();c.createResizer({container:s.view.containerEl,targetElement:l,mode:"overlay",onResize:n=>{l.style.height=`${n}%`,t.style.height=`${100-n}%`,t.style.top=`${n}%`}});const d=l.createDiv("youtube-view-controls");d.style.cssText=`
         position: absolute;
         top: 10px;
         right: 10px;
         z-index: 101;
         display: flex;
         gap: 5px;
      `,d.appendChild(r);const o=document.createElement("iframe");o.src=`https://www.youtube.com/embed/${e}`,o.style.cssText=`
         width: 100%;
         height: 100%;
         border: none;
      `,l.appendChild(o),r.addEventListener("click",async()=>{const{videoManager:n}=g.get();await n.closePreviousVideos()}),this.settingsManager.settings.lastVideoId=e,this.settingsManager.settings.isVideoOpen=!0,this.settingsManager.settings.currentMode="overlay",this.registerOverlayCleanup(s,l,t)}registerOverlayCleanup(e,s,i){const t=()=>{s.remove(),i&&(i.style.height="100%",i.style.top="0"),this.settingsManager.settings.isVideoOpen=!1,this.settingsManager.settings.overlayLeafId=null,this.settingsManager.save()};e.on("unload",t)}}class S extends f.PluginSettingTab{constructor(e,s){super(e,s);const{settingsManager:i}=g.get();this.settingsManager=i}display(){const{containerEl:e}=this;e.empty(),new f.Setting(e).setName("Mode d'affichage par défaut").setDesc("Choisissez comment les vidéos s'ouvriront par défaut").addDropdown(s=>s.addOption("tab","Onglet").addOption("sidebar","Barre latérale").addOption("overlay","Superposition").setValue(this.settingsManager.settings.currentMode).onChange(async i=>{this.settingsManager.settings.currentMode=i,await this.settingsManager.save()}))}}class C extends f.ItemView{constructor(e,s){super(e);const{settingsManager:i}=g.get();this.settingsManager=i,this.videoId=null,this.activeLeafId=s,this.contentEl.addClass("markdown-source-view"),this.contentEl.addClass("mod-cm6"),this.contentEl.style.background="var(--background-primary)",this.contentEl.empty();const{app:t}=g.get(),a=t.workspace.getActiveFile();a?t.vault.append(a,"").catch(l=>{console.log("Erreur lors de l'initialisation de la vue Markdown:",l)}):this.contentEl.createDiv("markdown-preview-view")}getViewType(){return"youtube-player"}getDisplayText(){return"YouTube Player"}getState(){return{videoId:this.videoId}}async setState(e){this.videoId=e.videoId,await this.onOpen()}async onOpen(){const e=this.containerEl.children[1];e.empty(),e.style.background="var(--background-primary)";const s=this.leaf.getViewState().state.videoId;console.log(`YouTubePlayerView.onOpen() - videoId: ${s}`),e.style.cssText=`
         display: flex;
         flex-direction: column;
         align-items: center;
         height: 100%;
         background: var(--background-primary);
         position: relative;
      `;const i=e.createDiv("youtube-view-controls");i.style.cssText=`
         position: absolute;
         top: 10px;
         right: 10px;
         z-index: 101;
         display: flex;
         gap: 5px;
      `;const t=i.createDiv("youtube-view-close");t.innerHTML="✕",t.style.cssText=`
         cursor: pointer;
         padding: 5px;
         background: var(--background-secondary);
         border-radius: 3px;
         opacity: 0.8;
      `,t.addEventListener("click",async()=>{const{videoManager:o}=g.get();await o.closePreviousVideos()});const l=this.settingsManager.settings.currentMode==="overlay"?this.settingsManager.settings.overlayHeight:this.settingsManager.settings.viewHeight,r=document.createElement("div");r.style.cssText=`
         width: 100%;
         height: ${l||60}%; 
         min-height: 100px;
         position: relative;
      `;const c=document.createElement("iframe");c.src=`https://www.youtube.com/embed/${s}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&rel=0&modestbranding=1&permissions-policy=ch-ua-form-factors=()`,c.allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",c.setAttribute("sandbox","allow-same-origin allow-scripts allow-popups allow-presentation"),c.style.cssText=`
         width: 100%;
         height: 100%;
         border: none;
      `;const{resizeHandler:d}=g.get();d.createResizer({container:e,targetElement:r,mode:this.settingsManager.settings.currentMode,onResize:o=>{r.style.height=`${o}%`}}),i.appendChild(t),r.appendChild(c),e.appendChild(r)}async onClose(){this.app.workspace.getLeavesOfType("youtube-player").length<=1&&!this.settingsManager.settings.isChangingMode&&(this.settingsManager.settings.isVideoOpen=!1,await this.settingsManager.save()),console.log("onClose avec settings :",this.settingsManager.settings)}}class O extends f.Plugin{async onload(){await g.init(this);const{videoManager:e,settingsManager:s}=g.get();this.app.workspace.onLayoutReady(()=>{if(console.log("Layout prêt, initialisation des écouteurs..."),s.settings.isVideoOpen&&s.settings.currentMode==="overlay"){let t=null;const a=this.app.workspace.activeLeaf;a&&(t=a.view.containerEl.querySelector(".cm-editor"),t&&(t.style.opacity="0",t.style.transition="opacity 0.3s ease")),setTimeout(()=>{e.displayVideo(s.settings.lastVideoId,s.settings.currentMode).then(()=>{t&&(t.style.opacity="1")})},100)}this.registerView("youtube-player",t=>new C(t,e.activeLeafId)),this.registerEvent(this.app.workspace.on("leaf-closed",t=>{if(console.log("evenement leaf-closed détecté!",{ferméeId:t==null?void 0:t.id,activeId:e==null?void 0:e.activeLeafId,match:(t==null?void 0:t.id)===(e==null?void 0:e.activeLeafId)}),!t){console.log("Feuille fermée détectée!",{ferméeId:t==null?void 0:t.id,activeId:e==null?void 0:e.activeLeafId,match:(t==null?void 0:t.id)===(e==null?void 0:e.activeLeafId)});return}e&&(t!=null&&t.id)&&t.id===e.activeLeafId&&console.log("Vue YouTube fermée manuellement, nettoyage...")}))});const i=this.addRibbonIcon("video","YouTube Flow",t=>{});i.addEventListener("mouseenter",t=>{const a=new f.Menu;a.addItem(d=>{d.setTitle("YouTube Tab").setIcon("tab").onClick(async()=>{const o=document.querySelector(".youtube-overlay");if(o){const n=parseFloat(o.style.height);isNaN(n)||(s.settings.viewHeight=n,s.settings.overlayHeight=n,await s.save())}await e.closePreviousVideos(),e.activeLeafId=null,e.displayVideo(s.settings.lastVideoId||"default-id","tab")})}),a.addItem(d=>{d.setTitle("YouTube Sidebar").setIcon("layout-sidebar-right").onClick(async()=>{const o=document.querySelector(".youtube-overlay");if(o){const n=parseFloat(o.style.height);isNaN(n)||(s.settings.viewHeight=n,s.settings.overlayHeight=n,await s.save())}await e.closePreviousVideos(),e.activeLeafId=null,e.displayVideo(s.settings.lastVideoId||"default-id","sidebar")})}),a.addItem(d=>{d.setTitle("YouTube Overlay").setIcon("layout-top").onClick(async()=>{const o=document.querySelector('.youtube-player div[style*="height"]');if(o){const n=parseFloat(o.style.height);isNaN(n)||(s.settings.viewHeight=n,s.settings.overlayHeight=n,await s.save())}await e.closePreviousVideos(),e.activeLeafId=null,e.displayVideo(s.settings.lastVideoId||"default-id","overlay")})});const l=i.getBoundingClientRect();a.showAtPosition({x:l.left,y:l.top-10});const r=a.dom;r.style.pointerEvents="all";const c=d=>{const o=i.contains(d.relatedTarget),n=r.contains(d.relatedTarget);!o&&!n&&(a.hide(),r.removeEventListener("mouseleave",c),i.removeEventListener("mouseleave",c))};r.addEventListener("mouseleave",c),i.addEventListener("mouseleave",c)}),this.addSettingTab(new S(this.app,this)),this.registerEditorExtension([b.ViewPlugin.define(t=>({decorations:L(t),update(a){(a.docChanged||a.viewportChanged)&&(this.decorations=L(a.view))}}),{decorations:t=>t.decorations})]),this.registerStyles()}async onunload(){const{videoManager:e}=g.get();await e.closePreviousVideos()}registerStyles(){document.head.appendChild(document.createElement("style")).textContent=`
         .youtube-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: var(--background-primary);
            z-index: 100;
         }

         .youtube-view-controls {
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 101;
            display: flex;
            gap: 5px;
            background: var(--background-secondary);
            padding: 5px;
            border-radius: 5px;
            opacity: 0.8;
         }

         .youtube-view-close {
            cursor: pointer;
            padding: 5px;
            border-radius: 3px;
         }

         .resize-handle {
            position: absolute;
            bottom: -6px;
            left: 0;
            width: 100%;
            height: 12px;
            background: transparent;
            cursor: ns-resize;
            z-index: 102;
         }

         .resize-handle:hover {
            background: var(--interactive-accent);
            opacity: 0.3;
         }

         .resize-handle:active {
            background: var(--interactive-accent);
            opacity: 0.5;
         }

         .loading-overlay {
            opacity: 0;
            transition: opacity 0.3s ease;
         }
         
         .loading-overlay.ready {
            opacity: 1;
         }

         .youtube-overlay-close {
            cursor: pointer;
            padding: 5px;
            border-radius: 3px;
            background: var(--background-secondary);
         }

         .youtube-overlay-close:hover {
            opacity: 0.8;
         }

         .youtube-view-close:hover {
            opacity: 0.8;
         }
      `}}function L(u){const e=[],s=u.state.doc;for(let i=0;i<s.length;){const t=s.lineAt(i),a=t.text,l=/(?:\[([^\]]+)\]\(([^)]+)\)|(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+))/g;let r;for(;(r=l.exec(a))!==null;){const c=r[0],d=r[2]||c,o=t.from+r.index,n=o+c.length,M=/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,x=d.match(M);if(x){const m=x[1];o>=0&&n<=s.length&&(e.push(b.Decoration.mark({class:"youtube-link",attributes:{"data-video-id":m},inclusive:!1}).range(o,n)),e.push(b.Decoration.widget({widget:new z(m),side:1}).range(n)))}}i=t.to+1}return b.Decoration.set(e,!0)}class z extends b.WidgetType{constructor(e){super(),this.videoId=e}toDOM(){const e=document.createElement("button");return e.textContent="▶️▶️ Ouvrir le player ✨",e.className="youtube-sparkle-decoration",e.setAttribute("aria-label","Ouvrir le player YouTube"),e.setAttribute("data-video-id",this.videoId),e.style.cssText=`
         cursor: pointer;
         user-select: none;
         pointer-events: all;
         background: none;
         border: none;
         padding: 2px;
         margin-left: 4px;
         position: relative;
         display: inline-block;
      `,e.addEventListener("click",s=>{s.preventDefault(),s.stopPropagation();const{videoManager:i,settingsManager:t}=g.get();i.displayVideo(this.videoId,t.settings.currentMode||"sidebar")}),e}eq(e){return e.videoId===this.videoId}}class H{constructor(){const{settingsManager:e}=g.get();this.settingsManager=e}createResizer(e){const{container:s,targetElement:i,onResize:t,mode:a,minHeight:l=20,maxHeight:r=90}=e,c=document.createElement("div");c.className="resize-handle",i.appendChild(c);let d=0,o=0,n=null,M=Date.now();const x=v=>{n&&cancelAnimationFrame(n),n=requestAnimationFrame(()=>{const p=Math.min(Math.max(v,l),r);if(a==="overlay"){i.style.height=`${p}%`;const y=i.closest(".workspace-leaf").querySelector(".cm-editor");y&&(y.style.height=`${100-p}%`,y.style.top=`${p}%`)}else{i.style.height=`${p}%`;const y=i.querySelector("iframe");y&&(y.style.height="100%")}const w=Date.now();w-M>=300&&(this.settingsManager.settings.viewHeight=p,this.settingsManager.settings.overlayHeight=p,this.settingsManager.save(),M=w),n=null})},m=v=>{const p=v.clientY-d,w=s.getBoundingClientRect().height,y=o+p/w*100;x(y)};return c.addEventListener("mousedown",v=>{d=v.clientY,o=parseFloat(i.style.height),document.body.style.cursor="ns-resize";const p=document.createElement("div");p.style.cssText=`
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9999;
            cursor: ns-resize;
         `,document.body.appendChild(p);const w=()=>{p.remove(),document.removeEventListener("mousemove",m),document.removeEventListener("mouseup",w),document.body.style.cursor="",n&&cancelAnimationFrame(n)};document.addEventListener("mousemove",m),document.addEventListener("mouseup",w),v.preventDefault(),v.stopPropagation()}),c}}module.exports=O;

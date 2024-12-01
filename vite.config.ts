import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
   build: {
      lib: {
         entry: resolve(__dirname, 'src/main.ts'),
         name: 'ObsiTubeFlowz',
         fileName: 'main',
         formats: ['cjs']
      },
      sourcemap: 'inline',
      cssCodeSplit: false,
      rollupOptions: {
         external: [
            'obsidian', 
            '@codemirror/view', 
            '@codemirror/state', 
            '@codemirror/language',
            'events',
            'child_process',
            'fs',
            'https',
            'os',
            'stream'
         ],
         output: {
            entryFileNames: 'main.js',
            format: 'cjs',
            exports: 'default',
            globals: {
               'obsidian': 'obsidian',
               '@codemirror/view': 'CodeMirror.view',
               '@codemirror/state': 'CodeMirror.state',
               '@codemirror/language': 'CodeMirror.language'
            }
         }
      },
      outDir: '.',
      emptyOutDir: false
   },
   optimizeDeps: {
      include: ['video.js', 'videojs-youtube'],
      exclude: ['yt-dlp-wrap']
   },
   resolve: {
      alias: {
         'video.js': 'video.js/dist/video.js'
      },
      extensions: ['.ts', '.js']
   }
}); 
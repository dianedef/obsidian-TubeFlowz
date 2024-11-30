import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
   build: {
      lib: {
         entry: resolve(__dirname, 'src/main.js'),
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
            '@codemirror/language'
         ],
         output: {
            entryFileNames: 'main.js',
            format: 'cjs',
            exports: 'default',
            globals: {
               'video.js': 'videojs',
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
      include: ['video.js', 'videojs-youtube']
   },
   resolve: {
      alias: {
         'video.js': 'video.js/dist/video.js'
      }
   }
}); 
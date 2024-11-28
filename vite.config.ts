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
   rollupOptions: {
   external: ['obsidian', '@codemirror/view', '@codemirror/state', '@codemirror/language'],
   output: {
      format: 'cjs',
      exports: 'default',
      globals: {
         obsidian: 'obsidian',
         '@codemirror/view': 'CodeMirror.view',
         '@codemirror/state': 'CodeMirror.state',
         '@codemirror/language': 'CodeMirror.language'
      }
   }
   },
   outDir: '.',
   emptyOutDir: false,
   watch: {
   include: 'src/**'
   }
}
}); 
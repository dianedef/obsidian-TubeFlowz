import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
   test: {
      globals: true,
      environment: 'jsdom',
      include: ['tests/**/*.{test,spec}.{js,ts}'],
      setupFiles: ['./tests/setup.ts'],
      deps: {
         inline: ['obsidian']
      }
   },
   resolve: {
      alias: {
         '@': resolve(__dirname, './src'),
         'obsidian': resolve(__dirname, './node_modules/obsidian/obsidian.d.ts')
      }
   }
}); 
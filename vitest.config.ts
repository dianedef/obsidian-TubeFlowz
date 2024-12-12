import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: [
            './src/tests/setup.ts'
        ],
        include: [
            'src/tests/**/*.test.ts',
            'src/tests/**/*.spec.ts'
        ],
        exclude: [
            '**/node_modules/**',
            '**/dist/**'
        ],
        coverage: {
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'src/tests/setup.ts',
            ],
        },
        deps: {
            inline: [
                'video.js',
                'videojs-youtube'
            ]
        },
        testTimeout: 10000,
        hookTimeout: 10000,
        clearMocks: true,
        restoreMocks: true,
        mockReset: true,
        alias: {
            'obsidian': resolve(__dirname, './src/tests/mocks/obsidian.ts')
        }
    }
}); 
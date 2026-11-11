import { defineConfig } from 'vitest/config';

// base './' keeps the build relocatable (GitHub Pages sub-path, itch.io zip, Capacitor).
export default defineConfig({
  base: './',
  build: { target: 'es2020', sourcemap: false, chunkSizeWarningLimit: 600 },
  test: { environment: 'node', testTimeout: 30000, include: ['tests/**/*.test.ts'] },
});

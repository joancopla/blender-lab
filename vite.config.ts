import { defineConfig } from 'vitest/config';

// BASE_PATH is set by the GitHub Pages workflow to "/<repository-name>/".
// Local development and preview use "/".
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  build: {
    // three.js alone is ~550 kB minified; one chunk per page is fine for this app.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      input: {
        index: 'index.html',
        lab01: 'labs/01-viewport/index.html',
        lab02: 'labs/02-edit-mode/index.html',
        lab03: 'labs/03-modifiers/index.html',
        lab04: 'labs/04-lights/index.html',
        lab05: 'labs/05-materials/index.html',
        ma3lab01: 'labs/ma3-01-dmx/index.html',
        ma3lab02: 'labs/ma3-02-addresses/index.html',
        ma3lab03: 'labs/ma3-03-command-line/index.html',
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});

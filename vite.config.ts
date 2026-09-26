import { defineConfig } from 'vitest/config';

// BASE_PATH is set by the GitHub Pages workflow to "/<repository-name>/".
// Local development and preview use "/".
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  build: {
    rollupOptions: {
      input: {
        index: 'index.html',
        lab01: 'labs/01-viewport/index.html',
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});

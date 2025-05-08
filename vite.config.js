import { defineConfig } from 'vite';

export default defineConfig({
  base: './',  // Ensures the assets are relative and work when served from a subdirectory or root
  build: {
    outDir: 'dist',  // Specify the output directory (default is dist)
    rollupOptions: {
      input: 'index.html',  // Entry point
    },
  },
});
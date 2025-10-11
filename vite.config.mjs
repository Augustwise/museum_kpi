import { defineConfig } from 'vite';

export default defineConfig({
  root: 'frontend',
  server: {
    open: true,
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});

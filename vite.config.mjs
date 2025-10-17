import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import vue from '@vitejs/plugin-vue';

const rootDir = 'frontend';

export default defineConfig({
  root: rootDir,
  base: './',
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, `${rootDir}/index.html`),
        login: resolve(__dirname, `${rootDir}/login.html`),
        register: resolve(__dirname, `${rootDir}/register.html`),
      },
    },
  },
});

import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const rootDir = fileURLToPath(new URL('./', import.meta.url));
const frontendDir = resolve(rootDir, 'frontend');

export default defineConfig({
  root: 'frontend',
  appType: 'mpa',
  server: {
    open: true,
  },
  build: {
    outDir: resolve(frontendDir, '../dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(frontendDir, 'index.html'),
        login: resolve(frontendDir, 'login.html'),
        register: resolve(frontendDir, 'register.html'),
      },
    },
  },
});

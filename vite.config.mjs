import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(new URL(import.meta.url)));
const frontendRoot = resolve(projectRoot, 'frontend');

export default defineConfig({
  root: frontendRoot,
  server: {
    open: true,
  },
  build: {
    outDir: resolve(projectRoot, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(frontendRoot, 'index.html'),
        admin: resolve(frontendRoot, 'admin.html'),
        login: resolve(frontendRoot, 'login.html'),
        register: resolve(frontendRoot, 'register.html'),
      },
    },
  },
});

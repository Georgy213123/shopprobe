/// <reference types="vitest/config" />
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.API_URL ?? 'http://localhost:8201';
const proxy = { '/api': { target: apiTarget, changeOrigin: true } };

/**
 * SPA-фолбэк отдаёт index.html на любой путь, и пропавший файл сборки выглядит как 200.
 * Для /assets/* отвечаем честным 404 — так же настроен nginx в Docker-образе.
 */
function strictAssets(): Plugin {
  const middleware =
    (root: string): Connect.NextHandleFunction =>
    (req, res, next) => {
      const path = (req.url ?? '').split('?')[0] ?? '';
      if (path.startsWith('/assets/') && !existsSync(join(root, path))) {
        res.statusCode = 404;
        res.end('Not Found');
        return;
      }
      next();
    };
  return {
    name: 'strict-assets',
    configurePreviewServer(server) {
      server.middlewares.use(middleware(join(server.config.root, server.config.build.outDir)));
    },
    configureServer(server) {
      server.middlewares.use(middleware(join(server.config.root, 'public')));
    },
  };
}

export default defineConfig({
  plugins: [react(), strictAssets()],
  server: { port: 5201, strictPort: true, proxy },
  preview: { port: 5201, strictPort: true, proxy },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});

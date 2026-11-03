import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // Браузерные тесты делят один Chromium и один сервер фикстур.
    fileParallelism: false,
  },
});

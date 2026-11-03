import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5201';

export default defineConfig({
  testDir: 'tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // В CI случайно оставленный test.only роняет прогон, а не сужает его.
  forbidOnly: !!process.env.CI,
  reporter: [
    ['list'],
    [
      'html',
      {
        outputFolder: process.env.PLAYWRIGHT_HTML_OUTPUT_DIR ?? 'playwright-report',
        open: 'never',
      },
    ],
  ],
  use: { baseURL, trace: 'retain-on-failure', locale: 'ru-RU' },
  projects: [
    {
      name: 'desktop',
      testMatch: /storefront\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      testMatch: /storefront\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
    },
    { name: 'shopprobe-meta', testMatch: /shopprobe-meta\.spec\.ts/ },
  ],
});

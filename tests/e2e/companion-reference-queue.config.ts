import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'companion-reference-queue.spec.ts',
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 8_000 },
  outputDir: '../../.tmp/companion-reference-queue-results',
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    ...(process.platform === 'win32' ? { channel: 'msedge' } : {}),
    headless: true,
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});

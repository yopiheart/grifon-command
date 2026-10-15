import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'companion-background-fixture.spec.ts',
  workers: 1,
  retries: 0,
  timeout: 70_000,
  expect: { timeout: 10_000 },
  outputDir: '../../.tmp/companion-background-fixture-results',
  reporter: [['list']],
  use: {
    baseURL: process.env.COMPANION_BACKGROUND_URL || 'http://localhost:5174',
    ...(process.platform === 'win32' ? { channel: 'msedge' } : {}),
    headless: true,
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'companion-cloud-fixture.spec.ts',
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  outputDir: '../../.tmp/ugc-cloud-browser-results',
  reporter: [['list']],
  use: {
    baseURL: process.env.COMPANION_CLOUD_URL || 'http://localhost:5173',
    ...(process.platform === 'win32' ? { channel: 'msedge' } : {}),
    headless: true,
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});

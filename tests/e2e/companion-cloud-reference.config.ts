import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'companion-cloud-reference.spec.ts',
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 8_000 },
  outputDir: '../../.tmp/ugc-cloud-media-e2e-results',
  reporter: [['list']],
  use: {
    baseURL: process.env.COMPANION_CLOUD_REFERENCE_URL || 'http://localhost:5193',
    ...(process.platform === 'win32' ? { channel: 'msedge' } : {}),
    headless: true,
    serviceWorkers: 'block',
    deviceScaleFactor: 2,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});

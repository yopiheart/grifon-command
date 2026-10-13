import { defineConfig } from '@playwright/test';

// Reuse Neil's current server. This config deliberately does not spawn a helper.
export default defineConfig({
  testDir: '.',
  testMatch: 'typography.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  outputDir: '../../assets/design/typography/qa/test-results',
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    ...(process.platform === 'win32' ? { channel: 'msedge' } : {}),
    headless: true,
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
  },
});

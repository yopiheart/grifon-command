import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.', testMatch: 'companion-continuity.spec.ts', fullyParallel: false,
  workers: 1, retries: 0, timeout: 45_000, expect: { timeout: 8_000 },
  outputDir: '../../assets/design/companion-continuity/qa/test-results',
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    ...(process.platform === 'win32' ? { channel: 'msedge' } : {}),
    headless: true, serviceWorkers: 'block', reducedMotion: 'no-preference',
  },
});

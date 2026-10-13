import { defineConfig } from '@playwright/test';

// Reuse the current desktop Vite process; this suite never starts a helper server.
export default defineConfig({
  testDir: '.', testMatch: 'companion-glass.spec.ts', fullyParallel: false,
  workers: 1, retries: 0, timeout: 45_000, expect: { timeout: 5_000 },
  outputDir: '../../assets/design/companion-glass/qa/test-results',
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    ...(process.platform === 'win32' ? { channel: 'msedge' } : {}),
    headless: true, serviceWorkers: 'block', reducedMotion: 'reduce',
  },
});

import { defineConfig } from '@playwright/test';
import path from 'node:path';

export default defineConfig({
  testDir: '.', testMatch: 'companion-startup.spec.ts', fullyParallel: false,
  workers: 1, retries: 0, timeout: 45_000, expect: { timeout: 8_000 },
  outputDir: '../../assets/design/companion-startup/qa/test-results',
  reporter: [['list'], ['json', { outputFile: path.resolve(`assets/design/companion-startup/qa/${process.env.COMPANION_STARTUP_PHASE || 'final'}-playwright-report.json`) }]],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    ...(process.platform === 'win32' ? { channel: 'msedge' } : {}),
    headless: true, serviceWorkers: 'block', reducedMotion: 'no-preference',
  },
});

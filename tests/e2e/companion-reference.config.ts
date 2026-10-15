import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.', testMatch: 'companion-reference.spec.ts', fullyParallel: false,
  workers: 1, retries: 0, timeout: 45_000, expect: { timeout: 8_000 },
  outputDir: '../../.tmp/companion-reference-results', reporter: [['list']],
  use: { baseURL: 'http://localhost:5173', ...(process.platform === 'win32' ? { channel: 'msedge' } : {}), headless: true, serviceWorkers: 'block' },
});

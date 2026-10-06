import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.', testMatch: 'companion-chat.spec.ts', fullyParallel: false, workers: 1,
  timeout: 60_000, expect: { timeout: 10_000 },
  use: { baseURL: 'http://127.0.0.1:5173', ...(process.platform === 'win32' ? { channel: 'msedge' } : {}), headless: true, serviceWorkers: 'block' },
  reporter: [['list']],
  webServer: { command: `${process.platform === 'win32' ? 'npm.cmd' : 'npm'} run dev -- --host 127.0.0.1 --port 5173 --strictPort`, url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI, timeout: 120_000 },
});

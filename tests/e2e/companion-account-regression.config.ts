import { defineConfig } from '@playwright/test';
import path from 'node:path';

export default defineConfig({
  testDir: '.',
  testMatch: ['route-consistency.spec.ts', 'companion-navigation.spec.ts', 'companion-continuity.spec.ts', 'companion-startup.spec.ts', 'companion-glass.spec.ts'],
  fullyParallel: false, workers: 1, retries: 0,
  timeout: 60_000, expect: { timeout: 10_000 },
  outputDir: '../../assets/design/companion-account/qa/regression-test-results',
  reporter: [['list'], ['json', { outputFile: path.resolve(`assets/design/companion-account/qa/${process.env.COMPANION_ACCOUNT_REGRESSION_PHASE || 'regression'}-playwright-report.json`) }]],
  use: {
    baseURL: 'http://localhost:5173',
    ...(process.platform === 'win32' ? { channel: 'msedge' } : {}),
    headless: true, serviceWorkers: 'block',
  },
});

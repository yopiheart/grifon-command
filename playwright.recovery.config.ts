import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const evidenceDir = process.env.RECOVERY_EVIDENCE_DIR;
if (!evidenceDir || !process.env.RECOVERY_RUN_ID) throw new Error('Run recovery tests through npm run verify:recovery.');

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['oneshot-recovery.spec.ts', 'oneshot-legacy-recovery.spec.ts'],
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 2,
  timeout: 60_000,
  metadata: { recoveryRunId: process.env.RECOVERY_RUN_ID },
  outputDir: path.join(evidenceDir, 'test-results'),
  reporter: [['list'], ['json', { outputFile: path.join(evidenceDir, 'playwright.json') }]],
  use: {
    baseURL: 'http://localhost:5173',
    serviceWorkers: 'block',
    storageState: { cookies: [], origins: [] },
    screenshot: 'on',
    trace: 'on',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `"${process.execPath}" tools/verify-recovery-server.mjs`,
    url: 'http://localhost:5173',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { VITE_SUPABASE_URL: 'http://localhost:54321', VITE_SUPABASE_ANON_KEY: 'dummy-recovery-anon-key' },
  },
});

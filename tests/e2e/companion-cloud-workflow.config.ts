import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.', testMatch: 'companion-cloud-workflow.spec.ts', workers: 1, retries: 0,
  timeout: 60_000, expect: { timeout: 8_000 },
  outputDir: '../../.tmp/ugc-cloud-workflow-e2e-results', reporter: [['list']],
  use: {
    baseURL: process.env.COMPANION_CLOUD_WORKFLOW_URL || 'http://localhost:5194',
    ...(process.platform === 'win32' ? { channel: 'msedge' } : {}), headless: true,
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'block', deviceScaleFactor: 2, screenshot: 'only-on-failure', trace: 'retain-on-failure',
  },
});

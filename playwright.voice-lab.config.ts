import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/voice-lab',
  testMatch: '**/*.pw.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 7_000 },
  reporter: 'list',
  outputDir: '.tmp/oceanides-voice-lab/playwright',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:5184',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm.cmd --prefix funnels/oceanides-price-page run dev:voice',
    url: 'http://127.0.0.1:5184/voice-lab.html',
    reuseExistingServer: false,
    timeout: 90_000,
    env: {
      OCEANIDES_VOICE_LIVE: '0',
      OCEANIDES_VOICE_APPROVED_SPEC_SHA256: '',
      XAI_API_KEY: '',
    },
  },
});

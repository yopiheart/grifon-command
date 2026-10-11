import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: '.', testMatch: 'review.spec.ts', workers: 1, timeout: 60000, reporter: 'list', use: { baseURL: 'http://localhost:5173', browserName: 'chromium' } });

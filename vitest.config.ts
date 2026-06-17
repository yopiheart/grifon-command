import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    // tests/e2e/ is owned by Playwright (playwright.config.ts), not vitest —
    // its specs import @playwright/test and must not be collected here.
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
    globals: false,
  },
});

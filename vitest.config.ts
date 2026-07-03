import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  // Give services/metaPixel.ts a deterministic pixel id in tests. It reads
  // VITE_META_PIXEL_ID from import.meta.env at module scope; vi.stubEnv only
  // touches process.env and CI has no .env, so the value must be baked in at
  // transform time. tests/unit/metaPixel.test.ts asserts against this.
  define: {
    'import.meta.env.VITE_META_PIXEL_ID': JSON.stringify('test_pixel_1234567890'),
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    // tests/e2e/ is owned by Playwright (playwright.config.ts), not vitest —
    // its specs import @playwright/test and must not be collected here.
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
    globals: false,
  },
});

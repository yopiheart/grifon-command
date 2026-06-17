import { defineConfig, devices } from '@playwright/test';

// Boot/render smoke (Move 2, scope A). Zero-quota: it boots the app against
// DUMMY Supabase env — enough that getSupabase() doesn't throw at mount
// (App.tsx:245) — and checks the public, pre-auth routes (App.tsx:734-829)
// render without crashing. It never reaches auth or the wizard, so it makes
// no Gemini / ElevenLabs calls and burns no quota. This catches the one class
// of regression the build-only CI gate cannot: a green build that
// white-screens or throws at runtime.

const PORT = 5173;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Dev server (not preview) so SPA history-fallback serves /pricing, /terms,
    // etc. directly, and VITE_ vars are read from process.env at runtime (no
    // build-time inlining to coordinate).
    command: 'npm run dev',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Truthy dummies only — getSupabase() checks presence, not validity.
      // No real project is contacted; a fresh browser has no stored session,
      // so getSession() resolves null without a network call.
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'dummy-anon-key-for-boot-smoke',
    },
  },
});

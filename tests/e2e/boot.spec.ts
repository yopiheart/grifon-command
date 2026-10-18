import { test, expect } from '@playwright/test';
import { isExpectedBootConsoleError } from '../support/bootErrors.js';

// Boot/render smoke for the public, pre-auth routes. Each route must:
//   1. mount React into #root (not a white screen),
//   2. NOT show the ErrorBoundary crash fallback,
//   3. render a route-specific anchor (proves the real page rendered, not a stub),
//   4. produce no UNEXPECTED runtime errors (benign offline-Supabase noise filtered).
// A screenshot is saved per route as a verification artifact.
//
// Scope guard: these routes return BEFORE the auth gate (App.tsx:831), so the
// test never authenticates and never calls Gemini/ElevenLabs — zero quota.

const CRASH_FALLBACK = 'A module has crashed.'; // components/ui/ErrorBoundary.tsx

type Route = {
  path: string;
  name: string;
} & ({ anchor: string } | { text: string } | { heading: string });

const ROUTES: Route[] = [
  { path: '/', name: 'landing', anchor: '#what-you-get' },
  { path: '/pricing', name: 'pricing', text: 'Starter' },
  { path: '/terms', name: 'terms', heading: 'Terms of Service' },
  { path: '/privacy', name: 'privacy', heading: 'Privacy Policy' },
];

for (const route of ROUTES) {
  test(`public route renders: ${route.name} (${route.path})`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error' && !isExpectedBootConsoleError(m.text(), m.location().url)) {
        errors.push(`console.error: ${m.text()}`);
      }
    });

    await page.goto(route.path, { waitUntil: 'domcontentloaded' });

    // 1. React actually mounted.
    await expect(page.locator('#root')).not.toBeEmpty();

    // 2. No crash fallback.
    await expect(page.getByText(CRASH_FALLBACK)).toHaveCount(0);

    // 3. Route-specific proof of render.
    if ('anchor' in route) await expect(page.locator(route.anchor)).toBeAttached();
    if ('text' in route) {
      await expect(page.getByText(route.text, { exact: false }).first()).toBeVisible();
    }
    if ('heading' in route) {
      await expect(page.getByRole('heading', { name: route.heading, exact: true })).toBeVisible();
    }

    // 4. Verification artifact.
    await page.screenshot({ path: `test-results/boot-${route.name}.png`, fullPage: true });

    // 5. No unexpected runtime errors.
    expect(errors, `Unexpected runtime errors on ${route.path}:\n${errors.join('\n')}`).toEqual([]);
  });
}

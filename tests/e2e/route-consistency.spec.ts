import { test, expect, type Page } from '@playwright/test';
import { installAccountApp } from './companion-account-fixture.js';

test.use({ reducedMotion: 'reduce' });
test.beforeEach(async ({ page }) => { await installAccountApp(page, false); });

// The real App router and page components run against a deterministic auth
// fixture. No real account, OAuth provider, billing request or payment is used.
async function authFixture(page: Page) {
  await page.route('**/api/**', route => new URL(route.request().url()).pathname.startsWith('/api/_lib/')
    ? route.continue() : route.fulfill({ status: 503, body: 'Offline route fixture' }));
  await page.route('https://**', route => route.fulfill({ status: 503, body: 'Offline route fixture' }));
  await page.route(/\/services\/supabaseClient\.ts(?:\?.*)?$/, route => {
    if (route.request().url().includes('route-fixture-original')) return route.continue();
    return route.fulfill({ contentType: 'application/javascript', body: `
      export * from '/services/supabaseClient.ts?route-fixture-original';
      const listeners = new Set();
      const session = () => sessionStorage.getItem('route_fixture_signed_in') ? {
        access_token: 'test-only-token', user: {id:'route-fixture-user', email:'buyer@example.test', user_metadata:{}}
      } : null;
      window.__routeFixtureSignIn = () => {
        sessionStorage.setItem('route_fixture_signed_in', '1');
        listeners.forEach(fn => fn('SIGNED_IN', session()));
      };
      const query = {select:()=>query,eq:()=>query,maybeSingle:async()=>({data:null}),
        single:async()=>({data:null}),then:resolve=>resolve({data:[]})};
      const channel = {on:()=>channel,subscribe:()=>channel};
      const client = {auth:{getSession:async()=>({data:{session:session()}}),
        onAuthStateChange:fn=>{listeners.add(fn);return {data:{subscription:{unsubscribe:()=>listeners.delete(fn)}}};},
        signOut:async()=>{sessionStorage.removeItem('route_fixture_signed_in');listeners.forEach(fn=>fn('SIGNED_OUT',null));return {error:null};}},
        from:()=>query,channel:()=>channel,removeChannel:()=>{}};
      export const getSupabase = () => client;
    ` });
  });
}

test('pricing Home changes the URL and refresh preserves the landing screen', async ({ page }) => {
  await page.goto('/pricing');
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.locator('.landing-page')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await page.reload();
  await expect(page.locator('.landing-page')).toBeVisible();
});

test('landing, pricing and login retain real Back and Forward entries', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pricing', exact: true }).first().click();
  await expect(page).toHaveURL(/\/pricing$/);
  await page.getByRole('button', { name: 'Annual', exact: true }).click();
  await page.getByRole('button', { name: 'Choose Starter', exact: true }).click();
  await expect(page).toHaveURL(/\/login\?plan=starter&cycle=annual$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(page.locator('.pricing-page')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.landing-page')).toBeVisible();
  await page.goForward();
  await expect(page.locator('.pricing-page')).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/login\?plan=starter&cycle=annual$/);
  await expect(page.locator('.auth-gateway')).toBeVisible();
  await page.reload();
  await expect(page.locator('.auth-gateway')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('grifon_intended_plan') || 'null')))
    .toEqual({ plan_id: 'starter', billing_cycle: 'annual' });
});

test('checkout error Back updates the URL to pricing', async ({ page }) => {
  await page.goto('/checkout?plan=business&cycle=annual');
  await page.getByRole('button', { name: 'Back to plans', exact: true }).click();
  await expect(page.locator('.pricing-page')).toBeVisible();
  await expect(page).toHaveURL(/\/pricing$/);
});

test('Reviews anchor and logo reflect the current landing location', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Reviews', exact: true }).click();
  await expect(page).toHaveURL(/\/#reviews$/);
  await expect(page.locator('#reviews')).toBeInViewport();
  await page.locator('header').getByText('GRIFON', { exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
});

test('signed-in pricing Home, app entry and logout keep screen and path aligned', async ({ page }) => {
  await authFixture(page);
  await page.addInitScript(() => sessionStorage.setItem('route_fixture_signed_in', '1'));
  await page.goto('/pricing');
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.locator('.landing-page')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await page.reload();
  await expect(page.locator('.landing-page')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('button', { name: /^log in$/i }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('textbox', { name: 'Message Grifon', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Account settings', exact: true }).click();
  await page.getByRole('button', { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/login\?from=logout$/);
  await expect(page.locator('.auth-gateway')).toBeVisible();
  await page.goBack();
  await expect(page.locator('.landing-page')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test('marked OAuth return enters the app after a full callback reload', async ({ page }) => {
  await authFixture(page);
  await page.addInitScript(() => {
    if (window !== window.top) return;
    sessionStorage.setItem('route_fixture_signed_in', '1');
    sessionStorage.setItem('grifon_oauth_pending', '1');
  });
  await page.goto('/');
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('textbox', { name: 'Message Grifon', exact: true })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('grifon_oauth_pending'))).toBeNull();
});

test('payment retry carries a billing cycle changed within checkout', async ({ page }) => {
  await authFixture(page);
  await page.addInitScript(() => sessionStorage.setItem('route_fixture_signed_in', '1'));
  await page.route('**/api/billing?action=intent', route => {
    const { plan_id, billing_cycle } = route.request().postDataJSON();
    return route.fulfill({ json: {
      intent_id: 'fixture-intent', client_key: 'fixture', status: 'awaiting_payment_method',
      plan: { id: plan_id, name: 'Business', billing_cycle, description: 'Fixture' },
      breakdown: { subtotal_centavos: 499700, vat_centavos: 0, total_centavos: 499700, add_on_centavos: 0 },
    } });
  });
  await page.goto('/checkout?plan=business&cycle=monthly');
  await page.getByRole('radio', { name: /^Annual/ }).click();
  await expect(page).toHaveURL(/\/checkout\?plan=business&cycle=annual$/);
  await page.goto('/billing/3ds-return');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page).toHaveURL(/\/checkout\?plan=business&cycle=annual$/);
  await expect(page.getByRole('radio', { name: /^Annual/ })).toBeChecked();
});

test('auth and browser history preserve legal and annual checkout return', async ({ page }) => {
  await authFixture(page);
  await page.goto('/login?plan=business&cycle=annual');
  await page.getByRole('button', { name: 'Terms of Service', exact: true }).click();
  await expect(page).toHaveURL(/\/terms$/);
  await page.goBack();
  await expect(page.locator('.auth-gateway')).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/terms$/);
  await page.reload();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page).toHaveURL(/\/login\?plan=business&cycle=annual$/);
  await page.evaluate(() => (window as any).__routeFixtureSignIn());
  await expect(page).toHaveURL(/\/checkout\?plan=business&cycle=annual$/);
});

test('guest app deep link presents login at its own URL', async ({ page }) => {
  await page.goto('/app');
  await expect(page.locator('.auth-gateway')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

for (const selection of ['plan=business&cycle=annual', 'topup=video_ad_pack5']) {
  test(`payment retry restores the selected checkout: ${selection}`, async ({ page }) => {
    await page.goto(`/checkout?${selection}`);
    await expect(page.getByRole('button', { name: /Back to plans|Back to my ads/i })).toBeVisible();
    await page.goto('/billing/3ds-return');
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/checkout\\?${selection}$`));
    await page.reload();
    await expect(page.getByRole('button', { name: /Back to plans|Back to my ads/i })).toBeVisible();
  });
}

test('mobile menu routes and direct Reviews links match their visible location', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#reviews');
  await expect(page.locator('#reviews')).toBeInViewport();
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  await page.getByRole('button', { name: 'Pricing', exact: true }).last().click();
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(page.locator('.pricing-page')).toBeVisible();
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  await page.getByRole('button', { name: 'Home', exact: true }).last().click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.landing-page')).toBeVisible();
  await page.goBack();
  await expect(page.locator('.pricing-page')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/#reviews$/);
  await expect(page.locator('#reviews')).toBeInViewport();
});

test('billing success continues to the authenticated chat URL', async ({ page }) => {
  await authFixture(page);
  await page.addInitScript(() => sessionStorage.setItem('route_fixture_signed_in', '1'));
  await page.route(/\/hooks\/useSubscription\.ts(?:\?.*)?$/, route => route.fulfill({
    contentType: 'application/javascript',
    body: `export const useSubscription=()=>({plan_id:'pro',status:'active',loading:false,billing_cycle:'monthly'});`,
  }));
  await page.goto('/billing/success');
  await page.getByRole('button', { name: 'Create my first ad', exact: false }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('textbox', { name: 'Message Grifon', exact: true })).toBeVisible();
});

test('invalid checkout return selection falls back to pricing on the same origin', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('grifon_checkout_return', '/checkout?plan=https://example.test&cycle=annual'));
  await page.goto('/billing/3ds-return');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page).toHaveURL('http://localhost:5173/pricing');
  await expect(page.locator('.pricing-page')).toBeVisible();
});

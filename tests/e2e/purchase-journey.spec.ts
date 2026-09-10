import { test, expect, type Page } from '@playwright/test';

const sizes = [{ width: 375, height: 667 }, { width: 1280, height: 900 }];

async function fits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

for (const size of sizes) {
  test(`pricing and login preserve annual plan intent at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/pricing');
    const consent = page.getByRole('dialog', { name: 'Analytics consent' });
    if (await consent.isVisible()) await consent.getByRole('button', { name: 'Decline', exact: true }).click();
    await expect(page.getByText(/(?:one|1) ad.plan preview.*month/i).first()).toBeVisible();
    await fits(page);
    await page.screenshot({ path: `test-results/purchase-pricing-${size.width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Annual', exact: true }).click();
    await page.getByRole('button', { name: /(?:choose|start|get|unlock).*Starter/i }).click();
    await expect(page).toHaveURL(/\/login\?plan=starter&cycle=annual/);
    await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('grifon_intended_plan') || 'null')))
      .toEqual({ plan_id: 'starter', billing_cycle: 'annual' });
    await expect(page.getByRole('button', { name: /continue with email/i })).toBeDisabled();
    await fits(page);
    await page.screenshot({ path: `test-results/purchase-login-${size.width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Terms of Service', exact: true }).click();
    await expect(page).toHaveURL(/\/terms/);
    await page.getByRole('button', { name: /back/i }).first().click();
    await expect(page).toHaveURL(/\/login\?plan=starter&cycle=annual/);
    await expect(page.locator('input[type="checkbox"]')).not.toBeChecked();
  });
}

test('free entry promises an ad-plan preview and carries no purchase intent', async ({ page }) => {
  await page.goto('/pricing');
  await page.getByRole('region', { name: 'Compare plans' }).getByRole('button', { name: 'Build my free ad plan', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText(/one ad.plan preview.*month/i).first()).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('grifon_intended_plan'))).toBeNull();
});

// Mount the real checkout component with test-only service replacements. All
// payment/provider requests are blocked. This checks UI state and callbacks,
// never a real authenticated session, intent, charge, or provider integration.
async function checkoutFixture(page: Page, failIntent = false) {
  await page.route('**/api/**', route => route.abort());
  await page.route('https://**', route => route.abort());
  await page.route(/\/services\/checkoutService\.ts(?:\?.*)?$/, route => route.fulfill({
    contentType: 'application/javascript',
    body: `
      export const formatPHP = n => '₱' + (n / 100).toLocaleString('en-PH', {minimumFractionDigits: 2});
      export const loadCheckoutDraft = () => JSON.parse(sessionStorage.getItem('test_checkout_draft') || 'null');
      export const saveCheckoutDraft = d => sessionStorage.setItem('test_checkout_draft', JSON.stringify(d));
      export const clearCheckoutDraft = () => sessionStorage.removeItem('test_checkout_draft');
      export async function fetchIntent(plan, cycle, addOns) {
        ${failIntent ? "throw new Error('Test checkout unavailable');" : ''}
        const total = cycle === 'annual' ? 2497200 : 249700;
        return { intent_id: 'fixture-' + cycle, client_key: 'fixture', status: 'awaiting_payment_method',
          plan: {id: plan, name: plan[0].toUpperCase() + plan.slice(1), billing_cycle: cycle, description: 'Fixture'},
          breakdown: {subtotal_centavos: total, vat_centavos: 0, total_centavos: total,
            add_on_centavos: 0, monthly_equivalent_centavos: total / 12, annual_savings_centavos: 499200}};
      }
      export async function processCardPayment() { throw new Error('Fixture payment declined'); }
      export async function processEwalletPayment() { throw new Error('Fixture wallet unavailable'); }
    `,
  }));
  await page.route(/\/App\.tsx(?:\?.*)?$/, route => route.fulfill({
    contentType: 'application/javascript',
    body: `import React from '/node_modules/.vite/deps/react.js';
      import CheckoutPage from '/components/CheckoutPage.tsx';
      export default function App() { return React.createElement(CheckoutPage, {
        email: 'buyer@example.test', onBack: () => { window.location.href = '/pricing'; },
        onViewLegal: route => { window.__checkoutLegal = route; }
      }); }`,
  }));
  await page.goto('/checkout?plan=pro&cycle=monthly');
}

for (const size of sizes) {
  test(`checkout selections, consent and failure recovery at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size);
    await checkoutFixture(page);
    await expect(page.getByText('buyer@example.test')).toBeVisible();
    await fits(page);
    await page.screenshot({ path: `test-results/purchase-checkout-${size.width}.png`, fullPage: true });
    await page.getByRole('radio', { name: /^Annual/ }).click();
    await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('test_checkout_draft') || '{}').cycle)).toBe('annual');
    await page.getByRole('button', { name: 'GCash', exact: true }).click();
    const pay = page.getByRole('button', { name: 'Continue with GCash', exact: true });
    await expect(pay).toBeDisabled();
    await page.locator('input[type="tel"]').fill('09123456789');
    await page.locator('.terms-consent input').check();
    await expect(pay).toBeEnabled();
    await page.getByRole('button', { name: 'Terms of Service', exact: true }).click();
    expect(await page.evaluate(() => (window as any).__checkoutLegal)).toBe('terms');
    await pay.click();
    await expect(page.getByText('Fixture wallet unavailable')).toBeVisible();
    await expect(pay).toBeEnabled();
    await page.reload();
    await expect(page.locator('input[type="tel"]')).toHaveValue('09123456789');
    await expect(page.locator('.terms-consent input')).toBeChecked();
    await fits(page);
  });
}

test('checkout intent failure provides a return to pricing', async ({ page }) => {
  await checkoutFixture(page, true);
  await expect(page.getByText('Test checkout unavailable')).toBeVisible();
  await page.getByRole('button', { name: 'Back to plans', exact: true }).click();
  await expect(page).toHaveURL(/\/pricing$/);
});

import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { ACCOUNT_EMAIL, ACCOUNT_ID, installAccountApp, readAccountBook, showAccountSettings } from './companion-account-fixture.js';

const QA = path.resolve(process.env.COMPANION_ACCOUNT_QA_DIR || 'assets/design/companion-account/qa');
const phase = process.env.COMPANION_ACCOUNT_PHASE || 'final';
const input = (page: Page) => page.getByRole('textbox', { name: 'Message Grifon', exact: true });

test.afterEach(async ({ page }, info) => {
  if (info.status === info.expectedStatus) return;
  fs.mkdirSync(QA, { recursive: true });
  fs.writeFileSync(path.join(QA, `${phase}-${info.title.replace(/[^a-z0-9]+/gi, '-').slice(0, 90)}-failure.json`), JSON.stringify({
    errors: info.errors.map(error => error.message),
    evidence: (page as any).accountEvidence,
  }, null, 2));
});

async function openPreview(page: Page) {
  const unexpected: string[] = [], pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() === 'GET' && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
    if (!['http://127.0.0.1:5173', 'http://localhost:5173'].includes(url.origin) || url.pathname.startsWith('/api/')) {
      unexpected.push(`${request.method()} ${url.origin}${url.pathname}`); return route.abort();
    }
    return route.fallback();
  });
  await page.goto('/companion-chat-preview.html');
  await expect(input(page)).toBeVisible();
  fs.mkdirSync(QA, { recursive: true });
  return { unexpected, pageErrors };
}

test('default preview hides the local test fixture toolbar', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const evidence = await openPreview(page);
  const toolbar = page.locator('summary').filter({ hasText: 'Local test fixture' });
  fs.writeFileSync(path.join(QA, `${phase}-default-preview.json`), JSON.stringify({
    toolbarVisible: await toolbar.isVisible(),
    settingsEntryCount: await page.getByRole('button', { name: /settings/i }).count(),
    ...evidence,
  }, null, 2));
  await page.screenshot({ path: path.join(QA, `${phase}-default-1280.png`), fullPage: true });
  await expect(toolbar).toHaveCount(0);
  expect(evidence.unexpected).toEqual([]);
  expect(evidence.pageErrors).toEqual([]);
});

test('default preview exposes account settings from chat navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPreview(page);
  await expect(page.getByRole('button', { name: /settings/i })).toBeVisible();
});

test('developer fixture controls require explicit opt-in and preview stays truthful', async ({ page }) => {
  const evidence = await openPreview(page);
  await expect(page.getByText(/preview/i).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /^Fixture:/ })).toHaveCount(0);
  const settings = await showAccountSettings(page);
  await expect(settings).toContainText(/preview|simulat/i);
  await expect(settings.getByRole('button', { name: /^Sign in to Grifon\b/ })
    .or(settings.getByRole('link', { name: /^Sign in to Grifon\b/ }))).toBeVisible();
  await page.goto('/companion-chat-preview.html?debug=1');
  await expect(page.locator('summary').filter({ hasText: 'Local test fixture' })).toBeVisible();
  await page.locator('summary').filter({ hasText: 'Local test fixture' }).click();
  await expect(page.getByRole('button', { name: 'Fixture: storyboard', exact: true })).toBeVisible();
  const optedInSettings = await showAccountSettings(page);
  await optedInSettings.getByRole('button', { name: /^Sign in to Grifon\b/ })
    .or(optedInSettings.getByRole('link', { name: /^Sign in to Grifon\b/ })).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(evidence.unexpected).toEqual([]); expect(evidence.pageErrors).toEqual([]);
});

test('preview disclosure stays visible on mobile and with desktop navigation collapsed', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  const evidence = await openPreview(page);
  const disclosure = page.locator('#companion-save-status').filter({ hasText: 'Preview · simulated output.' });
  await expect(disclosure).toBeVisible();
  expect(await disclosure.evaluate(element => {
    const box = element.getBoundingClientRect();
    return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight;
  })).toBe(true);
  await expect(page.locator('summary').filter({ hasText: 'Local test fixture' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Fixture:/ })).toHaveCount(0);
  await page.screenshot({ path: path.join(QA, `${phase}-preview-disclosure-375.png`), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: 'Collapse conversations', exact: true }).click();
  await expect(disclosure).toBeVisible();
  expect(await disclosure.evaluate(element => {
    const box = element.getBoundingClientRect();
    return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight;
  })).toBe(true);
  await expect(page.locator('summary').filter({ hasText: 'Local test fixture' })).toHaveCount(0);
  await page.screenshot({ path: path.join(QA, `${phase}-preview-disclosure-collapsed-1280.png`), fullPage: true });
  expect(evidence.unexpected).toEqual([]); expect(evidence.pageErrors).toEqual([]);
});

for (const [width, height] of [[375, 667], [390, 844], [1280, 900]]) {
  test(`real account settings preserve player and keyboard access at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const evidence = await installAccountApp(page);
    await page.goto('/app');
    await expect(input(page)).toBeVisible();
    await expect(page.locator('iframe[title="Grifon animated companion"]')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
    const player = await page.locator('iframe[title="Grifon animated companion"]').elementHandle();
    await input(page).fill('Account settings must preserve this draft');
    fs.mkdirSync(QA, { recursive: true });
    await page.screenshot({ path: path.join(QA, `${phase}-chat-${width}.png`), fullPage: true });
    const settings = await showAccountSettings(page);
    await expect(settings).toContainText(ACCOUNT_EMAIL);
    await expect(settings).toContainText('Pro Edition');
    const close = settings.getByRole('button', { name: /close/i });
    await expect(close).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(settings.getByRole('button', { name: 'Sign out', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    expect(await input(page).evaluate(element => !!element.closest('[inert]'))).toBe(true);
    expect(await player!.evaluate(element => element.isConnected)).toBe(true);
    const small = await settings.locator('button:visible').evaluateAll(buttons => buttons.filter(button => {
      const box = button.getBoundingClientRect(); return box.width < 43.5 || box.height < 43.5;
    }).map(button => ({ name: button.getAttribute('aria-label') || button.textContent, width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })));
    expect(small).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: path.join(QA, `${phase}-settings-${width}.png`), fullPage: true });
    await page.keyboard.press('Escape');
    await expect(settings).toHaveCount(0);
    expect(await page.evaluate(() => ['Account settings', 'Open conversations'].includes(document.activeElement?.getAttribute('aria-label') || ''))).toBe(true);
    if (await page.getByRole('dialog', { name: 'Chat navigation', exact: true }).isVisible()) await page.keyboard.press('Escape');
    await expect(input(page)).toHaveValue('Account settings must preserve this draft');
    expect(await input(page).evaluate(element => !!element.closest('[inert]'))).toBe(false);
    expect(await player!.evaluate(element => element.isConnected)).toBe(true);
    expect(evidence.unexpected).toEqual([]); expect(evidence.pageErrors).toEqual([]);
  });
}

test('collapsed navigation exposes the account settings entry', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const evidence = await installAccountApp(page);
  await page.goto('/app'); await expect(input(page)).toBeVisible();
  await page.getByRole('button', { name: 'Collapse conversations', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Conversations', exact: true })).not.toBeVisible();
  const settings = await showAccountSettings(page);
  await expect(settings).toContainText(ACCOUNT_EMAIL);
  expect(evidence.unexpected).toEqual([]); expect(evidence.pageErrors).toEqual([]);
});

test('settings confirm consent and recover read and write failures without dead preferences', async ({ page }) => {
  const evidence = await installAccountApp(page);
  await page.goto('/app'); await expect(input(page)).toBeVisible();
  await page.evaluate(() => { (window as any).accountFixture.consentReadFails = true; });
  const settings = await showAccountSettings(page);
  const consent = settings.getByRole('switch', { name: /personalized ads/i });
  await expect(settings.getByRole('alert')).toBeVisible();
  await expect(consent).toHaveCount(0);
  await expect(settings.getByText('Render finished', { exact: true })).toHaveCount(0);
  await expect(settings.getByText('Tips & product news', { exact: true })).toHaveCount(0);
  await page.evaluate(() => { (window as any).accountFixture.consentReadFails = false; });
  await settings.getByRole('button', { name: 'Retry ad preference', exact: true }).click();
  await expect(consent).toBeEnabled(); await expect(consent).not.toBeChecked();
  await page.evaluate(() => { (window as any).accountFixture.consentWriteFails = true; });
  await consent.click();
  await expect(settings.getByRole('alert')).toBeVisible();
  await expect(consent).not.toBeChecked(); await expect(consent).toBeEnabled();
  await page.evaluate(() => { (window as any).accountFixture.consentWriteFails = false; });
  await consent.click(); await expect(consent).toBeChecked();
  await consent.click(); await expect(consent).not.toBeChecked();
  expect(evidence.consentWrites).toEqual(['grant', 'grant', 'withdraw']);
  expect(evidence.unexpected).toEqual([]); expect(evidence.pageErrors).toEqual([]);
});

test('an unconfirmed consent record withholds the switch until its read finishes', async ({ page }) => {
  const evidence = await installAccountApp(page);
  await page.goto('/app'); await expect(input(page)).toBeVisible();
  await page.evaluate(() => { (window as any).accountFixture.holdConsent = true; });
  const settings = await showAccountSettings(page);
  const consent = settings.getByRole('switch', { name: /personalized ads/i });
  await expect(consent).toHaveCount(0);
  expect(evidence.consentWrites).toEqual([]);
  await expect.poll(() => page.evaluate(() => !!(window as any).accountFixture.releaseConsent)).toBe(true);
  await page.evaluate(() => { const state = (window as any).accountFixture; state.holdConsent = false; state.releaseConsent(); });
  await expect(consent).toBeEnabled(); await expect(consent).not.toBeChecked();
  expect(evidence.unexpected).toEqual([]); expect(evidence.pageErrors).toEqual([]);
});

test('logout waits for the latest IndexedDB draft before signing out and cleaning wizard state', async ({ page }) => {
  const evidence = await installAccountApp(page);
  await page.goto('/app'); await expect(input(page)).toBeVisible();
  await expect.poll(() => page.evaluate(() => !!(window as any).accountFixture)).toBe(true);
  await page.evaluate(() => { (window as any).accountFixture.holdStorage = true; });
  await input(page).fill('Unsent text preserved before sign out');
  const settings = await showAccountSettings(page);
  await settings.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).accountFixture.storageWaiters.length)).toBeGreaterThan(0);
  expect(await page.evaluate(() => (window as any).accountFixture.calls.filter((call: any) => ['signOut', 'wizard-delete'].includes(call.name)))).toEqual([]);
  await expect(page).toHaveURL(/\/app$/);
  await page.evaluate(() => { const state = (window as any).accountFixture; state.holdStorage = false; state.storageWaiters.splice(0).forEach((resolve: () => void) => resolve()); });
  await expect(page).toHaveURL(/\/login\?from=logout$/);
  await expect(page.locator('.auth-gateway')).toBeVisible();
  const calls = await page.evaluate(() => (window as any).accountFixture.calls);
  expect(calls.find((call: any) => call.name === 'signOut').composerAtSignOut).toBe('Unsent text preserved before sign out');
  expect(calls.findIndex((call: any) => call.name === 'wizard-delete')).toBeGreaterThan(calls.findIndex((call: any) => call.name === 'signOut'));
  const book = await readAccountBook(page);
  expect(book.userId).toBe(ACCOUNT_ID);
  expect(book.chats.find((chat: any) => chat.id === book.selectedId).composer).toBe('Unsent text preserved before sign out');
  expect(evidence.unexpected).toEqual([]); expect(evidence.pageErrors).toEqual([]);
});

test('failed logout keeps the session, draft and player and permits retry', async ({ page }) => {
  const evidence = await installAccountApp(page);
  await page.goto('/app'); await expect(input(page)).toBeVisible();
  const player = await page.locator('iframe[title="Grifon animated companion"]').elementHandle();
  await input(page).fill('Keep my draft when sign out fails');
  await page.evaluate(() => { (window as any).accountFixture.signOutFails = true; });
  const settings = await showAccountSettings(page);
  await settings.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(settings.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/app$/);
  expect(await page.evaluate(() => sessionStorage.getItem('account_fixture_signed_in'))).toBe('1');
  expect(await page.evaluate(() => (window as any).accountFixture.calls.some((call: any) => call.name === 'wizard-delete'))).toBe(false);
  await expect(input(page)).toHaveValue('Keep my draft when sign out fails');
  expect(await player!.evaluate(element => element.isConnected)).toBe(true);
  await page.evaluate(() => { (window as any).accountFixture.signOutFails = false; });
  await settings.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login\?from=logout$/);
  expect(evidence.unexpected).toEqual([]); expect(evidence.pageErrors).toEqual([]);
});

for (const action of ['Sign out', 'Upgrade plan', 'Help & support', 'Terms of service', 'Privacy policy']) {
  test(`failed draft save blocks settings ${action} and preserves session`, async ({ page }) => {
    const evidence = await installAccountApp(page);
    await page.goto('/app'); await expect(input(page)).toBeVisible();
    const id = await page.getByTestId('companion-chat').getAttribute('data-chat-id');
    await page.evaluate(() => {
      const originalPut = IDBObjectStore.prototype.put;
      (window as any).accountFailStorage = true;
      IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
        if (this.name === 'conversations' && (window as any).accountFailStorage) throw new DOMException('Account fixture save unavailable', 'QuotaExceededError');
        return originalPut.apply(this, args);
      };
    });
    await input(page).fill('This draft must stay through failed navigation');
    const settings = await showAccountSettings(page);
    await settings.getByRole('button', { name: new RegExp(`^${action.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`) }).click();
    await expect(settings.getByRole('alert')).toContainText(/sav|draft/i);
    await expect(page).toHaveURL(/\/app$/);
    expect(await page.evaluate(() => sessionStorage.getItem('account_fixture_signed_in'))).toBe('1');
    expect(await page.evaluate(() => (window as any).accountFixture.calls.some((call: any) => ['signOut', 'wizard-delete'].includes(call.name)))).toBe(false);
    expect(await page.getByTestId('companion-chat').getAttribute('data-chat-id')).toBe(id);
    await expect(input(page)).toHaveValue('This draft must stay through failed navigation');
    await page.evaluate(() => { (window as any).accountFailStorage = false; });
    await settings.getByRole('button', { name: /close/i }).click();
    await page.getByRole('button', { name: 'Retry saving', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Retry saving', exact: true })).toHaveCount(0);
    await expect.poll(async () => {
      const book = await readAccountBook(page); return book.chats.find((chat: any) => chat.id === book.selectedId).composer;
    }).toBe('This draft must stay through failed navigation');
    expect(evidence.unexpected).toEqual([]); expect(evidence.pageErrors).toEqual([]);
  });
}

test('chat is the default app entry and Studio navigation preserves draft and browser history', async ({ page }) => {
  const evidence = await installAccountApp(page);
  await page.goto('/app'); await expect(input(page)).toBeVisible();
  await input(page).fill('Return to this chat after Studio');
  await page.getByRole('button', { name: 'Studio', exact: true }).click();
  await expect(page).toHaveURL(/\/app\?experience=studio$/);
  await expect(page.getByText('What are we selling today?')).toBeVisible();
  await page.goBack(); await expect(input(page)).toHaveValue('Return to this chat after Studio');
  await page.reload(); await expect(input(page)).toHaveValue('Return to this chat after Studio');
  expect(evidence.unexpected).toEqual([]); expect(evidence.pageErrors).toEqual([]);
});

test('actual landing Research action survives browser Back and Forward', async ({ page }) => {
  const evidence = await installAccountApp(page);
  await page.goto('/');
  const cookies = page.getByRole('dialog', { name: 'Analytics consent', exact: true });
  if (await cookies.isVisible()) await cookies.getByRole('button', { name: 'Decline', exact: true }).click();
  await page.getByRole('button', { name: 'Research my market', exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('heading', { name: 'Recon', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.locator('.landing-page')).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('heading', { name: 'Recon', exact: true })).toBeVisible();
  await expect(input(page)).toHaveCount(0);
  expect(evidence.unexpected).toEqual([]); expect(evidence.pageErrors).toEqual([]);
});

test('Studio Edit Bay selection returns to the original chat with browser Back', async ({ page }) => {
  const evidence = await installAccountApp(page);
  await page.goto('/app'); await expect(input(page)).toBeVisible();
  await input(page).fill('Original chat draft before selecting a Studio tool');
  await page.getByRole('button', { name: 'Studio', exact: true }).click();
  await expect(page).toHaveURL(/\/app\?experience=studio$/);
  await page.getByRole('navigation', { name: 'Dashboard tools', exact: true })
    .getByRole('button', { name: /^Edit Bay(?:, requires pro)?$/ }).click();
  await expect(page.getByPlaceholder('Paste your script or outline here...', { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/app$/);
  await expect(input(page)).toHaveValue('Original chat draft before selecting a Studio tool');
  await page.goForward();
  await expect(page).toHaveURL(/\/app\?experience=studio$/);
  await expect(page.getByPlaceholder('Paste your script or outline here...', { exact: true })).toBeVisible();
  expect(evidence.unexpected).toEqual([]); expect(evidence.pageErrors).toEqual([]);
});

test('actual email OTP entry returns to default chat after a recoverable invalid code', async ({ page }) => {
  const evidence = await installAccountApp(page, false);
  await page.goto('/app'); await expect(page).toHaveURL(/\/login$/);
  const cookies = page.getByRole('dialog', { name: 'Analytics consent', exact: true });
  if (await cookies.isVisible()) await cookies.getByRole('button', { name: 'Decline', exact: true }).click();
  await page.getByLabel(/EMAIL$/).fill(ACCOUNT_EMAIL);
  await page.getByRole('button', { name: 'CONTINUE WITH EMAIL', exact: true }).click();
  await expect(page.getByLabel(/VERIFICATION CODE$/)).toBeVisible();
  await page.evaluate(() => { (window as any).accountFixture.otpFails = true; });
  await page.getByLabel(/VERIFICATION CODE$/).fill('123456');
  await expect(page.getByText('Account fixture code invalid', { exact: true })).toBeVisible();
  await page.evaluate(() => { (window as any).accountFixture.otpFails = false; });
  await page.getByRole('button', { name: 'VERIFY & CONTINUE', exact: true }).click();
  await expect(page).toHaveURL(/\/app$/); await expect(input(page)).toBeVisible();
  const settings = await showAccountSettings(page);
  if (process.env.COMPANION_ACCOUNT_ORIGINAL_SUBSCRIPTION === '1') {
    fs.writeFileSync(path.join(QA, `${phase}-otp-plan.json`), JSON.stringify({
      proConfirmed: await settings.getByText('Pro Edition', { exact: true }).count() > 0,
      calls: await page.evaluate(() => (window as any).accountFixture.calls.filter((call: any) => call.name === 'plan-read')),
    }, null, 2));
    await page.screenshot({ path: path.join(QA, `${phase}-otp-plan.png`), fullPage: true });
  }
  await expect(settings).toContainText('Pro Edition');
  const calls = await page.evaluate(() => (window as any).accountFixture.calls.filter((call: any) => call.name.startsWith('otp-')));
  expect(calls.map((call: any) => call.name)).toEqual(['otp-send', 'otp-verify', 'otp-verify']);
  expect(calls.every((call: any) => call.email === ACCOUNT_EMAIL)).toBe(true);
  expect(evidence.consentWrites).toEqual([]);
  expect(evidence.unexpected).toEqual([]); expect(evidence.pageErrors).toEqual([]);
});

test('an intended tool takes precedence over the default chat entry', async ({ page }) => {
  const evidence = await installAccountApp(page);
  await page.addInitScript(() => sessionStorage.setItem('grifon_intended_module', 'market_research'));
  await page.goto('/app');
  await expect(page.getByRole('heading', { name: 'Recon', exact: true })).toBeVisible();
  await expect(input(page)).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem('grifon_intended_module'))).toBeNull();
  expect(evidence.unexpected).toEqual([]); expect(evidence.pageErrors).toEqual([]);
});

test('pending checkout keeps precedence over intended tool and return-to-ad intents', async ({ page }) => {
  const evidence = await installAccountApp(page);
  await page.addInitScript(() => {
    if (window !== window.top || sessionStorage.getItem('account_plan_intent_seeded')) return;
    sessionStorage.setItem('account_plan_intent_seeded', '1');
    sessionStorage.setItem('grifon_intended_plan', JSON.stringify({ plan_id: 'business', billing_cycle: 'annual' }));
    sessionStorage.setItem('grifon_intended_module', 'market_research');
    sessionStorage.setItem('grifon_return_to_ad', '1');
  });
  await page.route('**/api/billing?action=intent', route => route.fulfill({ json: {
    intent_id: 'account-fixture-intent', client_key: 'test-only-intent', status: 'awaiting_payment_method',
    plan: { id: 'business', name: 'Business', billing_cycle: 'annual', description: 'Account smoke fixture' },
    breakdown: { subtotal_centavos: 499700, vat_centavos: 0, total_centavos: 499700, add_on_centavos: 0 },
  } }));
  await page.goto('/app');
  await expect(page).toHaveURL(/\/checkout\?plan=business&cycle=annual$/);
  await expect(page.getByRole('radio', { name: /^Annual/ })).toBeChecked();
  expect(await page.evaluate(() => sessionStorage.getItem('grifon_intended_module'))).toBe('market_research');
  expect(await page.evaluate(() => sessionStorage.getItem('grifon_return_to_ad'))).toBe('1');
  expect(evidence.unexpected).toEqual([]); expect(evidence.pageErrors).toEqual([]);
});

test('a return-to-ad marker with no finished ad safely retains the chat entry', async ({ page }) => {
  const evidence = await installAccountApp(page);
  await page.addInitScript(() => sessionStorage.setItem('grifon_return_to_ad', '1'));
  await page.goto('/app'); await expect(input(page)).toBeVisible();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('grifon_return_to_ad'))).toBeNull();
  expect(evidence.unexpected).toEqual([]); expect(evidence.pageErrors).toEqual([]);
});

test('chat, sidebar, viewer and settings use neutral thin accessible scrollbars', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const evidence = await openPreview(page);
  await page.evaluate(() => (window as any).companionFixture.emit('storyboard'));
  await page.getByRole('button', { name: 'Open storyboard', exact: true }).click();
  const selectors = ['.companion-scroll', '.companion-sidebar-scroll', '.companion-output-viewer'];
  const inspect = (selector: string) => page.locator(selector).evaluate(element => {
    const style = getComputedStyle(element);
    const ancestors: Element[] = [];
    for (let current: Element | null = element; current; current = current.parentElement) ancestors.push(current);
    const background = ancestors.reverse().reduce((base, node) => {
      const color = getComputedStyle(node).backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (!color) return base;
      const alpha = color[4] === undefined ? 1 : Number(color[4]);
      return base.map((value, i) => Number(color[i + 1]) * alpha + value * (1 - alpha));
    }, [0, 0, 0]);
    return { width: style.scrollbarWidth, color: style.scrollbarColor, background };
  });
  const neutral = (color: string, background: number[]) => {
    const first = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    expect(first, `visible neutral thumb in ${color}`).not.toBeNull();
    const channels = first!.slice(1, 4).map(Number);
    // Zinc grays may have a slight cool tint; saturated brand-yellow fails this contract.
    expect(Math.max(...channels) - Math.min(...channels)).toBeLessThanOrEqual(16);
    expect(Number(first![1])).toBeGreaterThan(0); expect(Number(first![1])).toBeLessThan(255);
    const luminance = (rgb: number[]) => rgb.map(value => value / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
      .reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
    const thumb = luminance(channels), surface = luminance(background);
    expect((Math.max(thumb, surface) + 0.05) / (Math.min(thumb, surface) + 0.05)).toBeGreaterThanOrEqual(3);
  };
  const styles: Record<string, unknown> = {};
  for (const selector of selectors) {
    await expect(page.locator(selector)).toBeVisible();
    const style = await inspect(selector); styles[selector] = style;
    expect(style.width).toBe('thin'); neutral(style.color, style.background);
  }
  await page.getByRole('button', { name: 'Close viewer', exact: true }).click();
  const settings = await showAccountSettings(page);
  const settingsStyle = await inspect('.companion-settings-scroll');
  styles['.companion-settings-scroll'] = settingsStyle;
  expect(settingsStyle.width).toBe('thin'); neutral(settingsStyle.color, settingsStyle.background);
  const box = await page.locator('.companion-settings-scroll').boundingBox();
  await page.mouse.move(box!.x + box!.width - 3, box!.y + 90);
  const hoverStyle = await inspect('.companion-settings-scroll');
  neutral(hoverStyle.color, hoverStyle.background);
  await page.emulateMedia({ forcedColors: 'active' });
  expect((await inspect('.companion-settings-scroll')).color).toBe('auto');
  await page.emulateMedia({ forcedColors: 'none' });
  await expect(settings).toBeVisible();
  fs.writeFileSync(path.join(QA, `${phase}-scrollbars.json`), JSON.stringify(styles, null, 2));
  expect(evidence.unexpected).toEqual([]); expect(evidence.pageErrors).toEqual([]);
});

test('late subscription response cannot replace the newly signed-in account plan', async ({ page }) => {
  const evidence = await installAccountApp(page);
  await page.addInitScript(() => { (window as any).accountFixture.holdPlanUsers['account-fixture-user'] = true; });
  await page.goto('/app'); await expect(input(page)).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).accountFixture.planWaiters.length)).toBeGreaterThan(0);
  await page.evaluate(() => { (window as any).accountFixture.signInAs('account-fixture-second'); });
  await expect.poll(() => page.evaluate(() => (window as any).accountFixture.calls.filter((call: any) => call.name === 'plan-read' && call.userId === 'account-fixture-second').length)).toBeGreaterThan(0);
  const settings = await showAccountSettings(page);
  await expect(settings).toContainText('Starter Edition');
  await page.evaluate(() => {
    const state = (window as any).accountFixture;
    state.holdPlanUsers['account-fixture-user'] = false;
    state.planWaiters.splice(0).forEach((waiter: { resolve: () => void }) => waiter.resolve());
  });
  // Allow a queued promise resolution and React commit, without adding wall-clock timing.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(settings).toContainText('Starter Edition');
  await expect(settings.getByText('Pro Edition', { exact: true })).toHaveCount(0);
  expect(evidence.unexpected).toEqual([]); expect(evidence.pageErrors).toEqual([]);
});

test('settings keep an unconfirmed plan pending and recover a failed plan read', async ({ page }) => {
  const evidence = await installAccountApp(page);
  await page.addInitScript(() => { (window as any).accountFixture.holdPlanUsers['account-fixture-user'] = true; });
  await page.goto('/app'); await expect(input(page)).toBeVisible();
  const settings = await showAccountSettings(page);
  await expect(settings.getByText('Checking your plan…', { exact: true })).toBeVisible();
  await expect(settings.getByText('Free Edition', { exact: true })).toHaveCount(0);
  await expect(settings.getByRole('button', { name: /^Upgrade plan\b/ })).toBeDisabled();
  await page.evaluate(() => {
    const state = (window as any).accountFixture;
    state.planReadFails = true; state.holdPlanUsers['account-fixture-user'] = false;
    state.planWaiters.splice(0).forEach((waiter: { resolve: () => void }) => waiter.resolve());
  });
  await expect(settings.getByRole('alert')).toBeVisible();
  await expect(settings.getByText('Free Edition', { exact: true })).toHaveCount(0);
  await page.evaluate(() => { (window as any).accountFixture.planReadFails = false; });
  await settings.getByRole('button', { name: /retry.*plan/i }).click();
  await expect(settings).toContainText('Pro Edition');
  await expect(settings.getByRole('button', { name: /^Upgrade plan\b/ })).toBeEnabled();
  expect(evidence.unexpected).toEqual([]); expect(evidence.pageErrors).toEqual([]);
});

for (const [action, destination] of [['Upgrade plan', '/pricing'], ['Help & support', '/support'], ['Terms of service', '/terms'], ['Privacy policy', '/privacy']]) {
  test(`settings ${action} navigates after saving and browser Back restores chat`, async ({ page, baseURL }) => {
    const evidence = await installAccountApp(page);
    await page.goto('/app'); await expect(input(page)).toBeVisible();
    await input(page).fill(`Keep this draft while opening ${action}`);
    const settings = await showAccountSettings(page);
    await settings.getByRole('button', { name: new RegExp(`^${action.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`) }).click();
    await expect(page).toHaveURL(new URL(destination, baseURL).href);
    const book = await readAccountBook(page);
    expect(book.chats.find((chat: any) => chat.id === book.selectedId).composer).toBe(`Keep this draft while opening ${action}`);
    await page.goBack();
    await expect(input(page)).toHaveValue(`Keep this draft while opening ${action}`);
    expect(evidence.unexpected).toEqual([]); expect(evidence.pageErrors).toEqual([]);
  });
}

test('same-account token refresh keeps the paid Studio form and unsent script mounted', async ({ page }) => {
  const evidence = await installAccountApp(page);
  await page.goto('/app?experience=studio');
  await page.getByRole('navigation', { name: 'Dashboard tools', exact: true })
    .getByRole('button', { name: /^Edit Bay(?:, requires pro)?$/ }).click();
  const script = page.getByPlaceholder('Paste your script or outline here...', { exact: true });
  await expect(script).toBeVisible();
  const field = await script.elementHandle();
  await script.fill('Keep this unsent Studio script through token refresh');
  await page.evaluate(() => {
    const state = (window as any).accountFixture;
    state.holdPlanUsers['account-fixture-user'] = true; state.refreshToken();
  });
  try {
    await expect.poll(() => page.evaluate(() => (window as any).accountFixture.planWaiters.length)).toBeGreaterThan(0);
    await expect(script).toHaveValue('Keep this unsent Studio script through token refresh');
    expect(await field!.evaluate(element => element.isConnected)).toBe(true);
  } finally {
    await page.evaluate(() => {
      const state = (window as any).accountFixture;
      state.holdPlanUsers['account-fixture-user'] = false;
      state.planWaiters.splice(0).forEach((waiter: { resolve: () => void }) => waiter.resolve());
    });
  }
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(script).toHaveValue('Keep this unsent Studio script through token refresh');
  expect(await field!.evaluate(element => element.isConnected)).toBe(true);
  expect(evidence.unexpected).toEqual([]); expect(evidence.pageErrors).toEqual([]);
});

test('an unknown held consent read does not block saved-draft logout and its late response is ignored', async ({ page }) => {
  const evidence = await installAccountApp(page);
  await page.goto('/app'); await expect(input(page)).toBeVisible();
  await input(page).fill('Save this draft even if ad preference cannot finish loading');
  await page.evaluate(() => { (window as any).accountFixture.holdConsent = true; });
  const settings = await showAccountSettings(page);
  await expect.poll(() => page.evaluate(() => !!(window as any).accountFixture.releaseConsent)).toBe(true);
  await expect(settings.getByRole('switch', { name: 'Personalized ads', exact: true })).toHaveCount(0);
  const signOut = settings.getByRole('button', { name: 'Sign out', exact: true });
  await expect(signOut).toBeEnabled(); await signOut.click();
  await expect(page).toHaveURL(/\/login\?from=logout$/);
  const book = await readAccountBook(page);
  expect(book.chats.find((chat: any) => chat.id === book.selectedId).composer).toBe('Save this draft even if ad preference cannot finish loading');
  await page.evaluate(() => { const state = (window as any).accountFixture; state.holdConsent = false; state.releaseConsent(); });
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(page.locator('.auth-gateway')).toBeVisible();
  await expect(settings).toHaveCount(0);
  expect(evidence.consentWrites).toEqual([]);
  expect(evidence.unexpected).toEqual([]); expect(evidence.pageErrors).toEqual([]);
});

test('a pending confirmed consent write guards logout until the response finishes', async ({ page }) => {
  const evidence = await installAccountApp(page);
  await page.goto('/app'); await expect(input(page)).toBeVisible();
  const settings = await showAccountSettings(page);
  const consent = settings.getByRole('switch', { name: 'Personalized ads', exact: true });
  await expect(consent).toBeEnabled();
  await page.evaluate(() => { (window as any).accountFixture.holdConsentWrite = true; });
  await consent.click();
  await expect.poll(() => page.evaluate(() => !!(window as any).accountFixture.releaseConsentWrite)).toBe(true);
  const signOut = settings.getByRole('button', { name: 'Sign out', exact: true });
  try { await expect(signOut).toBeDisabled(); await expect(consent).toBeDisabled(); }
  finally { await page.evaluate(() => { const state = (window as any).accountFixture; state.holdConsentWrite = false; state.releaseConsentWrite(); }); }
  await expect(consent).toBeChecked(); await expect(signOut).toBeEnabled();
  expect(evidence.consentWrites).toEqual(['grant']);
  expect(evidence.unexpected).toEqual([]); expect(evidence.pageErrors).toEqual([]);
});

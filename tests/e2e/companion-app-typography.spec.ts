import { test, expect, type Locator, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { installAccountApp, showAccountSettings } from './companion-account-fixture.js';

const input = (page: Page) => page.getByRole('textbox', { name: 'Message Grifon', exact: true });
const typeStyle = (locator: Locator) => locator.evaluate(element => {
  const style = getComputedStyle(element);
  return { font: style.fontFamily, size: style.fontSize, color: style.color, weight: style.fontWeight };
});
async function capture(page: Page, name: string, metrics?: unknown) {
  const directory = process.env.COMPANION_APP_TYPOGRAPHY_QA_DIR;
  if (!directory) return;
  fs.mkdirSync(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, `${name}.png`), fullPage: true });
  if (metrics) fs.writeFileSync(path.join(directory, `${name}.json`), JSON.stringify(metrics, null, 2));
}

// Demonstrate the regression against the original cascade without editing source.
test.beforeEach(async ({ page }) => {
  if (process.env.COMPANION_APP_ORIGINAL_TYPOGRAPHY !== '1') return;
  await page.route('**/app*', async route => {
    if (!route.request().isNavigationRequest() || new URL(route.request().url()).pathname !== '/app') return route.fallback();
    const response = await route.fetch({ url: new URL('/index.html', route.request().url()).href });
    const body = await response.text();
    const exclusion = ', .companion-chat *, :where(.companion-settings[data-companion-theme]) *';
    if (body.split(exclusion).length !== 6) throw new Error('Original typography negative control no longer matches the five global selectors');
    await route.fulfill({ response, body: body.replaceAll(exclusion, '') });
  });
});

for (const width of [375, 1280]) {
  for (const theme of ['dark', 'light']) {
    test(`actual app ${theme} ${width}px keeps approved chat typography and account state`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 375 ? 667 : 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const evidence = await installAccountApp(page);
      await page.addInitScript(value => localStorage.setItem('grifon-companion-appearance', value), theme);
      await page.goto('/app');
      await expect(input(page)).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const iframe = page.locator('iframe[title="Grifon animated companion"]');
      await expect(iframe).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
      const player = (await iframe.elementHandle())!;
      const typography = {
        name: await typeStyle(page.locator('.companion-display')),
        status: await typeStyle(page.locator('.companion-identity-status')),
        composer: await typeStyle(input(page)),
        assistant: await typeStyle(page.locator('.companion-message-assistant').first()),
      };
      const bounds = {
        main: (await page.locator('.companion-main').boundingBox())!,
        identity: (await page.locator('.companion-identity').boundingBox())!,
        avatar: (await page.locator('[data-companion-avatar-slot]').boundingBox())!,
        name: (await page.locator('.companion-display').boundingBox())!,
        status: (await page.locator('.companion-identity-status').boundingBox())!,
        header: (await page.locator('.companion-header').boundingBox())!,
        scroll: (await page.getByTestId('conversation-scroll').boundingBox())!,
        composer: (await page.locator('.companion-composer').boundingBox())!,
        reply: (await page.locator('.companion-message-assistant').first().boundingBox())!,
      };
      await capture(page, `${theme}-${width}-chat`, { typography, bounds });
      for (const [name, style] of Object.entries(typography)) expect.soft(style.font, `${name} uses Oxanium in the actual App`).toContain('Oxanium');
      expect.soft(typography.composer.size, 'mobile composer keeps its 16px input').toBe(width < 768 ? '16px' : '14px');
      expect.soft(typography.name.weight, 'the approved name retains its medium display weight').toBe('500');
      expect(Math.abs(bounds.identity.x + bounds.identity.width / 2 - bounds.main.x - bounds.main.width / 2)).toBeLessThanOrEqual(2);
      expect(bounds.name.y).toBeGreaterThanOrEqual(bounds.avatar.y + bounds.avatar.height);
      expect(bounds.status.y).toBeGreaterThanOrEqual(bounds.name.y + bounds.name.height);
      expect(bounds.scroll.y).toBeGreaterThanOrEqual(bounds.header.y + bounds.header.height - .5);
      expect(Math.abs(bounds.reply.x - bounds.composer.x)).toBeLessThanOrEqual(1);
      expect((await typeStyle(page.getByTestId('conversation-time-divider'))).font, 'timestamps keep explicit metadata typography').toContain('JetBrains Mono');

      await input(page).fill('Cold brew for busy parents.');
      await page.getByRole('button', { name: 'Send', exact: true }).click();
      await expect(page.locator('.companion-message-assistant')).toHaveCount(2);
      await expect(page.locator('.companion-identity-status')).toHaveText('Ready');
      expect((await typeStyle(page.locator('.companion-message-user'))).font).toContain('Oxanium');
      const draft = `Retain ${theme} ${width} draft`;
      await input(page).fill(draft);
      if (width < 768) await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
      const account = page.getByRole('button', { name: 'Account settings', exact: true });
      await expect(account).toBeVisible();
      expect.soft((await typeStyle(account)).font, 'sidebar account text uses Oxanium').toContain('Oxanium');
      expect.soft((await typeStyle(page.getByRole('button', { name: 'Studio', exact: true }))).font, 'sidebar Studio text uses Oxanium').toContain('Oxanium');
      const settings = await showAccountSettings(page);
      const settingsType = {
        title: await typeStyle(settings.getByRole('heading', { name: 'Settings', exact: true })),
        action: await typeStyle(settings.getByRole('button', { name: 'Sign out', exact: true })),
        theme: await typeStyle(settings.getByRole('button', { name: 'Light', exact: true })),
      };
      await capture(page, `${theme}-${width}-settings`, settingsType);
      for (const [name, style] of Object.entries(settingsType)) expect.soft(style.font, `settings ${name} uses Oxanium`).toContain('Oxanium');
      await expect(settings.getByRole('button', { name: 'Close settings', exact: true })).toBeFocused();
      expect(await input(page).evaluate(element => !!element.closest('[inert]'))).toBe(true);
      const nextTheme = theme === 'dark' ? 'light' : 'dark';
      await settings.getByRole('button', { name: nextTheme === 'light' ? 'Light' : 'Dark', exact: true }).click();
      await expect(page.locator('.companion-shell')).toHaveAttribute('data-companion-theme', nextTheme);
      expect(await player.evaluate(element => element.isConnected)).toBe(true);
      await page.keyboard.press('Escape');
      await expect(settings).toHaveCount(0);
      if (await page.getByRole('dialog', { name: 'Chat navigation', exact: true }).isVisible()) await page.keyboard.press('Escape');
      await expect(input(page)).toHaveValue(draft);
      expect(await input(page).evaluate(element => !!element.closest('[inert]'))).toBe(false);
      expect(await player.evaluate(element => element.isConnected)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(evidence.unexpected).toEqual([]);
      expect(evidence.pageErrors).toEqual([]);
    });
  }
}

test('chat typography remains scoped away from the website and Studio', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const evidence = await installAccountApp(page);
  await page.goto('/');
  await expect(page.locator('.landing-page')).toBeVisible();
  const wordmark = page.locator('header').getByText('GRIFON', { exact: true });
  await expect(wordmark).toBeVisible();
  expect((await typeStyle(wordmark)).font).toContain('Inter');
  expect((await typeStyle(wordmark)).font).not.toContain('Oxanium');
  await page.goto('/app?experience=studio');
  const business = page.getByRole('textbox', { name: 'Describe your business', exact: true });
  await expect(business).toBeVisible();
  expect((await typeStyle(business)).font).toContain('Inter');
  const settings = await showAccountSettings(page);
  expect(await settings.locator('..').getAttribute('data-companion-theme')).toBeNull();
  expect((await typeStyle(settings.getByRole('heading', { name: 'Settings', exact: true }))).font).toContain('Inter');
  expect((await typeStyle(settings.getByRole('button', { name: 'Sign out', exact: true }))).font).toContain('Inter');
  await page.keyboard.press('Escape');
  await expect(settings).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Dashboard tools', exact: true })
    .getByRole('button', { name: /^Edit Bay(?:, requires pro)?$/ }).click();
  const script = page.getByPlaceholder('Paste your script or outline here...', { exact: true });
  await expect(script).toBeVisible();
  expect((await typeStyle(script)).font).toContain('Inter');
  expect((await typeStyle(script)).font).not.toContain('Oxanium');
  expect(evidence.unexpected).toEqual([]);
  expect(evidence.pageErrors).toEqual([]);
});

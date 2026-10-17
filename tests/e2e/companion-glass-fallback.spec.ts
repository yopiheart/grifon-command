import { test, expect, type Page } from '@playwright/test';

const fallbackBrowsers = [
  { name: 'Safari', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15' },
  { name: 'Firefox', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0' },
  { name: 'Chrome on iOS', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1' },
];

async function expectOrdinaryGlass(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const surfaces = await page.locator('[data-companion-glass].mat-chrome').evaluateAll(nodes => nodes.map(node => {
    const before = getComputedStyle(node, '::before');
    return { lens: getComputedStyle(node).getPropertyValue('--companion-lens-filter').trim(),
      backdrop: before.getPropertyValue('backdrop-filter') || before.getPropertyValue('-webkit-backdrop-filter') };
  }));
  expect(surfaces.length).toBeGreaterThan(0);
  for (const surface of surfaces) {
    expect(surface.lens).toBe('');
    expect(surface.backdrop).toContain('blur(9px)');
    expect(surface.backdrop).not.toContain('url(');
  }
  expect(await page.locator('filter[id^="companion-lens-"]').count()).toBe(0);
}

for (const browser of fallbackBrowsers) {
  test.describe(`${browser.name} glass fallback`, () => {
    test.use({ userAgent: browser.userAgent });
    test('ordinary blur preserves themes, navigation and readable composer', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.addInitScript(() => localStorage.setItem('grifon-companion-appearance', 'dark'));
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname.startsWith('/api/')) return route.abort();
        return route.continue();
      });
      await page.goto('/companion-chat-preview.html');
      const input = page.getByRole('textbox', { name: 'Message Grifon', exact: true });
      await expect(input).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expectOrdinaryGlass(page);
      await input.fill('Keep my draft');
      for (const theme of ['Light', 'Dark']) {
        await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
        await page.getByRole('button', { name: 'Account settings', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Settings', exact: true });
        await expect(dialog).toBeVisible();
        await dialog.getByRole('group', { name: 'Chat appearance', exact: true }).getByRole('button', { name: theme, exact: true }).click();
        await expectOrdinaryGlass(page);
        await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
        const close = page.getByRole('button', { name: 'Close conversations', exact: true });
        if (await close.isVisible()) await close.click();
        await expect(page.locator('.companion-shell')).toHaveAttribute('data-companion-theme', theme.toLowerCase());
        await expect(input).toHaveValue('Keep my draft'); await expect(input).toBeVisible();
        await expect(page.getByRole('button', { name: 'Send', exact: true })).toBeVisible();
        await expectOrdinaryGlass(page);
        const text = await input.evaluate(node => ({ color: getComputedStyle(node).color, size: getComputedStyle(node).fontSize,
          fits: node.getBoundingClientRect().right <= innerWidth && node.getBoundingClientRect().bottom <= innerHeight }));
        expect(text.color).not.toBe('rgba(0, 0, 0, 0)'); expect(text.size).toBe('16px'); expect(text.fits).toBe(true);
      }
      await page.getByRole('button', { name: 'Send', exact: true }).click();
      await expect(page.locator('.companion-message-user')).toHaveText('Keep my draft');
      await expect(page.getByRole('status', { name: 'Grifon is typing', exact: true })).toHaveCount(0);
      await expect(page.locator('.companion-message-assistant').last()).toContainText('What is the brand name?');
    });
  });
}

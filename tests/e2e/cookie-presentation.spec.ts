import { test, expect } from '@playwright/test';

for (const size of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  test(`consent choices fit and remain usable at ${size.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(size);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const path of ['/', '/pricing', '/login']) {
      await page.goto(path);
      const banner = page.getByRole('dialog', { name: 'Analytics consent' });
      await expect(banner).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`consent-${path.replaceAll('/', '') || 'landing'}.png`) });
      const bounds = await banner.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(size.width);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(size.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (path === '/') {
        const primary = page.locator('.landing-hero-actions button');
        const box = await primary.boundingBox();
        if (size.width < 640) expect.soft(box!.y + box!.height, 'hero CTA above consent banner').toBeLessThanOrEqual(bounds!.y);
      }
      for (const name of ['Decline analytics', 'Privacy Policy', 'Decline', 'Accept']) {
        const choice = banner.getByRole('button', { name, exact: true });
        const box = await choice.boundingBox();
        expect.soft(box!.height, `${path} ${name} touch target`).toBeGreaterThanOrEqual(44);
        expect.soft(box!.width, `${path} ${name} touch target`).toBeGreaterThanOrEqual(44);
      }
    }
    const banner = page.getByRole('dialog', { name: 'Analytics consent' });
    await page.getByRole('button', { name: 'Continue with Google' }).focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('#signup-email')).toBeFocused();
    const email = await page.locator('#signup-email').boundingBox();
    const notice = await banner.boundingBox();
    if (size.width < 640) expect(email!.y + email!.height).toBeLessThanOrEqual(notice!.y);
    await page.screenshot({ path: testInfo.outputPath('consent-email-focused.png') });
    for (const name of ['Terms of Service', 'Privacy Policy', 'REFUND', 'SUPPORT']) {
      const footerControl = page.locator('.auth-gateway').getByRole('button', { name, exact: true }).first();
      await footerControl.focus();
      const control = await footerControl.boundingBox();
      const consent = await banner.boundingBox();
      if (size.width < 640) expect.soft(control!.y + control!.height, `${name} visible above banner`).toBeLessThanOrEqual(consent!.y);
    }
    await page.screenshot({ path: testInfo.outputPath('consent-support-focused.png') });
    await banner.getByRole('button', { name: 'Privacy Policy', exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(banner.getByRole('button', { name: 'Decline', exact: true })).toBeFocused();
    const heightWithNotice = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.keyboard.press('Enter');
    await expect(banner).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(heightWithNotice);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('grifon_pixel_consent') || 'null').granted)).toBe(false);
    await page.reload();
    await expect(banner).toHaveCount(0);
  });
}

test('consent waits for a choice and preserves accept, close and privacy callbacks', async ({ page }) => {
  // Mount the real banner only: this exercises consent without initializing a
  // pixel, authenticating, or sending any request to a payment provider.
  await page.route(/\/App\.tsx(?:\?.*)?$/, route => route.fulfill({
    contentType: 'application/javascript',
    body: `import React from '/node_modules/.vite/deps/react.js';
      import { ConsentBanner } from '/components/ui/ConsentBanner.tsx';
      export default function App() { return React.createElement(ConsentBanner, {
        onConsent: value => { window.__consentChoices = [...(window.__consentChoices || []), value]; },
        onNavigatePrivacy: () => { window.__privacyOpened = true; }
      }); }`,
  }));
  await page.goto('/');
  const banner = page.getByRole('dialog', { name: 'Analytics consent' });
  await expect(banner).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('grifon_pixel_consent'))).toBeNull();
  await banner.getByRole('button', { name: 'Privacy Policy', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__privacyOpened)).toBe(true);
  expect(await page.evaluate(() => (window as any).__consentChoices)).toBeUndefined();
  await banner.getByRole('button', { name: 'Accept', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__consentChoices)).toEqual([true]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('grifon_pixel_consent')!).granted)).toBe(true);
  await page.reload();
  await expect(banner).toHaveCount(0);
  await page.evaluate(() => localStorage.removeItem('grifon_pixel_consent'));
  await page.reload();
  await banner.getByRole('button', { name: 'Decline analytics', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__consentChoices)).toEqual([false]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('grifon_pixel_consent')!).granted)).toBe(false);
});

import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import sharp from 'sharp';

async function openChat(page: Page, width = 1280, height = 900, landscapeInsets = false) {
  await page.setViewportSize({ width, height });
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() === 'GET' && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
    if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname.startsWith('/api/')) return route.abort();
    return route.continue();
  });
  if (process.env.COMPANION_CHARCOAL_BASELINE_CSS || landscapeInsets) {
    let css = fs.readFileSync(process.env.COMPANION_CHARCOAL_BASELINE_CSS || 'components/CompanionChat/companionChat.css', 'utf8');
    // Desktop automation has no physical notch. Supply known device insets to
    // the existing CSS env() seams; expected usable bounds stay independent.
    if (landscapeInsets) css = css.replace(/env\(safe-area-inset-(left|right)\)/g, '44px').replace(/env\(safe-area-inset-bottom\)/g, '21px');
    await page.route(/\/components\/CompanionChat\/companionChat\.css(?:\?.*)?$/, async route => {
      const response = await route.fetch(), body = await response.text();
      const assignment = /const __vite__css = "(?:[^"\\]|\\.)*"/;
      if (!assignment.test(body)) throw new Error('Vite CSS negative control no longer matches');
      await route.fulfill({ response, body: body.replace(assignment, () => `const __vite__css = ${JSON.stringify(css)}`) });
    });
  }
  await page.goto('/companion-chat-preview.html');
  await expect(page.getByRole('textbox', { name: 'Message Grifon', exact: true })).toBeVisible();
}

for (const width of [667, 844]) {
  test(`landscape controls respect simulated left and right notches at ${width}px`, async ({ page }) => {
    await openChat(page, width, 390, true);
    const usable = { left: 44, right: width - 44, bottom: 390 - 21 };
    const withinSafeEdges = async (selector: string) => {
      const rect = await page.locator(selector).boundingBox();
      expect(rect!.x, `${selector} clears the left notch`).toBeGreaterThanOrEqual(usable.left);
      expect(rect!.x + rect!.width, `${selector} clears the right notch`).toBeLessThanOrEqual(usable.right);
      expect(rect!.y + rect!.height, `${selector} clears the bottom safe area`).toBeLessThanOrEqual(usable.bottom);
    };
    await withinSafeEdges('.companion-composer');
    await withinSafeEdges('.companion-identity');
    if (width < 768) {
      await withinSafeEdges('.companion-toolbar-new');
      await withinSafeEdges('.companion-header button[aria-label="Open conversations"]');
      await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
      await withinSafeEdges('.companion-mobile-navigation button[aria-label="Close conversations"]');
    }
    await page.getByRole('button', { name: 'Account settings', exact: true }).click();
    await withinSafeEdges('.companion-settings [role="dialog"]');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  });
}

test('desktop chat fills the viewport without a presentation frame', async ({ page }) => {
  await openChat(page);
  const main = await page.locator('.companion-main').boundingBox();
  const sidebar = await page.locator('.companion-sidebar').boundingBox();
  expect(sidebar!.x).toBeCloseTo(0, 0);
  expect(sidebar!.y).toBeCloseTo(0, 0);
  expect(sidebar!.height).toBeCloseTo(900, 0);
  expect(main!.y).toBeCloseTo(0, 0);
  expect(main!.x + main!.width).toBeCloseTo(1280, 0);
  expect(main!.height).toBeCloseTo(900, 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1280);
});

test('open charcoal background contains visible fine grain while text stays unfiltered', async ({ page }, testInfo) => {
  await openChat(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const main = await page.locator('.companion-main').boundingBox();
  // Empty space to the left of the readable message column, away from chrome.
  const clip = { left: Math.ceil(main!.x + 24), top: 160, width: 96, height: 96 };
  const capture = await page.screenshot({ path: testInfo.outputPath('grain-screen.png'), animations: 'disabled' });
  const styles = await page.locator('.companion-shell').evaluate(node => {
    const grain = getComputedStyle(node, '::before');
    return { display: grain.display, opacity: grain.opacity, background: grain.backgroundImage, mask: grain.maskImage, zIndex: grain.zIndex,
      layers: [...node.querySelectorAll('.companion-main, .companion-chat')].map(element => ({ className: element.className, parent: element.parentElement?.className, background: getComputedStyle(element).background })) };
  });
  fs.writeFileSync(testInfo.outputPath('grain-computed.json'), JSON.stringify(styles, null, 2));
  await testInfo.attach('grain-styles', { body: JSON.stringify(styles), contentType: 'application/json' });
  const { data, info } = await sharp(capture).extract(clip).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const luma = (offset: number) => data[offset] * .2126 + data[offset + 1] * .7152 + data[offset + 2] * .0722;
  let difference = 0, samples = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width - 1; x++) {
    const offset = (y * info.width + x) * info.channels;
    difference += Math.abs(luma(offset) - luma(offset + info.channels)); samples++;
  }
  const meanAdjacentDifference = difference / samples;
  await testInfo.attach('grain-measurement', { body: JSON.stringify({ clip, meanAdjacentDifference }), contentType: 'application/json' });
  expect(meanAdjacentDifference, 'fine grain is visible at normal 1x scale').toBeGreaterThan(.8);
  const filters = await page.locator('.companion-message').first().evaluate(node => {
    const values: string[] = [];
    for (let current: Element | null = node; current; current = current.parentElement) values.push(getComputedStyle(current).filter);
    return values;
  });
  expect(filters.every(value => value === 'none'), 'background texture must not blur or filter text').toBe(true);
});

for (const width of [375, 1280]) {
  test(`mascot remains bare and appearance stays in settings at ${width}px`, async ({ page }) => {
    await openChat(page, width, width === 375 ? 667 : 900);
    if (process.env.COMPANION_CHARCOAL_IDENTITY_GLASS === '1') {
      await page.locator('.companion-identity').evaluate(node => node.setAttribute('data-companion-glass', ''));
    }
    await expect(page.locator('.companion-identity[data-companion-glass], .companion-identity [data-companion-glass]')).toHaveCount(0);
    await expect(page.getByRole('group', { name: 'Chat appearance', exact: true })).toHaveCount(0);
    if (width < 768) await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
    await page.getByRole('button', { name: 'Account settings', exact: true }).click();
    const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
    await expect(settings.getByRole('group', { name: 'Chat appearance', exact: true })).toBeVisible();
    await settings.getByRole('button', { name: 'Light', exact: true }).click();
    await expect(page.locator('.companion-shell')).toHaveAttribute('data-companion-theme', 'light');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('textbox', { name: 'Message Grifon', exact: true })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Chat appearance', exact: true })).toHaveCount(0);
  });
}

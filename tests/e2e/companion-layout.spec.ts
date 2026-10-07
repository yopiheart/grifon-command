import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const QA = path.resolve(process.env.COMPANION_QA_DIR || 'assets/3d-lab/grifon-companion-chat/qa/centered');
const phase = process.env.COMPANION_LAYOUT_PHASE || 'current';

async function geometry(page: Page) {
  const avatar = await page.locator('iframe[title="Grifon animated companion"]:visible').boundingBox();
  const composer = await page.locator('.companion-composer').boundingBox();
  const transcript = await page.getByTestId('conversation-scroll').boundingBox();
  const header = await page.locator('.companion-header').boundingBox();
  if (!avatar || !composer || !transcript || !header) throw new Error('Missing visible avatar, composer, header or transcript');
  return { avatar, composer, transcript, header,
    centerOffset: Math.abs(avatar.x + avatar.width / 2 - composer.x - composer.width / 2),
    avatarBottom: avatar.y + avatar.height,
    overflow: await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
  };
}

for (const [width, height] of [[1280, 900], [375, 667], [390, 844]]) {
  test(`centered companion geometry and reachable controls at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const unexpected: string[] = [];
    await page.route('**/*', route => {
      const request = route.request(); const url = new URL(request.url());
      if (request.method() === 'GET' && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
      if (url.pathname === '/tests/fixtures/sample-batch/before_after-run1-complete-raw.mp4') return route.fulfill({ contentType: 'video/webm', path: 'tests/e2e/fixtures/recovery.webm' });
      if (!['http://127.0.0.1:5173', 'http://localhost:5173'].includes(url.origin) || url.pathname.startsWith('/api/')) {
        unexpected.push(`${request.method()} ${url.origin}${url.pathname}`); return route.abort();
      }
      return route.continue();
    });
    await page.goto('/companion-chat-preview.html');
    await expect(page.locator('iframe:visible')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
    fs.mkdirSync(QA, { recursive: true });
    const initial = await geometry(page);
    fs.writeFileSync(path.join(QA, `${phase}-geometry-${width}.json`), JSON.stringify(initial, null, 2));
    await page.screenshot({ path: path.join(QA, `${phase}-initial-${width}.png`), fullPage: true });
    // Floating chrome shares the composer center line; the scroll area runs below
    // it while newly opened content clears the header. Allow2px layout rounding.
    expect.soft(initial.centerOffset, 'avatar must share the composer center line').toBeLessThanOrEqual(2);
    expect.soft(initial.transcript.y, 'transcript extends beneath floating mascot').toBeLessThan(initial.avatarBottom);
    expect.soft((await page.locator('.companion-message').first().boundingBox())!.y, 'initial content clears floating chrome').toBeGreaterThanOrEqual(initial.header.y + initial.header.height - 2);
    expect(initial.overflow).toBeLessThanOrEqual(0);
    const input = page.getByRole('textbox', { name: 'Message Grifon' });
    await input.fill('Cold brew for busy parents.');
    await expect(page.getByTestId('companion-chat')).toHaveAttribute('data-companion-state', 'reading');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.getByTestId('conversation-scroll').getByText('Cold brew for busy parents.', { exact: true })).toBeVisible();
    await expect(page.getByRole('status', { name: 'Grifon is typing', exact: true })).toHaveCount(0);
    await expect.poll(() => page.getByTestId('conversation-scroll').evaluate(element => element.scrollHeight - element.clientHeight - element.scrollTop)).toBeLessThanOrEqual(24);
    await expect(page.locator('.companion-message-assistant').last()).toBeInViewport({ ratio: 1 });
    await input.fill('North Coffee');
    await page.screenshot({ path: path.join(QA, `${phase}-active-${width}.png`), fullPage: true });
    const active = await geometry(page);
    expect.soft(active.centerOffset).toBeLessThanOrEqual(2);
    expect.soft(active.transcript.y).toBeLessThan(active.avatarBottom);
    await expect(page.getByRole('button', { name: /^(Pause|Resume) companion motion$/ })).toHaveCount(0);
    for (const name of [width < 768 ? 'Open conversations' : 'Collapse conversations', 'Attach product photo', 'Send']) {
      const control = page.getByRole('button', { name, exact: true });
      await expect(control).toBeVisible();
      const bounds = await control.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height);
    }
    for (const answer of ['North Coffee', 'Morning brew', 'Two bottles for 199', '199']) {
      await input.fill(answer);
      await page.getByRole('button', { name: 'Send', exact: true }).click();
      await expect(page.getByRole('status', { name: 'Grifon is typing', exact: true })).toHaveCount(0);
    }
    await page.getByLabel('Product photo', { exact: true }).setInputFiles({
      name: 'coffee.png', mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9X8AAAAASUVORK5CYII=', 'base64'),
    });
    await page.getByRole('button', { name: 'Generate storyboard', exact: true }).click();
    await expect(page.getByTestId('companion-chat')).toHaveAttribute('data-companion-state', 'working');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(QA, `${phase}-working-${width}.png`), fullPage: true });
    await page.evaluate(() => (window as any).companionFixture.emit('storyboard'));
    await page.getByRole('button', { name: 'Open storyboard', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Approve storyboard', exact: true })).toBeVisible();
    await expect(page.getByTestId('companion-chat')).toHaveAttribute('data-companion-state', 'ready');
    await page.waitForTimeout(600);
    await expect(page.getByRole('heading', { name: 'Your scenes, before we film.', exact: true })).toBeInViewport({ ratio: 1 });
    await page.screenshot({ path: path.join(QA, `${phase}-ready-${width}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Close viewer', exact: true }).click();
    await page.evaluate(() => (window as any).companionFixture.emit('result'));
    await page.getByRole('button', { name: 'Open first cut', exact: true }).click();
    await expect.poll(() => page.locator('video').evaluate(video => (video as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(1);
    await page.waitForTimeout(600);
    await expect(page.getByRole('heading', { name: 'Your first cut.', exact: true })).toBeInViewport({ ratio: 1 });
    await page.screenshot({ path: path.join(QA, `${phase}-result-${width}.png`), fullPage: true });
    expect(unexpected).toEqual([]);
  });
}

for (const [width, height] of [[375, 667], [1000, 700]]) {
  test(`new tall brief review starts at its heading at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (route.request().method() === 'GET' && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
      if (!['http://127.0.0.1:5173', 'http://localhost:5173'].includes(url.origin) || url.pathname.startsWith('/api/')) return route.abort();
      return route.continue();
    });
    await page.goto('/companion-chat-preview.html');
    const input = page.getByRole('textbox', { name: 'Message Grifon' });
    for (const answer of ['Cold brew for busy parents.', 'North Coffee', 'Morning brew', 'Two bottles for 199', '199']) {
      await input.fill(answer);
      await page.getByRole('button', { name: 'Send', exact: true }).click();
      await expect(page.getByRole('status', { name: 'Grifon is typing', exact: true })).toHaveCount(0);
    }
    const scroller = page.getByTestId('conversation-scroll');
    const review = page.locator('[aria-label="Review your brief"]');
    await expect(review).toBeVisible();
    // Let the existing smooth follow finish before measuring its destination.
    await page.waitForTimeout(600);
    const bounds = await review.boundingBox();
    const scrollBounds = await scroller.boundingBox();
    const headerBounds = (await page.locator('.companion-header').boundingBox())!;
    const safeTop = Math.max(scrollBounds!.y, headerBounds.y + headerBounds.height);
    fs.mkdirSync(QA, { recursive: true });
    fs.writeFileSync(path.join(QA, `${phase}-review-${width}.json`), JSON.stringify({ review: bounds, transcript: scrollBounds, header: headerBounds, safeTop }, null, 2));
    await page.screenshot({ path: path.join(QA, `${phase}-review-${width}.png`), fullPage: true });
    expect.soft(bounds!.y, 'new review card heading clears floating header').toBeGreaterThanOrEqual(safeTop - 2);
    expect.soft(bounds!.y, 'new tall review card starts near the clear content top').toBeLessThanOrEqual(safeTop + 40);
    await scroller.evaluate(element => { element.scrollTop = 0; element.dispatchEvent(new Event('scroll')); });
    await expect(page.getByTestId('conversation-scroll').getByText('Cold brew for busy parents.', { exact: true })).toBeVisible();
    await input.fill('A draft while reading history');
    await page.waitForTimeout(250);
    expect(await scroller.evaluate(element => element.scrollTop), 'typing must not hijack the reader scroll position').toBe(0);
    await scroller.evaluate(element => { element.scrollTop = element.scrollHeight; element.dispatchEvent(new Event('scroll')); });
    await expect(page.getByRole('button', { name: 'Add product photo', exact: true })).toBeInViewport();
  });
}

test('320px companion retry does not overlap navigation', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 667 });
  await page.route('**/companion/scene.bin', route => route.fulfill({ status: 503, body: 'Fixture asset failure' }));
  await page.goto('/companion-chat-preview.html');
  const retry = page.getByRole('button', { name: 'Retry companion motion', exact: true });
  await expect(retry).toBeVisible();
  const retryBox = (await retry.boundingBox())!;
  const navigation = await Promise.all(['Open conversations', 'New chat'].map(name => page.getByRole('button', { name, exact: true }).boundingBox()));
  fs.mkdirSync(QA, { recursive: true });
  fs.writeFileSync(path.join(QA, `${phase}-retry-320.json`), JSON.stringify({ retry: retryBox, navigation }, null, 2));
  await page.screenshot({ path: path.join(QA, `${phase}-retry-320.png`), fullPage: true });
  for (const box of navigation) {
    expect(box).not.toBeNull();
    const intersectionWidth = Math.min(retryBox.x + retryBox.width, box!.x + box!.width) - Math.max(retryBox.x, box!.x);
    const intersectionHeight = Math.min(retryBox.y + retryBox.height, box!.y + box!.height) - Math.max(retryBox.y, box!.y);
    expect(intersectionWidth <= 0 || intersectionHeight <= 0, 'retry and navigation hit targets must not overlap').toBe(true);
  }
});

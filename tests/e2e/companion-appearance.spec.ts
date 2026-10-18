import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const chat = (page: Page) => page.getByTestId('companion-chat');
const input = (page: Page) => page.getByRole('textbox', { name: 'Message Grifon', exact: true });
const shell = (page: Page) => page.locator('.companion-shell');
const settings = (page: Page) => page.getByRole('dialog', { name: 'Settings', exact: true });
const appearance = (page: Page) => settings(page).getByRole('group', { name: 'Chat appearance', exact: true });

async function openAppearance(page: Page) {
  if (!await settings(page).isVisible()) {
    const account = page.getByRole('button', { name: 'Account settings', exact: true });
    if (!await account.isVisible()) await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
    await account.click();
  }
  await expect(settings(page)).toBeVisible();
  await expect(settings(page).getByRole('heading', { name: 'Appearance', exact: true })).toBeVisible();
  await appearance(page).scrollIntoViewIfNeeded();
  await expect(appearance(page)).toBeVisible();
}

async function closeAppearance(page: Page) {
  await page.keyboard.press('Escape');
  await expect(settings(page)).toHaveCount(0);
}

async function openFixture(page: Page, width = 390, height = 844) {
  await page.setViewportSize({ width, height });
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() === 'GET' && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
    if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname.startsWith('/api/')) return route.abort();
    return route.continue();
  });
  await page.goto('/companion-chat-preview.html');
  await expect(input(page)).toBeVisible();
  await expect(shell(page).getByRole('group', { name: 'Chat appearance', exact: true })).toHaveCount(0);
}

test('theme survives reload without losing the selected conversation or unsent draft', async ({ page }) => {
  await openFixture(page);
  const selectedId = await chat(page).getAttribute('data-chat-id');
  await input(page).fill('A draft I want to keep while choosing a theme.');
  await expect(page.getByText('Saving on this device…', { exact: true })).toHaveCount(0);
  const before = await page.locator('.companion-message').allTextContents();
  await openAppearance(page);
  await appearance(page).getByRole('button', { name: 'Light', exact: true }).click();
  await expect(shell(page)).toHaveAttribute('data-companion-theme', 'light');
  await expect(appearance(page).getByRole('button', { name: 'Light', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await closeAppearance(page);
  await expect(input(page)).toHaveValue('A draft I want to keep while choosing a theme.');
  expect(await chat(page).getAttribute('data-chat-id')).toBe(selectedId);
  expect(await page.locator('.companion-message').allTextContents()).toEqual(before);
  await page.reload();
  await expect(shell(page)).toHaveAttribute('data-companion-theme', 'light');
  await expect(input(page)).toHaveValue('A draft I want to keep while choosing a theme.');
  expect(await chat(page).getAttribute('data-chat-id')).toBe(selectedId);
  await openAppearance(page);
  await expect(appearance(page).getByRole('button', { name: 'Light', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await appearance(page).getByRole('button', { name: 'Dark', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(shell(page)).toHaveAttribute('data-companion-theme', 'dark');
  await expect(appearance(page).getByRole('button', { name: 'Dark', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await closeAppearance(page);
});

test('theme changes preserve history position, mascot instance and controller state', async ({ page }) => {
  await openFixture(page, 375, 667);
  for (const answer of ['Cold brew for busy parents.', 'Daybreak Coffee', 'Morning bottle']) {
    await input(page).fill(answer);
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.getByRole('status', { name: 'Grifon is typing', exact: true })).toHaveCount(0);
  }
  const scroller = page.getByTestId('conversation-scroll');
  await scroller.evaluate(node => { node.scrollTop = 0; node.dispatchEvent(new Event('scroll')); });
  const top = await scroller.evaluate(node => node.scrollTop);
  const avatar = await page.locator('iframe[title="Grifon animated companion"]').elementHandle();
  expect(avatar).not.toBeNull();
  const snapshot = () => page.evaluate(() => (window as unknown as { companionFixture: { snapshot: () => unknown } }).companionFixture.snapshot());
  const state = await snapshot();
  const messages = await page.locator('.companion-message').allTextContents();
  await input(page).fill('Keep this unsent message.');
  await openAppearance(page);
  await appearance(page).getByRole('button', { name: 'Light', exact: true }).click();
  await appearance(page).getByRole('button', { name: 'Dark', exact: true }).click();
  await closeAppearance(page);
  expect(await scroller.evaluate(node => node.scrollTop)).toBeCloseTo(top, 0);
  expect(await avatar!.evaluate(node => node.isConnected)).toBe(true);
  expect(await snapshot()).toEqual(state);
  expect(await page.locator('.companion-message').allTextContents()).toEqual(messages);
  await expect(input(page)).toHaveValue('Keep this unsent message.');
});

test('account settings exposes chat appearance and restores focus', async ({ page }) => {
  await openFixture(page, 1280, 900);
  await openAppearance(page);
  await appearance(page).getByRole('button', { name: 'Light', exact: true }).click();
  await expect(shell(page)).toHaveAttribute('data-companion-theme', 'light');
  await expect(page.locator('.companion-settings')).toHaveAttribute('data-companion-theme', 'light');
  await closeAppearance(page);
  await expect(page.getByRole('button', { name: 'Account settings', exact: true })).toBeFocused();
  await openAppearance(page);
  await expect(appearance(page).getByRole('button', { name: 'Light', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await closeAppearance(page);
});

test('appearance still works when its preference storage is unavailable', async ({ page }) => {
  await page.addInitScript(preferenceKey => {
    const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (key === preferenceKey) throw new DOMException('Preference storage is unavailable', 'SecurityError');
      return get.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (key === preferenceKey) throw new DOMException('Preference storage is unavailable', 'QuotaExceededError');
      return set.call(this, key, value);
    };
  }, 'grifon-companion-appearance');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await openFixture(page);
  await openAppearance(page);
  await appearance(page).getByRole('button', { name: 'Light', exact: true }).click();
  await expect(shell(page)).toHaveAttribute('data-companion-theme', 'light');
  await closeAppearance(page);
  await input(page).fill('The chat remains usable without preference storage.');
  await expect(input(page)).toHaveValue('The chat remains usable without preference storage.');
  expect(errors).toEqual([]);
});

test('both themes retain an opaque readable fallback for increased contrast', async ({ page }) => {
  await openFixture(page);
  await page.emulateMedia({ contrast: 'more', reducedMotion: 'reduce' });
  for (const theme of ['Light', 'Dark']) {
    await openAppearance(page);
    await appearance(page).getByRole('button', { name: theme, exact: true }).click();
    await closeAppearance(page);
    const styles = await page.locator('.companion-composer').evaluate(node => {
      const body = getComputedStyle(node), before = getComputedStyle(node, '::before');
      return { background: body.backgroundColor, backdrop: body.backdropFilter, beforeBackdrop: before.backdropFilter, beforeDisplay: before.display };
    });
    expect(styles.background).toMatch(/^rgb\(/);
    expect(styles.backdrop).toBe('none');
    expect(styles.beforeDisplay === 'none' || styles.beforeBackdrop === 'none').toBe(true);
    await expect(input(page)).toBeVisible();
  }
});

for (const [theme, width, height] of [['Dark', 1280, 900], ['Light', 375, 667]] as const) {
test(`${theme.toLowerCase()} saved-chat previews remain readable across the filled ${width}px sidebar`, async ({ page }, testInfo) => {
  await openFixture(page, width, height);
  await page.evaluate(async selectedIndex => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('grifon_companion', 1);
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('conversations', 'readwrite'), store = tx.objectStore('conversations');
      const request = store.get('fixture-user-a');
      request.onsuccess = () => {
        const book = request.result, original = book.chats.find((item: { id: string }) => item.id === book.selectedId);
        book.chats = Array.from({ length: 12 }, (_, index) => ({ ...original, id: `contrast-chat-${index}`, title: `Saved chat ${index + 1}`,
          updatedAt: Date.now() - index, draft: { ...original.draft, messages: [{ id: `contrast-message-${index}`, role: 'assistant', text: 'Saved conversation', at: Date.now() }] } }));
        book.selectedId = book.chats[selectedIndex].id; store.put(book, 'fixture-user-a');
      };
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, width < 768 ? 2 : 6);
  await page.reload();
  await expect(page.locator('.companion-conversation')).toHaveCount(12);
  await openAppearance(page);
  await appearance(page).getByRole('button', { name: theme, exact: true }).click();
  await closeAppearance(page);
  if (width < 768 && !await page.getByRole('dialog', { name: 'Chat navigation', exact: true }).isVisible()) {
    await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
  }
  const readPreviews = () => page.locator('.companion-conversation').evaluateAll(rows => rows.flatMap(row => {
    const preview = row.querySelector('.companion-conversation-preview')!, rect = row.getBoundingClientRect();
    const list = row.closest('.companion-sidebar-scroll')!.getBoundingClientRect(), text = preview.getBoundingClientRect();
    if (!rect.width || !rect.height || rect.top < list.top || rect.bottom > list.bottom) return [];
    return [{ x: Math.floor(rect.left + 6), y: Math.floor(text.top + text.height / 2), color: getComputedStyle(preview).color, selected: row.getAttribute('aria-current') === 'page' }];
  }));
  const luminance = (rgb: number[]) => rgb.map(value => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  const captureContrast = async (state: 'selected' | 'inactive') => {
    const previews = await readPreviews();
    expect(previews.length).toBeGreaterThanOrEqual(width < 768 ? 3 : 6);
    if (state === 'selected') expect(previews.some(preview => preview.selected && preview.y > (width < 768 ? height / 2 : 650))).toBe(true);
    const hovered = previews.filter(preview => !preview.selected).at(-1)!;
    if (state === 'inactive') expect(hovered.y).toBeGreaterThan(width < 768 ? height / 2 : 650);
    await page.mouse.move(hovered.x + 20, hovered.y);
    const screenshot = await page.screenshot({ path: testInfo.outputPath(`${theme.toLowerCase()}-filled-sidebar-${state}.png`), animations: 'disabled' });
    const { data, info } = await sharp(screenshot).raw().toBuffer({ resolveWithObject: true });
    const scale = info.width / (await page.evaluate(() => innerWidth));
    const contrasts = previews.map(preview => {
      const at = (Math.floor(preview.y * scale) * info.width + Math.floor(preview.x * scale)) * info.channels;
      const background = Array.from(data.subarray(at, at + 3));
      const ink = preview.color.match(/\d+(?:\.\d+)?/g)!.slice(0, 3).map(Number);
      const a = luminance(background), b = luminance(ink);
      return { ...preview, background, contrast: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
    });
    await testInfo.attach(`saved-chat-contrast-${state}`, { body: JSON.stringify(contrasts, null, 2), contentType: 'application/json' });
    expect(Math.min(...contrasts.map(sample => sample.contrast))).toBeGreaterThanOrEqual(4.5);
  };
  // Cover the same lower sidebar region in selected and inactive/hovered states.
  await captureContrast('selected');
  const visibleList = width < 768 ? page.getByRole('dialog', { name: 'Chat navigation', exact: true }) : page.locator('.companion-sidebar');
  await visibleList.locator('.companion-conversation').first().click();
  if (width < 768) await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
  await expect(visibleList.locator('.companion-conversation').first()).toHaveAttribute('aria-current', 'page');
  await captureContrast('inactive');
});
}

for (const [width, height] of [[375, 667], [390, 844], [1280, 900]]) {
  test(`both themes retain readable controls and fit at ${width}px`, async ({ page }, testInfo) => {
    await openFixture(page, width, height);
    const screens = path.resolve(process.env.COMPANION_SCREEN_QA_DIR || testInfo.outputPath('screens'));
    fs.mkdirSync(screens, { recursive: true });
    for (const theme of ['Light', 'Dark']) {
      await openAppearance(page);
      await appearance(page).getByRole('button', { name: theme, exact: true }).click();
      for (const button of await appearance(page).getByRole('button').all()) {
        const size = await button.boundingBox();
        expect(size!.height).toBeGreaterThanOrEqual(43.5);
        expect(size!.width).toBeGreaterThanOrEqual(43.5);
      }
      await closeAppearance(page);
      await expect(input(page)).toBeVisible();
      const geometry = await page.locator('.companion-composer').evaluate(node => {
        const rect = node.getBoundingClientRect();
        return { right: rect.right, bottom: rect.bottom, width: document.documentElement.scrollWidth, viewport: innerWidth, height: innerHeight };
      });
      expect(geometry.width).toBeLessThanOrEqual(geometry.viewport);
      expect(geometry.right).toBeLessThanOrEqual(geometry.viewport);
      expect(geometry.bottom).toBeLessThanOrEqual(geometry.height);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('iframe[title="Grifon animated companion"]:visible')).toHaveAttribute('data-ready', 'true');
      await page.screenshot({ path: path.join(screens, `${theme.toLowerCase()}-initial-${width}.png`), fullPage: true, scale: 'css', animations: 'disabled' });
    }
    if (width >= 768) {
      await expect(page.locator('.companion-shell img[alt="Grifon"]')).toBeVisible();
      await expect(page.locator('.companion-shell').getByText('GRIFON AI', { exact: true })).toHaveCount(0);
    }
  });
}

import { test, expect, type Page } from '@playwright/test';
import type { CompanionConversations } from '../../services/companionConversations.js';

type ViewportMode = 'visual' | 'layout' | 'layout-no-visual';
const composer = (page: Page) => page.getByRole('textbox', { name: 'Message Grifon', exact: true });
const drawer = (page: Page) => page.getByRole('dialog', { name: 'Chat navigation', exact: true });
const search = (page: Page) => drawer(page).getByRole('textbox', { name: 'Search chats', exact: true });
const footer = (page: Page) => drawer(page).locator('.companion-sidebar-account');
const back = (page: Page) => drawer(page).getByRole('button', { name: 'Back to conversations', exact: true });

async function expectSearchView(page: Page, width: number) {
  expect((await drawer(page).boundingBox())!.width).toBeCloseTo(width, 1);
  await expect(back(page)).toBeVisible();
  await expect(drawer(page).locator('.companion-brand-logo')).toHaveCount(0);
  await expect(drawer(page).getByRole('button', { name: 'New chat', exact: true })).toHaveCount(0);
  await expect(drawer(page).getByRole('button', { name: 'Studio', exact: true })).toHaveCount(0);
  await expect(drawer(page).getByRole('button', { name: 'Account settings', exact: true })).toHaveCount(0);
}

async function openFixture(page: Page, theme: string, width: number, height: number, mode: ViewportMode, query = '') {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(({ theme, mode }) => {
    localStorage.setItem('grifon-companion-appearance', theme);
    if (mode === 'layout-no-visual') Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined });
    if (mode === 'visual') {
      const state = { height: innerHeight, offsetTop: 0, scale: 1 };
      Object.assign(window, { sidebarViewport: state });
      for (const key of ['height', 'offsetTop', 'scale'] as const) {
        Object.defineProperty(window.visualViewport, key, { configurable: true, get: () => state[key] });
      }
    }
  }, { theme, mode });
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() === 'GET' && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
    if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname.startsWith('/api/')) return route.abort();
    return route.continue();
  });
  await page.goto(`/companion-chat-preview.html${query}`);
  await expect(composer(page)).toBeVisible();
  await expect(page.locator('#companion-save-status')).toContainText('Draft saved on this device.');
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('grifon_companion', 1);
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('conversations', 'readwrite'), store = tx.objectStore('conversations');
      const request = store.get('fixture-user-a');
      request.onsuccess = () => {
        const book = request.result as CompanionConversations;
        const original = book.chats.find(item => item.id === book.selectedId)!;
        book.chats = Array.from({ length: 10 }, (_, index) => ({ ...original, id: `sidebar-chat-${index}`,
          composer: index === 0 ? 'Unsent coffee draft' : '', updatedAt: Date.now() - index,
          draft: { ...original.draft, brandName: `${index < 8 ? 'Coffee' : 'Tea'} project ${index + 1}` } }));
        book.selectedId = book.chats[0].id; store.put(book, 'fixture-user-a');
      };
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await expect(composer(page)).toHaveValue('Unsent coffee draft');
  if (width >= 768) return;
  await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
  await expect(drawer(page)).toBeVisible();
  await expect(search(page)).not.toBeFocused();
  await expect(footer(page)).toBeVisible();
}

async function resizeKeyboard(page: Page, width: number, height: number, mode: ViewportMode) {
  if (mode === 'visual') {
    await page.evaluate(height => {
      const state = (window as unknown as { sidebarViewport: { height: number; offsetTop: number } }).sidebarViewport;
      state.height = height; state.offsetTop = 0;
      window.visualViewport!.dispatchEvent(new Event('resize'));
    }, height);
  } else await page.setViewportSize({ width, height });
  await expect.poll(async () => (await page.locator('.companion-shell').boundingBox())!.height).toBeCloseTo(height, 0);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

for (const theme of ['dark', 'light']) {
  for (const mode of ['layout', 'visual', 'layout-no-visual'] as const) {
    test(`${theme} mobile ${mode} search fills the viewport and stays after keyboard close`, async ({ page }, testInfo) => {
      const width = mode === 'layout' ? 390 : 375, height = mode === 'layout' ? 844 : 667, keyboardHeight = mode === 'layout' ? 440 : 400;
      await openFixture(page, theme, width, height, mode);
      const field = await search(page).elementHandle();
      const originalFooterHeight = (await footer(page).boundingBox())!.height;
      await search(page).fill('Coffee');
      await expectSearchView(page, width);
      expect(await search(page).evaluate((node, original) => node === original, field)).toBe(true);
      await expect(search(page)).toBeFocused();
      await expect(footer(page)).toHaveCount(0);
      await expect(drawer(page).getByRole('button', { name: /^Open chat:/ })).toHaveCount(8);
      const before = (await drawer(page).getByRole('navigation').boundingBox())!;
      await resizeKeyboard(page, width, keyboardHeight, mode);
      await expect(footer(page)).toHaveCount(0);
      await expect(search(page)).toBeFocused();
      await expect(search(page)).toHaveValue('Coffee');
      const nav = drawer(page).getByRole('navigation');
      const bounds = (await nav.boundingBox())!;
      expect(originalFooterHeight).toBeGreaterThan(100);
      expect(bounds.height).toBeGreaterThanOrEqual(before.height - (height - keyboardHeight) - 1);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(keyboardHeight + .5);
      await expectSearchView(page, width);
      const last = nav.getByRole('button', { name: 'Open chat: Coffee project 8', exact: true });
      await last.scrollIntoViewIfNeeded();
      const result = (await last.boundingBox())!;
      expect(result.y).toBeGreaterThanOrEqual(bounds.y - .5);
      expect(result.y + result.height).toBeLessThanOrEqual(bounds.y + bounds.height + .5);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
      await page.screenshot({ path: testInfo.outputPath(`${theme}-${mode}-keyboard.png`), animations: 'disabled' });
      await resizeKeyboard(page, width, height, mode);
      await expectSearchView(page, width);
      await expect(footer(page)).toHaveCount(0);
      await expect(search(page)).toBeFocused();
      await resizeKeyboard(page, width, keyboardHeight, mode);
      await expect(footer(page)).toHaveCount(0);
      await search(page).evaluate(node => node.blur());
      await expectSearchView(page, width);
      await expect(footer(page)).toHaveCount(0);
      await search(page).focus();
      await expect(footer(page)).toHaveCount(0);
      await resizeKeyboard(page, width, height, mode);
      await back(page).click();
      await expect(back(page)).toHaveCount(0);
      await expect(search(page)).toHaveValue('');
      await expect(search(page)).not.toBeFocused();
      await expect(drawer(page).getByRole('button', { name: 'Close conversations', exact: true })).toBeFocused();
      await expect(footer(page)).toBeVisible();
      await footer(page).getByRole('button', { name: 'Account settings', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(composer(page)).toHaveValue('Unsent coffee draft');
      await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
      await expect(search(page)).toHaveValue('');
      await expect(search(page)).not.toBeFocused();
      await expect(footer(page)).toBeVisible();
    });
  }

  test(`${theme} desktop search keeps Studio and account settings through viewport shrink`, async ({ page }, testInfo) => {
    await openFixture(page, theme, 1280, 900, 'visual');
    const sidebar = page.locator('aside.companion-sidebar');
    const field = sidebar.getByRole('textbox', { name: 'Search chats', exact: true });
    await field.fill('Coffee');
    await resizeKeyboard(page, 1280, 500, 'visual');
    await expect(field).toBeFocused();
    await expect(sidebar.getByRole('button', { name: 'Studio', exact: true })).toBeVisible();
    await expect(sidebar.getByRole('button', { name: 'Account settings', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await resizeKeyboard(page, 1280, 900, 'visual');
    await page.screenshot({ path: testInfo.outputPath(`${theme}-desktop.png`), animations: 'disabled' });
    await sidebar.getByRole('button', { name: 'Account settings', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Settings', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(composer(page)).toHaveValue('Unsent coffee draft');
  });

  test(`${theme} search remains dedicated through chrome shrink, pinch and viewport panning`, async ({ page }) => {
    await openFixture(page, theme, 375, 667, 'visual');
    await search(page).fill('Coffee');
    await expectSearchView(page, 375);
    await expect(footer(page)).toHaveCount(0);
    await resizeKeyboard(page, 375, 600, 'visual');
    await expect(footer(page)).toHaveCount(0);
    await page.evaluate(() => {
      const state = (window as unknown as { sidebarViewport: { height: number; scale: number } }).sidebarViewport;
      state.height = 333; state.scale = 2;
      window.visualViewport!.dispatchEvent(new Event('resize'));
    });
    await expect.poll(() => page.locator('.companion-shell').evaluate(node => node.style.getPropertyValue('--companion-viewport-height'))).toBe('');
    await expect(footer(page)).toHaveCount(0);
    await expect(search(page)).toBeFocused();
    await page.evaluate(() => {
      const state = (window as unknown as { sidebarViewport: { height: number; scale: number } }).sidebarViewport;
      state.height = 667; state.scale = 1;
      window.visualViewport!.dispatchEvent(new Event('resize'));
    });
    await resizeKeyboard(page, 375, 400, 'visual');
    await expect(footer(page)).toHaveCount(0);
    await page.evaluate(() => {
      const state = (window as unknown as { sidebarViewport: { offsetTop: number } }).sidebarViewport;
      state.offsetTop = 12;
      window.visualViewport!.dispatchEvent(new Event('scroll'));
    });
    await expect.poll(async () => (await drawer(page).boundingBox())!.y).toBeCloseTo(12, 1);
    const bounds = (await drawer(page).getByRole('navigation').boundingBox())!;
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(412.5);
    await expect(search(page)).toHaveValue('Coffee');
  });

  test(`${theme} mobile search survives width and orientation changes without restoring actions`, async ({ page }) => {
    await openFixture(page, theme, 393, 743, 'layout');
    await search(page).fill('Coffee');
    await resizeKeyboard(page, 393, 440, 'layout');
    await expect(footer(page)).toHaveCount(0);
    await resizeKeyboard(page, 375, 400, 'layout');
    await expectSearchView(page, 375);
    await expect(footer(page)).toHaveCount(0);
    await resizeKeyboard(page, 375, 667, 'layout');
    await resizeKeyboard(page, 375, 400, 'layout');
    await expect(footer(page)).toHaveCount(0);
    await page.evaluate(() => {
      Object.defineProperty(screen.orientation, 'angle', { configurable: true, value: 90 });
      window.dispatchEvent(new Event('resize'));
    });
    await expect(footer(page)).toHaveCount(0);
    await resizeKeyboard(page, 375, 667, 'layout');
    await resizeKeyboard(page, 375, 400, 'layout');
    await expect(footer(page)).toHaveCount(0);
    await expect(search(page)).toBeFocused();
    await expect(search(page)).toHaveValue('Coffee');
  });

  test(`${theme} search keyboard keeps actionable save feedback visible`, async ({ page }) => {
    await openFixture(page, theme, 393, 743, 'layout');
    await page.evaluate(() => {
      const put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function(...args: Parameters<IDBObjectStore['put']>) {
        if (this.name === 'conversations') throw new DOMException('Fixture storage failure', 'QuotaExceededError');
        return put.apply(this, args);
      };
    });
    await footer(page).getByRole('button', { name: 'Studio', exact: true }).click();
    await expect(footer(page).getByRole('alert')).toContainText('Draft could not be saved on this device.');
    await search(page).fill('Coffee');
    await resizeKeyboard(page, 393, 440, 'layout');
    await expect(footer(page).getByRole('button')).toHaveCount(0);
    await expect(footer(page).getByText('Preview · simulated output', { exact: true })).toHaveCount(0);
    await expect(footer(page).getByRole('alert')).toBeVisible();
    await expect(search(page)).toBeFocused();
    await resizeKeyboard(page, 393, 743, 'layout');
    await expectSearchView(page, 393);
    await expect(footer(page).getByRole('button')).toHaveCount(0);
    await expect(footer(page).getByRole('alert')).toBeVisible();
    await back(page).click();
    await expect(footer(page).getByRole('button', { name: 'Account settings', exact: true })).toBeVisible();
    await expect(footer(page).getByRole('alert')).toBeVisible();
  });

  test(`${theme} Escape leaves search before closing the drawer and visible controls trap focus`, async ({ page }) => {
    await openFixture(page, theme, 375, 667, 'layout');
    await search(page).fill('no matching title');
    await expect(drawer(page).getByText('No matching chats', { exact: true })).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(back(page)).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(search(page)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(back(page)).toHaveCount(0);
    await expect(footer(page)).toBeVisible();
    await expect(search(page)).toHaveValue('');
    await page.keyboard.press('Escape');
    await expect(drawer(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Open conversations', exact: true })).toBeFocused();
    await expect(composer(page)).toHaveValue('Unsent coffee draft');
  });

  test(`${theme} selecting a result closes search, preserves the original draft and resets on reopen`, async ({ page }) => {
    await openFixture(page, theme, 390, 844, 'layout');
    await search(page).fill('Coffee project 2');
    await drawer(page).getByRole('button', { name: 'Open chat: Coffee project 2', exact: true }).click();
    await expect(drawer(page)).toHaveCount(0);
    await expect(composer(page)).toHaveValue('');
    await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
    await expect(back(page)).toHaveCount(0);
    await expect(footer(page)).toBeVisible();
    await expect(search(page)).not.toBeFocused();
    await expect(search(page)).toHaveValue('');
    await search(page).fill('Coffee project 1');
    await drawer(page).getByRole('button', { name: 'Open chat: Coffee project 1', exact: true }).click();
    await expect(drawer(page)).toHaveCount(0);
    await expect(composer(page)).toHaveValue('Unsent coffee draft');
  });

  test(`${theme} failed result navigation keeps search and error until retry succeeds`, async ({ page }) => {
    await openFixture(page, theme, 375, 667, 'layout');
    await search(page).fill('Coffee project 2');
    await page.evaluate(() => {
      const put = IDBObjectStore.prototype.put;
      Object.assign(window, { restoreConversationPut: () => { IDBObjectStore.prototype.put = put; } });
      IDBObjectStore.prototype.put = function(...args: Parameters<IDBObjectStore['put']>) {
        if (this.name === 'conversations') throw new DOMException('Fixture storage failure', 'QuotaExceededError');
        return put.apply(this, args);
      };
    });
    const result = drawer(page).getByRole('button', { name: 'Open chat: Coffee project 2', exact: true });
    await page.keyboard.press('Tab');
    await expect(result).toBeFocused();
    await page.keyboard.press('Enter');
    await expectSearchView(page, 375);
    await expect(search(page)).toHaveValue('Coffee project 2');
    await expect(footer(page).getByRole('alert')).toContainText('Draft could not be saved on this device.');
    await expect(result).toBeFocused();
    await page.evaluate(() => (window as unknown as { restoreConversationPut: () => void }).restoreConversationPut());
    await page.keyboard.press('Enter');
    await expect(drawer(page)).toHaveCount(0);
    await expect(composer(page)).toHaveValue('');
  });

  test(`${theme} repeated search entry and desktop crossing restore normal navigation`, async ({ page }) => {
    await openFixture(page, theme, 375, 667, 'layout');
    for (let count = 0; count < 2; count++) {
      await search(page).fill('Coffee');
      await expectSearchView(page, 375);
      await back(page).click();
      await expect(footer(page)).toBeVisible();
      await expect(search(page)).toHaveValue('');
    }
    await search(page).fill('Coffee');
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(drawer(page)).toHaveCount(0);
    const sidebar = page.locator('aside.companion-sidebar');
    await expect(sidebar.getByRole('button', { name: 'Studio', exact: true })).toBeVisible();
    await expect(sidebar.getByRole('textbox', { name: 'Search chats', exact: true })).toHaveValue('');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
    await expect(back(page)).toHaveCount(0);
    await expect(footer(page)).toBeVisible();
    await expect(search(page)).not.toBeFocused();
  });

}

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test.use({ serviceWorkers: 'block' });
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const u = new URL(route.request().url());
    if (route.request().method() === 'GET' && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(u.hostname)) return route.continue();
    if (!['http://localhost:5173', 'http://127.0.0.1:5173'].includes(u.origin) || u.pathname.startsWith('/api/')) return route.abort();
    return route.continue();
  });
  if (process.env.POLISH_OLD_FOLLOW === '1') await page.route(/\/components\/CompanionChat\/CompanionChatSurface\.tsx(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    // Route-only reconstruction of the two missing pending-follow intent assignments
    // proven by scroll-trace.json; never edits the production component.
    await route.fulfill({ response, body: (await response.text()).replaceAll('followingScroll.current = true;', '') });
  });
  await page.goto('/companion-chat-preview.html');
  await expect(page.locator('iframe:visible')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
});

test('polish: pointer burst coalesces avatar bounds reads to one per animation frame', async ({ page }) => {
  const measurement = await page.locator('iframe:visible').evaluate(async iframe => {
    const host = iframe.parentElement!;
    const original = host.getBoundingClientRect.bind(host); let reads = 0;
    host.getBoundingClientRect = () => { reads++; return original(); };
    return new Promise<{ duringBurst: number; afterFrame: number }>(resolve => requestAnimationFrame(() => {
      for (let i = 0; i < 120; i++) window.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', clientX: 100 + i, clientY: 200 }));
      const duringBurst = reads;
      requestAnimationFrame(() => requestAnimationFrame(() => resolve({ duringBurst, afterFrame: reads })));
    }));
  });
  const dir = path.resolve(process.env.COMPANION_QA_DIR || 'assets/3d-lab/grifon-companion-chat/qa/polish'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${process.env.POLISH_PHASE || 'current'}-pointer.json`), JSON.stringify({ events: 120, ...measurement }, null, 2));
  expect(measurement.duringBurst).toBe(0);
  expect(measurement.afterFrame).toBeLessThanOrEqual(1);
});

test('polish: mobile composer uses readable 14px sans text with normal tracking', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  const css = await page.getByRole('textbox', { name: 'Message Grifon' }).evaluate(element => {
    const s = getComputedStyle(element); return { size: parseFloat(s.fontSize), family: s.fontFamily, tracking: s.letterSpacing };
  });
  expect(css.size).toBe(14);
  expect(css.family.toLowerCase()).not.toMatch(/mono/);
  expect(['normal', '0px']).toContain(css.tracking);
});

test('polish: capped120 transcript explicitly follows a sent message from far history', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('grifon_companion', 1); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('conversations', 'readwrite'); const store = tx.objectStore('conversations');
      const request = store.get('fixture-user-a');
      request.onsuccess = () => {
        const book = request.result; const chat = book.chats.find((item: any) => item.id === book.selectedId);
        chat.draft.messages = Array.from({ length: 120 }, (_, i) => ({ id: `capped-${i}`, role: i % 2 ? 'user' : 'assistant', text: `Existing message ${i}. ` + 'More context for this ad. '.repeat(4), at: 1 + i }));
        store.put(book, 'fixture-user-a');
      };
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await page.getByRole('textbox', { name: 'Message Grifon' }).waitFor();
  await page.evaluate(() => (window as any).companionFixture.emit('result'));
  const scroller = page.getByTestId('conversation-scroll');
  await scroller.evaluate(element => { element.scrollTop = element.scrollHeight * .4; element.dispatchEvent(new Event('scroll')); });
  await page.getByRole('textbox', { name: 'Message Grifon' }).fill('style clean');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect.poll(() => scroller.evaluate(element => element.scrollHeight - element.clientHeight - element.scrollTop), { timeout: 500 }).toBeLessThanOrEqual(24);
  expect(await page.locator('article').count()).toBe(120);
  await expect.poll(() => page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('grifon_companion', 1); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    try {
      return await new Promise<number | undefined>((resolve, reject) => {
        const request = db.transaction('conversations', 'readonly').objectStore('conversations').get('fixture-user-a');
        request.onsuccess = () => { const book = request.result; resolve(book?.chats.find((chat: any) => chat.id === book.selectedId)?.draft.messages.length); };
        request.onerror = () => reject(request.error);
      });
    } finally { db.close(); }
  })).toBe(120);
});

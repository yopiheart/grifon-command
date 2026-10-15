import { test, expect, type Page } from '@playwright/test';

const photo = { name: 'product.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aEocAAAAASUVORK5CYII=', 'base64') };
const saved = (page: Page) => expect(page.locator('#companion-save-status')).toContainText('Reference brief saved on this device.');
async function prepare(page: Page, width = 375) {
  await page.setViewportSize({ width, height: 812 });
  const unexpected: string[] = [];
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname.startsWith('/api/') || !['localhost', '127.0.0.1'].includes(url.hostname)) { unexpected.push(request.method() + ' ' + url.pathname); return route.abort(); }
    return route.continue();
  });
  await page.goto('/companion-chat-preview.html');
  await page.getByRole('button', { name: 'Reference brief', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Reference brief', exact: true })).toBeVisible();
  return unexpected;
}
async function openSaved(page: Page, title: string) {
  const nav = page.getByRole('navigation', { name: 'Conversations', exact: true });
  if (!await nav.isVisible()) await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
  await nav.getByRole('button', { name: `Open chat: ${title}`, exact: true }).click();
}

for (const width of [375, 1280]) {
  test(`saves and reopens exact reference brief, video, five photos and voice at ${width}px`, async ({ page }) => {
    const requests = await prepare(page, width);
    await page.getByLabel('// Brief', { exact: true }).fill('Coffee for parents. Keep the packaging unchanged.');
    await page.getByLabel('// Product or service', { exact: true }).fill('North Coffee');
    await page.getByLabel('// Reference language (optional)').fill('Japanese');
    await page.getByLabel('// Reference link (optional)').fill('https://example.com/edit');
    await page.getByLabel('Reference video', { exact: true }).setInputFiles('tests/e2e/fixtures/recovery.webm');
    await expect(page.getByLabel('Reference video preview')).toBeVisible();
    await page.getByLabel('Add photos', { exact: true }).setInputFiles(Array.from({ length: 5 }, (_, i) => ({ ...photo, name: `photo-${i}.png` })));
    await expect(page.getByRole('img', { name: /^photo-/ })).toHaveCount(5);
    await page.getByLabel('Role for photo-0.png').selectOption('character');
    await page.getByLabel('Saved voice', { exact: true }).selectOption('private:fixture-private');
    await saved(page);
    await page.reload();
    await expect(page.getByLabel('// Brief', { exact: true })).toHaveValue('Coffee for parents. Keep the packaging unchanged.');
    await expect(page.getByLabel('// Reference language (optional)')).toHaveValue('Japanese');
    await expect(page.getByLabel('Output language', { exact: true })).toHaveValue('Taglish');
    await expect(page.getByLabel('Saved voice', { exact: true })).toHaveValue('private:fixture-private');
    await expect(page.getByLabel('Role for photo-0.png')).toHaveValue('character');
    await expect(page.getByRole('img', { name: /^photo-/ })).toHaveCount(5);
    await expect.poll(() => page.getByLabel('Reference video preview').evaluate((video: HTMLVideoElement) => video.readyState)).toBeGreaterThanOrEqual(1);
    await expect.poll(() => page.getByRole('img', { name: 'photo-0.png', exact: true }).evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1);
    await page.getByRole('button', { name: 'New chat', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Reference brief', exact: true })).toHaveCount(0);
    await openSaved(page, 'North Coffee');
    await expect(page.getByLabel('Saved voice', { exact: true })).toHaveValue('private:fixture-private');
    await page.getByLabel('// Brief', { exact: true }).fill('Edited after reopening'); await saved(page);
    await page.reload(); await expect(page.getByLabel('// Brief', { exact: true })).toHaveValue('Edited after reopening');
    await expect(page.getByRole('button', { name: /Generate|Approve storyboard/ })).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).companionFixture.snapshot().calls)).toEqual([]);
    expect(requests.filter(request => request.includes('/api/'))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `.tmp/companion-reference-${width}.png`, fullPage: true });
  });
}

test('rejects sixth, fake, empty and oversize files without losing accepted photos', async ({ page }) => {
  await prepare(page);
  await page.getByLabel('Add photos').setInputFiles([{ name: 'fake.png', mimeType: 'image/png', buffer: Buffer.from('not an image') }]);
  await expect(page.getByRole('alert')).toContainText('could not be decoded');
  await page.getByLabel('Add photos').setInputFiles([{ name: 'huge.png', mimeType: 'image/png', buffer: Buffer.alloc(10 * 1024 * 1024 + 1) }]);
  await expect(page.getByRole('alert')).toContainText('10 MB');
  await page.getByLabel('Add photos').setInputFiles([{ name: 'empty.png', mimeType: 'image/png', buffer: Buffer.alloc(0) }]);
  await expect(page.getByRole('alert')).toContainText('cannot be empty');
  await page.getByLabel('Add photos').setInputFiles(Array.from({ length: 5 }, (_, i) => ({ ...photo, name: `valid-${i}.png` })));
  await expect(page.getByRole('img', { name: /^valid-/ })).toHaveCount(5);
  await page.getByLabel('Add photos').setInputFiles(photo);
  await expect(page.getByRole('alert')).toContainText('up to five photos');
  await expect(page.getByRole('img', { name: /^valid-/ })).toHaveCount(5);
  await page.getByLabel('// Reference link (optional)').fill('javascript:alert(1)');
  await expect(page.locator('#reference-link-help')).toContainText('HTTPS');
});

test('keeps account drafts isolated and retains an unavailable selected voice', async ({ page }) => {
  await prepare(page);
  await page.getByLabel('// Brief', { exact: true }).fill('Account A private brief');
  await page.getByLabel('Add photos').setInputFiles(photo);
  await expect(page.getByRole('img', { name: 'product.png', exact: true })).toBeVisible();
  await page.getByLabel('Saved voice', { exact: true }).selectOption('curated:fixture-curated'); await saved(page);
  await page.evaluate(() => (window as any).companionFixture.account('fixture-user-b'));
  await expect(page.getByRole('button', { name: 'Reference brief', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reference brief', exact: true }).click();
  await expect(page.getByLabel('// Brief', { exact: true })).toHaveValue('');
  await expect(page.getByRole('img', { name: 'product.png', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Saved voice', { exact: true })).toHaveValue('');
  await page.evaluate(() => (window as any).companionFixture.account('fixture-user-a'));
  await expect(page.getByLabel('// Brief', { exact: true })).toHaveValue('Account A private brief');
  await saved(page);
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const req = indexedDB.open('grifon_companion', 1); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
    await new Promise<void>((resolve, reject) => { const tx = db.transaction('conversations', 'readwrite'), store = tx.objectStore('conversations'), req = store.get('fixture-user-a'); req.onsuccess = () => { const book = req.result; book.chats.find((chat: any) => chat.id === book.selectedId).referenceDraft.voice = { id: 'removed-voice', name: 'My old voice', source: 'private' }; store.put(book, 'fixture-user-a'); }; tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); db.close();
  });
  await page.reload();
  await expect(page.getByLabel('Saved voice', { exact: true })).toHaveValue('private:removed-voice');
  await expect(page.getByText('Your selected voice is kept, but could not be confirmed in the current list.')).toBeVisible();
  await saved(page);
});

test('reports failed storage and retries without losing the draft', async ({ page }) => {
  await prepare(page); await saved(page);
  await page.evaluate(() => { const original = IDBObjectStore.prototype.put; (window as any).restoreReferenceStorage = () => { IDBObjectStore.prototype.put = original; }; IDBObjectStore.prototype.put = function () { throw new DOMException('Fixture full', 'QuotaExceededError'); }; });
  await page.getByLabel('// Brief', { exact: true }).fill('Keep this unsaved brief');
  await expect(page.locator('#companion-save-status')).toContainText('Draft could not be saved');
  await page.evaluate(() => (window as any).restoreReferenceStorage());
  await page.getByRole('button', { name: 'Retry saving', exact: true }).click(); await saved(page);
  await page.reload(); await expect(page.getByLabel('// Brief', { exact: true })).toHaveValue('Keep this unsaved brief');
});

test('saves a conflict copy with its media and voice while preserving the newer tab', async ({ page, context }) => {
  await prepare(page);
  await page.getByLabel('// Product or service').fill('Shared first brief');
  await page.getByLabel('Add photos').setInputFiles(photo);
  await expect(page.getByRole('img', { name: 'product.png', exact: true })).toBeVisible();
  await page.getByLabel('Saved voice', { exact: true }).selectOption('private:fixture-private'); await saved(page);
  const other = await context.newPage();
  await other.goto('/companion-chat-preview.html');
  await expect(other.getByLabel('// Product or service')).toHaveValue('Shared first brief');
  await page.getByLabel('// Product or service').fill('Newer tab version'); await saved(page);
  await other.getByLabel('// Product or service').fill('Recovered copy');
  await expect(other.locator('#companion-save-status')).toContainText('Another tab saved newer chats');
  await other.getByRole('button', { name: 'Save this chat as a copy', exact: true }).click(); await saved(other);
  await other.reload();
  await expect(other.getByLabel('// Product or service')).toHaveValue('Recovered copy');
  await expect(other.getByLabel('Saved voice', { exact: true })).toHaveValue('private:fixture-private');
  await expect(other.getByRole('img', { name: 'product.png', exact: true })).toBeVisible();
  await openSaved(other, 'Newer tab version');
  await expect(other.getByLabel('// Product or service')).toHaveValue('Newer tab version');
});

test('late file decoding cannot attach media to a different chat or account', async ({ page }) => {
  await prepare(page); await saved(page);
  await page.evaluate(() => {
    const OriginalImage = window.Image;
    (window as any).releaseImage = null;
    (window as any).Image = function () {
      const image = new OriginalImage();
      Object.defineProperty(image, 'onload', { set(handler) {
        if (!handler) return;
        image.addEventListener('load', event => { (window as any).releaseImage = () => handler.call(image, event); }, { once: true });
      } });
      return image;
    };
  });
  await page.getByLabel('Add photos').setInputFiles(photo);
  await expect(page.getByText('Checking media on this device…')).toBeVisible();
  await expect.poll(() => page.evaluate(() => typeof (window as any).releaseImage)).toBe('function');
  await page.evaluate(() => (window as any).companionFixture.account('fixture-user-b'));
  await page.getByRole('button', { name: 'Reference brief', exact: true }).click();
  await page.evaluate(() => (window as any).releaseImage());
  await expect(page.getByRole('img', { name: 'product.png', exact: true })).toHaveCount(0);
  await saved(page);
  await page.evaluate(() => (window as any).companionFixture.account('fixture-user-a'));
  await expect(page.getByRole('img', { name: 'product.png', exact: true })).toHaveCount(0);
  await saved(page);
});

test('blocks navigation and warns before unload while selected media is still decoding', async ({ page }) => {
  await prepare(page, 1280);
  await page.getByLabel('// Product or service').fill('Pending photo brief'); await saved(page);
  await page.evaluate(() => {
    const OriginalImage = window.Image;
    (window as any).Image = function () {
      const image = new OriginalImage();
      Object.defineProperty(image, 'onload', { set(handler) {
        if (handler) image.addEventListener('load', event => { (window as any).releaseImage = () => handler.call(image, event); }, { once: true });
      } });
      return image;
    };
  });
  await page.getByLabel('Add photos').setInputFiles(photo);
  await expect.poll(() => page.evaluate(() => typeof (window as any).releaseImage)).toBe('function');
  await expect(page.getByText('Checking media on this device…')).toBeVisible();
  const chatId = await page.getByTestId('companion-chat').getAttribute('data-chat-id');
  expect(await page.evaluate(() => { const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented; })).toBe(true);
  await page.getByRole('button', { name: 'New chat', exact: true }).click();
  await expect(page.getByText('Wait for the selected media to finish checking and saving before leaving this chat.')).toBeVisible();
  await expect(page.getByTestId('companion-chat')).toHaveAttribute('data-chat-id', chatId!);
  await page.getByRole('button', { name: 'Studio', exact: true }).click();
  expect(await page.evaluate(() => (window as any).companionFixture.snapshot().calls)).toEqual([]);
  await page.evaluate(() => (window as any).releaseImage());
  await expect(page.getByRole('img', { name: 'product.png', exact: true })).toBeVisible(); await saved(page);
  await page.getByRole('button', { name: 'New chat', exact: true }).click();
  await openSaved(page, 'Pending photo brief');
  await expect(page.getByRole('img', { name: 'product.png', exact: true })).toBeVisible();
});

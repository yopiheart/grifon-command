import { test, expect, type Page } from '@playwright/test';

const photo = { name: 'product.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aEocAAAAASUVORK5CYII=', 'base64') };
const saved = (page: Page) => expect(page.locator('#companion-save-status')).toContainText('saved on this device.');
async function open(page: Page, width = 375) {
  await page.setViewportSize({ width, height: width === 375 ? 667 : 900 });
  const calls: string[] = [];
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) { calls.push(request.method() + ' ' + url.pathname); return route.abort(); }
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort();
    return route.continue();
  });
  await page.goto('/companion-chat-preview.html');
  await page.getByRole('button', { name: 'Reference brief', exact: true }).click(); await saved(page);
  return calls;
}
async function prepare(page: Page) {
  await page.getByRole('button', { name: 'Prepare sample plan', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sample plan review', exact: true })).toBeVisible(); await saved(page);
}

for (const width of [375, 1280]) test(`sample review edits, confirmation and reopen at ${width}px without provider calls`, async ({ page }) => {
  const calls = await open(page, width);
  await page.getByLabel('// Product or service').fill('Coffee sample');
  await page.getByLabel('Saved voice', { exact: true }).selectOption('private:fixture-private'); await saved(page);
  await prepare(page);
  await expect(page.getByText('Fixture demo · actual spend PHP 0.00')).toBeVisible();
  await expect(page.getByText('Target language: Taglish. Sample speech is English and has not been localized.')).toBeVisible();
  await expect(page.getByTestId('sample-cost-total')).toContainText('PHP 220.00–PHP 340.00');
  await page.getByLabel('// Direction', { exact: true }).fill('Hold the product close-up and use restrained captions.');
  await page.getByLabel('// Scene 1 sample speech').fill('Look at the packaging.');
  await page.getByLabel('// Scene 1 visual plan').fill('Close-up with the product label visible.'); await saved(page);
  await page.getByRole('button', { name: 'Confirm sample plan', exact: true }).click();
  await expect(page.getByText(/Sample plan confirmed for revision/)).toBeVisible(); await saved(page);
  await page.reload();
  await expect(page.getByLabel('// Direction', { exact: true })).toHaveValue('Hold the product close-up and use restrained captions.');
  await expect(page.getByLabel('// Scene 1 sample speech')).toHaveValue('Look at the packaging.');
  await expect(page.getByText(/Sample plan confirmed for revision/)).toBeVisible();
  await page.getByLabel('// Maximum demo cap (PHP)').fill('1');
  await expect(page.getByText('The demo cap must cover the upper estimate including contingency.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm sample plan', exact: true })).toBeDisabled();
  await expect(page.getByText(/Sample plan confirmed for revision/)).toHaveCount(0);
  await page.getByLabel('// Maximum demo cap (PHP)').fill('350'); await saved(page);
  await page.getByRole('button', { name: 'Edit brief', exact: true }).click();
  await page.getByLabel('Saved voice', { exact: true }).selectOption('curated:fixture-curated');
  await page.getByLabel('Saved voice', { exact: true }).selectOption('private:fixture-private'); await saved(page);
  await page.getByRole('button', { name: 'View previous sample plan', exact: true }).click();
  await expect(page.getByLabel('// Scene 1 sample speech')).toHaveValue('Look at the packaging.');
  await expect(page.getByRole('button', { name: 'Confirm sample plan', exact: true })).toBeDisabled();
  await expect(page.getByText('The brief changed. This is the previous sample plan.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Prepare updated sample plan', exact: true }).click(); await saved(page);
  await expect(page.getByLabel('// Scene 1 sample speech')).toHaveValue('Take a closer look.');
  await expect(page.getByRole('button', { name: 'Confirm sample plan', exact: true })).toBeEnabled();
  expect(calls).toEqual([]);
  expect(await page.evaluate(() => (window as any).companionFixture.snapshot().calls)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `.tmp/reference-review-${width}.png`, fullPage: true });
});

test('silent incomplete sample preserves editable errors and rejects malformed persistence', async ({ page }) => {
  await open(page);
  await page.getByLabel('Speech mode', { exact: true }).selectOption('silent'); await saved(page); await prepare(page);
  await expect(page.getByLabel('// Scene 1 sample speech')).toHaveCount(0);
  await expect(page.getByText('No spoken line. Describe on-screen text in the visual plan if needed.')).toHaveCount(3);
  await page.getByLabel('// Scene 1 end (seconds)').fill(''); await saved(page); await page.reload();
  await expect(page.getByLabel('// Scene 1 end (seconds)')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Confirm sample plan', exact: true })).toBeDisabled();
  await page.getByLabel('// Scene 1 end (seconds)').fill('5'); await saved(page);
  await page.getByRole('button', { name: 'Confirm sample plan', exact: true }).click(); await saved(page);
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>(resolve => { const req = indexedDB.open('grifon_companion', 1); req.onsuccess = () => resolve(req.result); });
    await new Promise<void>(resolve => { const tx = db.transaction('conversations', 'readwrite'), store = tx.objectStore('conversations'), req = store.get('fixture-user-a'); req.onsuccess = () => { const book = req.result; book.chats[0].referenceReview.confirmation.revision = 999; store.put(book, 'fixture-user-a'); }; tx.oncomplete = () => resolve(); }); db.close();
  });
  await page.reload(); await expect(page.getByText('Saved chats could not be opened. Your saved data has been kept.')).toBeVisible();
});

test('late hashing cannot install an outdated plan or leak it to another account', async ({ page }) => {
  await open(page);
  await page.getByLabel('Add photos').setInputFiles(photo);
  await expect(page.getByRole('img', { name: 'product.png', exact: true })).toBeVisible(); await saved(page);
  await page.evaluate(() => {
    const digest = crypto.subtle.digest.bind(crypto.subtle);
    (window as any).releaseHash = null;
    crypto.subtle.digest = (...args: Parameters<SubtleCrypto['digest']>) => new Promise((resolve, reject) => { (window as any).releaseHash = () => digest(...args).then(resolve, reject); });
    (window as any).restoreHash = () => { crypto.subtle.digest = digest; };
  });
  await page.getByRole('button', { name: 'Prepare sample plan', exact: true }).click();
  await expect(page.getByText('Checking your saved brief and files… No generation or spending.')).toBeVisible();
  await page.getByLabel('// Brief', { exact: true }).fill('Changed while hashing');
  await page.evaluate(() => { (window as any).restoreHash(); (window as any).releaseHash(); });
  await expect(page.getByText('The brief or review changed while checking inputs. Prepare the sample again.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sample plan review', exact: true })).toHaveCount(0); await saved(page);
  await page.evaluate(() => {
    const digest = crypto.subtle.digest.bind(crypto.subtle);
    crypto.subtle.digest = (...args: Parameters<SubtleCrypto['digest']>) => new Promise((resolve, reject) => { (window as any).releaseHash = () => digest(...args).then(resolve, reject); });
    (window as any).restoreHash = () => { crypto.subtle.digest = digest; };
  });
  await page.getByRole('button', { name: 'Prepare sample plan', exact: true }).click();
  await expect(page.getByText('Checking your saved brief and files… No generation or spending.')).toBeVisible();
  await page.evaluate(() => (window as any).companionFixture.account('fixture-user-b'));
  await page.getByRole('button', { name: 'Reference brief', exact: true }).click();
  await page.evaluate(() => { (window as any).restoreHash(); (window as any).releaseHash(); });
  await expect(page.getByRole('heading', { name: 'Sample plan review', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('// Brief', { exact: true })).toHaveValue('');
});

test('conflict copy preserves edited review and failed writes do not claim a saved confirmation', async ({ page, context }) => {
  await open(page, 1280); await prepare(page);
  const other = await context.newPage(); await other.goto('/companion-chat-preview.html');
  await expect(other.getByRole('heading', { name: 'Sample plan review', exact: true })).toBeVisible();
  await page.getByLabel('// Direction', { exact: true }).fill('Newer tab direction'); await saved(page);
  await other.getByLabel('// Direction', { exact: true }).fill('Conflict copy direction');
  await expect(other.locator('#companion-save-status')).toContainText('Another tab saved newer chats');
  await other.getByRole('button', { name: 'Save this chat as a copy', exact: true }).click(); await saved(other);
  await other.reload(); await expect(other.getByLabel('// Direction', { exact: true })).toHaveValue('Conflict copy direction');
  await other.evaluate(() => { const original = IDBObjectStore.prototype.put; (window as any).restoreStorage = () => { IDBObjectStore.prototype.put = original; }; IDBObjectStore.prototype.put = function () { throw new DOMException('Fixture full', 'QuotaExceededError'); }; });
  await other.getByRole('button', { name: 'Confirm sample plan', exact: true }).click();
  await expect(other.getByText('Demo confirmation is not saved yet. Keep this tab open and check the save status.')).toBeVisible();
  await expect(other.getByText(/Sample plan confirmed for revision/)).toHaveCount(0);
  await other.evaluate(() => (window as any).restoreStorage());
  await other.getByRole('button', { name: 'Retry saving', exact: true }).click(); await saved(other);
  await expect(other.getByText(/Sample plan confirmed for revision/)).toBeVisible();
});

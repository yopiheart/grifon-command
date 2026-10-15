import { test as base, expect, type Page } from '@playwright/test';

const test = base.extend<{ forbiddenCalls: string[] }>({
  forbiddenCalls: [async ({ context }, use, testInfo) => {
    const calls: string[] = [];
    const blockedDecorativeRequests: string[] = [];
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      // The existing fixture HTML imports decorative fonts. Keep them offline and
      // record them separately from the API/provider boundary this suite protects.
      if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) {
        blockedDecorativeRequests.push(`${request.method()} ${url.origin}${url.pathname}`);
        return route.abort();
      }
      if (url.pathname.startsWith('/api/') || !['localhost', '127.0.0.1'].includes(url.hostname)) {
        calls.push(`${request.method()} ${url.origin}${url.pathname}`);
        return route.abort();
      }
      return route.continue();
    });
    await use(calls);
    await testInfo.attach('offline-network-boundary', { body: JSON.stringify({ calls, blockedDecorativeRequests }, null, 2), contentType: 'application/json' });
    expect(calls, 'The fixture queue must not call APIs or external providers').toEqual([]);
    for (const page of context.pages()) {
      if (!page.isClosed()) expect(await page.evaluate(() => (window as any).companionFixture?.snapshot().calls ?? [])).toEqual([]);
    }
  }, { auto: true }],
});

const saved = (page: Page) => expect(page.locator('#companion-save-status')).toContainText('saved on this device.');
const row = (page: Page, id: string) => page.getByTestId(`demo-step-${id}`);
const status = (page: Page) => page.getByTestId('demo-queue-status');
const steps = ['clip-1', 'clip-2', 'clip-3', 'voice', 'music', 'sfx', 'assembly', 'quality'];
const labels = ['Scene 1 clip', 'Scene 2 clip', 'Scene 3 clip', 'Locked voice and alignment', 'Instrumental music', 'Existing sound-bank cues', 'Assembly', 'Quality check'];

async function confirmed(page: Page, width = 390, silent = false) {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
  await page.goto('/companion-chat-preview.html');
  await page.getByRole('button', { name: 'Reference brief', exact: true }).click();
  await page.getByLabel('// Product or service', { exact: true }).fill('Queue coffee');
  if (silent) await page.getByLabel('Speech mode', { exact: true }).selectOption('silent');
  await saved(page);
  await page.getByRole('button', { name: 'Prepare sample plan', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sample plan review', exact: true })).toBeVisible();
  await saved(page);
  await page.getByRole('button', { name: 'Confirm sample plan', exact: true }).click();
  await expect(page.getByText(/Sample plan confirmed for revision/)).toBeVisible();
  await saved(page);
}

async function preview(page: Page) {
  await page.getByRole('button', { name: 'Preview demo queue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Demo production queue', exact: true })).toBeVisible();
}

async function prepare(page: Page, scenario = 'normal') {
  await preview(page);
  await page.locator('summary').filter({ hasText: 'Demo test scenario' }).click();
  await page.getByLabel('Demo scenario', { exact: true }).selectOption(scenario);
  await page.getByRole('button', { name: 'Prepare demo queue', exact: true }).click();
  await saved(page);
  await expect(page.getByRole('button', { name: 'Start demo queue', exact: true })).toBeEnabled();
}

async function savedQueue(page: Page, userId = 'fixture-user-a', chatId?: string): Promise<any> {
  return page.evaluate(async ({ userId, chatId }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('grifon_companion', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const book = await new Promise<any>((resolve, reject) => {
        const request = db.transaction('conversations', 'readonly').objectStore('conversations').get(userId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      return book?.chats.find((chat: any) => chat.id === (chatId ?? book.selectedId))?.referenceQueue ?? null;
    } finally { db.close(); }
  }, { userId, chatId });
}

async function staysStopped(page: Page, userId = 'fixture-user-a', chatId?: string) {
  const before = await savedQueue(page, userId, chatId);
  // Longer than two step timers: a leaked callback would change this checkpoint.
  await page.waitForTimeout(1_500);
  expect(await savedQueue(page, userId, chatId)).toEqual(before);
}

async function duplicateClick(page: Page, name: string) {
  const button = page.getByRole('button', { name, exact: true });
  await expect(button).toBeEnabled();
  await button.evaluate((element: HTMLButtonElement) => { element.click(); element.click(); });
}

async function completed(page: Page, silent = false) {
  await expect(status(page)).toContainText(/complete/i);
  await saved(page);
  for (const id of steps.filter(id => !silent || id !== 'voice')) await expect(row(page, id)).toContainText('Demo passed');
  await expect(page.locator('video')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /download.*video|download.*ad/i })).toHaveCount(0);
}

async function openSaved(page: Page) {
  const navigation = page.getByRole('navigation', { name: 'Conversations', exact: true });
  if (!await navigation.isVisible()) await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
  await navigation.getByRole('button', { name: 'Open chat: Queue coffee', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Demo production queue', exact: true })).toBeVisible();
}

async function denyWrites(page: Page) {
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    (window as any).restoreQueueStorage = () => { IDBObjectStore.prototype.put = original; };
    IDBObjectStore.prototype.put = function () { throw new DOMException('Fixture full', 'QuotaExceededError'); };
  });
}

async function recoverWrites(page: Page) {
  await page.evaluate(() => (window as any).restoreQueueStorage());
  await page.getByRole('button', { name: 'Retry saving', exact: true }).click();
  await saved(page);
}

test('confirmed sample exposes the demo queue entry without generating media', async ({ page }) => {
  await confirmed(page);
  await expect(page.getByRole('button', { name: 'Preview demo queue', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Preview demo queue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Demo production queue', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start demo queue', exact: true })).toHaveCount(0);
});

for (const width of [390, 1280]) test(`demo progress reloads stopped and completes only after explicit resume at ${width}px`, async ({ page }) => {
  await confirmed(page, width); await prepare(page);
  await expect(page.locator('[data-testid^="demo-step-"]')).toHaveCount(8);
  for (const [index, id] of steps.entries()) {
    await expect(row(page, id)).toContainText(labels[index]);
    await expect(row(page, id)).toContainText('Waiting');
  }
  await expect(page.getByText(/actual spend: PHP 0.00/i)).toBeVisible();
  await page.locator('summary').filter({ hasText: 'Original sample plan' }).click();
  await expect(page.getByText('PHP 220.00–PHP 340.00', { exact: false })).toBeVisible();
  await staysStopped(page);
  await duplicateClick(page, 'Start demo queue');
  await expect(row(page, 'clip-1')).toContainText('Demo passed');
  await saved(page);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Resume demo queue', exact: true })).toBeEnabled();
  await expect(status(page)).not.toContainText(/running|background/i);
  await staysStopped(page);
  await duplicateClick(page, 'Resume demo queue');
  await completed(page);
  await expect(row(page, 'clip-1')).toContainText('Attempt 1');
  await expect(page.getByText(/actual spend: PHP 0.00/i)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `.tmp/companion-reference-queue-${width}.png`, fullPage: true });
});

for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }]) test(`long visual plan stays within the queue and conversation scroller at ${viewport.width}px`, async ({ page }, testInfo) => {
  await confirmed(page, viewport.width);
  await page.setViewportSize(viewport);
  await page.getByLabel('// Scene 1 visual plan', { exact: true }).fill('Show the product label URL https://static.example.test/references/' + 'label'.repeat(30));
  await saved(page);
  await page.getByRole('button', { name: 'Confirm sample plan', exact: true }).click(); await saved(page);
  await prepare(page);
  await page.locator('summary').filter({ hasText: 'Original sample plan' }).click();
  const layout = await page.getByTestId('demo-queue-panel').evaluate(panel => {
    let scroller = panel.parentElement;
    while (scroller && !['auto', 'scroll'].includes(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement;
    return {
      panel: { scrollWidth: panel.scrollWidth, clientWidth: panel.clientWidth },
      scroller: scroller ? { scrollWidth: scroller.scrollWidth, clientWidth: scroller.clientWidth } : null,
      document: { scrollWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth },
    };
  });
  await testInfo.attach('long-visual-layout', { body: JSON.stringify(layout, null, 2), contentType: 'application/json' });
  await page.screenshot({ path: testInfo.outputPath('long-visual.png'), fullPage: true });
  expect.soft(layout.panel.scrollWidth, 'The saved visual must wrap inside the queue panel').toBeLessThanOrEqual(layout.panel.clientWidth + 1);
  expect(layout.scroller, 'Measure the actual conversation scroller, since document width hides this overflow').not.toBeNull();
  expect(layout.scroller!.scrollWidth).toBeLessThanOrEqual(layout.scroller!.clientWidth);
});

test('second scene failure stops the demo and retries only that failed step', async ({ page }) => {
  await confirmed(page, 1280); await prepare(page, 'second-clip-fails-once');
  await duplicateClick(page, 'Start demo queue');
  await expect(row(page, 'clip-2')).toContainText('Demo failed');
  await expect(status(page)).toContainText(/failed/i); await saved(page);
  await expect(row(page, 'clip-1')).toContainText('Demo passed');
  await expect(row(page, 'clip-1')).toContainText('Attempt 1');
  await expect(row(page, 'clip-2')).toContainText('Attempt 1');
  for (const id of steps.slice(2)) await expect(row(page, id)).toContainText('Waiting');
  await staysStopped(page);
  await page.screenshot({ path: '.tmp/companion-reference-queue-failed.png', fullPage: true });
  await duplicateClick(page, 'Retry failed step');
  await completed(page);
  await expect(row(page, 'clip-2')).toContainText('Attempt 2');
  for (const id of steps.filter(id => id !== 'clip-2')) await expect(row(page, id)).toContainText('Attempt 1');
  await page.screenshot({ path: '.tmp/companion-reference-queue-retried.png', fullPage: true });
});

test('pause and resume preserve successful work and cancel rejects stale callbacks', async ({ page }) => {
  await confirmed(page, 1280); await prepare(page);
  await page.getByRole('button', { name: 'Start demo queue', exact: true }).click();
  await expect(row(page, 'clip-1')).toContainText('Demo passed');
  await page.getByRole('button', { name: 'Pause demo queue', exact: true }).click(); await saved(page);
  await expect(page.getByRole('button', { name: 'Resume demo queue', exact: true })).toBeEnabled();
  await staysStopped(page);
  await page.getByRole('button', { name: 'Resume demo queue', exact: true }).click();
  await expect(row(page, 'clip-3')).toContainText('Simulating');
  await duplicateClick(page, 'Cancel demo queue'); await saved(page);
  await expect(status(page)).toContainText(/cancelled/i);
  await expect(page.getByRole('button', { name: 'Resume demo queue', exact: true })).toHaveCount(0);
  await staysStopped(page);
  await expect(row(page, 'clip-1')).toContainText('Demo passed');
  await expect(row(page, 'clip-1')).toContainText('Attempt 1');
  await page.reload(); await expect(status(page)).toContainText(/cancelled/i); await staysStopped(page);
});

test('leaving the queue panel and opening a new chat stop playback', async ({ page }) => {
  await confirmed(page, 1280); await prepare(page);
  await page.getByRole('button', { name: 'Start demo queue', exact: true }).click();
  await expect(row(page, 'clip-1')).toContainText('Simulating');
  await page.getByRole('button', { name: 'Back to sample plan', exact: true }).click(); await saved(page);
  await staysStopped(page);
  await preview(page);
  await expect(page.getByRole('button', { name: 'Resume demo queue', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Resume demo queue', exact: true }).click();
  await expect(row(page, 'clip-1')).toContainText('Demo passed'); await saved(page);
  const chatId = await page.getByTestId('companion-chat').getAttribute('data-chat-id');
  await page.getByRole('button', { name: 'New chat', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Demo production queue', exact: true })).toHaveCount(0);
  await staysStopped(page, 'fixture-user-a', chatId!);
  await openSaved(page);
  await expect(page.getByRole('button', { name: 'Resume demo queue', exact: true })).toBeEnabled();
  await staysStopped(page);
});

test('account switch isolates the queue and prevents old timers from advancing', async ({ page }) => {
  await confirmed(page, 1280); await prepare(page);
  await page.getByRole('button', { name: 'Start demo queue', exact: true }).click();
  await expect(row(page, 'clip-1')).toContainText('Simulating'); await saved(page);
  const chatId = await page.getByTestId('companion-chat').getAttribute('data-chat-id');
  await page.evaluate(() => (window as any).companionFixture.account('fixture-user-b'));
  await expect(page.getByRole('button', { name: 'Reference brief', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Demo production queue', exact: true })).toHaveCount(0);
  await saved(page); expect(await savedQueue(page, 'fixture-user-b')).toBeNull();
  await staysStopped(page, 'fixture-user-a', chatId!);
  await page.evaluate(() => (window as any).companionFixture.account('fixture-user-a'));
  await expect(page.getByRole('button', { name: 'Resume demo queue', exact: true })).toBeEnabled();
  await staysStopped(page);
});

test('review edit and revert permanently invalidate the old queue until replacement', async ({ page }) => {
  await confirmed(page, 1280); await prepare(page);
  const old = await savedQueue(page);
  await page.getByRole('button', { name: 'Back to sample plan', exact: true }).click();
  const direction = page.getByLabel('// Direction', { exact: true }), original = await direction.inputValue();
  await direction.fill('Changed sample direction'); await saved(page);
  await direction.fill(original); await saved(page);
  expect((await savedQueue(page)).invalidated).toBe(true);
  await page.getByRole('button', { name: 'Confirm sample plan', exact: true }).click(); await saved(page);
  await preview(page);
  await expect(page.getByText('This demo queue belongs to an earlier plan.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start demo queue', exact: true })).toHaveCount(0);
  expect((await savedQueue(page)).id).toBe(old.id);
  await page.reload(); expect((await savedQueue(page)).invalidated).toBe(true);
  await page.getByRole('button', { name: 'Prepare replacement demo queue', exact: true }).click(); await saved(page);
  expect((await savedQueue(page)).id).not.toBe(old.id);
  expect((await savedQueue(page)).invalidated).toBe(false);
  await expect(page.getByRole('button', { name: 'Start demo queue', exact: true })).toBeEnabled();
});

test('brief edit and revert cannot revive the queue even after a new confirmation', async ({ page }) => {
  await confirmed(page, 1280); await prepare(page);
  const old = await savedQueue(page);
  await page.getByRole('button', { name: 'Back to sample plan', exact: true }).click();
  await page.getByRole('button', { name: 'Edit brief', exact: true }).click();
  await page.getByLabel('// Product or service', { exact: true }).fill('Changed coffee'); await saved(page);
  await page.getByLabel('// Product or service', { exact: true }).fill('Queue coffee'); await saved(page);
  expect((await savedQueue(page)).invalidated).toBe(true);
  await page.getByRole('button', { name: 'View previous sample plan', exact: true }).click();
  await page.getByRole('button', { name: 'Prepare updated sample plan', exact: true }).click(); await saved(page);
  await page.getByRole('button', { name: 'Confirm sample plan', exact: true }).click(); await saved(page);
  await preview(page);
  await expect(page.getByText('This demo queue belongs to an earlier plan.', { exact: false })).toBeVisible();
  expect((await savedQueue(page)).id).toBe(old.id);
  await expect(page.getByRole('button', { name: 'Resume demo queue', exact: true })).toHaveCount(0);
  await staysStopped(page);
});

test('silent review omits spoken voice while retaining music, SFX, assembly and QA', async ({ page }) => {
  await confirmed(page, 390, true); await prepare(page);
  await expect(page.locator('[data-testid^="demo-step-"]')).toHaveCount(7);
  await expect(row(page, 'voice')).toHaveCount(0);
  for (const id of steps.filter(id => id !== 'voice')) await expect(row(page, id)).toContainText('Waiting');
  await page.getByRole('button', { name: 'Start demo queue', exact: true }).click(); await completed(page, true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '.tmp/companion-reference-queue-silent.png', fullPage: true });
});

test('failed progress save stops playback, preserves the saved checkpoint and requires resume after retry', async ({ page }) => {
  await confirmed(page, 1280); await prepare(page);
  await page.getByRole('button', { name: 'Start demo queue', exact: true }).click();
  await expect(row(page, 'clip-1')).toContainText('Simulating'); await saved(page);
  await denyWrites(page);
  await expect(page.locator('#companion-save-status')).toContainText('could not be saved');
  await expect(page.locator('#companion-save-status')).not.toContainText('saved on this device.');
  await expect(row(page, 'clip-2')).toContainText('Pending save');
  await expect(page.locator('[data-testid^="demo-step-"]').filter({ hasText: 'Simulating' })).toHaveCount(0);
  const checkpoint = await savedQueue(page);
  const displayedSteps = await page.locator('[data-testid^="demo-step-"]').allTextContents();
  await staysStopped(page);
  expect(await savedQueue(page)).toEqual(checkpoint);
  expect(await page.locator('[data-testid^="demo-step-"]').allTextContents()).toEqual(displayedSteps);
  await expect(row(page, 'clip-3')).toContainText('Waiting');
  await page.screenshot({ path: '.tmp/companion-reference-queue-save-failed.png', fullPage: true });
  await recoverWrites(page);
  await expect(page.getByRole('button', { name: 'Resume demo queue', exact: true })).toBeEnabled();
  await staysStopped(page);
  await page.getByRole('button', { name: 'Resume demo queue', exact: true }).click(); await completed(page);
});

test('conflict copy retains the queue stopped and preserves the newer original', async ({ page, context }) => {
  await confirmed(page, 1280); await prepare(page);
  const chatId = await page.getByTestId('companion-chat').getAttribute('data-chat-id');
  const other = await context.newPage(); await other.goto('/companion-chat-preview.html');
  await expect(other.getByRole('button', { name: 'Start demo queue', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Start demo queue', exact: true }).click();
  await expect(row(page, 'clip-1')).toContainText('Demo passed');
  await page.getByRole('button', { name: 'Pause demo queue', exact: true }).click(); await saved(page);
  const original = await savedQueue(page);
  await other.getByRole('button', { name: 'Start demo queue', exact: true }).click();
  await expect(other.locator('#companion-save-status')).toContainText('Another tab saved newer chats');
  await expect(other.locator('#companion-save-status')).not.toContainText('saved on this device.');
  await staysStopped(other);
  await other.getByRole('button', { name: 'Save this chat as a copy', exact: true }).click(); await saved(other);
  await expect(other.getByRole('button', { name: 'Resume demo queue', exact: true })).toBeEnabled();
  const copiedChatId = await other.getByTestId('companion-chat').getAttribute('data-chat-id');
  expect(copiedChatId).not.toBe(chatId);
  expect(await savedQueue(other, 'fixture-user-a', chatId!)).toEqual(original);
  const copy = await savedQueue(other);
  expect(copy.id).toBe(original.id);
  await staysStopped(other);
  await other.reload();
  await expect(other.getByRole('button', { name: 'Resume demo queue', exact: true })).toBeEnabled();
  await staysStopped(other);
  await other.screenshot({ path: '.tmp/companion-reference-queue-conflict-copy.png', fullPage: true });
});

for (const defect of ['actual spend', 'completion status', 'dependency order']) test(`malformed saved queue ${defect} fails closed and retains the original data`, async ({ page }) => {
  await confirmed(page, 1280); await prepare(page);
  await page.evaluate(async defect => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('grifon_companion', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('conversations', 'readwrite'), store = transaction.objectStore('conversations');
        const request = store.get('fixture-user-a');
        request.onsuccess = () => {
          const book = request.result, queue = book.chats.find((chat: any) => chat.id === book.selectedId).referenceQueue;
          if (defect === 'actual spend') queue.actualCents = 1;
          if (defect === 'completion status') queue.status = 'complete';
          if (defect === 'dependency order') {
            queue.status = 'running'; queue.steps[1].status = 'running'; queue.steps[1].attempts = 1;
          }
          store.put(book, 'fixture-user-a');
        };
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } finally { db.close(); }
  }, defect);
  const malformed = await savedQueue(page);
  await page.reload();
  await expect(page.getByText('Saved chats could not be opened. Your saved data has been kept.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start demo queue', exact: true })).toHaveCount(0);
  expect(await savedQueue(page)).toEqual(malformed);
});

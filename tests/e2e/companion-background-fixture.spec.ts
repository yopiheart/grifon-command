import { test as base, expect, chromium, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

const PREFIX = '/__companion-fixture-jobs';
const PREVIEW = '/companion-chat-preview.html?background=1';
const DB_PATH = process.env.COMPANION_BACKGROUND_DB || '.tmp/companion-background-live/jobs.sqlite';
const steps = ['clip-1', 'clip-2', 'clip-3', 'voice', 'music', 'sfx', 'assembly', 'quality'];
type RecordedRequest = { method: string; path: string; at: number; body: any };
type JournalEvent = { revision: number; kind: string; occurredAt: number; queue: any };

async function evidence(testInfo: TestInfo, name: string, value: unknown) {
  const path = testInfo.outputPath(`${name}.json`);
  writeFileSync(path, JSON.stringify(value, null, 2));
  await testInfo.attach(name, { path, contentType: 'application/json' });
}

function journal(requestId: string): JournalEvent[] {
  // A read-only SQLite connection cannot run the worker or the HTTP GET handler.
  const db = new DatabaseSync(resolve(DB_PATH), { readOnly: true });
  try {
    return db.prepare('SELECT revision, kind, occurred_at, queue_json FROM events WHERE request_id = ? ORDER BY revision').all(requestId).map(row => ({
      revision: Number(row.revision), kind: String(row.kind), occurredAt: Number(row.occurred_at), queue: JSON.parse(String(row.queue_json)),
    }));
  } finally { db.close(); }
}

class OwnedBrowser {
  private contexts = new Set<BrowserContext>();
  private launches = 0;
  readonly requests: RecordedRequest[] = [];
  readonly forbidden: string[] = [];
  readonly decorative: string[] = [];
  readonly pageErrors: string[] = [];
  readonly closures: { at: number; disconnected: boolean; remainingContexts: number }[] = [];
  constructor(readonly baseURL: string, readonly testInfo: TestInfo) {}
  async open(width = 390) {
    const context = await chromium.launchPersistentContext(this.testInfo.outputPath('owned-edge-profile'), {
      ...(process.platform === 'win32' ? { channel: 'msedge' } : {}), headless: true, serviceWorkers: 'block',
      baseURL: this.baseURL, viewport: { width, height: width === 390 ? 844 : 900 },
    });
    this.launches++;
    this.contexts.add(context);
    context.on('page', page => page.on('pageerror', error => this.pageErrors.push(error.message)));
    context.on('request', request => {
      const url = new URL(request.url());
      if (url.origin !== new URL(this.baseURL).origin || !url.pathname.startsWith(PREFIX)) return;
      let body = null;
      try { body = request.postDataJSON(); } catch { /* GET has no body. */ }
      this.requests.push({ method: request.method(), path: url.pathname + url.search, at: Date.now(), body });
    });
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) {
        this.decorative.push(`${request.method()} ${url.origin}${url.pathname}`); return route.abort();
      }
      if (url.origin !== new URL(this.baseURL).origin || url.pathname.startsWith('/api/')) {
        this.forbidden.push(`${request.method()} ${url.origin}${url.pathname}`); return route.abort();
      }
      if (url.pathname.startsWith(PREFIX)) {
        const allowed = (request.method() === 'POST' && ['/start', '/command'].some(path => url.pathname === PREFIX + path))
          || (request.method() === 'GET' && url.pathname === PREFIX + '/job');
        if (!allowed) { this.forbidden.push(`${request.method()} ${url.pathname}`); return route.abort(); }
      }
      return route.continue();
    });
    const page = context.pages()[0] || await context.newPage();
    page.on('pageerror', error => this.pageErrors.push(error.message));
    return { context, page };
  }
  async closeAll() {
    for (const context of this.contexts) {
      const browser = context.browser();
      expect(browser, 'The persistent context must expose its owned Edge browser').not.toBeNull();
      await context.close();
      this.contexts.delete(context);
      this.closures.push({ at: Date.now(), disconnected: browser ? !browser.isConnected() : true, remainingContexts: this.contexts.size });
    }
    expect(this.contexts.size, 'All browser contexts owned by this test must be closed').toBe(0);
    expect(this.closures.at(-1)?.disconnected, 'Closing the persistent context must terminate its owned Edge browser').toBe(true);
    return Date.now();
  }
  starts() { return this.requests.filter(request => request.method === 'POST' && request.path === PREFIX + '/start'); }
  commands() { return this.requests.filter(request => request.method === 'POST' && request.path === PREFIX + '/command'); }
  async finish() {
    const fixtureCalls: unknown[] = [];
    for (const context of this.contexts) for (const page of context.pages()) {
      if (!page.isClosed()) fixtureCalls.push(...await page.evaluate(() => (window as any).companionFixture?.snapshot().calls || []));
    }
    await this.closeAll();
    await evidence(this.testInfo, 'local-fixture-network-boundary', { requests: this.requests, forbidden: this.forbidden, decorative: this.decorative, pageErrors: this.pageErrors, launches: this.launches, closures: this.closures });
    expect(this.forbidden, 'Only the same-origin fixture transport is allowed; APIs and providers stay blocked').toEqual([]);
    expect(this.pageErrors).toEqual([]);
    expect(fixtureCalls).toEqual([]);
  }
}

const test = base.extend<{ owned: OwnedBrowser }>({
  owned: async ({ baseURL }, use, testInfo) => {
    const owned = new OwnedBrowser(baseURL!, testInfo);
    try { await use(owned); } finally { await owned.finish(); }
  },
});
const saved = (page: Page) => expect(page.locator('#companion-save-status')).toContainText(/saved on this device\.|Job link saved in this browser\./);
const panel = (page: Page) => page.getByTestId('background-fixture-panel');
const status = (page: Page) => page.getByTestId('background-fixture-status');
const step = (page: Page, id: string) => page.getByTestId(`background-step-${id}`);

async function confirmed(page: Page, width = 390, url = PREVIEW) {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
  await page.goto(url);
  await page.getByRole('button', { name: 'Reference brief', exact: true }).click();
  await page.getByLabel('// Product or service', { exact: true }).fill('Background coffee');
  await saved(page);
  await page.getByRole('button', { name: 'Prepare sample plan', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sample plan review', exact: true })).toBeVisible();
  await saved(page);
  await page.getByRole('button', { name: 'Confirm sample plan', exact: true }).click();
  await expect(page.getByText(/Sample plan confirmed for revision/)).toBeVisible();
  await saved(page);
}
async function openPanel(page: Page) {
  await page.getByRole('button', { name: 'Open background fixture job', exact: true }).click();
  await expect(panel(page)).toBeVisible();
}
async function start(page: Page, scenario = 'normal') {
  await openPanel(page);
  await page.getByLabel('Background fixture scenario', { exact: true }).selectOption(scenario);
  await page.getByRole('button', { name: 'Start background fixture job', exact: true }).click();
  await saved(page);
}
async function book(page: Page, ownerId = 'fixture-user-a'): Promise<any> {
  return page.evaluate(async ownerId => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('grifon_companion', 1);
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<any>((resolve, reject) => {
        const request = db.transaction('conversations', 'readonly').objectStore('conversations').get(ownerId);
        request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
    } finally { db.close(); }
  }, ownerId);
}
async function link(page: Page, chatId?: string, ownerId = 'fixture-user-a') {
  const savedBook = await book(page, ownerId);
  return savedBook?.chats.find((chat: any) => chat.id === (chatId || savedBook.selectedId))?.referenceFixtureJob || null;
}
async function currentChatId(page: Page) { return (await page.getByTestId('companion-chat').getAttribute('data-chat-id'))!; }
async function openSaved(page: Page) {
  const nav = page.getByRole('navigation', { name: 'Conversations', exact: true });
  if (!await nav.isVisible()) await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
  await nav.getByRole('button', { name: 'Open chat: Background coffee', exact: true }).click();
  await expect(panel(page)).toBeVisible();
}
async function complete(page: Page) {
  await expect(status(page)).toHaveText('Background fixture complete', { timeout: 25_000 });
  for (const id of steps) await expect(step(page, id)).toContainText('Fixture passed');
  await expect(page.getByText(/Actual spend: PHP 0.00/)).toBeVisible();
  await expect(page.locator('video')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /download.*video|download.*ad/i })).toHaveCount(0);
}
async function duplicateClick(page: Page, name: string) {
  const button = page.getByRole('button', { name, exact: true });
  await expect(button).toBeEnabled();
  await button.evaluate((element: HTMLButtonElement) => { element.click(); element.click(); });
}
async function layout(page: Page, testInfo: TestInfo, name: string) {
  const evidence = await panel(page).evaluate(element => {
    let scroller = element.parentElement;
    while (scroller && !['auto', 'scroll'].includes(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement;
    return {
      panel: { width: element.clientWidth, scrollWidth: element.scrollWidth },
      scroller: scroller ? { width: scroller.clientWidth, scrollWidth: scroller.scrollWidth } : null,
      document: { width: innerWidth, scrollWidth: document.documentElement.scrollWidth },
      controls: Array.from(element.querySelectorAll<HTMLElement>('button, select, summary')).filter(control => control.getClientRects().length).map(control => ({ label: control.textContent?.trim(), width: control.getBoundingClientRect().width, height: control.getBoundingClientRect().height })),
    };
  });
  const path = testInfo.outputPath(`${name}.json`);
  writeFileSync(path, JSON.stringify(evidence, null, 2));
  await testInfo.attach(name, { path, contentType: 'application/json' });
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
  expect(evidence.panel.scrollWidth).toBeLessThanOrEqual(evidence.panel.width + 1);
  expect(evidence.scroller).not.toBeNull();
  expect(evidence.scroller!.scrollWidth).toBeLessThanOrEqual(evidence.scroller!.width + 1);
  expect(evidence.document.scrollWidth).toBeLessThanOrEqual(evidence.document.width);
  for (const control of evidence.controls) {
    expect(control.height, `${control.label} touch height`).toBeGreaterThanOrEqual(44);
    expect(control.width, `${control.label} touch width`).toBeGreaterThanOrEqual(44);
  }
}

test('saved confirmed plan offers a background fixture job without generating media', async ({ owned }) => {
  const { page } = await owned.open();
  await confirmed(page);
  await expect(page.getByRole('button', { name: 'Open background fixture job', exact: true })).toBeVisible();
  await openPanel(page);
  await expect(status(page)).toHaveText('Ready to start');
  expect(owned.starts()).toHaveLength(0);
});

test('ordinary preview keeps its local demo entry and makes no background transport requests', async ({ owned }) => {
  const { page } = await owned.open();
  await confirmed(page, 390, '/companion-chat-preview.html');
  await expect(page.getByRole('button', { name: 'Preview demo queue', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open background fixture job', exact: true })).toHaveCount(0);
  expect(owned.requests).toEqual([]);
});

for (const width of [390, 1280]) test(`worker completes while the entire owned browser is closed and same profile recovers at ${width}px`, async ({ owned }, testInfo) => {
  const { page, context } = await owned.open(width);
  let persistedBeforePost: unknown;
  await context.route(`**${PREFIX}/start`, async route => {
    persistedBeforePost = await link(page);
    expect((persistedBeforePost as any)?.intent, 'IndexedDB must acknowledge this exact intent before the first POST').toEqual(route.request().postDataJSON().intent);
    await route.fallback();
  });
  await confirmed(page, width); await start(page);
  await expect(status(page)).toHaveText('Background fixture running');
  const original = await link(page), originalChatId = await currentChatId(page);
  expect(original.intent.ownerChatId).toBe(originalChatId);
  expect((await book(page)).chats.find((chat: any) => chat.id === originalChatId).referenceQueue).toBeUndefined();
  const accepted = journal(original.intent.requestId).at(-1)!;
  expect(accepted.queue.status).toBe('running');
  await layout(page, testInfo, `running-${width}`);
  const closedAt = await owned.closeAll(), requestsAtClose = owned.requests.length;
  await expect.poll(() => journal(original.intent.requestId).at(-1)?.queue.status, { timeout: 20_000, intervals: [200] }).toBe('complete');
  const proofReadAt = Date.now(), eventsBeforeReopen = journal(original.intent.requestId);
  const closedEvents = eventsBeforeReopen.filter(event => event.occurredAt > closedAt && event.occurredAt <= proofReadAt);
  expect(closedEvents.length, 'Worker journal must advance after Edge has terminated and before any reopening').toBeGreaterThan(0);
  expect(closedEvents.every(event => event.kind === 'tick')).toBe(true);
  expect(closedEvents.at(-1)!.queue.status).toBe('complete');
  expect(owned.requests).toHaveLength(requestsAtClose);
  await evidence(testInfo, 'browser-closed-worker-proof', { requestId: original.intent.requestId, jobId: accepted.queue.id, originalChatId, persistedBeforePost, closedAt, proofReadAt, requestsAtClose, eventsBeforeReopen, closedEvents, closures: owned.closures });
  const reopened = await owned.open(width); await reopened.page.goto(PREVIEW); await complete(reopened.page);
  expect(await currentChatId(reopened.page)).toBe(originalChatId); expect(await link(reopened.page)).toEqual(original);
  expect(journal(original.intent.requestId).at(-1)!.queue.id).toBe(accepted.queue.id);
  expect(owned.starts()).toHaveLength(1);
  expect(owned.requests.filter(request => request.at > proofReadAt).every(request => request.method === 'GET')).toBe(true);
  await layout(reopened.page, testInfo, `complete-${width}`);
});

test('lost start acknowledgement reopens with a GET for the same request and no second POST', async ({ owned }, testInfo) => {
  const { page, context } = await owned.open();
  await confirmed(page);
  let upstreamAccepted = false;
  await context.route(`**${PREFIX}/start`, async route => {
    const response = await route.fetch(); expect(response.ok()).toBe(true); upstreamAccepted = true;
    await route.abort('failed');
  });
  await start(page); await expect.poll(() => upstreamAccepted).toBe(true);
  const original = await link(page);
  expect(journal(original.intent.requestId).length).toBeGreaterThan(0);
  const closedAt = await owned.closeAll(), requestCount = owned.requests.length;
  await expect.poll(() => journal(original.intent.requestId).at(-1)?.queue.status, { timeout: 20_000, intervals: [200] }).toBe('complete');
  const proofReadAt = Date.now(), closedEvents = journal(original.intent.requestId).filter(event => event.occurredAt > closedAt);
  expect(closedEvents.length).toBeGreaterThan(0);
  expect(closedEvents.every(event => event.kind === 'tick')).toBe(true); expect(closedEvents.at(-1)!.queue.status).toBe('complete');
  expect(owned.requests).toHaveLength(requestCount);
  await evidence(testInfo, 'lost-ack-closed-worker-proof', { closedAt, proofReadAt, original, closedEvents });
  const reopened = await owned.open(); await reopened.page.goto(PREVIEW); await complete(reopened.page);
  expect(await link(reopened.page)).toEqual(original); expect(owned.starts()).toHaveLength(1);
  expect(owned.requests.filter(request => request.at > proofReadAt).every(request => request.method === 'GET')).toBe(true);
});

test('IndexedDB intent save failure dispatches no start request', async ({ owned }) => {
  const { page } = await owned.open(); await confirmed(page); await openPanel(page);
  await page.evaluate(() => { IDBObjectStore.prototype.put = function () { throw new DOMException('Fixture storage full', 'QuotaExceededError'); }; });
  await page.getByRole('button', { name: 'Start background fixture job', exact: true }).click();
  await expect(page.locator('#companion-save-status')).toContainText('could not be saved');
  await expect(page.getByText('The browser job link is not saved yet.', { exact: false })).toBeVisible();
  expect(await link(page)).toBeNull(); await page.waitForTimeout(1_500); expect(owned.starts()).toHaveLength(0);
  await page.reload(); expect(await link(page)).toBeNull(); expect(owned.starts()).toHaveLength(0);
});

test('rapid starts and a stale second tab cannot fork a job; conflict copy only observes its original', async ({ owned }) => {
  const { page, context } = await owned.open(1280); await confirmed(page, 1280); await openPanel(page);
  const stale = await context.newPage(); await stale.goto(PREVIEW); await openPanel(stale);
  await duplicateClick(page, 'Start background fixture job'); await expect(status(page)).toHaveText('Background fixture running'); await saved(page);
  const original = await link(page), originalChatId = await currentChatId(page);
  await duplicateClick(stale, 'Start background fixture job');
  await expect(stale.locator('#companion-save-status')).toContainText('Another tab saved newer chats'); expect(owned.starts()).toHaveLength(1);
  await stale.getByRole('button', { name: 'Save this chat as a copy', exact: true }).click(); await saved(stale);
  await expect(panel(stale)).toBeVisible(); await expect(stale.getByText('This chat is a copy.', { exact: false })).toBeVisible();
  const copy = await link(stale);
  expect(await currentChatId(stale)).not.toBe(originalChatId); expect(copy.intent).toEqual(original.intent);
  for (const name of ['Start background fixture job', 'Start saved fixture job', 'Retry failed step', 'Cancel background fixture job', 'Stop job and edit plan']) await expect(stale.getByRole('button', { name, exact: true })).toHaveCount(0);
  await stale.reload(); await expect(panel(stale)).toBeVisible(); await expect(stale.getByText('This chat is a copy.', { exact: false })).toBeVisible();
  expect(await link(stale)).toEqual(copy); expect(owned.starts()).toHaveLength(1); expect(owned.commands()).toHaveLength(0);
  expect(owned.requests.filter(request => request.method === 'GET').every(request => new URL(request.path, owned.baseURL).searchParams.get('chatId') === originalChatId)).toBe(true);
});

test('second clip retry preserves every successful step and the original job identity', async ({ owned }) => {
  const { page } = await owned.open(1280); await confirmed(page, 1280); await start(page, 'second-clip-fails-once');
  await expect(status(page)).toHaveText('Fixture stopped at a failed step');
  const original = await link(page), failed = journal(original.intent.requestId).at(-1)!.queue;
  await expect(step(page, 'clip-1')).toContainText('Fixture passed'); await expect(step(page, 'clip-1')).toContainText('Attempt 1');
  await expect(step(page, 'clip-2')).toContainText('Fixture failed');
  for (const id of steps.slice(2)) await expect(step(page, id)).toContainText('Waiting');
  await duplicateClick(page, 'Retry failed step'); await complete(page);
  const completed = journal(original.intent.requestId).at(-1)!.queue;
  expect(completed.id).toBe(failed.id); expect(await link(page)).toEqual(original);
  for (const id of steps) await expect(step(page, id)).toContainText(`Attempt ${id === 'clip-2' ? 2 : 1}`);
  expect(completed.steps[0]).toEqual(failed.steps[0]);
  expect(owned.starts()).toHaveLength(1); expect(owned.commands().map(request => request.body.action)).toEqual(['retry']);
});

test('cancel acknowledges a stopped job and prevents future worker steps', async ({ owned }) => {
  const { page, context } = await owned.open(1280); await confirmed(page, 1280); await start(page);
  let forcedStaleRevision = false;
  await context.route(`**${PREFIX}/command`, async route => {
    const body = route.request().postDataJSON();
    if (body.action === 'cancel' && !forcedStaleRevision) {
      forcedStaleRevision = true;
      const revisionAtDispatch = journal(body.intent.requestId).at(-1)!.revision;
      await expect.poll(() => journal(body.intent.requestId).at(-1)!.revision, { timeout: 5_000, intervals: [100] }).toBeGreaterThan(revisionAtDispatch);
    }
    await route.fallback();
  });
  await expect(step(page, 'clip-1')).toContainText('Fixture passed'); await duplicateClick(page, 'Cancel background fixture job');
  await expect(status(page)).toHaveText('Background fixture cancelled');
  const original = await link(page), cancelled = journal(original.intent.requestId);
  expect(forcedStaleRevision).toBe(true);
  expect(cancelled.filter(event => event.kind === 'cancel')).toHaveLength(1);
  await page.waitForTimeout(2_600); expect(journal(original.intent.requestId)).toEqual(cancelled);
  await page.reload(); await expect(status(page)).toHaveText('Background fixture cancelled');
  await expect(page.getByRole('button', { name: 'Retry failed step', exact: true })).toHaveCount(0);
  expect(owned.starts()).toHaveLength(1); expect(owned.commands().map(request => request.body.action)).toEqual(['cancel']);
});

test('a rejected command stays visible across automatic status polls until an explicit refresh', async ({ owned }) => {
  const { page, context } = await owned.open(1280);
  await confirmed(page, 1280); await start(page); await expect(status(page)).toHaveText('Background fixture running');
  await context.route(`**${PREFIX}/command`, route => route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'Fixture command rejected' }) }));
  await page.getByRole('button', { name: 'Cancel background fixture job', exact: true }).click();
  const rejection = page.getByRole('alert').filter({ hasText: 'could not confirm this request (409)' });
  await expect(rejection).toBeVisible();
  const pollsBefore = owned.requests.filter(request => request.method === 'GET').length;
  await expect.poll(() => owned.requests.filter(request => request.method === 'GET').length, { timeout: 4_000 }).toBeGreaterThan(pollsBefore + 1);
  await expect(rejection).toBeVisible();
  await page.getByRole('button', { name: 'Refresh job status', exact: true }).click();
  await expect(rejection).toHaveCount(0);
  await context.unroute(`**${PREFIX}/command`);
  await page.getByRole('button', { name: 'Cancel background fixture job', exact: true }).click();
  await expect(status(page)).toHaveText('Background fixture cancelled');
  expect(owned.starts()).toHaveLength(1);
});

test('plan edits wait for worker invalidation acknowledgement and edit-revert cannot revive the old job', async ({ owned }) => {
  const { page, context } = await owned.open(1280); await confirmed(page, 1280); await start(page);
  await expect(status(page)).toHaveText('Background fixture running'); const original = await link(page);
  let release!: () => void, received = false; const held = new Promise<void>(resolve => { release = resolve; });
  await context.route(`**${PREFIX}/command`, async route => { const response = await route.fetch(); received = true; await held; await route.fulfill({ response }); });
  await page.getByRole('button', { name: 'Stop job and edit plan', exact: true }).click(); await expect.poll(() => received).toBe(true);
  expect(journal(original.intent.requestId).at(-1)!.queue.invalidated).toBe(true);
  await expect(page.getByLabel('// Direction', { exact: true })).toHaveCount(0); expect((await link(page)).invalidated).toBe(false);
  release(); const direction = page.getByLabel('// Direction', { exact: true }); await expect(direction).toBeEditable(); await saved(page);
  expect((await link(page)).invalidated).toBe(true); const prior = await direction.inputValue();
  await direction.fill('An edited plan'); await saved(page); await direction.fill(prior); await saved(page);
  await page.getByRole('button', { name: 'Confirm sample plan', exact: true }).click(); await saved(page); await openPanel(page);
  await expect(status(page)).toHaveText('Earlier plan · stopped'); expect((await link(page)).intent).toEqual(original.intent); expect(owned.starts()).toHaveLength(1);
  const stopped = journal(original.intent.requestId); await page.waitForTimeout(1_500); expect(journal(original.intent.requestId)).toEqual(stopped);
});

test('late start acknowledgement cannot land in a different account or chat', async ({ owned }) => {
  const { page, context } = await owned.open(1280); await confirmed(page, 1280);
  let release!: () => void, accepted = false; const held = new Promise<void>(resolve => { release = resolve; });
  await context.route(`**${PREFIX}/start`, async route => { const response = await route.fetch(); accepted = true; await held; await route.fulfill({ response }); });
  await start(page); await expect.poll(() => accepted).toBe(true); const original = await link(page), originalChatId = await currentChatId(page);
  await page.evaluate(() => (window as any).companionFixture.account('fixture-user-b'));
  await expect(page.getByRole('button', { name: 'Reference brief', exact: true })).toBeVisible(); release(); await page.waitForTimeout(1_100);
  await expect(panel(page)).toHaveCount(0); expect(await link(page, undefined, 'fixture-user-b')).toBeNull(); expect(await link(page, originalChatId)).toEqual(original);
  await page.evaluate(() => (window as any).companionFixture.account('fixture-user-a')); await expect(panel(page)).toBeVisible();
  await page.getByRole('button', { name: 'New chat', exact: true }).click(); await expect(panel(page)).toHaveCount(0); await page.waitForTimeout(1_100);
  expect(await link(page)).toBeNull(); expect(await link(page, originalChatId)).toEqual(original); await openSaved(page); await complete(page); expect(owned.starts()).toHaveLength(1);
});

test('network disconnection leaves honest last-known status while the worker completes independently', async ({ owned }, testInfo) => {
  const { page, context } = await owned.open(); await confirmed(page); await start(page); await expect(status(page)).toHaveText('Background fixture running');
  const original = await link(page); await context.setOffline(true);
  await expect(page.getByText('The last confirmed worker status is shown below.', { exact: false })).toBeVisible();
  await expect.poll(() => journal(original.intent.requestId).at(-1)?.queue.status, { timeout: 20_000, intervals: [200] }).toBe('complete');
  await expect(status(page)).toHaveText('Background fixture running'); await expect(page.getByText('No worker progress is confirmed.', { exact: false })).toHaveCount(0);
  await evidence(testInfo, 'offline-worker-journal', journal(original.intent.requestId));
  await context.setOffline(false); await page.getByRole('button', { name: 'Refresh job status', exact: true }).click(); await complete(page);
  expect(await link(page)).toEqual(original); expect(owned.starts()).toHaveLength(1);
});

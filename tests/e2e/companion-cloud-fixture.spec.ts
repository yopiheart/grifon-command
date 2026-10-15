import { test as base, expect, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import { writeFileSync } from 'node:fs';

// This harness is a simulated RPC server. Real PC-off/cron persistence has a separate SQL proof.
const PREVIEW = '/companion-chat-preview.html?cloud=1';
const OWNER = 'fixture-user-a';
const OTHER = 'fixture-user-b';
type HarnessSnapshot = { calls: { name: string; args?: any; value?: any }[]; jobs: any[]; offline: boolean };

async function evidence(testInfo: TestInfo, name: string, value: unknown) {
  const path = testInfo.outputPath(`${name}.json`);
  writeFileSync(path, JSON.stringify(value, null, 2));
  await testInfo.attach(name, { path, contentType: 'application/json' });
}
class Boundary {
  readonly forbidden: string[] = [];
  readonly decorative: string[] = [];
  readonly errors: string[] = [];
  readonly pages: Page[] = [];
  constructor(readonly baseURL: string, readonly testInfo: TestInfo) {}
  async install(context: BrowserContext) {
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) {
        this.decorative.push(`${request.method()} ${url.origin}${url.pathname}`); return route.abort();
      }
      if (url.origin !== new URL(this.baseURL).origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/__companion-fixture-jobs')) {
        this.forbidden.push(`${request.method()} ${url.origin}${url.pathname}`); return route.abort();
      }
      return route.continue();
    });
    const record = (page: Page) => { this.pages.push(page); page.on('pageerror', error => this.errors.push(error.message)); };
    context.pages().forEach(record); context.on('page', record);
  }
  async finish() {
    const harnesses = [];
    for (const page of this.pages) if (!page.isClosed()) harnesses.push(await page.evaluate(() => ({ cloud: (window as any).companionCloudFixture?.snapshot(), producerCalls: (window as any).companionFixture?.snapshot().calls || [] })));
    await evidence(this.testInfo, 'simulated-cloud-network-boundary', { forbidden: this.forbidden, decorative: this.decorative, errors: this.errors, harnesses });
    expect(this.forbidden, 'No real cloud, provider, local worker, or live API is permitted').toEqual([]);
    expect(this.errors).toEqual([]);
    for (const item of harnesses) expect(item.producerCalls).toEqual([]);
  }
}
const test = base.extend<{ boundary: Boundary }>({
  boundary: [async ({ context, baseURL }, use, testInfo) => {
    const boundary = new Boundary(baseURL!, testInfo); await boundary.install(context);
    try { await use(boundary); } finally { await boundary.finish(); }
  }, { auto: true }],
});
const panel = (page: Page) => page.getByTestId('cloud-fixture-panel');
const status = (page: Page) => page.getByTestId('cloud-fixture-status');
const step = (page: Page, id: string) => page.getByTestId(`cloud-step-${id}`);
async function snapshot(page: Page): Promise<HarnessSnapshot> { return page.evaluate(() => (window as any).companionCloudFixture.snapshot()); }
async function harness(page: Page, name: string, ...args: unknown[]) { return page.evaluate(({ name, args }) => (window as any).companionCloudFixture[name](...args), { name, args }); }
async function advance(page: Page, requestId?: string, ticks = 1) { for (let index = 0; index < ticks; index++) await harness(page, 'advance', requestId); }
async function saved(page: Page) { await expect(page.locator('#companion-save-status')).toContainText(/saved on this device\./); }
async function openCloud(page: Page) {
  const button = page.getByRole('button', { name: 'Cloud fixture jobs', exact: true });
  if (!await button.isVisible()) await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
  await button.click(); await expect(panel(page)).toBeVisible();
}
async function confirmed(page: Page, width = 390, product = 'Cloud coffee', url = PREVIEW) {
  await page.setViewportSize({ width, height: width === 375 ? 667 : width === 390 ? 844 : 900 });
  await page.goto(url); await page.getByRole('button', { name: 'Reference brief', exact: true }).click();
  await page.getByLabel('// Product or service', { exact: true }).fill(product); await saved(page);
  await page.getByLabel('// Audience', { exact: true }).fill('Busy coffee drinkers'); await saved(page);
  await page.getByRole('button', { name: 'Prepare sample plan', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sample plan review', exact: true })).toBeVisible(); await saved(page);
  await page.getByLabel('// Direction', { exact: true }).fill(`Cloud direction for ${product}`); await saved(page);
  await page.getByRole('button', { name: 'Confirm sample plan', exact: true }).click();
  await expect(page.getByText(/Sample plan confirmed for revision/)).toBeVisible(); await saved(page);
}
async function refresh(page: Page) { await page.getByRole('button', { name: 'Refresh cloud jobs', exact: true }).click(); }
async function start(page: Page, scenario = 'normal') {
  await openCloud(page);
  await page.getByLabel('Cloud fixture scenario', { exact: true }).selectOption(scenario);
  await page.getByRole('button', { name: 'Start cloud fixture job', exact: true }).click();
  await expect(status(page)).toContainText(/running/i);
  return (await snapshot(page)).jobs[0];
}
async function book(page: Page, ownerId = OWNER): Promise<any> {
  return page.evaluate(async ownerId => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('grifon_companion', 1);
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    try { return await new Promise<any>((resolve, reject) => {
      const request = db.transaction('conversations', 'readonly').objectStore('conversations').get(ownerId);
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    }); } finally { db.close(); }
  }, ownerId);
}
async function selected(page: Page, requestId: string) {
  await page.getByRole('button', { name: `Open cloud fixture job: ${requestId}`, exact: true }).click();
  await expect(status(page)).toBeVisible();
}
async function noMedia(page: Page) {
  await expect(panel(page).getByText(/Actual spend: PHP 0.00/)).toBeVisible();
  await expect(page.locator('video')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /download.*video|download.*ad/i })).toHaveCount(0);
}
async function layout(page: Page, testInfo: TestInfo, name: string) {
  const metrics = await panel(page).evaluate(element => ({
    panel: { width: element.clientWidth, scrollWidth: element.scrollWidth },
    document: { width: innerWidth, scrollWidth: document.documentElement.scrollWidth },
    controls: Array.from(element.querySelectorAll<HTMLElement>('button, select, summary')).filter(control => control.getClientRects().length).map(control => ({ label: control.textContent?.trim(), width: control.getBoundingClientRect().width, height: control.getBoundingClientRect().height, font: getComputedStyle(control).fontSize })),
  }));
  await evidence(testInfo, name, metrics);
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
  expect(metrics.panel.scrollWidth).toBeLessThanOrEqual(metrics.panel.width + 1);
  expect(metrics.document.scrollWidth).toBeLessThanOrEqual(metrics.document.width);
  for (const control of metrics.controls) {
    expect(control.height, `${control.label} touch height`).toBeGreaterThanOrEqual(44);
    expect(control.width, `${control.label} touch width`).toBeGreaterThanOrEqual(44);
    expect(parseFloat(control.font), `${control.label} font`).toBeGreaterThanOrEqual(12);
  }
}

test('cloud fixture jobs are explicitly available without changing the default preview', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/companion-chat-preview.html');
  await expect(page.getByRole('button', { name: 'Cloud fixture jobs', exact: true })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as any).companionCloudFixture ?? null)).toBeNull();
  await page.goto(PREVIEW); await openCloud(page);
  await expect(panel(page).getByText('Cloud fixture simulation', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start cloud fixture job', exact: true })).toBeDisabled();
  expect((await snapshot(page)).calls.every(call => call.name === 'grifon_fixture_list')).toBe(true);
});

for (const width of [375, 390, 1280]) test(`confirmed cloud job keeps immutable plan, zero spend, and fits ${width}px`, async ({ page }, testInfo) => {
  await confirmed(page, width); const job = await start(page);
  const original = structuredClone(job.intent);
  expect(job.runtime).toBe('supabase-cloud-fixture-v1');
  const savedBook = await book(page);
  expect(job.intent.ownerChatId).toBe(savedBook.selectedId);
  expect(job.intent.plan.facts.find((fact: any) => fact.label === 'Product or service').value).toBe('Cloud coffee');
  expect(savedBook.chats[0].referenceFixtureJob).toBeUndefined();
  expect(savedBook.chats[0].referenceQueue).toBeUndefined();
  await layout(page, testInfo, `cloud-running-${width}`);
  await advance(page, job.intent.requestId, 8); await refresh(page);
  await expect(status(page)).toContainText(/complete/i); await noMedia(page);
  const completed = (await snapshot(page)).jobs[0];
  expect(completed.intent).toEqual(original); expect(completed.queue.id).toBe(job.queue.id);
  expect(completed.queue.steps.map((item: any) => item.attempts)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
  await page.getByText(/Approved cloud plan · revision/, { exact: false }).click();
  await expect(panel(page).locator('[aria-label="Cloud fixture job details"]').getByText('Cloud direction for Cloud coffee', { exact: true })).toBeVisible();
  await layout(page, testInfo, `cloud-complete-${width}`);
  expect((await snapshot(page)).calls.filter(call => call.name === 'grifon_fixture_start')).toHaveLength(1);
});

test('a fresh empty browser context recovers seeded cloud jobs without a local draft or a new start', async ({ page, browser, boundary }, testInfo) => {
  await confirmed(page); const job = await start(page); await advance(page, job.intent.requestId, 8);
  const serverJobs = (await snapshot(page)).jobs;
  const context = await browser.newContext({ baseURL: boundary.baseURL, viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await boundary.install(context);
  try {
    const recovered = await context.newPage(); await recovered.goto(PREVIEW); await saved(recovered);
    const emptyBook = await book(recovered); expect(emptyBook.chats[0].referenceReview).toBeUndefined();
    await harness(recovered, 'seed', serverJobs); await openCloud(recovered); await selected(recovered, job.intent.requestId);
    await expect(status(recovered)).toContainText(/complete/i); await noMedia(recovered);
    expect((await snapshot(recovered)).jobs[0].intent.ownerChatId).toBe(job.intent.ownerChatId);
    expect((await book(recovered)).selectedId).not.toBe(job.intent.ownerChatId);
    expect((await snapshot(recovered)).calls.filter(call => call.name === 'grifon_fixture_start')).toHaveLength(0);
    await evidence(testInfo, 'fresh-context-simulated-recovery', { simulated: true, originalJob: job, recovered: await snapshot(recovered), localBook: await book(recovered) });
  } finally { await context.close(); }
});

test('lost start acknowledgement and duplicate clicks reconcile one request through reads', async ({ page }) => {
  await confirmed(page); await openCloud(page); await harness(page, 'failNextStartAck');
  const button = page.getByRole('button', { name: 'Start cloud fixture job', exact: true });
  await button.evaluate((element: HTMLButtonElement) => { element.click(); element.click(); });
  await expect.poll(async () => (await snapshot(page)).jobs.length).toBe(1);
  await expect(status(page)).toContainText(/running/i);
  const original = (await snapshot(page)).jobs[0];
  await refresh(page); await selected(page, original.intent.requestId);
  await expect(status(page)).toContainText(/running/i);
  expect((await snapshot(page)).calls.filter(call => call.name === 'grifon_fixture_start')).toHaveLength(1);
  expect((await snapshot(page)).jobs[0].queue.id).toBe(original.queue.id);
});

test('a start rejected before acceptance can retry only the same frozen request after an explicit absent read', async ({ page }) => {
  await confirmed(page); await openCloud(page);
  const startButton = page.getByRole('button', { name: 'Start cloud fixture job', exact: true });
  await expect(startButton).toBeEnabled(); await harness(page, 'offline', true); await startButton.click();
  await expect(page.getByRole('alert')).toContainText(/offline|unreachable/i);
  expect((await snapshot(page)).jobs).toEqual([]);
  await expect(startButton).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Retry saved cloud request', exact: true })).toHaveCount(0);
  const failedCall = (await snapshot(page)).calls.find(call => call.name === 'grifon_fixture_start')!;
  await harness(page, 'offline', false); await refresh(page);
  const retry = page.getByRole('button', { name: 'Retry saved cloud request', exact: true });
  await expect(retry).toBeEnabled(); expect((await snapshot(page)).jobs).toEqual([]);
  await retry.click(); await expect(status(page)).toContainText(/running/i);
  const starts = (await snapshot(page)).calls.filter(call => call.name === 'grifon_fixture_start');
  expect(starts).toHaveLength(2); expect(starts[1].args).toEqual(failedCall.args);
  expect((await snapshot(page)).jobs).toHaveLength(1);
});

test('a held successful start acknowledgement cannot cross an account change', async ({ page }) => {
  await confirmed(page); await openCloud(page); await harness(page, 'holdNextStartAck');
  await page.getByRole('button', { name: 'Start cloud fixture job', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).jobs.length).toBe(1);
  const original = (await snapshot(page)).jobs[0];
  await harness(page, 'account', OTHER); await harness(page, 'releaseStartAck'); await openCloud(page);
  await expect(page.getByRole('button', { name: `Open cloud fixture job: ${original.intent.requestId}`, exact: true })).toHaveCount(0);
  await expect(status(page)).toHaveCount(0);
  expect((await book(page, OTHER)).chats[0].referenceReview).toBeUndefined();
  await harness(page, 'account', OWNER); await openCloud(page); await selected(page, original.intent.requestId);
  await expect(status(page)).toContainText(/running/i);
  expect((await snapshot(page)).calls.filter(call => call.name === 'grifon_fixture_start')).toHaveLength(1);
});

test('list and get reads do not advance or implicitly restart a running fixture', async ({ page }) => {
  await confirmed(page); const job = await start(page); const original = structuredClone(job);
  await refresh(page); await selected(page, job.intent.requestId); await refresh(page);
  await page.waitForTimeout(2_200);
  expect((await snapshot(page)).jobs[0]).toEqual(original);
  expect((await snapshot(page)).calls.filter(call => call.name === 'grifon_fixture_start')).toHaveLength(1);
});

test('retry restarts only failed clip two and preserves successful work and job identity', async ({ page }) => {
  await confirmed(page); const job = await start(page, 'second-clip-fails-once');
  await advance(page, job.intent.requestId, 2); await refresh(page);
  await expect(status(page)).toContainText(/failed/i);
  const failed = (await snapshot(page)).jobs[0]; expect(failed.queue.steps[0].status).toBe('succeeded'); expect(failed.queue.steps[1].status).toBe('failed');
  await expect(step(page, 'clip-1')).toContainText('Attempt 1');
  await page.getByRole('button', { name: 'Retry failed cloud step', exact: true }).click();
  await expect(status(page)).toContainText(/running/i);
  await advance(page, job.intent.requestId, 7); await refresh(page);
  await expect(status(page)).toContainText(/complete/i);
  const complete = (await snapshot(page)).jobs[0];
  expect(complete.queue.id).toBe(job.queue.id); expect(complete.intent).toEqual(job.intent);
  expect(complete.queue.steps[0]).toEqual(failed.queue.steps[0]);
  expect(complete.queue.steps.map((item: any) => item.attempts)).toEqual([1, 2, 1, 1, 1, 1, 1, 1]);
  expect((await snapshot(page)).calls.filter(call => call.name === 'grifon_fixture_start')).toHaveLength(1);
});

test('cancel stops the selected fixture and later ticks cannot revive it', async ({ page }) => {
  await confirmed(page); const job = await start(page);
  await page.getByRole('button', { name: 'Cancel cloud fixture job', exact: true }).click();
  await expect(status(page)).toContainText(/cancelled/i); const cancelled = (await snapshot(page)).jobs[0];
  await advance(page, job.intent.requestId, 8); await refresh(page);
  expect((await snapshot(page)).jobs[0].queue).toEqual(cancelled.queue);
  expect((await snapshot(page)).jobs[0].intent).toEqual(cancelled.intent);
  await expect(page.getByRole('button', { name: 'Retry failed cloud step', exact: true })).toHaveCount(0);
});

test('offline and command failures keep last confirmed status and visible errors until explicit refresh', async ({ page }) => {
  await confirmed(page); const job = await start(page); await harness(page, 'failNextCommand');
  await page.getByRole('button', { name: 'Cancel cloud fixture job', exact: true }).click();
  const alert = page.getByRole('alert'); await expect(alert).toContainText(/confirm|rejected/i);
  await advance(page, job.intent.requestId); await page.waitForTimeout(2_200);
  await expect(alert).toBeVisible(); await expect(status(page)).toContainText(/running/i);
  await harness(page, 'offline', true); await refresh(page);
  await expect(alert).toContainText(/offline|unreachable/i);
  await advance(page, job.intent.requestId, 8); await expect(status(page)).toContainText(/running/i);
  await harness(page, 'offline', false); await refresh(page);
  await expect(alert).toHaveCount(0); await expect(status(page)).toContainText(/complete/i);
  expect((await snapshot(page)).calls.filter(call => call.name === 'grifon_fixture_start')).toHaveLength(1);
});

test('another account cannot list or operate the first account jobs', async ({ page }) => {
  await confirmed(page); const job = await start(page);
  await harness(page, 'account', OTHER); await openCloud(page);
  await expect(page.getByRole('button', { name: `Open cloud fixture job: ${job.intent.requestId}`, exact: true })).toHaveCount(0);
  await expect(status(page)).toHaveCount(0);
  await harness(page, 'account', OWNER); await openCloud(page); await selected(page, job.intent.requestId);
  await expect(status(page)).toContainText(/running/i);
});

test('a malformed simulated server snapshot fails closed without progress or generation', async ({ page }) => {
  await confirmed(page); const job = await start(page);
  const bad = structuredClone(job); bad.queue.actualCents = 1;
  await harness(page, 'seed', [bad]); await refresh(page);
  await expect(page.getByRole('alert')).toContainText(/invalid|mismatch/i);
  await expect(status(page)).toContainText(/running/i);
  expect((await snapshot(page)).calls.filter(call => call.name === 'grifon_fixture_start')).toHaveLength(1);
});

test('an unconfirmed changed brief cannot start a cloud job or borrow the old confirmed plan', async ({ page }) => {
  await confirmed(page); await page.getByRole('button', { name: 'Edit brief', exact: true }).click();
  await page.getByLabel('// Product or service', { exact: true }).fill('A different product'); await saved(page);
  await openCloud(page);
  await expect(page.getByRole('button', { name: 'Start cloud fixture job', exact: true })).toBeDisabled();
  expect((await snapshot(page)).calls.filter(call => call.name === 'grifon_fixture_start')).toHaveLength(0);
});

test('an existing device-local queue is never submitted as a cloud job', async ({ page }) => {
  await confirmed(page, 390, 'Local coffee', '/companion-chat-preview.html');
  await page.getByRole('button', { name: 'Preview demo queue', exact: true }).click();
  await page.getByRole('button', { name: 'Prepare demo queue', exact: true }).click(); await saved(page);
  await page.getByRole('button', { name: 'Start demo queue', exact: true }).click(); await saved(page);
  const local = (await book(page)).chats[0].referenceQueue; expect(local).toBeTruthy();
  await page.goto(PREVIEW); await openCloud(page);
  expect((await snapshot(page)).jobs).toEqual([]);
  expect((await snapshot(page)).calls.filter(call => call.name === 'grifon_fixture_start')).toHaveLength(0);
  expect((await book(page)).chats[0].referenceQueue.id).toBe(local.id);
});

test('cloud navigation is keyboard reachable and warning and step icons fit the mobile panel', async ({ page }, testInfo) => {
  await confirmed(page, 375); await openCloud(page);
  const scroller = panel(page).locator('.companion-sidebar-scroll');
  await scroller.evaluate(element => { element.scrollTop = 0; });
  await page.screenshot({ path: testInfo.outputPath('brand-ready-375.png') });
  await page.getByRole('heading', { name: 'Cloud fixture jobs', exact: true }).screenshot({ path: testInfo.outputPath('brand-heading-icon.png') });
  const back = page.getByRole('button', { name: 'Back to chat', exact: true });
  await back.focus(); await back.press('Tab');
  await expect(page.getByRole('button', { name: 'Open conversations', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('navigation', { name: 'Conversations', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: 'Conversations', exact: true })).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Open conversations', exact: true })).toBeFocused();
  await page.getByLabel('Cloud fixture scenario', { exact: true }).selectOption('second-clip-fails-once');
  await page.getByRole('button', { name: 'Start cloud fixture job', exact: true }).click();
  await expect(status(page)).toContainText(/running/i);
  const job = (await snapshot(page)).jobs[0];
  await panel(page).getByText('A cloud job for this original chat is still active.', { exact: false }).locator('..').screenshot({ path: testInfo.outputPath('brand-warning-icon.png') });
  await advance(page, job.intent.requestId, 2); await refresh(page); await expect(status(page)).toContainText(/failed/i);
  await step(page, 'clip-2').screenshot({ path: testInfo.outputPath('brand-failed-step-icon.png') });
  await page.getByRole('button', { name: 'Back to chat', exact: true }).screenshot({ path: testInfo.outputPath('brand-back-icon.png') });
  await page.setViewportSize({ width: 1280, height: 900 }); await scroller.evaluate(element => { element.scrollTop = 0; });
  await page.screenshot({ path: testInfo.outputPath('brand-ready-1280.png') });
  await layout(page, testInfo, 'brand-failed-1280');
});

import { test as base, expect, type Browser, type BrowserContext, type Page, type Route, type TestInfo } from '@playwright/test';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

// Shared simulated HTTP RPC/object store, owned by the test process rather than any browser.
// Native client decoding remains active. No provider, real cloud/auth or worker request is allowed.
const PREVIEW = '/companion-chat-preview.html?workflow=1';
const REFERENCES = '/__fixture-cloud-references';
const JOBS = '/__fixture-cloud-workflow';
const OWNER = 'fixture-user-a', OTHER = 'fixture-user-b';
const photoBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aEocAAAAASUVORK5CYII=', 'base64');
const videoBytes = readFileSync('tests/e2e/fixtures/recovery.webm');
const hash = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
type Receipt = { runtime: string; ownerId: string; saveId: string; sourceChatId: string; manifestText: string; createdAt: number; committed: boolean };
type StoredMedia = { bytes: Buffer; type: string };
type Call = { ownerId: string; method: string; name: string; path?: string; args?: Record<string, any> };
type ServerJob = { runtime: string; intentText: string; queue: any; updatedAt: number; nextDueAt: null };

class SharedWorkflow {
  receipts = new Map<string, Receipt>(); objects = new Map<string, StoredMedia>(); jobs = new Map<string, ServerJob>();
  calls: Call[] = []; forbidden: string[] = []; errors: string[] = []; pages: Page[] = []; contexts: BrowserContext[] = [];
  loseCommitAck = false; loseStartAck = false; offline = false; rejectStart = false;
  unknownJobs = new Set<string>();
  held = false; private heldName = ''; private releaseHeld: (() => void) | undefined;
  constructor(readonly baseURL: string, readonly testInfo: TestInfo) {}
  key(ownerId: string, saveId: string) { return `${ownerId}:${saveId}`; }
  committed(ownerId = OWNER) { return [...this.receipts.values()].filter(receipt => receipt.ownerId === ownerId && receipt.committed); }
  startCalls() { return this.calls.filter(call => call.name === 'grifon_fixture_start'); }
  holdNext(name: string) { this.heldName = name; this.held = false; }
  release() { this.releaseHeld?.(); this.releaseHeld = undefined; }
  // Deliberate worker events. Reads and browser-open events never mutate progress.
  tick(requestId: string, count = 1) {
    for (let index = 0; index < count; index++) {
      const job = this.jobs.get(requestId)!;
      if (job.queue.status !== 'running' || job.queue.invalidated) continue;
      const intent = JSON.parse(job.intentText), queue = structuredClone(job.queue);
      const running = queue.steps.findIndex((step: any) => step.status === 'running');
      if (running < 0) throw new Error('Fixture worker has no running step.');
      const step = queue.steps[running];
      const fails = intent.scenario === 'second-clip-fails-once' && step.id === 'clip-2' && step.attempts === 1;
      step.status = fails ? 'failed' : 'succeeded'; queue.revision++;
      if (fails) queue.status = 'failed';
      else if (running === queue.steps.length - 1) queue.status = 'complete';
      else { queue.steps[running + 1].status = 'running'; queue.steps[running + 1].attempts = 1; }
      this.jobs.set(requestId, { ...job, queue, updatedAt: job.updatedAt + 5000 });
    }
  }
  async route(route: Route) {
    const request = route.request(), url = new URL(request.url());
    if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.abort();
    if (url.origin !== new URL(this.baseURL).origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/__companion-fixture-jobs')) {
      this.forbidden.push(`${request.method()} ${url.origin}${url.pathname}`); return route.abort();
    }
    if (!url.pathname.startsWith(REFERENCES + '/') && !url.pathname.startsWith(JOBS + '/')) return route.continue();
    const ownerId = request.headers()['x-fixture-owner'];
    if (![OWNER, OTHER].includes(ownerId)) return route.fulfill({ status: 403, body: 'Invalid fixture owner' });
    const json = (value: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(value) });
    if (this.offline) return route.abort('failed');
    if (url.pathname.startsWith(REFERENCES + '/storage/')) {
      const path = decodeURIComponent(url.pathname.slice((REFERENCES + '/storage/').length));
      this.calls.push({ ownerId, method: request.method(), name: 'storage', path });
      if (!path.startsWith(ownerId + '/')) return route.fulfill({ status: 403, body: 'Fixture path owner mismatch' });
      if (request.method() === 'PUT') {
        if (this.objects.has(path)) return route.fulfill({ status: 409, body: 'Object already exists' });
        this.objects.set(path, { bytes: request.postDataBuffer()!, type: request.headers()['content-type'] });
        return route.fulfill({ status: 201, body: '' });
      }
      const object = this.objects.get(path);
      return object ? route.fulfill({ body: object.bytes, contentType: object.type }) : route.fulfill({ status: 404, body: 'Missing fixture media' });
    }
    const root = url.pathname.startsWith(REFERENCES) ? REFERENCES : JOBS;
    const name = decodeURIComponent(url.pathname.slice((root + '/rpc/').length));
    const args = request.postDataJSON() as Record<string, any>;
    this.calls.push({ ownerId, method: request.method(), name, args });
    const held = this.heldName === name;
    if (held) { this.heldName = ''; this.held = true; }
    const respond = async (value: unknown) => { if (held) await new Promise<void>(resolve => { this.releaseHeld = resolve; }); return json(value); };
    if (root === REFERENCES) {
      const key = this.key(ownerId, args.p_save_id), existing = this.receipts.get(key);
      if (name === 'grifon_reference_reserve') {
        const identity = JSON.stringify([ownerId, args.p_source_chat_id, args.p_manifest_text]);
        if (args.p_identity_text !== identity || args.p_save_id !== hash(identity)) return respond({ data: null, error: { code: '22023' } });
        const receipt = existing ?? { runtime: 'supabase-cloud-reference-v1', ownerId, saveId: args.p_save_id, sourceChatId: args.p_source_chat_id, manifestText: args.p_manifest_text, createdAt: 1_792_015_200_000 + this.receipts.size, committed: false };
        this.receipts.set(key, receipt); return respond({ data: receipt, error: null });
      }
      if (name === 'grifon_reference_commit') {
        if (!existing) return respond({ data: null, error: { code: '42501' } });
        const media = JSON.parse(existing.manifestText).media as { slot: string; type: string; size: number }[];
        if (media.some(entry => { const stored = this.objects.get(`${ownerId}/${existing.saveId}/${entry.slot}`); return !stored || stored.type !== entry.type || stored.bytes.length !== entry.size; })) return respond({ data: null, error: { code: '22023' } });
        const receipt = { ...existing, committed: true }; this.receipts.set(key, receipt);
        if (this.loseCommitAck) { this.loseCommitAck = false; return route.abort('failed'); }
        return respond({ data: receipt, error: null });
      }
      if (name === 'grifon_reference_get') return respond({ data: existing?.committed ? existing : null, error: null });
      if (name === 'grifon_reference_list') return respond({ data: this.committed(ownerId), error: null });
    } else {
      if (name === 'grifon_fixture_list') return respond({ data: [...this.jobs.entries()].filter(([id, job]) => !this.unknownJobs.has(id) && JSON.parse(job.intentText).ownerId === ownerId).map(([, job]) => job), error: null });
      if (name === 'grifon_fixture_start') {
        if (this.rejectStart) { this.rejectStart = false; return respond({ data: null, error: { code: '22023' } }); }
        const intent = JSON.parse(args.p_intent_text), link = intent.cloudReference;
        const identity = JSON.stringify(link ? [ownerId, intent.ownerChatId, intent.plan.confirmation.planSnapshot, link.saveId] : [ownerId, intent.ownerChatId, intent.plan.confirmation.planSnapshot]);
        const saved = link ? this.receipts.get(this.key(ownerId, link.saveId)) : null;
        if (intent.ownerId !== ownerId || args.p_identity_text !== identity || intent.requestId !== hash(identity)
          || (link && (!saved?.committed || JSON.parse(saved.manifestText).inputHash !== link.inputHash || intent.plan.inputHash !== link.inputHash))) return respond({ data: null, error: { code: '22023' } });
        let job = this.jobs.get(intent.requestId);
        if (job && job.intentText !== args.p_intent_text) return respond({ data: null, error: { code: '23505' } });
        if (!job) {
          if ([...this.jobs.values()].some(other => { const value = JSON.parse(other.intentText); return value.ownerId === ownerId && value.ownerChatId === intent.ownerChatId && !other.queue.invalidated && !['complete', 'cancelled'].includes(other.queue.status); })) return respond({ data: null, error: { code: '23505' } });
          const kinds = [...intent.plan.scenes.map((_: any, index: number) => ({ id: `clip-${index + 1}`, kind: 'clip' })), ...(intent.plan.speechMode === 'spoken' ? [{ id: 'voice', kind: 'voice' }] : []), ...['music', 'sfx', 'assembly', 'quality'].map(kind => ({ id: kind, kind }))];
          job = { runtime: 'supabase-cloud-fixture-v1', intentText: args.p_intent_text, queue: { version: 1, fixture: true, id: randomUUID(), revision: 2, status: 'running', invalidated: false, scenario: intent.scenario, steps: kinds.map((step, index) => ({ ...step, status: index ? 'queued' : 'running', attempts: index ? 0 : 1 })), actualCents: 0 }, updatedAt: 1_792_015_300_000, nextDueAt: null };
          this.jobs.set(intent.requestId, job);
        }
        if (this.loseStartAck) { this.loseStartAck = false; return route.abort('failed'); }
        return respond({ data: job, error: null });
      }
      const job = this.jobs.get(args.p_request_id);
      if (!job || JSON.parse(job.intentText).ownerId !== ownerId) return respond({ data: null, error: null });
      if (name === 'grifon_fixture_get') return respond(this.unknownJobs.has(args.p_request_id) ? { data: null, error: { code: '503' } } : { data: job, error: null });
      if (name === 'grifon_fixture_command') {
        const queue = structuredClone(job.queue);
        if (args.p_action === 'retry') {
          if (args.p_expected_revision !== queue.revision) return respond({ data: null, error: { code: '40001' } });
          const failed = queue.steps.find((step: any) => step.status === 'failed');
          if (queue.status === 'failed' && failed) { failed.status = 'running'; failed.attempts++; queue.status = 'running'; queue.revision++; }
        } else if (args.p_action === 'cancel' && !['complete', 'cancelled'].includes(queue.status)) { queue.status = 'cancelled'; queue.revision++; }
        else if (args.p_action === 'invalidate' && !queue.invalidated) { queue.invalidated = true; queue.revision++; }
        const next = { ...job, queue, updatedAt: job.updatedAt + 1 }; this.jobs.set(args.p_request_id, next);
        return respond({ data: next, error: null });
      }
    }
    return respond({ data: null, error: { code: 'PGRST202' } });
  }
  async install(context: BrowserContext) {
    this.contexts.push(context); await context.route('**/*', route => this.route(route));
    await context.addInitScript(() => { if (location.protocol === 'http:' || location.protocol === 'https:') (window as any).fixtureInitialDatabases = indexedDB.databases().then(databases => databases.map(database => database.name)); });
    const record = (page: Page) => { this.pages.push(page); page.on('pageerror', error => this.errors.push(error.message)); };
    context.pages().forEach(record); context.on('page', record);
  }
  async device(browser: Browser, width = 390) {
    const context = await browser.newContext({ baseURL: this.baseURL, viewport: { width, height: width === 1280 ? 900 : width === 375 ? 667 : 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
    await this.install(context); const page = await context.newPage(); await page.goto(PREVIEW);
    await expect(page.getByRole('button', { name: 'Reference brief', exact: true })).toBeVisible();
    expect(await page.evaluate(() => (window as any).fixtureInitialDatabases)).toEqual([]); return page;
  }
  async finish() {
    this.release();
    const clients = [];
    for (const page of this.pages) if (!page.isClosed()) clients.push(await page.evaluate(() => ({ providerCalls: (window as any).companionFixture?.snapshot().calls ?? [], pageMemoryJobCalls: (window as any).companionCloudFixture?.snapshot().calls ?? [] })));
    const path = this.testInfo.outputPath('shared-workflow-boundary.json');
    writeFileSync(path, JSON.stringify({ simulated: true, runtime: 'shared HTTP fixture backend; native production client decoder', forbidden: this.forbidden, errors: this.errors, calls: this.calls, receipts: [...this.receipts.values()], objects: [...this.objects].map(([path, media]) => ({ path, type: media.type, size: media.bytes.length, sha256: hash(media.bytes) })), jobs: [...this.jobs.values()], clients }, null, 2));
    await this.testInfo.attach('shared-workflow-boundary', { path, contentType: 'application/json' });
    expect(this.forbidden).toEqual([]); expect(this.errors).toEqual([]);
    for (const client of clients) { expect(client.providerCalls).toEqual([]); expect(client.pageMemoryJobCalls).toEqual([]); }
  }
}
const test = base.extend<{ cloud: SharedWorkflow }>({
  cloud: [async ({ context, baseURL }, use, testInfo) => {
    const cloud = new SharedWorkflow(baseURL!, testInfo); await cloud.install(context);
    try { await use(cloud); } finally { try { await cloud.finish(); } finally { for (const extra of cloud.contexts.slice(1)) await extra.close(); } }
  }, { auto: true }],
});
const panel = (page: Page) => page.getByTestId('cloud-fixture-panel');
const status = (page: Page) => page.getByTestId('cloud-fixture-status');
async function saved(page: Page) { await expect(page.locator('#companion-save-status')).toContainText(/saved on this device\./); }
async function reference(page: Page, count = 5, title = 'Workflow coffee', preview = PREVIEW) {
  await page.goto(preview); await page.getByRole('button', { name: 'Reference brief', exact: true }).click();
  await page.getByLabel('// Brief', { exact: true }).fill('Coffee for parents. Keep the packaging unchanged.');
  await page.getByLabel('// Product or service', { exact: true }).fill(title);
  await page.getByLabel('// Audience', { exact: true }).fill('Busy coffee drinkers');
  await page.getByLabel('// Reference language (optional)').fill('Japanese');
  await page.getByLabel('Output language', { exact: true }).selectOption('English');
  await page.getByLabel('Reference adaptation', { exact: true }).selectOption('close');
  await page.getByLabel('Reference video', { exact: true }).setInputFiles({ name: 'reference.webm', mimeType: 'video/webm', buffer: videoBytes });
  await expect(page.getByLabel('Reference video preview')).toBeVisible();
  if (count) {
    await page.getByLabel('Add photos', { exact: true }).setInputFiles(Array.from({ length: count }, (_, index) => ({ name: `photo-${index}.png`, mimeType: 'image/png', buffer: photoBytes })));
    await expect(page.getByRole('img', { name: /^photo-/ })).toHaveCount(count);
    await page.getByLabel('Role for photo-0.png').selectOption('character');
    if (count > 1) await page.getByLabel('Role for photo-1.png').selectOption('clothing');
  }
  await page.getByLabel('Saved voice', { exact: true }).selectOption('private:fixture-private'); await saved(page);
}
async function prepare(page: Page, cloud: SharedWorkflow) {
  await page.getByRole('button', { name: /^(Prepare sample plan|Prepare updated sample plan)$/ }).click();
  await expect(page.getByRole('heading', { name: 'Sample plan review', exact: true })).toBeVisible(); await saved(page);
  expect(cloud.committed().length, 'Preparing review must first commit a cloud snapshot').toBeGreaterThan(0);
}
async function confirm(page: Page) {
  await page.getByLabel('// Direction', { exact: true }).fill('Keep the Japanese reference pacing; introduce coffee, detail, then CTA.'); await saved(page);
  await page.getByRole('button', { name: 'Confirm sample plan', exact: true }).click();
  await expect(page.getByText(/Sample plan confirmed for revision/)).toBeVisible(); await saved(page);
}
async function openCloud(page: Page) {
  const button = page.getByRole('button', { name: 'Cloud fixture jobs', exact: true });
  if (!await button.isVisible()) await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
  await button.click(); await expect(panel(page)).toBeVisible();
}
async function start(page: Page, cloud: SharedWorkflow, scenario = 'normal') {
  await page.getByRole('button', { name: 'Open cloud fixture job', exact: true }).click(); await expect(panel(page)).toBeVisible();
  await page.getByLabel('Cloud fixture scenario', { exact: true }).selectOption(scenario);
  await page.getByRole('button', { name: 'Start cloud fixture job', exact: true }).click();
  await expect(status(page)).toContainText(/running/i);
  expect(cloud.jobs.size).toBe(1); return [...cloud.jobs.values()][0];
}
async function book(page: Page, ownerId = OWNER): Promise<any> {
  return page.evaluate(async ownerId => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('grifon_companion', 1); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    try {
      const value: any = await new Promise((resolve, reject) => { const request = db.transaction('conversations', 'readonly').objectStore('conversations').get(ownerId); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      const media = async (item: any) => { if (!item) return item; const { blob, ...metadata } = item; const bytes = new Uint8Array(await blob.arrayBuffer()); const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(byte => byte.toString(16).padStart(2, '0')).join(''); return { ...metadata, type: blob.type, size: blob.size, sha256: digest, bytes: Array.from(bytes) }; };
      return { ...value, chats: await Promise.all(value.chats.map(async (chat: any) => ({ ...chat, ...(chat.referenceDraft ? { referenceDraft: { ...chat.referenceDraft, referenceVideo: await media(chat.referenceDraft.referenceVideo), photos: await Promise.all(chat.referenceDraft.photos.map(media)) } } : {}) }))) };
    } finally { db.close(); }
  }, ownerId);
}
const selectedChat = (value: any) => value.chats.find((chat: any) => chat.id === value.selectedId);
async function refresh(page: Page) { await page.getByRole('button', { name: 'Refresh cloud jobs', exact: true }).click(); }
async function selectJob(page: Page, requestId: string) { await page.getByRole('button', { name: `Open cloud fixture job: ${requestId}`, exact: true }).click(); await expect(status(page)).toBeVisible(); }
async function account(page: Page, ownerId: string) { await page.evaluate(id => (window as any).companionCloudFixture.account(id), ownerId); }
async function layout(page: Page, testInfo: TestInfo, name: string) {
  const metrics = await panel(page).evaluate(element => ({ document: { width: innerWidth, scrollWidth: document.documentElement.scrollWidth }, panel: { width: element.clientWidth, scrollWidth: element.scrollWidth }, controls: Array.from(element.querySelectorAll<HTMLElement>('button,select,summary')).filter(item => item.getClientRects().length).map(item => ({ label: item.textContent?.trim(), width: item.getBoundingClientRect().width, height: item.getBoundingClientRect().height, font: getComputedStyle(item).fontSize })) }));
  expect(metrics.document.scrollWidth).toBeLessThanOrEqual(metrics.document.width); expect(metrics.panel.scrollWidth).toBeLessThanOrEqual(metrics.panel.width + 1);
  for (const item of metrics.controls) { expect(item.height, item.label).toBeGreaterThanOrEqual(44); expect(item.width, item.label).toBeGreaterThanOrEqual(44); expect(parseFloat(item.font), item.label).toBeGreaterThanOrEqual(12); }
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true }); const path = testInfo.outputPath(`${name}.json`); writeFileSync(path, JSON.stringify(metrics, null, 2)); await testInfo.attach(name, { path, contentType: 'application/json' });
}

test('preparing review commits exact cloud inputs before confirmation and job dispatch', async ({ page, cloud }) => {
  await reference(page); const original = selectedChat(await book(page)); await prepare(page, cloud);
  expect(cloud.committed()).toHaveLength(1); expect(cloud.objects.size).toBe(6); expect(cloud.startCalls()).toEqual([]);
  const receipt = cloud.committed()[0], manifest = JSON.parse(receipt.manifestText), prepared = selectedChat(await book(page));
  expect(receipt.sourceChatId).toBe(original.id); expect(manifest.draft.voice).toEqual({ id: 'fixture-private', name: 'Fixture private voice', source: 'private' });
  expect(manifest.draft.photos.map((item: any) => [item.name, item.role])).toEqual([['photo-0.png', 'character'], ['photo-1.png', 'clothing'], ['photo-2.png', 'product'], ['photo-3.png', 'product'], ['photo-4.png', 'product']]);
  expect(prepared.referenceReview.confirmation).toBeNull(); expect(prepared.referenceReview.inputHash).toBe(manifest.inputHash);
  expect(prepared.referenceCloudSource).toEqual({ version: 1, saveId: receipt.saveId, inputHash: manifest.inputHash });
});

test('a manually saved cloud brief reuses the same snapshot when preparing its review', async ({ page, cloud }) => {
  await reference(page, 1);
  await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
  await page.getByRole('button', { name: 'Cloud reference briefs', exact: true }).click();
  await page.getByRole('button', { name: 'Save this brief to cloud', exact: true }).click();
  await expect(page.getByText('Cloud save confirmed. This private snapshot can be opened on another device.', { exact: true })).toBeVisible();
  const receipt = cloud.committed()[0], puts = cloud.calls.filter(call => call.name === 'storage' && call.method === 'PUT').length;
  await page.getByRole('button', { name: 'Back to chat', exact: true }).click(); await prepare(page, cloud);
  expect(cloud.committed()).toHaveLength(1); expect(cloud.committed()[0]).toEqual(receipt);
  expect(cloud.calls.filter(call => call.name === 'storage' && call.method === 'PUT')).toHaveLength(puts);
  expect(selectedChat(await book(page)).referenceCloudSource.saveId).toBe(receipt.saveId); expect(cloud.startCalls()).toEqual([]);
});

test('review saved-status copy follows the verified current snapshot instead of cloud service availability', async ({ page, cloud }, testInfo) => {
  await reference(page, 1, 'Originally local coffee', '/companion-chat-preview.html');
  await page.getByRole('button', { name: 'Prepare sample plan', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sample plan review', exact: true })).toBeVisible(); await saved(page); await confirm(page);
  expect(cloud.committed()).toEqual([]);
  await page.goto(PREVIEW); await expect(page.getByRole('heading', { name: 'Sample plan review', exact: true })).toBeVisible(); await saved(page);
  expect(selectedChat(await book(page)).referenceCloudSource).toBeUndefined();
  await expect(page.getByText(/^These inputs are saved privately in cloud storage\./)).toHaveCount(0);
  await expect(page.getByText(/^These current inputs are not confirmed in cloud storage\./)).toBeVisible();
  await page.getByText(/^These current inputs are not confirmed in cloud storage\./).scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('review-local-only-390.png'), fullPage: true });
  await openCloud(page); await expect(page.getByRole('button', { name: 'Start cloud fixture job', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Back to chat', exact: true }).click(); await page.getByRole('button', { name: 'Edit brief', exact: true }).click();
  await prepare(page, cloud); await expect(page.getByText(/^These inputs are saved privately in cloud storage\./)).toBeVisible();
  const prepared = selectedChat(await book(page)); expect(prepared.referenceCloudSource.inputHash).toBe(prepared.referenceReview.inputHash);
  await confirm(page); await page.getByRole('button', { name: 'Edit brief', exact: true }).click();
  await page.getByLabel('// Product or service', { exact: true }).fill('A changed local product'); await saved(page);
  await page.getByRole('button', { name: 'View previous sample plan', exact: true }).click();
  await expect(page.getByText(/^These inputs are saved privately in cloud storage\./)).toHaveCount(0);
  await expect(page.getByText(/^These current inputs are not confirmed in cloud storage\./)).toBeVisible();
  await page.getByText(/^These current inputs are not confirmed in cloud storage\./).scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('review-changed-unsaved-390.png'), fullPage: true });
  const changed = selectedChat(await book(page)); expect(changed.referenceCloudSource).toBeUndefined(); expect(changed.referenceReview.confirmation).toBeNull(); expect(changed.referenceReview.stale).toBe(true);
  await openCloud(page); await expect(page.getByRole('button', { name: 'Start cloud fixture job', exact: true })).toBeDisabled(); expect(cloud.startCalls()).toEqual([]);
});

for (const width of [390, 375, 1280]) test(`linked job restores exact inputs and unconfirmed review after all browsers close at ${width}px`, async ({ page, browser, cloud }, testInfo) => {
  await page.setViewportSize({ width, height: width === 1280 ? 900 : width === 375 ? 667 : 844 });
  await reference(page); await prepare(page, cloud); await confirm(page);
  const originalChat = selectedChat(await book(page)), job = await start(page, cloud), intent = JSON.parse(job.intentText);
  const receipt = cloud.committed()[0], manifest = JSON.parse(receipt.manifestText);
  expect(intent.cloudReference).toEqual({ version: 1, saveId: receipt.saveId, inputHash: manifest.inputHash });
  expect(intent.plan.voice).toEqual({ id: 'fixture-private', name: 'Fixture private voice', source: 'private' });
  expect(intent.plan).toEqual(originalChat.referenceReview); expect(intent.ownerChatId).toBe(originalChat.id);
  expect(intent.requestId).toBe(hash(JSON.stringify([OWNER, originalChat.id, intent.plan.confirmation.planSnapshot, receipt.saveId])));
  await layout(page, testInfo, `linked-running-${width}`);
  await page.context().close();
  // No browser exists during these explicit server-side worker events.
  cloud.tick(intent.requestId, 2); expect(cloud.jobs.get(intent.requestId)!.queue.revision).toBe(4);
  const recovered = await cloud.device(browser, width); await openCloud(recovered); await selectJob(recovered, intent.requestId);
  const beforeOpen = structuredClone(cloud.jobs.get(intent.requestId));
  await expect(status(recovered)).toContainText(/running/i); await refresh(recovered);
  expect(cloud.jobs.get(intent.requestId)).toEqual(beforeOpen); expect(cloud.startCalls()).toHaveLength(1);
  await recovered.getByRole('button', { name: 'Open saved inputs/review in chat', exact: true }).click();
  await expect(recovered.getByRole('heading', { name: 'Sample plan review', exact: true })).toBeVisible(); await saved(recovered);
  const localCopy = selectedChat(await book(recovered));
  expect(localCopy.id).not.toBe(originalChat.id); expect(localCopy.referenceDraft).toEqual(originalChat.referenceDraft);
  expect(localCopy.referenceReview.confirmation).toBeNull(); expect(localCopy.referenceReview.stale).toBe(false);
  for (const key of ['direction', 'scenes', 'quote', 'facts', 'voice', 'inputHash']) expect(localCopy.referenceReview[key]).toEqual(intent.plan[key]);
  expect(localCopy.referenceCloudSource).toEqual(intent.cloudReference);
  expect(localCopy.referenceCloudJob).toBeUndefined(); expect(localCopy.referenceFixtureJob).toBeUndefined(); expect(localCopy.referenceQueue).toBeUndefined();
  expect(cloud.jobs.get(intent.requestId)).toEqual(beforeOpen); expect(cloud.startCalls()).toHaveLength(1);
  await recovered.screenshot({ path: testInfo.outputPath(`restored-review-${width}.png`), fullPage: true });
  await recovered.getByRole('button', { name: 'Confirm sample plan', exact: true }).scrollIntoViewIfNeeded();
  await recovered.screenshot({ path: testInfo.outputPath(`restored-review-confirm-${width}.png`), fullPage: true });
  await recovered.getByRole('button', { name: 'Confirm sample plan', exact: true }).screenshot({ path: testInfo.outputPath(`restored-review-confirm-${width}-200-percent.png`) });
  await recovered.getByRole('button', { name: 'Edit brief', exact: true }).click();
  await expect(recovered.getByLabel('Reference video preview')).toBeVisible(); await expect(recovered.getByRole('img', { name: /^photo-/ })).toHaveCount(5);
  await expect(recovered.getByLabel('Saved voice', { exact: true })).toHaveValue('private:fixture-private');
  await recovered.screenshot({ path: testInfo.outputPath(`restored-inputs-${width}.png`), fullPage: true });
  await recovered.getByLabel('Reference video preview').scrollIntoViewIfNeeded();
  await recovered.screenshot({ path: testInfo.outputPath(`restored-video-${width}.png`), fullPage: true });
  await recovered.getByLabel('Role for photo-0.png').scrollIntoViewIfNeeded();
  await recovered.screenshot({ path: testInfo.outputPath(`restored-photo-roles-${width}.png`), fullPage: true });
  await recovered.getByLabel('Saved voice', { exact: true }).scrollIntoViewIfNeeded();
  await recovered.screenshot({ path: testInfo.outputPath(`restored-voice-${width}.png`), fullPage: true });
  await recovered.getByLabel('Saved voice', { exact: true }).screenshot({ path: testInfo.outputPath(`restored-voice-${width}-200-percent.png`) });
  const committedBeforePrepare = cloud.committed().length, uploadsBeforePrepare = cloud.calls.filter(call => call.name === 'storage' && call.method === 'PUT').length;
  await prepare(recovered, cloud);
  expect(selectedChat(await book(recovered)).referenceCloudSource).toEqual(intent.cloudReference);
  expect(cloud.committed()).toHaveLength(committedBeforePrepare);
  expect(cloud.calls.filter(call => call.name === 'storage' && call.method === 'PUT')).toHaveLength(uploadsBeforePrepare);
  await openCloud(recovered); await selectJob(recovered, intent.requestId);
  cloud.tick(intent.requestId, 6); await refresh(recovered); await expect(status(recovered)).toContainText(/complete/i);
  expect(cloud.jobs.get(intent.requestId)!.intentText).toBe(job.intentText);
  expect(cloud.jobs.get(intent.requestId)!.queue.steps.map((step: any) => step.attempts)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
  await expect(panel(recovered).getByText(/Actual spend: PHP 0.00/)).toBeVisible();
  await expect(recovered.locator('video')).toHaveCount(0); await expect(recovered.getByRole('link', { name: /download.*video|download.*ad/i })).toHaveCount(0);
  await layout(recovered, testInfo, `linked-complete-${width}`);
  await recovered.getByRole('button', { name: 'Open saved inputs/review in chat', exact: true }).scrollIntoViewIfNeeded();
  await recovered.screenshot({ path: testInfo.outputPath(`linked-reopen-control-${width}.png`), fullPage: true });
  await recovered.getByRole('button', { name: 'Open saved inputs/review in chat', exact: true }).screenshot({ path: testInfo.outputPath(`linked-reopen-control-${width}-200-percent.png`) });
  if (width === 375) {
    await recovered.getByText('Fixture details', { exact: true }).click();
    await recovered.screenshot({ path: testInfo.outputPath('linked-diagnostics-expanded-375.png'), fullPage: true });
  }
});

test('lost commit acknowledgement reconciles the same snapshot before review and reuses it after reload', async ({ page, cloud }) => {
  await reference(page, 1); cloud.loseCommitAck = true;
  await page.getByRole('button', { name: 'Prepare sample plan', exact: true }).click();
  await expect.poll(() => cloud.committed().length).toBe(1);
  const receipt = cloud.committed()[0];
  await expect(page.getByRole('heading', { name: 'Sample plan review', exact: true })).toBeVisible(); await saved(page);
  expect(selectedChat(await book(page)).referenceCloudSource.saveId).toBe(receipt.saveId);
  await page.reload(); await page.getByRole('button', { name: 'Edit brief', exact: true }).click();
  await prepare(page, cloud); expect(cloud.committed()).toHaveLength(1); expect(cloud.committed()[0]).toEqual(receipt);
  expect(cloud.objects.size).toBe(2); expect(cloud.startCalls()).toEqual([]);
});

test('lost start acknowledgement survives reload as the exact frozen request', async ({ page, cloud }) => {
  await reference(page, 1); await prepare(page, cloud); await confirm(page);
  await page.getByRole('button', { name: 'Open cloud fixture job', exact: true }).click();
  cloud.loseStartAck = true; cloud.holdNext('grifon_fixture_get');
  await page.getByRole('button', { name: 'Start cloud fixture job', exact: true }).click();
  await expect.poll(() => cloud.jobs.size).toBe(1); await expect.poll(() => cloud.held).toBe(true);
  const original = structuredClone([...cloud.jobs.values()][0]), intent = JSON.parse(original.intentText);
  await page.reload(); cloud.release(); await openCloud(page); await selectJob(page, intent.requestId);
  await expect(status(page)).toContainText(/running/i); expect(cloud.jobs.size).toBe(1); expect(cloud.startCalls()).toHaveLength(1);
  expect([...cloud.jobs.values()][0]).toEqual(original);
  const source = (await book(page)).chats.find((chat: any) => chat.id === intent.ownerChatId);
  expect(source.referenceCloudJob).toEqual(intent);
});

test('selecting an older terminal job cannot clear a newer unknown start acknowledgement', async ({ page, cloud }) => {
  await reference(page, 1); await prepare(page, cloud); await confirm(page);
  const first = await start(page, cloud), oldIntent = JSON.parse(first.intentText); cloud.tick(oldIntent.requestId, 8); await refresh(page); await expect(status(page)).toContainText(/complete/i);
  await page.getByRole('button', { name: 'Back to chat', exact: true }).click();
  await page.getByLabel('// Direction', { exact: true }).fill('A changed direction with the same verified photos and voice.'); await saved(page);
  await page.getByRole('button', { name: 'Confirm sample plan', exact: true }).click(); await expect(page.getByText(/Sample plan confirmed for revision/)).toBeVisible(); await saved(page);
  const changed = selectedChat(await book(page));
  const expectedId = hash(JSON.stringify([OWNER, changed.id, changed.referenceReview.confirmation.planSnapshot, changed.referenceCloudSource.saveId]));
  cloud.unknownJobs.add(expectedId); cloud.loseStartAck = true;
  await page.getByRole('button', { name: 'Open cloud fixture job', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start cloud fixture job', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Start cloud fixture job', exact: true }).click(); await expect.poll(() => cloud.jobs.size).toBe(2);
  await expect(page.getByText(/Start acknowledgement is pending for the saved request/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Refresh cloud jobs', exact: true })).toBeEnabled();
  const accepted = structuredClone(cloud.jobs.get(expectedId));
  await selectJob(page, oldIntent.requestId); await refresh(page);
  await expect(page.getByText(/Start acknowledgement is pending for the saved request/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start cloud fixture job', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Retry saved cloud request', exact: true })).toHaveCount(0);
  expect(selectedChat(await book(page)).referenceCloudJob.requestId).toBe(expectedId); expect(cloud.startCalls()).toHaveLength(2);
  await page.reload(); await openCloud(page);
  await expect(page.getByText(/Start acknowledgement is pending for the saved request/)).toBeVisible();
  cloud.unknownJobs.delete(expectedId); await refresh(page); await selectJob(page, expectedId); await expect(status(page)).toContainText(/running/i);
  await expect(page.getByText(/Start acknowledgement is pending for the saved request/)).toHaveCount(0);
  expect(cloud.jobs.get(expectedId)).toEqual(accepted); expect(cloud.startCalls()).toHaveLength(2);
});

test('saving a conflicted chat as a copy clears its review approval and retains the original job as observation only', async ({ page, cloud }) => {
  await reference(page, 1); await prepare(page, cloud); await confirm(page); const job = await start(page, cloud), intent = JSON.parse(job.intentText);
  await page.getByRole('button', { name: 'Back to chat', exact: true }).click(); const original = selectedChat(await book(page));
  const otherTab = await page.context().newPage(); await otherTab.goto(PREVIEW);
  await otherTab.getByRole('button', { name: 'Edit brief', exact: true }).click();
  await otherTab.getByLabel('// Product or service', { exact: true }).fill('Other tab’s newer product'); await saved(otherTab);
  await page.getByRole('button', { name: 'Save review', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save this chat as a copy', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save this chat as a copy', exact: true }).click(); await saved(page);
  const current = selectedChat(await book(page)); expect(current.id).not.toBe(original.id); expect(current.referenceDraft).toEqual(original.referenceDraft);
  expect(current.referenceReview.confirmation).toBeNull(); expect(current.referenceCloudJob).toBeUndefined(); expect(current.referenceCloudObservation).toEqual(intent);
  expect(cloud.jobs.get(intent.requestId)).toEqual(job); expect(cloud.startCalls()).toHaveLength(1);
  await openCloud(page); await expect(page.getByRole('button', { name: 'Start cloud fixture job', exact: true })).toBeDisabled();
  await otherTab.close();
});

test('a changed selected voice invalidates confirmation and link before a new snapshot can start', async ({ page, cloud }) => {
  await reference(page, 1); await prepare(page, cloud); await confirm(page);
  const old = selectedChat(await book(page)); const oldReceipt = cloud.committed()[0];
  await page.getByRole('button', { name: 'Edit brief', exact: true }).click();
  await page.getByLabel('Saved voice', { exact: true }).selectOption('curated:fixture-curated'); await saved(page);
  const edited = selectedChat(await book(page));
  expect(edited.referenceReview.confirmation).toBeNull(); expect(edited.referenceReview.stale).toBe(true); expect(edited.referenceCloudSource).toBeUndefined();
  await openCloud(page); await expect(page.getByRole('button', { name: 'Start cloud fixture job', exact: true })).toBeDisabled();
  expect(cloud.startCalls()).toEqual([]); expect(cloud.committed()).toHaveLength(1);
  await page.getByRole('button', { name: 'Back to chat', exact: true }).click();
  if (await page.getByRole('button', { name: 'View previous sample plan', exact: true }).isVisible()) await page.getByRole('button', { name: 'View previous sample plan', exact: true }).click();
  await prepare(page, cloud); await confirm(page);
  const job = await start(page, cloud), intent = JSON.parse(job.intentText);
  expect(cloud.committed()).toHaveLength(2); expect(intent.cloudReference.saveId).not.toBe(oldReceipt.saveId);
  expect(intent.plan.voice).toEqual({ id: 'fixture-curated', name: 'Fixture curated voice', source: 'curated' });
  expect(intent.plan.inputHash).not.toBe(old.referenceReview.inputHash); expect(cloud.committed()[0]).toEqual(oldReceipt);
});

test('editing inputs preserves the running original job and requires explicit cancellation before a changed version starts', async ({ page, cloud }) => {
  await reference(page, 1); await prepare(page, cloud); await confirm(page); const original = await start(page, cloud), oldIntent = JSON.parse(original.intentText);
  await page.getByRole('button', { name: 'Back to chat', exact: true }).click(); await page.getByRole('button', { name: 'Edit brief', exact: true }).click();
  await page.getByLabel('// Product or service', { exact: true }).fill('Changed workflow coffee'); await saved(page);
  const edited = selectedChat(await book(page)); expect(edited.referenceCloudSource).toBeUndefined(); expect(edited.referenceReview.confirmation).toBeNull();
  expect(edited.referenceCloudJob).toEqual(oldIntent); expect(cloud.jobs.get(oldIntent.requestId)).toEqual(original);
  await prepare(page, cloud); await confirm(page); await page.getByRole('button', { name: 'Open cloud fixture job', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start cloud fixture job', exact: true })).toBeDisabled();
  await selectJob(page, oldIntent.requestId); await page.getByRole('button', { name: 'Cancel cloud fixture job', exact: true }).click(); await expect(status(page)).toContainText(/cancelled/i);
  await page.getByRole('button', { name: 'Start cloud fixture job', exact: true }).click(); await expect(status(page)).toContainText(/running/i);
  expect(cloud.jobs.size).toBe(2); expect(cloud.startCalls()).toHaveLength(2);
  const replacement = [...cloud.jobs.values()].find(job => JSON.parse(job.intentText).requestId !== oldIntent.requestId)!, newIntent = JSON.parse(replacement.intentText);
  expect(newIntent.cloudReference.saveId).not.toBe(oldIntent.cloudReference.saveId); expect(newIntent.plan.inputHash).not.toBe(oldIntent.plan.inputHash);
  expect(cloud.jobs.get(oldIntent.requestId)!.intentText).toBe(original.intentText); expect(cloud.jobs.get(oldIntent.requestId)!.queue.status).toBe('cancelled');
});

for (const problem of ['missing', 'corrupt']) test(`${problem} saved media blocks job dispatch and keeps the current chat when reopen fails`, async ({ page, browser, cloud }, testInfo) => {
  await reference(page, 1); await prepare(page, cloud); await confirm(page);
  const original = selectedChat(await book(page)), receipt = cloud.committed()[0], path = `${OWNER}/${receipt.saveId}/photo-0`, object = cloud.objects.get(path)!;
  if (problem === 'missing') cloud.objects.delete(path); else cloud.objects.set(path, { ...object, bytes: Buffer.from(object.bytes).fill(0) });
  await page.getByRole('button', { name: 'Open cloud fixture job', exact: true }).click();
  await page.getByRole('button', { name: 'Start cloud fixture job', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(/unavailable|integrity|match|download/i);
  expect(cloud.startCalls()).toEqual([]); expect(cloud.jobs.size).toBe(0);
  await layout(page, testInfo, `${problem}-start-blocked-390`);
  cloud.objects.set(path, object); await page.getByRole('button', { name: 'Start cloud fixture job', exact: true }).click();
  await expect(status(page)).toContainText(/running/i); const intent = JSON.parse([...cloud.jobs.values()][0].intentText);
  const fresh = await cloud.device(browser); await openCloud(fresh); await selectJob(fresh, intent.requestId); const before = await book(fresh);
  if (problem === 'missing') cloud.objects.delete(path); else cloud.objects.set(path, { ...object, bytes: Buffer.from(object.bytes).fill(0) });
  await fresh.getByRole('button', { name: 'Open saved inputs/review in chat', exact: true }).click();
  await expect(fresh.getByRole('alert')).toContainText(/unavailable|integrity|match|download/i);
  expect(await book(fresh)).toEqual(before); expect(cloud.startCalls()).toHaveLength(1);
  expect(cloud.jobs.get(intent.requestId)!.intentText).toBe(JSON.stringify(intent));
  expect((await book(page)).chats.find((chat: any) => chat.id === original.id).referenceDraft).toEqual(original.referenceDraft);
  await layout(fresh, testInfo, `${problem}-reopen-blocked-390`);
});

test('failed and cancelled jobs keep their original link while retry and reopen never resubmit', async ({ page, browser, cloud }) => {
  await reference(page, 1); await prepare(page, cloud); await confirm(page); const job = await start(page, cloud, 'second-clip-fails-once'), intent = JSON.parse(job.intentText);
  cloud.tick(intent.requestId, 2); await refresh(page); await expect(status(page)).toContainText(/failed/i);
  const failed = structuredClone(cloud.jobs.get(intent.requestId)!); await page.context().close();
  const fresh = await cloud.device(browser); await openCloud(fresh); await selectJob(fresh, intent.requestId);
  await fresh.getByRole('button', { name: 'Retry failed cloud step', exact: true }).click(); await expect(status(fresh)).toContainText(/running/i);
  const retried = cloud.jobs.get(intent.requestId)!;
  expect(retried.intentText).toBe(failed.intentText); expect(retried.queue.id).toBe(failed.queue.id);
  expect(retried.queue.steps.map((step: any) => step.attempts)).toEqual([1, 2, 0, 0, 0, 0, 0, 0]);
  expect(retried.queue.steps[0]).toEqual(failed.queue.steps[0]);
  await fresh.getByRole('button', { name: 'Cancel cloud fixture job', exact: true }).click(); await expect(status(fresh)).toContainText(/cancelled/i);
  const cancelled = structuredClone(cloud.jobs.get(intent.requestId)); cloud.tick(intent.requestId, 8); await refresh(fresh);
  expect(cloud.jobs.get(intent.requestId)).toEqual(cancelled);
  await fresh.getByRole('button', { name: 'Open saved inputs/review in chat', exact: true }).click();
  await expect(fresh.getByRole('heading', { name: 'Sample plan review', exact: true })).toBeVisible(); await saved(fresh);
  expect(selectedChat(await book(fresh)).referenceReview.confirmation).toBeNull(); expect(cloud.startCalls()).toHaveLength(1);
  expect(cloud.jobs.get(intent.requestId)).toEqual(cancelled);
});

test('late cloud save acknowledgement cannot install another account’s inputs or review', async ({ page, cloud }) => {
  await reference(page, 1); cloud.holdNext('grifon_reference_commit');
  await page.getByRole('button', { name: 'Prepare sample plan', exact: true }).click(); await expect.poll(() => cloud.held).toBe(true);
  await account(page, OTHER); cloud.release(); await expect(page.getByRole('button', { name: 'Reference brief', exact: true })).toBeVisible();
  const other = selectedChat(await book(page, OTHER));
  expect(other.referenceDraft).toBeUndefined(); expect(other.referenceReview).toBeUndefined(); expect(other.referenceCloudSource).toBeUndefined();
  await openCloud(page); await expect(status(page)).toHaveCount(0); expect(cloud.startCalls()).toEqual([]);
});

test('late start acknowledgement cannot replace a different chat or create another job', async ({ page, cloud }, testInfo) => {
  await reference(page, 1); await prepare(page, cloud); await confirm(page);
  await page.getByRole('button', { name: 'Open cloud fixture job', exact: true }).click(); cloud.holdNext('grifon_fixture_start');
  await page.getByRole('button', { name: 'Start cloud fixture job', exact: true }).click(); await expect.poll(() => cloud.held).toBe(true);
  await expect(panel(page)).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByText('Checking your cloud request…', { exact: true })).toBeVisible();
  await page.getByText('Checking your cloud request…', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('linked-start-busy-390.png'), fullPage: true });
  const intent = JSON.parse([...cloud.jobs.values()][0].intentText);
  await page.getByRole('button', { name: 'Open conversations', exact: true }).click(); await page.getByRole('button', { name: 'New chat', exact: true }).click();
  cloud.release(); await expect(page.getByRole('button', { name: 'Reference brief', exact: true })).toBeVisible();
  const newChat = selectedChat(await book(page)); expect(newChat.id).not.toBe(intent.ownerChatId); expect(newChat.referenceCloudJob).toBeUndefined(); expect(newChat.referenceReview).toBeUndefined();
  await openCloud(page); await selectJob(page, intent.requestId); await expect(status(page)).toContainText(/running/i); expect(cloud.startCalls()).toHaveLength(1);
  expect(JSON.parse(cloud.jobs.get(intent.requestId)!.intentText)).toEqual(intent);
});

test('late start acknowledgement stays with its original account', async ({ page, cloud }) => {
  await reference(page, 1); await prepare(page, cloud); await confirm(page);
  await page.getByRole('button', { name: 'Open cloud fixture job', exact: true }).click(); cloud.holdNext('grifon_fixture_start');
  await page.getByRole('button', { name: 'Start cloud fixture job', exact: true }).click(); await expect.poll(() => cloud.held).toBe(true);
  const original = structuredClone([...cloud.jobs.values()][0]), intent = JSON.parse(original.intentText);
  await account(page, OTHER); cloud.release(); await openCloud(page);
  await expect(status(page)).toHaveCount(0); await expect(page.getByRole('button', { name: `Open cloud fixture job: ${intent.requestId}`, exact: true })).toHaveCount(0);
  expect(selectedChat(await book(page, OTHER)).referenceCloudJob).toBeUndefined();
  await account(page, OWNER); await openCloud(page); await selectJob(page, intent.requestId); await expect(status(page)).toContainText(/running/i);
  expect(cloud.jobs.get(intent.requestId)).toEqual(original); expect(cloud.startCalls()).toHaveLength(1);
});

test('legacy cloud jobs remain observable without pretending their original media was saved', async ({ page, cloud }) => {
  await reference(page, 1); await prepare(page, cloud); await confirm(page); const linked = await start(page, cloud), intent = JSON.parse(linked.intentText);
  delete intent.cloudReference; intent.ownerChatId = 'legacy-source-chat'; intent.requestId = hash(JSON.stringify([OWNER, intent.ownerChatId, intent.plan.confirmation.planSnapshot]));
  const legacy = { ...structuredClone(linked), intentText: JSON.stringify(intent), queue: { ...linked.queue, id: randomUUID() } }; cloud.jobs.set(intent.requestId, legacy);
  await refresh(page); await selectJob(page, intent.requestId); await expect(status(page)).toContainText(/running/i);
  await expect(panel(page)).toContainText(/Saved inputs are unavailable for this older job/);
  await expect(page.getByRole('button', { name: 'Open saved inputs/review in chat', exact: true })).toHaveCount(0);
  expect(cloud.jobs.get(intent.requestId)).toEqual(legacy); expect(cloud.startCalls()).toHaveLength(1);
});

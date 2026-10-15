import { test as base, expect, type Browser, type BrowserContext, type Page, type Route, type TestInfo } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

// Shared simulated RPC + object store. Every device uses the real production client adapter.
// No Supabase, auth, provider, worker or /api request may leave these fixture contexts.
const PREVIEW = '/companion-chat-preview.html?cloud=1';
const ROOT = '/__fixture-cloud-references';
const OWNER = 'fixture-user-a';
const photoBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aEocAAAAASUVORK5CYII=', 'base64');
const videoBytes = readFileSync('tests/e2e/fixtures/recovery.webm');
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const photo = (index = 0) => ({ name: `photo-${index}.png`, mimeType: 'image/png', buffer: photoBytes });
type Receipt = { runtime: string; ownerId: string; saveId: string; sourceChatId: string; manifestText: string; createdAt: number; committed: boolean };
type StoredMedia = { bytes: Buffer; type: string };
type Call = { ownerId: string; method: string; name: string; path?: string; args?: Record<string, unknown> };

class SharedCloud {
  receipts = new Map<string, Receipt>();
  objects = new Map<string, StoredMedia>();
  calls: Call[] = [];
  forbidden: string[] = [];
  errors: string[] = [];
  pages: Page[] = [];
  contexts: BrowserContext[] = [];
  failUploadAt = 0;
  uploads = 0;
  loseCommitAck = false;
  duplicateList = false;
  failNextList = false;
  private heldName = '';
  private releaseHeld: (() => void) | undefined;
  held = false;
  constructor(readonly baseURL: string, readonly testInfo: TestInfo) {}
  key(ownerId: string, saveId: string) { return `${ownerId}:${saveId}`; }
  committed(ownerId = OWNER) { return [...this.receipts.values()].filter(receipt => receipt.ownerId === ownerId && receipt.committed); }
  holdNext(name: string) { this.heldName = name; this.held = false; }
  release() { this.releaseHeld?.(); this.releaseHeld = undefined; }
  async route(route: Route) {
    const request = route.request(), url = new URL(request.url());
    if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.abort();
    if (url.origin !== new URL(this.baseURL).origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/__companion-fixture-jobs')) {
      this.forbidden.push(`${request.method()} ${url.origin}${url.pathname}`); return route.abort();
    }
    // RED proof removes only the StrictMode fix from the served module; shared source stays intact.
    if (process.env.COMPANION_CLOUD_REFERENCE_STRICT_RED === '1' && url.pathname.endsWith('/CompanionCloudReferences.tsx')) {
      const response = await route.fetch(), source = await response.text();
      const original = source.replace(/active\.current = true;\s+locked\.current = false;\s+void refresh\(\);/, 'active.current = true; void refresh();');
      if (original === source) throw new Error('StrictMode RED mutation did not find the exact effect setup.');
      return route.fulfill({ response, body: original });
    }
    if (!url.pathname.startsWith(ROOT + '/')) return route.continue();
    const ownerId = request.headers()['x-fixture-owner'];
    if (![OWNER, 'fixture-user-b'].includes(ownerId)) return route.fulfill({ status: 403, body: 'Invalid fixture owner' });
    const json = (value: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(value) });
    const name = decodeURIComponent(url.pathname.slice((ROOT + '/rpc/').length));
    if (url.pathname.startsWith(ROOT + '/rpc/')) {
      const args = request.postDataJSON() as Record<string, unknown>;
      this.calls.push({ ownerId, method: request.method(), name, args });
      if (this.heldName === name) {
        this.heldName = ''; this.held = true;
        await new Promise<void>(resolve => { this.releaseHeld = resolve; });
      }
      const key = this.key(ownerId, args.p_save_id as string), existing = this.receipts.get(key);
      if (name === 'grifon_reference_reserve') {
        const manifestText = args.p_manifest_text as string;
        const identity = JSON.stringify([ownerId, args.p_source_chat_id, manifestText]);
        if (args.p_identity_text !== identity || args.p_save_id !== hash(Buffer.from(identity))) return json({ data: null, error: { code: '22023' } });
        if (existing && (existing.manifestText !== manifestText || existing.sourceChatId !== args.p_source_chat_id)) return json({ data: null, error: { code: '23505' } });
        const receipt = existing ?? { runtime: 'supabase-cloud-reference-v1', ownerId, saveId: args.p_save_id as string, sourceChatId: args.p_source_chat_id as string, manifestText, createdAt: 1_792_015_200_000 + this.receipts.size, committed: false };
        this.receipts.set(key, receipt); return json({ data: receipt, error: null });
      }
      if (name === 'grifon_reference_commit') {
        if (!existing) return json({ data: null, error: { code: '42501' } });
        const media = JSON.parse(existing.manifestText).media as { slot: string; type: string; size: number; sha256: string }[];
        if (media.some(entry => {
          const stored = this.objects.get(`${ownerId}/${existing.saveId}/${entry.slot}`);
          return !stored || stored.type !== entry.type || stored.bytes.length !== entry.size || hash(stored.bytes) !== entry.sha256;
        })) return json({ data: null, error: { code: '22023' } });
        const receipt = { ...existing, committed: true }; this.receipts.set(key, receipt);
        if (this.loseCommitAck) { this.loseCommitAck = false; return route.abort('failed'); }
        return json({ data: receipt, error: null });
      }
      if (name === 'grifon_reference_get') return json({ data: existing?.committed ? existing : null, error: null });
      if (name === 'grifon_reference_list') {
        if (this.failNextList) { this.failNextList = false; return json({ data: null, error: { code: 'PGRST202' } }); }
        const receipts = this.committed(ownerId);
        return json({ data: this.duplicateList && receipts.length ? [...receipts, receipts[0]] : receipts, error: null });
      }
      return json({ data: null, error: { code: 'PGRST202' } });
    }
    if (url.pathname.startsWith(ROOT + '/storage/')) {
      const path = decodeURIComponent(url.pathname.slice((ROOT + '/storage/').length));
      this.calls.push({ ownerId, method: request.method(), name: 'storage', path });
      if (!path.startsWith(ownerId + '/')) return route.fulfill({ status: 403, body: 'Fixture path owner mismatch' });
      if (request.method() === 'PUT') {
        this.uploads++;
        if (this.failUploadAt === this.uploads) return route.fulfill({ status: 503, body: 'Fixture middle upload failure' });
        if (this.objects.has(path)) return route.fulfill({ status: 409, body: 'Object already exists' });
        this.objects.set(path, { bytes: request.postDataBuffer()!, type: request.headers()['content-type'] });
        return route.fulfill({ status: 201, body: '' });
      }
      const object = this.objects.get(path);
      return object ? route.fulfill({ body: object.bytes, contentType: object.type }) : route.fulfill({ status: 404, body: 'Missing fixture media' });
    }
    this.forbidden.push(`${request.method()} ${url.pathname}`); return route.abort();
  }
  async install(context: BrowserContext) {
    this.contexts.push(context);
    await context.route('**/*', route => this.route(route));
    await context.addInitScript(() => {
      if (location.protocol === 'http:' || location.protocol === 'https:') (window as any).fixtureInitialDatabases = indexedDB.databases().then(databases => databases.map(database => database.name));
    });
    const record = (page: Page) => { this.pages.push(page); page.on('pageerror', error => this.errors.push(error.message)); };
    context.pages().forEach(record); context.on('page', record);
  }
  async device(browser: Browser, width = 390, missingVoice = false) {
    const context = await browser.newContext({ baseURL: this.baseURL, viewport: { width, height: width === 1280 ? 900 : width === 375 ? 667 : 844 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
    await this.install(context); const page = await context.newPage();
    await page.goto(PREVIEW + (missingVoice ? '&voices=missing' : ''));
    await expect(page.getByRole('button', { name: 'Reference brief', exact: true })).toBeVisible();
    expect(await page.evaluate(() => (window as any).fixtureInitialDatabases)).toEqual([]);
    return page;
  }
  async finish() {
    this.release();
    const clients = [];
    for (const page of this.pages) if (!page.isClosed()) clients.push(await page.evaluate(() => ({ calls: (window as any).companionFixture?.snapshot().calls ?? [], cloudJobs: (window as any).companionCloudFixture?.snapshot().calls ?? [] })));
    const path = this.testInfo.outputPath('shared-fixture-boundary.json');
    writeFileSync(path, JSON.stringify({ runtime: 'shared HTTP fixture backend; real production client', forbidden: this.forbidden, errors: this.errors, calls: this.calls, receipts: [...this.receipts.values()], objects: [...this.objects].map(([path, media]) => ({ path, type: media.type, size: media.bytes.length, sha256: hash(media.bytes) })), clients }, null, 2));
    await this.testInfo.attach('shared-fixture-boundary', { path, contentType: 'application/json' });
    expect(this.forbidden, 'No real cloud, auth, provider, worker, or live API is permitted').toEqual([]);
    expect(this.errors).toEqual([]);
    for (const client of clients) { expect(client.calls).toEqual([]); expect(client.cloudJobs).toEqual([]); }
  }
}
const test = base.extend<{ cloud: SharedCloud }>({
  cloud: [async ({ context, baseURL }, use, testInfo) => {
    const cloud = new SharedCloud(baseURL!, testInfo); await cloud.install(context);
    try { await use(cloud); } finally { try { await cloud.finish(); } finally { for (const extra of cloud.contexts.slice(1)) await extra.close(); } }
  }, { auto: true }],
});
const panel = (page: Page) => page.getByTestId('cloud-reference-panel');
async function saved(page: Page) { await expect(page.locator('#companion-save-status')).toContainText(/saved on this device\./); }
async function openCloud(page: Page) {
  const button = page.getByRole('button', { name: 'Cloud reference briefs', exact: true });
  if (!await button.isVisible()) await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
  await expect(button).toBeVisible(); await button.click(); await expect(panel(page)).toBeVisible();
}
async function prepare(page: Page, width = 390, count = 1, title = 'Cloud coffee') {
  await page.setViewportSize({ width, height: width === 1280 ? 900 : width === 375 ? 667 : 844 }); await page.goto(PREVIEW);
  await reference(page, count, title);
}
async function reference(page: Page, count = 1, title = 'Cloud coffee') {
  await page.getByRole('button', { name: 'Reference brief', exact: true }).click();
  await page.getByLabel('// Brief', { exact: true }).fill('Coffee for parents. Keep the packaging unchanged.');
  await page.getByLabel('// Product or service', { exact: true }).fill(title);
  await page.getByLabel('// Reference language (optional)').fill('Japanese');
  await page.getByLabel('// Reference link (optional)').fill('https://example.com/reference');
  await page.getByLabel('Output language', { exact: true }).selectOption('English');
  await page.getByLabel('Reference adaptation', { exact: true }).selectOption('close');
  await page.getByLabel('Reference video', { exact: true }).setInputFiles({ name: 'reference.webm', mimeType: 'video/webm', buffer: videoBytes });
  await expect(page.getByLabel('Reference video preview')).toBeVisible();
  if (count) {
    await page.getByLabel('Add photos', { exact: true }).setInputFiles(Array.from({ length: count }, (_, index) => photo(index)));
    await expect(page.getByRole('img', { name: /^photo-/ })).toHaveCount(count);
    await page.getByLabel('Role for photo-0.png').selectOption('character');
    if (count > 1) await page.getByLabel('Role for photo-1.png').selectOption('clothing');
  }
  await page.getByLabel('Saved voice', { exact: true }).selectOption('private:fixture-private'); await saved(page);
}
async function book(page: Page, ownerId = OWNER): Promise<any> {
  return page.evaluate(async ownerId => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('grifon_companion', 1); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    try {
      const value: any = await new Promise((resolve, reject) => { const request = db.transaction('conversations', 'readonly').objectStore('conversations').get(ownerId); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      if (!value) return null;
      const media = async (item: any) => {
        if (!item) return item;
        const bytes = new Uint8Array(await item.blob.arrayBuffer());
        const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(byte => byte.toString(16).padStart(2, '0')).join('');
        const { blob, ...metadata } = item;
        return { ...metadata, type: blob.type, size: blob.size, sha256: digest, ...(bytes.length <= 4096 ? { bytes: Array.from(bytes) } : {}) };
      };
      return { ...value, chats: await Promise.all(value.chats.map(async (chat: any) => ({ ...chat, ...(chat.referenceDraft ? { referenceDraft: { ...chat.referenceDraft, referenceVideo: await media(chat.referenceDraft.referenceVideo), photos: await Promise.all(chat.referenceDraft.photos.map(media)) } } : {}) }))) };
    } finally { db.close(); }
  }, ownerId);
}
const selected = (value: any) => value.chats.find((chat: any) => chat.id === value.selectedId);
async function saveCloud(page: Page, cloud: SharedCloud, total = 1) {
  await openCloud(page); await page.getByRole('button', { name: 'Save this brief to cloud', exact: true }).click();
  await expect.poll(() => cloud.committed().length).toBe(total);
  await expect(panel(page).getByRole('button', { name: /^Open copy in chat:/ })).toHaveCount(total);
}
async function openCopy(page: Page, title = 'Cloud coffee') {
  await page.getByRole('button', { name: `Open copy in chat: ${title}`, exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Reference brief', exact: true })).toBeVisible(); await saved(page);
}
async function layout(page: Page, testInfo: TestInfo, name: string) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const metrics = await panel(page).evaluate(element => ({
    viewport: { width: innerWidth, height: innerHeight, deviceScaleFactor: devicePixelRatio },
    document: { width: innerWidth, scrollWidth: document.documentElement.scrollWidth },
    controls: Array.from(element.querySelectorAll<HTMLElement>('button,select')).filter(item => item.getClientRects().length).map(item => { const style = getComputedStyle(item), bounds = item.getBoundingClientRect(); return { text: item.textContent?.trim(), rect: bounds.toJSON(), width: bounds.width, height: bounds.height, font: style.fontSize, weight: style.fontWeight, gap: style.gap, align: style.alignItems, shrink: style.flexShrink, color: style.color, background: style.backgroundColor, radius: style.borderRadius }; }),
    text: Array.from(element.querySelectorAll<HTMLElement>('p,h1,h2')).map(item => { const style = getComputedStyle(item); return { text: item.textContent?.trim(), font: style.fontSize, weight: style.fontWeight, lineHeight: style.lineHeight, gap: style.gap, align: style.alignItems, color: style.color, width: item.getBoundingClientRect().width, scrollWidth: item.scrollWidth, clientWidth: item.clientWidth }; }),
    icons: Array.from(element.querySelectorAll<SVGElement>('svg')).filter(item => item.getClientRects().length).map(item => { const bounds = item.getBoundingClientRect(), parent = item.parentElement!.getBoundingClientRect(), style = getComputedStyle(item); return { className: item.getAttribute('class'), width: bounds.width, height: bounds.height, shrink: style.flexShrink, color: style.color, clipped: bounds.left < parent.left || bounds.top < parent.top || bounds.right > parent.right || bounds.bottom > parent.bottom }; }),
  }));
  expect(metrics.controls.every(control => control.height >= 44), JSON.stringify(metrics.controls)).toBe(true);
  expect(metrics.icons.every(icon => icon.width >= 16 && icon.height >= 16 && !icon.clipped), JSON.stringify(metrics.icons)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
  await panel(page).getByRole('heading', { name: 'Cloud reference briefs', exact: true }).screenshot({ path: testInfo.outputPath(`${name}-icon-text-200-percent.png`) });
  await panel(page).getByRole('button', { name: 'Back to chat', exact: true }).screenshot({ path: testInfo.outputPath(`${name}-back-200-percent.png`) });
  await panel(page).getByRole('button', { name: 'Save this brief to cloud', exact: true }).screenshot({ path: testInfo.outputPath(`${name}-save-200-percent.png`) });
  await panel(page).getByRole('button', { name: 'Refresh cloud briefs', exact: true }).screenshot({ path: testInfo.outputPath(`${name}-refresh-200-percent.png`) });
  const copy = panel(page).getByRole('button', { name: /^Open copy in chat:/ }).first();
  if (await copy.count()) {
    await copy.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`${name}-lower-list.png`) });
    await copy.screenshot({ path: testInfo.outputPath(`${name}-open-copy-200-percent.png`) });
  }
  const sidebar = [];
  if (metrics.viewport.width < 768) await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
  const cloudNavigation = page.getByRole('button', { name: 'Cloud reference briefs', exact: true });
  sidebar.push(await cloudNavigation.evaluate(item => { const style = getComputedStyle(item), icon = item.querySelector('svg')!; return { text: item.textContent?.trim(), rect: item.getBoundingClientRect().toJSON(), font: style.fontSize, weight: style.fontWeight, gap: style.gap, align: style.alignItems, shrink: style.flexShrink, color: style.color, background: style.backgroundColor, radius: style.borderRadius, icon: { rect: icon.getBoundingClientRect().toJSON(), shrink: getComputedStyle(icon).flexShrink, color: getComputedStyle(icon).color } }; }));
  await cloudNavigation.screenshot({ path: testInfo.outputPath(`${name}-sidebar-200-percent.png`) });
  if (metrics.viewport.width < 768) await page.getByRole('button', { name: 'Close conversations', exact: true }).click();
  const path = testInfo.outputPath(`${name}-metrics.json`); writeFileSync(path, JSON.stringify({ ...metrics, sidebar }, null, 2));
  await testInfo.attach(`${name}-metrics`, { path, contentType: 'application/json' });
}

test('opens cloud reference briefs from a fresh fixture chat', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(PREVIEW); await openCloud(page);
  await expect(panel(page)).toContainText('Cloud reference briefs');
});

test('StrictMode replay settles the initial cloud list and unlocks save and refresh', async ({ page, cloud }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(PREVIEW + '&strict=1');
  await reference(page); cloud.holdNext('grifon_reference_list'); await openCloud(page);
  await expect.poll(() => cloud.held).toBe(true); cloud.release();
  await expect(panel(page).getByText('No cloud reference briefs found.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Refresh cloud briefs', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Save this brief to cloud', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Save this brief to cloud', exact: true }).click();
  await expect.poll(() => cloud.committed().length).toBe(1);
  await expect(panel(page).getByRole('button', { name: 'Open copy in chat: Cloud coffee', exact: true })).toBeVisible();
});

for (const width of [375, 390, 1280]) {
  test(`fresh device opens editable exact video, five photos and voice at ${width}px`, async ({ page, browser, cloud }, testInfo) => {
    await prepare(page, width, 5);
    await page.getByRole('button', { name: 'Prepare sample plan', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Sample plan review', exact: true })).toBeVisible(); await saved(page);
    await page.getByRole('button', { name: 'Confirm sample plan', exact: true }).click();
    await expect(page.getByText(/Sample plan confirmed for revision/)).toBeVisible(); await saved(page);
    const original = selected(await book(page));
    expect(original.referenceReview.confirmation).toBeTruthy();
    expect(original.referenceDraft.referenceVideo.sha256).toBe(hash(videoBytes));
    expect(original.referenceDraft.photos.map((item: any) => item.sha256)).toEqual(Array(5).fill(hash(photoBytes)));
    await saveCloud(page, cloud); await layout(page, testInfo, `cloud-list-${width}`);
    const receipt = cloud.committed()[0], manifest = JSON.parse(receipt.manifestText);
    expect(manifest.media.map((item: any) => item.slot)).toEqual(['reference', 'photo-0', 'photo-1', 'photo-2', 'photo-3', 'photo-4']);
    expect(manifest.draft.voice).toEqual({ id: 'fixture-private', name: 'Fixture private voice', source: 'private' });
    const other = await cloud.device(browser, width);
    expect((await book(other)).chats.every((chat: any) => !chat.referenceDraft)).toBe(true);
    await other.getByRole('button', { name: 'Reference brief', exact: true }).click();
    await other.getByLabel('// Product or service', { exact: true }).fill('Keep my local work'); await saved(other);
    const local = selected(await book(other));
    await openCloud(other); await openCopy(other);
    const reopened = await book(other), copy = selected(reopened);
    expect(copy.id).not.toBe(original.id); expect(copy.id).not.toBe(local.id);
    expect(copy.referenceDraft).toEqual(original.referenceDraft);
    expect(copy.runId).toBeNull(); expect(copy.referenceReview).toBeUndefined(); expect(copy.referenceQueue).toBeUndefined(); expect(copy.referenceFixtureJob).toBeUndefined();
    expect(reopened.chats.find((chat: any) => chat.id === local.id)).toEqual(local);
    expect(selected(await book(page))).toEqual(original);
    await expect(other.getByLabel('Saved voice', { exact: true })).toHaveValue('private:fixture-private');
    await expect(other.getByLabel('Role for photo-0.png')).toHaveValue('character');
    await expect(other.getByLabel('Role for photo-1.png')).toHaveValue('clothing');
    await expect.poll(() => other.getByLabel('Reference video preview').evaluate((video: HTMLVideoElement) => video.readyState)).toBeGreaterThanOrEqual(1);
    await expect.poll(() => other.getByRole('img', { name: 'photo-0.png', exact: true }).evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1);
    await other.getByLabel('// Brief', { exact: true }).fill('Editable imported copy'); await saved(other); await other.reload();
    await expect(other.getByLabel('// Brief', { exact: true })).toHaveValue('Editable imported copy');
    await expect(other.getByRole('button', { name: /Generate|Approve storyboard/ })).toHaveCount(0);
    expect(await other.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await other.screenshot({ path: testInfo.outputPath(`reopened-${width}.png`), fullPage: true });
  });
}

test('keeps unavailable private voice identity on a fresh device', async ({ page, browser, cloud }) => {
  await prepare(page); await saveCloud(page, cloud);
  const other = await cloud.device(browser, 390, true); await openCloud(other); await openCopy(other);
  await expect(other.getByLabel('Saved voice', { exact: true })).toHaveValue('private:fixture-private');
  await expect(other.getByText('Your selected voice is kept, but could not be confirmed in the current list.')).toBeVisible();
  expect(selected(await book(other)).referenceDraft.voice).toEqual({ id: 'fixture-private', name: 'Fixture private voice', source: 'private' });
});

test('middle upload failure preserves prior cloud version and local work; retry commits once', async ({ page, cloud }) => {
  await prepare(page, 390, 2); await saveCloud(page, cloud); const prior = cloud.committed()[0];
  await page.getByRole('button', { name: 'Back to chat', exact: true }).click();
  await page.getByLabel('// Brief', { exact: true }).fill('Changed brief with a new cloud version'); await saved(page);
  const local = selected(await book(page)); cloud.failUploadAt = cloud.uploads + 2;
  await openCloud(page); await page.getByRole('button', { name: 'Save this brief to cloud', exact: true }).click();
  await expect(panel(page).getByRole('alert')).toBeVisible();
  expect(cloud.committed()).toEqual([prior]); expect(selected(await book(page))).toEqual(local);
  await expect(panel(page).getByRole('button', { name: /^Open copy in chat:/ })).toHaveCount(1);
  await page.getByRole('button', { name: 'Save this brief to cloud', exact: true }).click();
  await expect.poll(() => cloud.committed().length).toBe(2);
  expect(cloud.receipts.size).toBe(2); expect(cloud.committed().find(receipt => receipt.saveId === prior.saveId)).toEqual(prior);
});

test('lost commit acknowledgement and repeat save resolve to one immutable version', async ({ page, cloud }) => {
  await prepare(page, 390, 2); cloud.loseCommitAck = true; await saveCloud(page, cloud);
  await page.getByRole('button', { name: 'Save this brief to cloud', exact: true }).click();
  await expect(panel(page).getByRole('button', { name: /^Open copy in chat:/ })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Save this brief to cloud', exact: true })).toBeEnabled();
  expect(cloud.receipts.size).toBe(1); expect(cloud.committed()).toHaveLength(1); expect(cloud.objects.size).toBe(3);
});

test('rejects duplicate cloud payload without importing a chat', async ({ page, cloud }) => {
  await prepare(page); await saveCloud(page, cloud); const local = await book(page);
  cloud.duplicateList = true; await page.getByRole('button', { name: 'Refresh cloud briefs', exact: true }).click();
  await expect(panel(page).getByRole('alert')).toBeVisible(); expect(await book(page)).toEqual(local);
});

test('initial list failure stays unconfirmed and refresh recovers without losing local work', async ({ page, cloud }, testInfo) => {
  await prepare(page); const local = selected(await book(page)); cloud.failNextList = true;
  await openCloud(page);
  await expect(panel(page).getByRole('alert')).toContainText('activation');
  await expect(panel(page).getByText('Cloud briefs have not been confirmed. Refresh when connected.')).toBeVisible();
  await expect(panel(page).getByText('Checking cloud briefs…', { exact: true })).toHaveCount(0);
  await expect(panel(page).getByText('No cloud reference briefs found.', { exact: true })).toHaveCount(0);
  expect(selected(await book(page))).toEqual(local);
  await layout(page, testInfo, 'cloud-initial-list-failure');
  await panel(page).getByRole('alert').screenshot({ path: testInfo.outputPath('cloud-warning-icon-text-200-percent.png') });
  await page.getByRole('button', { name: 'Refresh cloud briefs', exact: true }).click();
  await expect(panel(page).getByText('No cloud reference briefs found.', { exact: true })).toBeVisible();
  expect(selected(await book(page))).toEqual(local);
});

test('account cloud lists stay isolated when a previous list response arrives late', async ({ page, cloud }) => {
  await prepare(page); await saveCloud(page, cloud);
  await page.getByRole('button', { name: 'Back to chat', exact: true }).click();
  cloud.holdNext('grifon_reference_list'); await openCloud(page); await expect.poll(() => cloud.held).toBe(true);
  await page.evaluate(() => (window as any).companionCloudFixture.account('fixture-user-b'));
  await expect(page.getByRole('button', { name: 'Reference brief', exact: true })).toBeVisible();
  await openCloud(page); await expect(panel(page).getByText('No cloud reference briefs found.', { exact: true })).toBeVisible();
  cloud.release();
  await expect(panel(page).getByRole('button', { name: /^Open copy in chat:/ })).toHaveCount(0);
  expect((await book(page, 'fixture-user-b')).chats.every((chat: any) => !chat.referenceDraft)).toBe(true);
  await page.evaluate(() => (window as any).companionCloudFixture.account('fixture-user-a'));
  await expect(page.getByRole('heading', { name: 'Reference brief', exact: true })).toBeVisible();
  await openCloud(page); await expect(panel(page).getByRole('button', { name: 'Open copy in chat: Cloud coffee', exact: true })).toBeVisible();
});

test('late save acknowledgement stays with the original account and does not install a local copy', async ({ page, cloud }) => {
  await prepare(page); const original = selected(await book(page)); await openCloud(page);
  cloud.holdNext('grifon_reference_commit');
  await page.getByRole('button', { name: 'Save this brief to cloud', exact: true }).click();
  await expect.poll(() => cloud.held).toBe(true);
  await page.evaluate(() => (window as any).companionCloudFixture.account('fixture-user-b'));
  await expect(page.getByRole('button', { name: 'Reference brief', exact: true })).toBeVisible();
  cloud.release(); await expect.poll(() => cloud.committed().length).toBe(1);
  await openCloud(page); await expect(panel(page).getByText('No cloud reference briefs found.', { exact: true })).toBeVisible();
  await expect(panel(page).getByText('Cloud save confirmed. This private snapshot can be opened on another device.', { exact: true })).toHaveCount(0);
  expect(selected(await book(page))).toEqual(original);
  expect((await book(page, 'fixture-user-b')).chats.every((chat: any) => !chat.referenceDraft)).toBe(true);
  await page.evaluate(() => (window as any).companionCloudFixture.account('fixture-user-a'));
  await expect(page.getByRole('heading', { name: 'Reference brief', exact: true })).toBeVisible();
  await openCloud(page); await expect(panel(page).getByRole('button', { name: 'Open copy in chat: Cloud coffee', exact: true })).toBeVisible();
});

test('failed local copy commit keeps selection and files, then retries to one durable copy', async ({ page, browser, cloud }) => {
  await prepare(page, 390, 2); await saveCloud(page, cloud);
  const other = await cloud.device(browser); await reference(other, 1, 'Keep my local media');
  await openCloud(other); const before = await book(other);
  await other.evaluate(() => {
    const original = IDBObjectStore.prototype.put; let writes = 0;
    (window as any).restoreCloudCopyStorage = () => { IDBObjectStore.prototype.put = original; };
    IDBObjectStore.prototype.put = function (...args: any[]) {
      if (this.name === 'conversations' && ++writes === 2) throw new DOMException('Fixture copy commit full', 'QuotaExceededError');
      return original.apply(this, args as any);
    };
  });
  await other.getByRole('button', { name: 'Open copy in chat: Cloud coffee', exact: true }).click();
  await expect(panel(other).getByRole('alert')).toBeVisible();
  const failed = await book(other); expect(failed.selectedId).toBe(before.selectedId); expect(failed.chats).toEqual(before.chats);
  await other.evaluate(() => (window as any).restoreCloudCopyStorage());
  await openCopy(other);
  const succeeded = await book(other); expect(succeeded.chats).toHaveLength(before.chats.length + 1);
  expect(succeeded.chats.find((chat: any) => chat.id === before.selectedId)).toEqual(selected(before));
  const copy = selected(succeeded); expect(copy.id).not.toBe(before.selectedId);
  await other.reload(); await saved(other);
  expect(selected(await book(other)).referenceDraft).toEqual(copy.referenceDraft);
});

for (const defect of ['missing', 'corrupt'] as const) {
  test(`${defect} media refuses open and preserves the local draft`, async ({ page, browser, cloud }) => {
    await prepare(page, 390, 2); await saveCloud(page, cloud);
    const other = await cloud.device(browser); await other.getByRole('button', { name: 'Reference brief', exact: true }).click();
    await other.getByLabel('// Brief', { exact: true }).fill('Local work must survive'); await saved(other);
    const before = await book(other), receipt = cloud.committed()[0], path = `${OWNER}/${receipt.saveId}/photo-1`;
    if (defect === 'missing') cloud.objects.delete(path);
    else { const object = cloud.objects.get(path)!; const bytes = Buffer.from(object.bytes); bytes[bytes.length - 1] ^= 0xff; cloud.objects.set(path, { ...object, bytes }); }
    await openCloud(other); await other.getByRole('button', { name: 'Open copy in chat: Cloud coffee', exact: true }).click();
    await expect(panel(other).getByRole('alert')).toBeVisible();
    const after = await book(other); expect(after.selectedId).toBe(before.selectedId); expect(after.chats).toEqual(before.chats);
    await other.getByRole('button', { name: 'Back to chat', exact: true }).click();
    await expect(other.getByLabel('// Brief', { exact: true })).toHaveValue('Local work must survive');
  });
}

for (const destination of ['account', 'chat'] as const) {
  test(`late open response cannot create a copy after leaving for another ${destination}`, async ({ page, cloud }) => {
    await prepare(page); await saveCloud(page, cloud); const before = await book(page);
    cloud.holdNext('grifon_reference_get');
    await page.getByRole('button', { name: 'Open copy in chat: Cloud coffee', exact: true }).click();
    await expect.poll(() => cloud.held).toBe(true);
    if (destination === 'account') {
      await page.evaluate(() => (window as any).companionCloudFixture.account('fixture-user-b'));
      await expect(page.getByRole('button', { name: 'Reference brief', exact: true })).toBeVisible();
    } else await page.getByRole('button', { name: 'Back to chat', exact: true }).click();
    cloud.release();
    await expect.poll(() => cloud.calls.filter(call => call.method === 'GET').length).toBeGreaterThan(0);
    expect((await book(page)).chats).toEqual(before.chats);
    if (destination === 'account') expect((await book(page, 'fixture-user-b')).chats.every((chat: any) => !chat.referenceDraft)).toBe(true);
    else await expect(page.getByLabel('// Product or service', { exact: true })).toHaveValue('Cloud coffee');
  });
}

test('enforces five photos and 6000000-byte cloud limit without dropping local media', async ({ page, cloud }) => {
  await prepare(page, 390, 5);
  await page.getByLabel('Add photos', { exact: true }).setInputFiles(photo(5));
  await expect(page.getByRole('alert')).toContainText('up to five photos'); await expect(page.getByRole('img', { name: /^photo-/ })).toHaveCount(5);
  const oversized = Buffer.alloc(6_000_001); videoBytes.copy(oversized);
  await page.getByLabel('Reference video', { exact: true }).setInputFiles({ name: 'larger-local.webm', mimeType: 'video/webm', buffer: oversized });
  await expect(page.getByText('larger-local.webm', { exact: true })).toBeVisible(); await saved(page);
  const local = selected(await book(page));
  await openCloud(page); const beforeCalls = cloud.calls.length;
  await page.getByRole('button', { name: 'Save this brief to cloud', exact: true }).click();
  await expect(panel(page).getByRole('alert')).toContainText(/6|6,000,000/);
  expect(cloud.calls.slice(beforeCalls).filter(call => call.name === 'grifon_reference_reserve' || call.method === 'PUT')).toEqual([]);
  expect(cloud.committed()).toEqual([]); expect(selected(await book(page))).toEqual(local);
});

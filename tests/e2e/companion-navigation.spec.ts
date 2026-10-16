import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { installRecoveryBackend, seededRun, RUN_ID } from './fixtures/oneshotRecovery.js';

const input = (page: Page) => page.getByRole('textbox', { name: 'Message Grifon' });
const QA = path.resolve(process.env.COMPANION_NAV_QA_DIR || 'assets/3d-lab/grifon-companion-chat/qa/navigation');
async function openFixture(page: Page) {
  await page.route('**/*', route => {
    const req = route.request(); const url = new URL(req.url());
    if (req.method() === 'GET' && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
    if (!['http://127.0.0.1:5173', 'http://localhost:5173'].includes(url.origin) || url.pathname.startsWith('/api/')) return route.abort();
    return route.fallback();
  });
  await page.goto('/companion-chat-preview.html');
  await expect(input(page)).toBeVisible();
}
const nav = (page: Page) => page.getByRole('navigation', { name: 'Conversations', exact: true });
const currentId = (page: Page) => page.getByTestId('companion-chat').getAttribute('data-chat-id');
async function showNavigation(page: Page) {
  if (!await nav(page).isVisible()) await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
}
async function send(page: Page, message: string) {
  await input(page).fill(message); await input(page).press('Enter');
  await expect(page.getByRole('status', { name: 'Grifon is typing', exact: true })).toHaveCount(0);
}
async function noSmallTargets(page: Page) {
  expect(await page.locator('button:visible').evaluateAll(buttons => buttons.filter(button => {
    const r = button.getBoundingClientRect(); return r.width < 43.5 || r.height < 43.5;
  }).map(button => ({ text: button.getAttribute('aria-label') || button.textContent, width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
}

test('New chat preserves a pre-generation conversation and returns in one click', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openFixture(page);
  const firstId = await currentId(page);
  expect(firstId).toBeTruthy();
  await input(page).fill('Coffee project'); await input(page).press('Enter');
  await expect(page.getByRole('status', { name: 'Grifon is typing', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'New chat', exact: true }).click({ timeout: process.env.CI ? 15_000 : 3_000 });
  await expect.poll(() => currentId(page)).not.toBe(firstId);
  await expect(page.locator('.companion-message-user')).toHaveCount(0);
  await page.getByRole('navigation', { name: 'Conversations', exact: true }).getByRole('button', { name: /Coffee project/ }).click();
  await expect(page.locator('.companion-message-user')).toHaveText('Coffee project');
  expect(await currentId(page)).toBe(firstId);
  expect(await page.evaluate(() => (window as any).companionFixture.snapshot().calls)).toEqual([]);
  await page.reload();
  await expect(page.locator('.companion-message-user')).toHaveText('Coffee project');
});

test('opening a running production history is GET-only until explicit Resume', async ({ page }) => {
  const backend = await installRecoveryBackend(page, seededRun('video'));
  backend.holdVideo = true;
  await page.addInitScript(id => localStorage.setItem('osa_producer_companion:recovery-user', id), RUN_ID);
  await page.goto('http://localhost:5173/app?experience=companion');
  await expect.poll(() => backend.reads.length).toBeGreaterThan(0);
  await page.waitForTimeout(1200);
  fs.mkdirSync(QA, { recursive: true });
  fs.writeFileSync(path.join(QA, `${process.env.COMPANION_NAV_PHASE || 'current'}-production-history.json`), JSON.stringify({ reads: backend.reads.length, actions: backend.actions.length, submissions: backend.submissions.length, checkpoints: backend.checkpoints.length, finalStarts: backend.finalStarts.length }, null, 2));
  expect(backend.actions).toEqual([]);
  expect(backend.submissions).toEqual([]);
  expect(backend.checkpoints).toEqual([]);
  expect(backend.finalStarts).toEqual([]);
  expect(backend.unexpected).toEqual([]);
  await expect(page.getByRole('button', { name: /Resume/ }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Resume saved progress', exact: true }).click();
  await expect.poll(() => backend.actions.length).toBeGreaterThan(0);
});

for (const [width, height] of [[375, 667], [390, 844], [1280, 900]]) {
  test(`navigation, search, focus, compact header and viewer at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openFixture(page);
    await expect(page.locator('iframe:visible')).toHaveAttribute('data-ready', 'true');
    const avatar = (await page.locator('iframe:visible').boundingBox())!;
    const identity = (await page.locator('.companion-identity').boundingBox())!;
    const appearance = (await page.getByRole('group', { name: 'Chat appearance', exact: true }).boundingBox())!;
    expect(avatar.width).toBe(width < 768 ? 56 : 64);
    expect(avatar.x).toBeGreaterThanOrEqual(identity.x - 1);
    expect(avatar.x + avatar.width).toBeLessThanOrEqual(identity.x + identity.width + 1);
    expect(avatar.y).toBeGreaterThanOrEqual(identity.y - 1);
    expect(avatar.y + avatar.height).toBeLessThanOrEqual(identity.y + identity.height + 1);
    expect(appearance.x - identity.x - identity.width).toBeGreaterThanOrEqual(4);
    await send(page, 'Coffee navigation');
    await noSmallTargets(page);
    fs.mkdirSync(QA, { recursive: true });
    await page.screenshot({ path: path.join(QA, `conversation-${width}.png`), fullPage: true });
    await showNavigation(page);
    await expect(nav(page)).toBeVisible();
    if (width < 768) {
      await expect(page.getByRole('button', { name: 'Close conversations', exact: true })).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(page.getByRole('button', { name: 'Account settings', exact: true })).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: 'Close conversations', exact: true })).toBeFocused();
    }
    await noSmallTargets(page);
    await page.screenshot({ path: path.join(QA, `navigation-${width}.png`), fullPage: true });
    if (width < 768) await page.getByRole('dialog', { name: 'Chat navigation' }).getByRole('button', { name: 'New chat', exact: true }).click();
    else await page.getByRole('button', { name: 'New chat', exact: true }).click();
    await expect(input(page)).toBeFocused();
    await send(page, 'Tea navigation');
    await showNavigation(page);
    await page.getByRole('textbox', { name: 'Search chats', exact: true }).fill('Coffee');
    await expect(nav(page).getByRole('button', { name: /Tea navigation/ })).toHaveCount(0);
    await nav(page).getByRole('button', { name: /Coffee navigation/ }).click();
    await expect(page.locator('.companion-message-user')).toHaveText('Coffee navigation');
    if (width < 768) {
      await expect(nav(page)).not.toBeVisible();
      await showNavigation(page);
      await page.keyboard.press('Escape');
      await expect(nav(page)).not.toBeVisible();
      await expect(page.getByRole('button', { name: 'Open conversations', exact: true })).toBeFocused();
      expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
    } else {
      await page.getByRole('button', { name: 'Collapse conversations', exact: true }).click();
      await expect(nav(page)).not.toBeVisible();
      await showNavigation(page);
    }
    await page.evaluate(() => (window as any).companionFixture.emit('storyboard'));
    if (width < 768 && await nav(page).isVisible()) await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Open storyboard', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Close viewer', exact: true })).toBeVisible();
    if (width < 768) {
      await page.keyboard.press('Shift+Tab');
      await expect(page.getByRole('button', { name: 'Approve storyboard', exact: true })).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: 'Close viewer', exact: true })).toBeFocused();
    }
    await noSmallTargets(page);
    await page.screenshot({ path: path.join(QA, `viewer-${width}.png`), fullPage: true });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Close viewer', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Open storyboard', exact: true })).toBeFocused();
    await showNavigation(page);
    await page.getByRole('button', { name: 'Studio', exact: true }).click();
    await expect.poll(() => page.evaluate(() => (window as any).companionFixture.snapshot().calls.some((call: any) => call.name === 'back'))).toBe(true);
  });
}

test('switching chats while typing isolates callbacks and preserves unsent input across accounts', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 }); await openFixture(page);
  await page.clock.install(); await page.clock.pauseAt(new Date(Date.now() + 2 * 60 * 60 * 1000));
  await input(page).fill('Pending coffee'); await input(page).press('Enter');
  await expect(page.getByRole('status', { name: 'Grifon is typing', exact: true })).toBeVisible();
  await input(page).fill('Unsent coffee');
  await page.getByRole('button', { name: 'New chat', exact: true }).click();
  await page.clock.runFor(1000);
  await expect(page.locator('.companion-message-user')).toHaveCount(0);
  await expect(page.locator('article .companion-message-assistant')).toHaveCount(1);
  await nav(page).getByRole('button', { name: /Pending coffee/ }).click();
  await expect(input(page)).toHaveValue('Unsent coffee');
  await expect(page.locator('article .companion-message-assistant')).toHaveCount(2);
  await page.evaluate(() => (window as any).companionFixture.account('fixture-user-b'));
  await expect(nav(page).getByRole('button', { name: /Pending coffee/ })).toHaveCount(0);
  await expect(page.locator('.companion-message-user')).toHaveCount(0);
  await page.evaluate(() => (window as any).companionFixture.account('fixture-user-a'));
  await expect(page.locator('.companion-message-user')).toHaveText('Pending coffee');
  await expect(input(page)).toHaveValue('Unsent coffee');
});

test('completed production output opens read-only and Studio still reaches existing tools', async ({ page }) => {
  const seed = seededRun('first_cut'); seed.row.status = 'done';
  const backend = await installRecoveryBackend(page, seed);
  await page.addInitScript(id => localStorage.setItem('osa_producer_companion:recovery-user', id), RUN_ID);
  await page.goto('http://localhost:5173/app?experience=companion');
  await page.getByRole('button', { name: 'Open first cut', exact: true }).click();
  await expect(page.locator('video')).toBeVisible();
  await page.getByRole('button', { name: 'Close viewer', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume editing', exact: true })).toBeVisible();
  expect(backend.actions).toEqual([]); expect(backend.submissions).toEqual([]); expect(backend.checkpoints).toEqual([]); expect(backend.finalStarts).toEqual([]);
  await showNavigation(page); await page.getByRole('button', { name: 'Studio', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Make a video ad', exact: true })).toBeVisible();
  expect(backend.unexpected).toEqual([]);
});

test('legacy device draft is adopted without losing image or history; only latest user has a receipt', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9X8AAAAASUVORK5CYII=';
  await page.addInitScript(image => {
    if (localStorage.getItem('navigation_legacy_seeded')) return;
    localStorage.setItem('navigation_legacy_seeded', '1');
    localStorage.setItem('grifon_companion_draft:fixture-user-a', JSON.stringify({ version: 1, userId: 'fixture-user-a', draft: {
      version: 1, brief: 'Legacy coffee project', brandName: 'Legacy Coffee', productName: '', offer: '', price: '', heroImageBase64: image, imageName: 'legacy-coffee.png', language: 'English', aspectRatio: '9:16', voiceId: 'EXAVITQu4vr4xnSDxMaL',
      messages: [
        { id: 'legacy-1', role: 'user', text: 'Legacy coffee project', at: Date.parse('2026-10-01T09:00:00Z') },
        { id: 'legacy-2', role: 'assistant', text: 'Saved project question', at: Date.parse('2026-10-01T09:00:01Z') },
        { id: 'legacy-3', role: 'user', text: 'Legacy Coffee', at: Date.parse('2026-10-02T09:00:00Z') },
        { id: 'legacy-4', role: 'assistant', text: 'Saved product question', at: Date.parse('2026-10-02T09:00:01Z') },
      ],
    } }));
  }, image);
  await openFixture(page);
  await expect(page.locator('.companion-message-user')).toHaveText(['Legacy coffee project', 'Legacy Coffee']);
  await expect(page.getByText(/legacy-coffee\.png/)).toBeVisible();
  await expect(page.getByRole('img', { name: 'Attached product', exact: true })).toHaveAttribute('src', image);
  await expect(page.getByText(/Received/, { exact: false })).toHaveCount(1);
  await expect(page.getByText('Seen', { exact: true })).toHaveCount(0);
  const dividers = page.locator('[data-testid="conversation-time-divider"]');
  await expect(dividers).toHaveCount(2);
  await page.getByRole('button', { name: 'New chat', exact: true }).click();
  await nav(page).getByRole('button', { name: /Legacy Coffee/ }).click();
  await expect(page.locator('.companion-message-user')).toHaveCount(2);
  await expect(page.locator('#companion-save-status')).toContainText('Draft saved on this device.');
  await page.reload();
  await expect(page.getByText(/legacy-coffee\.png/)).toBeVisible();
  await expect(page.getByRole('img', { name: 'Attached product', exact: true })).toHaveAttribute('src', image);
});

test('approved companion assets retain their recorded hashes', async () => {
  const manifest = JSON.parse(fs.readFileSync('public/companion/asset-manifest.json', 'utf8'));
  for (const [file, hash] of Object.entries(manifest.hashes)) {
    expect(createHash('sha256').update(fs.readFileSync(path.join('public/companion', file))).digest('hex'), file).toBe(hash);
  }
});

test('switching away from explicitly resumed production rejects late driver callbacks', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const backend = await installRecoveryBackend(page, seededRun('video'));
  await page.addInitScript(id => localStorage.setItem('osa_producer_companion:recovery-user', id), RUN_ID);
  await page.route(/\/services\/producerOrchestrator\.ts(?:\?.*)?$/, route => {
    if (route.request().url().includes('navigation-original')) return route.fallback();
    return route.fulfill({ contentType: 'application/javascript', body: `
      export * from '/services/producerOrchestrator.ts?navigation-original';
      export const runProduction=(run,callbacks)=>new Promise(resolve=>{window.navigationDeferredDriver={run,callbacks,resolve};});
    ` });
  });
  await page.goto('http://localhost:5173/app?experience=companion');
  await page.getByRole('button', { name: 'Resume saved progress', exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!(window as any).navigationDeferredDriver)).toBe(true);
  const originalId = await currentId(page);
  await page.getByRole('button', { name: 'New chat', exact: true }).click();
  await expect.poll(() => currentId(page)).not.toBe(originalId);
  await send(page, 'New safe project');
  await page.evaluate(() => {
    const driver = (window as any).navigationDeferredDriver;
    const stale = { ...driver.run, status: 'review', gate: 'storyboard' };
    driver.callbacks.onUpdate(stale); driver.resolve(stale);
  });
  await expect(page.locator('.companion-message-user')).toHaveText('New safe project');
  await expect(page.getByRole('button', { name: 'Open storyboard', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Approve storyboard', exact: true })).toHaveCount(0);
  expect(backend.submissions).toHaveLength(0); expect(backend.unexpected).toEqual([]);
});

test('failed storage keeps the current draft and allows an explicit save retry', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 }); await openFixture(page);
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    (window as any).navigationFailStorage = true;
    IDBObjectStore.prototype.put = function(...args: Parameters<IDBObjectStore['put']>) {
      if (this.name === 'conversations' && (window as any).navigationFailStorage) throw new DOMException('Fixture quota exhausted', 'QuotaExceededError');
      return put.apply(this, args);
    };
  });
  const id = await currentId(page);
  await send(page, 'Keep this unsaved coffee project');
  await expect(page.getByRole('button', { name: 'Retry saving', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New chat', exact: true }).click();
  expect(await currentId(page)).toBe(id);
  await expect(page.locator('.companion-message-user')).toHaveText('Keep this unsaved coffee project');
  await page.evaluate(() => { (window as any).navigationFailStorage = false; });
  await page.getByRole('button', { name: 'Retry saving', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry saving', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'New chat', exact: true }).click();
  await expect(page.locator('.companion-message-user')).toHaveCount(0);
  await nav(page).getByRole('button', { name: /Keep this unsaved coffee project/ }).click();
  await expect(page.locator('.companion-message-user')).toHaveText('Keep this unsaved coffee project');
  await expect(page.locator('#companion-save-status')).toContainText('Draft saved on this device.');
  await page.reload();
  await expect(page.locator('.companion-message-user')).toHaveText('Keep this unsaved coffee project');
});

test('failed saved-chat load is recoverable without replacing the stored book', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 }); await openFixture(page);
  await send(page, 'Recover this saved coffee');
  const id = await currentId(page);
  await page.addInitScript(() => {
    const open = IDBFactory.prototype.open;
    (window as any).navigationFailOpen = true;
    IDBFactory.prototype.open = function(...args: Parameters<IDBFactory['open']>) {
      if (args[0] === 'grifon_companion' && (window as any).navigationFailOpen) throw new DOMException('Fixture storage denied', 'SecurityError');
      return open.apply(this, args);
    };
  });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Retry saved chats', exact: true })).toBeVisible();
  await expect(input(page)).toHaveCount(0);
  await page.evaluate(() => { (window as any).navigationFailOpen = false; });
  await page.getByRole('button', { name: 'Retry saved chats', exact: true }).click();
  await expect(page.locator('.companion-message-user')).toHaveText('Recover this saved coffee');
  expect(await currentId(page)).toBe(id);
});

for (const allowance of ['pending', 'denied'] as const) {
  test(`production history Resume cannot submit while allowance is ${allowance}`, async ({ page }) => {
    const backend = await installRecoveryBackend(page, seededRun('video')); backend.holdVideo = true;
    let release!: () => void;
    const hold = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/api/billing?action=usage', async route => {
      if (allowance === 'pending') await hold;
      const meter = { used: 20, limit: 20, remaining: 0 };
      await route.fulfill({ json: { plan: 'pro', workflows: meter, reports: meter, captions: meter, images: meter, video_ads: meter, omni_ads: meter } });
    });
    await page.addInitScript(id => localStorage.setItem('osa_producer_companion:recovery-user', id), RUN_ID);
    try {
      await page.goto('http://localhost:5173/app?experience=companion');
      await expect.poll(() => backend.reads.length).toBeGreaterThan(0);
      const resume = page.getByRole('button', { name: 'Resume saved progress', exact: true });
      await expect(page.getByText(/Saved conversation/)).toBeVisible();
      if (await resume.isVisible() && await resume.isEnabled()) await resume.click();
      await page.waitForTimeout(700);
      expect(backend.actions).toEqual([]); expect(backend.submissions).toEqual([]); expect(backend.checkpoints).toEqual([]); expect(backend.finalStarts).toEqual([]);
    } finally { release(); }
  });
}

test('retrying a failed historical run load only reads; it never resumes production', async ({ page }) => {
  const backend = await installRecoveryBackend(page, seededRun('video')); backend.loadFails = true;
  await page.addInitScript(id => localStorage.setItem('osa_producer_companion:recovery-user', id), RUN_ID);
  await page.goto('http://localhost:5173/app?experience=companion');
  await page.getByRole('button', { name: 'Retry saved ad', exact: true }).waitFor();
  backend.loadFails = false;
  await page.getByRole('button', { name: 'Retry saved ad', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume saved progress', exact: true })).toBeVisible();
  await page.waitForTimeout(500);
  expect(backend.reads.length).toBeGreaterThan(1);
  expect(backend.actions).toEqual([]); expect(backend.submissions).toEqual([]); expect(backend.checkpoints).toEqual([]); expect(backend.finalStarts).toEqual([]);
});

test('Resume refreshes a stale running snapshot and never resubmits a run already completed elsewhere', async ({ page }) => {
  const backend = await installRecoveryBackend(page, seededRun('video')); backend.holdVideo = true;
  await page.addInitScript(id => localStorage.setItem('osa_producer_companion:recovery-user', id), RUN_ID);
  await page.goto('http://localhost:5173/app?experience=companion');
  await expect(page.getByRole('button', { name: 'Resume saved progress', exact: true })).toBeVisible();
  const reads = backend.reads.length;
  const completed = seededRun('first_cut'); completed.row.status = 'done';
  backend.row = completed.row; backend.scenes = completed.scenes;
  await page.getByRole('button', { name: 'Resume saved progress', exact: true }).click();
  await expect.poll(() => backend.reads.length).toBeGreaterThan(reads);
  await expect(page.getByRole('button', { name: 'Open first cut', exact: true })).toBeVisible();
  expect(backend.actions).toEqual([]); expect(backend.submissions).toEqual([]); expect(backend.checkpoints).toEqual([]); expect(backend.finalStarts).toEqual([]);
});

test.describe('rendered control closeups', () => {
  test.use({ deviceScaleFactor: 2, viewport: { width: 1280, height: 900 } });
  test('sidebar and storyboard controls at double pixel density', async ({ page }) => {
    await openFixture(page);
    fs.mkdirSync(QA, { recursive: true });
    await page.getByRole('button', { name: 'New chat', exact: true }).screenshot({ path: path.join(QA, 'new-chat-2x.png') });
    await page.getByRole('button', { name: 'Studio', exact: true }).screenshot({ path: path.join(QA, 'studio-2x.png') });
    await page.evaluate(() => (window as any).companionFixture.emit('storyboard'));
    await page.getByRole('button', { name: 'Open storyboard', exact: true }).click();
    await page.getByRole('dialog', { name: 'Storyboard', exact: true }).screenshot({ path: path.join(QA, 'storyboard-viewer-2x.png') });
  });
});

test('pending device writes say Saving and only become Saved after the write completes', async ({ page }) => {
  if (process.env.COMPANION_OLD_SAVING === '1') await page.route(/\/components\/CompanionChat\/CompanionChatSurface\.tsx(?:\?.*)?$/, async route => {
    const response = await route.fetch(); const body = await response.text();
    // Route-only reconstruction of the old missing pending-save presentation.
    // Runtime source remains unchanged; this guard must reject the old behavior.
    if (!body.includes('conversation?.saving')) throw new Error('Pending-save negative control no longer matches the source');
    await route.fulfill({ response, body: body.replaceAll('conversation?.saving', 'false') });
  });
  await page.route(/\/services\/companionConversations\.ts(?:\?.*)?$/, route => {
    if (route.request().url().includes('saving-original')) return route.fallback();
    return route.fulfill({ contentType: 'application/javascript', body: `
      export * from '/services/companionConversations.ts?saving-original';
      import {saveConversations as save} from '/services/companionConversations.ts?saving-original';
      export const saveConversations=book=>window.navigationHoldWrite
        ? new Promise((resolve,reject)=>{window.navigationReleaseWrite=()=>{window.navigationHoldWrite=false;save(book).then(resolve,reject);};})
        : save(book);
    ` });
  });
  await openFixture(page);
  await expect(page.locator('#companion-save-status')).toContainText('Draft saved on this device.');
  await page.evaluate(() => { (window as any).navigationHoldWrite = true; });
  await input(page).fill('Pending storage text');
  await expect(page.locator('#companion-save-status')).toContainText('Saving on this device');
  await expect(page.getByRole('button', { name: 'Retry saving', exact: true })).toHaveCount(0);
  await page.evaluate(() => (window as any).navigationReleaseWrite());
  await expect(page.locator('#companion-save-status')).toContainText('Draft saved on this device.');
});

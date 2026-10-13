import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { installRecoveryBackend, seededRun, RUN_ID } from './fixtures/oneshotRecovery.js';

const QA = path.resolve(process.env.COMPANION_QA_DIR || 'assets/3d-lab/grifon-companion-chat/qa');
test.use({ serviceWorkers: 'block' });
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9X8AAAAASUVORK5CYII=', 'base64');
const answers = ['Cold brew for busy parents. Promote our new bottle.', 'North Coffee', 'Morning brew', 'Two bottles for 199', '199'];
const composer = (page: Page) => page.getByRole('textbox', { name: 'Message Grifon' });
const snapshot = (page: Page) => page.evaluate(() => (window as any).companionFixture.snapshot());
const emit = (page: Page, event: string) => page.evaluate(value => (window as any).companionFixture.emit(value), event);

async function openFixture(page: Page) {
  const unexpected: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('**/*', route => {
    const req = route.request(); const url = new URL(req.url());
    if (req.method() === 'GET' && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
    if (url.pathname === '/__companion_fixture/video.webm') return route.fulfill({ contentType: 'video/webm', path: 'tests/e2e/fixtures/recovery.webm' });
    if (!['http://127.0.0.1:5173', 'http://localhost:5173'].includes(url.origin) || (url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/_lib/'))) {
      unexpected.push(`${req.method()} ${url.origin}${url.pathname}`);
      return route.abort('blockedbyclient');
    }
    return route.fallback();
  });
  await page.goto('/companion-chat-preview.html');
  await expect(composer(page)).toBeVisible();
  await expect(page.locator('#companion-save-status')).toBeVisible();
  await expect(page.locator('#companion-save-status')).toContainText('Preview · simulated output');
  return { unexpected, errors };
}

async function brief(page: Page, expectGenerate = true) {
  for (const [index, answer] of answers.entries()) {
    await composer(page).fill(answer);
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.locator('article .companion-message-assistant')).toHaveCount(index + 2);
  }
  await expect(page.locator('.companion-message-user')).toHaveText(answers);
  await expect(page.getByRole('status', { name: 'Grifon is typing', exact: true })).toHaveCount(0);
  await page.getByLabel('Product photo', { exact: true }).setInputFiles({ name: 'coffee.png', mimeType: 'image/png', buffer: PNG });
  if (expectGenerate) await expect(page.getByRole('button', { name: 'Generate storyboard', exact: true })).toBeEnabled();
}

test('brief, explicit start, truthful callbacks, storyboard approval, video and supported revisions', async ({ page }) => {
  const evidence = await openFixture(page);
  await brief(page);
  expect((await snapshot(page)).calls.filter((c: any) => c.name === 'start')).toHaveLength(0);
  await page.getByRole('button', { name: 'Generate storyboard', exact: true }).dblclick();
  await expect.poll(async () => (await snapshot(page)).calls.filter((c: any) => c.name === 'start')).toHaveLength(1);
  await expect(page.getByText('Researching your product', { exact: true }).first()).toBeVisible();
  await expect(page.getByTestId('companion-chat')).toHaveAttribute('data-companion-state', 'working');
  await emit(page, 'script');
  await expect(page.getByText(/writing your script/i).first()).toBeVisible();
  await expect(page.locator('video')).toHaveCount(0);
  await emit(page, 'storyboard');
  await page.getByRole('button', { name: 'Open storyboard', exact: true }).click();
  await expect(page.getByRole('button', { name: /approve storyboard/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /approve storyboard/i })).toBeEnabled();
  expect((await snapshot(page)).calls.filter((c: any) => c.name === 'approve')).toHaveLength(0);
  await page.getByRole('button', { name: /approve storyboard/i }).click();
  await expect.poll(async () => (await snapshot(page)).calls.filter((c: any) => c.name === 'approve')).toHaveLength(1);
  await expect(page.getByRole('button', { name: 'Open storyboard', exact: true })).toHaveCount(0);
  await emit(page, 'result');
  await expect(page.locator('video')).toBeVisible();
  await expect(page.getByTestId('companion-chat')).toHaveAttribute('data-companion-state', 'ready');
  await composer(page).fill('Reshoot scene 1'); await page.getByRole('button', { name: 'Send', exact: true }).click();
  expect((await snapshot(page)).calls.filter((c: any) => c.name === 'reshoot')).toHaveLength(0);
  await page.getByRole('button', { name: 'Confirm reshoot', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).calls.filter((call: any) => call.name === 'reshoot')).toEqual([{ name: 'reshoot', value: 0 }]);
  await composer(page).fill('style clean'); await page.getByRole('button', { name: 'Send', exact: true }).click();
  expect((await snapshot(page)).calls.filter((c: any) => c.name === 'choosePreset')).toHaveLength(0);
  await page.getByRole('button', { name: 'Apply style', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).calls.filter((call: any) => call.name === 'choosePreset')).toEqual([{ name: 'choosePreset', value: 'clean' }]);
  const before = (await snapshot(page)).calls.length;
  await composer(page).fill('Make it magically viral'); await page.getByRole('button', { name: 'Send', exact: true }).click();
  expect((await snapshot(page)).calls.length).toBe(before);
  expect(evidence.unexpected).toEqual([]); expect(evidence.errors).toEqual([]);
});

test('IME Enter does not submit; invalid files and missing image cannot generate', async ({ page }) => {
  await openFixture(page);
  await composer(page).fill('Unfinished composition');
  await composer(page).dispatchEvent('compositionstart');
  await composer(page).dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true });
  expect(await composer(page).inputValue()).toBe('Unfinished composition');
  await composer(page).dispatchEvent('compositionend');
  await expect(composer(page)).toBeFocused();
  await page.getByLabel('Product photo', { exact: true }).setInputFiles({ name: 'script.html', mimeType: 'text/html', buffer: Buffer.from('<h1>invalid</h1>') });
  await expect(page.getByText(/png|jpeg|webp|image file/i).last()).toBeVisible();
  expect((await snapshot(page)).calls.filter((c: any) => c.name === 'start')).toHaveLength(0);
});

test('draft reload/account isolation, error retry and fixture checkpoint restore', async ({ page }) => {
  await openFixture(page); await brief(page);
  await expect(page.locator('#companion-save-status')).toContainText('Draft saved on this device.');
  await page.reload(); await expect(page.getByRole('button', { name: 'Generate storyboard', exact: true })).toBeEnabled();
  await page.evaluate(() => (window as any).companionFixture.account('fixture-user-b'));
  await expect(page.getByText('North Coffee', { exact: true })).toHaveCount(0);
  await page.evaluate(() => (window as any).companionFixture.account('fixture-user-a'));
  await expect(page.getByRole('button', { name: 'Generate storyboard', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Generate storyboard', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).calls.filter((c: any) => c.name === 'start')).toHaveLength(1);
  await expect(page.getByText('Researching your product', { exact: true }).first()).toBeVisible();
  await emit(page, 'error');
  await page.getByRole('button', { name: 'Resume saved progress', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).calls.filter((c: any) => c.name === 'retry')).toEqual([{ name: 'retry' }]);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await emit(page, 'storyboard');
  await expect(page.getByRole('button', { name: 'Open storyboard', exact: true })).toBeVisible();
  await expect(page.locator('#companion-save-status')).toContainText('Draft saved on this device.');
  await page.reload();
  await page.getByRole('button', { name: 'Open storyboard', exact: true }).click();
  await expect(page.getByRole('button', { name: /approve storyboard/i })).toBeVisible();
  expect((await snapshot(page)).calls.filter((c: any) => c.name === 'start')).toHaveLength(0);
});

for (const width of [320, 375, 390, 1280]) {
  test(`${width}px layout and real avatar bridge`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1280 ? 900 : width === 375 ? 667 : 844 });
    const evidence = await openFixture(page);
    await expect(page.locator('iframe[title="Grifon animated companion"]:visible')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const small = await page.locator('button:visible').evaluateAll(buttons => buttons.filter(button => {
      const b = button.getBoundingClientRect(); return b.width < 43.5 || b.height < 43.5;
    }).map(button => ({ text: button.getAttribute('aria-label') || button.textContent, width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })));
    expect(small).toEqual([]);
    await page.screenshot({ path: `${QA}/initial-${width}.png`, fullPage: true });
    await brief(page);
    await page.getByRole('button', { name: 'Generate storyboard', exact: true }).click();
    await expect.poll(async () => (await snapshot(page)).calls.filter((c: any) => c.name === 'start')).toHaveLength(1);
    const frame = await (await page.locator('iframe:visible').elementHandle())!.contentFrame();
    await expect.poll(() => frame!.evaluate(() => (window as any).grifonDebug.snapshot().reaction.state)).toBe('working');
    await expect(page.getByRole('button', { name: /^(Pause|Resume) companion motion$/ })).toHaveCount(0);
    const animated = await frame!.evaluate(() => (window as any).grifonDebug.snapshot());
    await expect.poll(() => frame!.evaluate(() => (window as any).grifonDebug.snapshot().frameCount)).toBeGreaterThan(animated.frameCount);
    const avatarElement = await page.locator('iframe:visible').elementHandle();
    await page.setViewportSize({ width: width === 1280 ? 390 : 1280, height: 900 });
    expect(await avatarElement!.evaluate(element => element.isConnected)).toBe(true);
    await expect.poll(() => frame!.evaluate(() => (window as any).grifonDebug.snapshot().reaction.state)).toBe('working');
    expect(evidence.unexpected).toEqual([]); expect(evidence.errors).toEqual([]);
  });
}

test('reduced motion stays static and companion failure leaves usable chat', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openFixture(page);
  await expect(page.locator('iframe:visible')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
  const frame = (await (await page.locator('iframe:visible').elementHandle())!.contentFrame())!;
  const pose = await frame.evaluate(() => (window as any).grifonDebug.snapshot().controls);
  await page.waitForTimeout(350);
  expect(await frame.evaluate(() => (window as any).grifonDebug.snapshot().controls)).toEqual(pose);
  await frame.evaluate(() => { const gl = document.querySelector('canvas')!.getContext('webgl2')!; gl.getExtension('WEBGL_lose_context')!.loseContext(); });
  await expect(page.getByRole('button', { name: 'Retry companion motion' })).toBeVisible();
  await composer(page).fill('Chat still works'); await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByTestId('conversation-scroll').getByText('Chat still works', { exact: true })).toBeVisible();
});

test('actual App and ProducerFlow restore the same account run without generation', async ({ page }) => {
  const backend = await installRecoveryBackend(page, seededRun('storyboard'));
  await page.addInitScript(id => localStorage.setItem('osa_producer_companion:recovery-user', id), RUN_ID);
  await page.goto('http://localhost:5173/app?experience=companion');
  await page.getByRole('button', { name: 'Open storyboard', exact: true }).click();
  await expect(page.getByRole('button', { name: /approve storyboard/i })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: /approve storyboard/i })).toBeDisabled();
  await page.reload();
  await page.getByRole('button', { name: 'Open storyboard', exact: true }).click();
  await expect(page.getByRole('button', { name: /approve storyboard/i })).toBeVisible();
  expect(new Set(backend.reads)).toEqual(new Set([RUN_ID]));
  expect(backend.submissions).toHaveLength(0); expect(backend.finalStarts).toHaveLength(0);
  expect(backend.unexpected).toEqual([]);
});

test('actual ProducerFlow prevents duplicate starts and ignores research completing after cancellation', async ({ page }) => {
  const backend = await installRecoveryBackend(page);
  await page.route(/\/services\/geminiService\.ts(?:\?.*)?$/, route => {
    if (route.request().url().includes('companion-original')) return route.fallback();
    return route.fulfill({ contentType: 'application/javascript', body: `
      export * from '/services/geminiService.ts?companion-original';
      window.companionResearch = {calls:0,resolve:null};
      export const generateMarketResearch = async () => { window.companionResearch.calls++; return new Promise(resolve=>{window.companionResearch.resolve=resolve}); };
      export const generateAvatarImage = async () => { throw new Error('Unexpected avatar generation after cancelled research'); };
    ` });
  });
  await page.goto('http://localhost:5173/app?experience=companion');
  await expect(composer(page)).toBeVisible({ timeout: 30_000 });
  await brief(page);
  expect(await page.evaluate(() => (window as any).companionResearch.calls)).toBe(0);
  await page.getByRole('button', { name: 'Generate storyboard', exact: true }).dblclick();
  await expect.poll(() => page.evaluate(() => (window as any).companionResearch.calls)).toBe(1);
  await page.getByRole('button', { name: /stop waiting|cancel/i }).click();
  await page.evaluate(() => (window as any).companionResearch.resolve({}));
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => (window as any).companionResearch.calls)).toBe(1);
  await expect(page.getByText(/stopped waiting/i).first()).toBeVisible();
  await page.getByRole('button', { name: 'Back to brief', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Generate storyboard', exact: true })).toBeEnabled();
  expect(backend.submissions).toHaveLength(0); expect(backend.checkpoints).toHaveLength(0);
  expect(backend.unexpected).toEqual([]);
});

test('allowance and preset gates dispatch no generation or revision until permitted', async ({ page }) => {
  await openFixture(page); await brief(page);
  await page.evaluate(() => (window as any).companionFixture.quota(true));
  await expect(page.getByRole('button', { name: 'Generate storyboard', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'View plan options', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).calls.filter((c: any) => c.name === 'upgrade')).toHaveLength(1);
  expect((await snapshot(page)).calls.filter((c: any) => c.name === 'start')).toHaveLength(0);
  await emit(page, 'storyboard');
  await page.getByRole('button', { name: 'Open storyboard', exact: true }).click();
  await page.evaluate(() => (window as any).companionFixture.videoAllowed(false));
  await page.getByRole('button', { name: 'Unlock video production', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).calls.filter((c: any) => c.name === 'upgrade')).toHaveLength(2);
  expect((await snapshot(page)).calls.filter((c: any) => c.name === 'approve')).toHaveLength(0);
  await emit(page, 'result');
  await page.evaluate(() => (window as any).companionFixture.presets(false));
  await composer(page).fill('style clean'); await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText(/Clean requires Pro/i)).toBeVisible();
  expect((await snapshot(page)).calls.filter((c: any) => c.name === 'choosePreset')).toHaveLength(0);
});

test('late attachment completion cannot cross an account remount', async ({ page }) => {
  await page.route(/\/utils\/imageCompression\.ts(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: `
    export const compressImageForUpload=()=>new Promise(resolve=>{window.finishCompanionUpload=resolve});
  ` }));
  await openFixture(page);
  await page.getByLabel('Product photo', { exact: true }).setInputFiles({ name: 'old-account.png', mimeType: 'image/png', buffer: PNG });
  await expect.poll(() => page.evaluate(() => typeof (window as any).finishCompanionUpload)).toBe('function');
  await page.evaluate(() => (window as any).companionFixture.account('fixture-user-b'));
  await page.evaluate(() => (window as any).finishCompanionUpload({ dataUrl: 'data:image/png;base64,iVBORw0KGgo=' }));
  await page.waitForTimeout(100);
  await expect(page.getByRole('img', { name: 'Attached product', exact: true })).toHaveCount(0);
  await expect(page.getByText('old-account.png', { exact: true })).toHaveCount(0);
  await expect.poll(() => page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open('grifon_companion', 1); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    try {
      return await new Promise<string | undefined>((resolve, reject) => {
        const request = db.transaction('conversations', 'readonly').objectStore('conversations').get('fixture-user-b');
        request.onsuccess = () => { const book = request.result; resolve(book?.chats.find((chat: any) => chat.id === book.selectedId)?.draft.heroImageBase64); };
        request.onerror = () => reject(request.error);
      });
    } finally { db.close(); }
  })).toBe('');
});

test('actual ProducerFlow rejects stale orchestrator callbacks after Stop waiting', async ({ page }) => {
  const backend = await installRecoveryBackend(page, seededRun('video'));
  await page.addInitScript(id => localStorage.setItem('osa_producer_companion:recovery-user', id), RUN_ID);
  await page.route(/\/services\/producerOrchestrator\.ts(?:\?.*)?$/, route => {
    if (route.request().url().includes('companion-original')) return route.fallback();
    return route.fulfill({ contentType: 'application/javascript', body: `
      export * from '/services/producerOrchestrator.ts?companion-original';
      export const runProduction=(run,callbacks)=>new Promise(resolve=>{window.companionDeferredDriver={run,callbacks,resolve};});
    ` });
  });
  await page.goto('http://localhost:5173/app?experience=companion');
  await page.getByRole('button', { name: 'Resume saved progress', exact: true }).click();
  await page.getByRole('button', { name: 'Stop waiting', exact: true }).click();
  await page.evaluate(() => {
    const driver = (window as any).companionDeferredDriver;
    const stale = { ...driver.run, status: 'review', gate: 'storyboard' };
    driver.callbacks.onUpdate(stale); driver.resolve(stale);
  });
  await expect(page.getByRole('alert')).toContainText('Stopped waiting');
  await expect(page.getByRole('button', { name: 'Approve storyboard', exact: true })).toHaveCount(0);
  expect(backend.submissions).toHaveLength(0); expect(backend.unexpected).toEqual([]);
});

test('actual route fails closed while allowance is unknown and recovers after Retry allowance', async ({ page }) => {
  const backend = await installRecoveryBackend(page);
  let released = false, healthy = false;
  const pending: (() => void)[] = [];
  await page.route('**/api/billing?action=usage', async route => {
    if (!released) await new Promise<void>(resolve => pending.push(resolve));
    if (!healthy) return route.fulfill({ status: 503, json: { error: 'Fixture allowance temporarily unavailable' } });
    const meter = { used: 0, limit: 20, remaining: 20 };
    return route.fulfill({ json: { plan: 'pro', workflows: meter, reports: meter, captions: meter, images: meter, video_ads: meter, omni_ads: meter } });
  });
  // Route-only historical wrapper: this recreates the original missing readiness guard
  // without modifying runtime files. The assertion below must reject it.
  if (process.env.COMPANION_OLD_QUOTA === '1') await page.route(/\/components\/CompanionChat\/index\.tsx(?:\?.*)?$/, route => route.fulfill({ contentType: 'application/javascript', body: `
    import React from '/node_modules/.vite/deps/react.js';
    import ProducerFlow from '/components/OneShotAd/ProducerFlow.tsx';
    import {useQuota} from '/hooks/useQuota.ts';
    import {CompanionChatSurface} from '/components/CompanionChat/CompanionChatSurface.tsx';
    export default function CompanionChat({userId,presetUnlocked,isBusinessTier,videoAllowed,onBack,onUpgrade}) {
      const quota=useQuota(); const quotaBlocked=quota.loaded&&!quota.loading&&(quota.reports.remaining===0||quota.workflows.remaining===0);
      return React.createElement(ProducerFlow,{userId,directorUnlocked:false,presetUnlocked,isBusinessTier,onBack,onUpgrade,onSwitchToSteps:onBack,onCloneVoice:onBack,
        renderSurface:controller=>React.createElement(CompanionChatSurface,{userId,controller:{...controller,start:input=>quotaBlocked?Promise.resolve(onUpgrade()):controller.start(input),approve:()=>videoAllowed===true?controller.approve():videoAllowed===false?Promise.resolve(onUpgrade()):Promise.resolve()},onBack,onUpgrade,presetUnlocked,quotaBlocked,videoAllowed})});
    }
  ` }));
  await page.goto('http://localhost:5173/app?experience=companion');
  await expect(composer(page)).toBeVisible(); await brief(page, false);
  try {
    await expect(page.getByRole('button', { name: 'Generate storyboard', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'View plan options', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Checking allowance…', exact: true })).toBeDisabled();
  } finally { released = true; pending.splice(0).forEach(resolve => resolve()); }
  await expect(page.getByRole('button', { name: 'Retry allowance', exact: true })).toBeVisible();
  healthy = true;
  await page.getByRole('button', { name: 'Retry allowance', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Generate storyboard', exact: true })).toBeEnabled();
  expect(backend.submissions).toHaveLength(0); expect(backend.checkpoints).toHaveLength(0); expect(backend.unexpected).toEqual([]);
});

test('actual upgrade and browser Back preserve companion intent and the local brief', async ({ page }) => {
  const backend = await installRecoveryBackend(page);
  await page.route('**/api/billing?action=usage', route => {
    const meter = { used: 20, limit: 20, remaining: 0 };
    return route.fulfill({ json: { plan: 'pro', workflows: meter, reports: meter, captions: meter, images: meter, video_ads: meter, omni_ads: meter } });
  });
  await page.goto('http://localhost:5173/app?experience=companion');
  await expect(composer(page)).toBeVisible(); await brief(page, false);
  await page.getByRole('button', { name: 'View plan options', exact: true }).click();
  await expect(page).toHaveURL(/\/pricing/);
  await page.goBack();
  await expect(page).toHaveURL(/experience=companion/);
  await expect(composer(page)).toBeVisible();
  await expect(page.getByRole('button', { name: 'View plan options', exact: true })).toBeVisible();
  expect(backend.submissions).toHaveLength(0); expect(backend.checkpoints).toHaveLength(0);
});

test('actual saved-run load failure retries the same run without resubmitting', async ({ page }) => {
  const backend = await installRecoveryBackend(page, seededRun('storyboard')); backend.loadFails = true;
  await page.addInitScript(id => localStorage.setItem('osa_producer_companion:recovery-user', id), RUN_ID);
  await page.goto('http://localhost:5173/app?experience=companion');
  await expect(page.getByRole('button', { name: 'Retry saved ad', exact: true })).toBeVisible();
  backend.loadFails = false;
  await page.getByRole('button', { name: 'Retry saved ad', exact: true }).click();
  await page.getByRole('button', { name: 'Open storyboard', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Approve storyboard', exact: true })).toBeVisible();
  await expect(page.getByTestId('companion-chat')).toHaveAttribute('data-companion-state', 'ready');
  expect(new Set(backend.reads)).toEqual(new Set([RUN_ID]));
  expect(backend.submissions).toHaveLength(0); expect(backend.checkpoints).toHaveLength(0); expect(backend.unexpected).toEqual([]);
});

test('avatar asset load failure offers still-image fallback and retry without blocking text', async ({ page }) => {
  let fail = true;
  await page.route('**/companion/scene.bin', route => fail ? route.fulfill({ status: 503, body: 'Fixture asset failure' }) : route.continue());
  await openFixture(page);
  await expect(page.getByRole('button', { name: 'Retry companion motion', exact: true })).toBeVisible();
  await composer(page).fill('My brief is safe'); await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByTestId('conversation-scroll').getByText('My brief is safe', { exact: true })).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Retry companion motion', exact: true }).click();
  await expect(page.locator('iframe:visible')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
});

test('parent pointer events move the embedded companion eyes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFixture(page);
  await expect(page.locator('iframe:visible')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
  const frame = (await (await page.locator('iframe:visible').elementHandle())!.contentFrame())!;
  await page.mouse.move(5, 350);
  await expect.poll(() => frame.evaluate(() => (window as any).grifonDebug.snapshot().target.x)).toBeLessThan(0);
  await expect.poll(() => frame.evaluate(() => (window as any).grifonDebug.snapshot().controls.gazeX)).toBeLessThan(0);
  const left = await frame.evaluate(() => (window as any).grifonDebug.snapshot().controls.gazeX);
  await page.mouse.move(385, 350);
  await expect.poll(() => frame.evaluate(() => (window as any).grifonDebug.snapshot().target.x)).toBeGreaterThan(0);
  await expect.poll(() => frame.evaluate(() => (window as any).grifonDebug.snapshot().controls.gazeX)).toBeGreaterThan(Math.max(0, left + 0.1));
  const right = await frame.evaluate(() => (window as any).grifonDebug.snapshot().controls.gazeX);
  expect(right - left).toBeGreaterThan(0.1);
});

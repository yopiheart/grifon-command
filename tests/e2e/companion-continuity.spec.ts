import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const QA = path.resolve(process.env.COMPANION_CONTINUITY_QA_DIR || 'assets/design/companion-continuity/qa');
const phase = process.env.COMPANION_CONTINUITY_PHASE || 'current';
const FRAME = 'iframe[title="Grifon animated companion"]';
const FALLBACK = 'img[src$="/companion/neutral.png"]';
const input = (page: Page) => page.getByRole('textbox', { name: 'Message Grifon', exact: true });
const currentId = (page: Page) => page.getByTestId('companion-chat').getAttribute('data-chat-id');

async function configure(page: Page, width: number) {
  await page.setViewportSize({ width, height: width === 1280 ? 900 : width === 375 ? 667 : 844 });
  await page.addInitScript(() => {
    // Never open a microphone while testing unrelated renderer lifecycle.
    delete (window as any).SpeechRecognition; delete (window as any).webkitSpeechRecognition;
    const events: { type: string; at: number; ready?: string | null }[] = [];
    const frameSelector = 'iframe[title="Grifon animated companion"]';
    const fallbackSelector = 'img[src$="/companion/neutral.png"]';
    const collect = (node: Node, type: string) => {
      if (!(node instanceof Element)) return;
      for (const selector of [frameSelector, fallbackSelector]) {
        const matches = [...(node.matches(selector) ? [node] : []), ...Array.from(node.querySelectorAll(selector))];
        for (const element of matches) events.push({ type: `${selector === frameSelector ? 'iframe' : 'fallback'}-${type}`, at: performance.now(), ready: element.getAttribute('data-ready') });
      }
    };
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'attributes' && record.target instanceof Element && record.target.matches(frameSelector)) {
          events.push({ type: 'ready-change', at: performance.now(), ready: record.target.getAttribute('data-ready') });
        } else {
          record.removedNodes.forEach(node => collect(node, 'removed'));
          record.addedNodes.forEach(node => collect(node, 'added'));
        }
      }
    });
    observer.observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-ready'] });
    (window as any).continuityEvidence = { events, reference: null };
  });
  const requests: string[] = [], rejected: string[] = [];
  page.on('request', request => { const url = new URL(request.url()); if (url.pathname.startsWith('/companion/')) requests.push(url.pathname); });
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() === 'GET' && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
    if (url.pathname === '/tests/fixtures/sample-batch/before_after-run1-complete-raw.mp4') return route.fulfill({ contentType: 'video/webm', path: 'tests/e2e/fixtures/recovery.webm' });
    if (!['http://127.0.0.1:5173', 'http://localhost:5173'].includes(url.origin) || url.pathname.startsWith('/api/')) {
      rejected.push(`${request.method()} ${url.origin}${url.pathname}`); return route.abort();
    }
    return route.continue();
  });
  fs.mkdirSync(QA, { recursive: true });
  return { requests, rejected };
}

async function load(page: Page) {
  await page.goto('/companion-chat-preview.html'); await expect(input(page)).toBeVisible();
}
async function ready(page: Page) { await expect(page.locator(FRAME)).toHaveAttribute('data-ready', 'true', { timeout: 30_000 }); }
async function capture(page: Page, name: string, data: unknown) {
  fs.writeFileSync(path.join(QA, `${phase}-${name}.json`), JSON.stringify(data, null, 2));
  await page.screenshot({ path: path.join(QA, `${phase}-${name}.png`), fullPage: true });
}
async function markReadyRenderer(page: Page) {
  await page.evaluate(() => {
    const evidence = (window as any).continuityEvidence;
    const iframe = document.querySelector('iframe[title="Grifon animated companion"]') as HTMLIFrameElement;
    evidence.reference = { iframe, window: iframe.contentWindow, canvas: iframe.contentDocument!.querySelector('canvas') };
    evidence.events.length = 0;
  });
}
async function observation(page: Page) {
  return page.evaluate(() => {
    const ledger = (window as any).continuityEvidence;
    const iframe = document.querySelector('iframe[title="Grifon animated companion"]') as HTMLIFrameElement | null;
    const canvas = iframe?.contentDocument?.querySelector('canvas');
    const debug = (iframe?.contentWindow as any)?.grifonDebug?.snapshot();
    return {
      sameIframe: !!iframe && iframe === ledger.reference?.iframe,
      sameWindow: !!iframe && iframe.contentWindow === ledger.reference?.window,
      sameCanvas: !!canvas && canvas === ledger.reference?.canvas,
      originalIframeConnected: ledger.reference?.iframe.isConnected ?? null,
      originalCanvasConnected: ledger.reference?.canvas?.isConnected ?? null,
      iframeCount: document.querySelectorAll('iframe[title="Grifon animated companion"]').length,
      fallbackCount: document.querySelectorAll('img[src$="/companion/neutral.png"]').length,
      ready: iframe?.getAttribute('data-ready'),
      reaction: debug?.reaction.state, frameCount: debug?.frameCount,
      hostReaction: iframe?.parentElement?.getAttribute('data-companion-state'),
      events: [...ledger.events],
    };
  });
}
async function send(page: Page, text: string) {
  await input(page).fill(text); await input(page).press('Enter');
  await expect(page.getByRole('status', { name: 'Grifon is typing', exact: true })).toHaveCount(0);
}
async function openChat(page: Page, id: string) {
  const navigation = page.getByRole('navigation', { name: 'Conversations', exact: true });
  if (!await navigation.isVisible()) await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
  await navigation.locator(`[data-chat-id="${id}"]`).click();
  await expect(page.getByTestId('companion-chat')).toHaveAttribute('data-chat-id', id);
}

for (const width of [375, 390, 1280]) {
  test(`ready renderer continuity across New chat and saved chats at ${width}px`, async ({ page }) => {
    const network = await configure(page, width); await load(page); await ready(page);
    await send(page, 'Coffee continuity project'); const firstId = (await currentId(page))!;
    await input(page).fill('Coffee unsent draft');
    await expect.poll(() => page.evaluate(() => ((document.querySelector('iframe[title="Grifon animated companion"]') as HTMLIFrameElement)?.contentWindow as any)?.grifonDebug.snapshot().reaction.state)).toBe('reading');
    await markReadyRenderer(page); const requestStart = network.requests.length;
    const snapshots: any[] = [{ action: 'initial ready', ...(await observation(page)) }];
    await page.getByRole('button', { name: 'New chat', exact: true }).click();
    await expect(page.getByTestId('companion-chat')).not.toHaveAttribute('data-chat-id', firstId);
    const secondId = (await currentId(page))!;
    await ready(page); await expect(input(page)).toHaveValue('');
    await expect(page.locator('.companion-message-user')).toHaveCount(0);
    snapshots.push({ action: 'New chat', ...(await observation(page)) });
    await send(page, 'Tea continuity project'); await input(page).fill('Tea unsent draft');
    for (const [id, draft, userMessage] of [[firstId, 'Coffee unsent draft', 'Coffee continuity project'], [secondId, 'Tea unsent draft', 'Tea continuity project'], [firstId, 'Coffee unsent draft', 'Coffee continuity project'], [secondId, 'Tea unsent draft', 'Tea continuity project']]) {
      await openChat(page, id); await ready(page);
      await expect(input(page)).toHaveValue(draft); await expect(page.locator('.companion-message-user')).toHaveText(userMessage);
      await expect.poll(async () => (await observation(page)).reaction).toBe('reading');
      snapshots.push({ action: `Open ${id === firstId ? 'Coffee' : 'Tea'} saved chat`, ...(await observation(page)) });
    }
    // Mocked production affects only the active leaf. It never starts a provider.
    await page.evaluate(() => (window as any).companionFixture.emit('storyboard'));
    await expect.poll(async () => (await observation(page)).reaction).toBe('ready');
    snapshots.push({ action: 'Tea storyboard review', ...(await observation(page)) });
    await openChat(page, firstId); await ready(page);
    await expect(input(page)).toHaveValue('Coffee unsent draft');
    await expect(page.getByRole('button', { name: 'Open storyboard', exact: true })).toHaveCount(0);
    await expect.poll(async () => (await observation(page)).reaction).toBe('reading');
    snapshots.push({ action: 'Return Coffee without Tea production', ...(await observation(page)) });
    const frame = (await (await page.locator(FRAME).elementHandle())!.contentFrame())!;
    await page.mouse.move(5, 350); await expect.poll(() => frame.evaluate(() => (window as any).grifonDebug.snapshot().controls.gazeX)).toBeLessThan(0);
    const left = await frame.evaluate(() => (window as any).grifonDebug.snapshot().controls.gazeX);
    await page.mouse.move(width - 5, 350);
    await expect.poll(() => frame.evaluate(previous => (window as any).grifonDebug.snapshot().controls.gazeX - previous, left)).toBeGreaterThan(.1);
    const final = await observation(page), warmRequests = network.requests.slice(requestStart);
    const calls = await page.evaluate(() => (window as any).companionFixture.snapshot().calls);
    await capture(page, `switches-${width}`, { snapshots, final, warmRequests, rejected: network.rejected, calls });
    for (const snapshot of snapshots) {
      expect.soft(snapshot.sameIframe, `${snapshot.action}: preserve iframe DOM identity`).toBe(true);
      expect.soft(snapshot.sameWindow, `${snapshot.action}: preserve live window identity`).toBe(true);
      expect.soft(snapshot.sameCanvas, `${snapshot.action}: preserve live canvas identity`).toBe(true);
      expect.soft(snapshot.iframeCount).toBe(1); expect.soft(snapshot.fallbackCount).toBe(0);
    }
    expect.soft(warmRequests, 'chat switches must not reload renderer resources').toEqual([]);
    expect.soft(final.events.filter(event => ['iframe-added', 'iframe-removed', 'fallback-added'].includes(event.type)), 'no remount or neutral fallback insertion after initial ready').toEqual([]);
    expect.soft(final.events.filter(event => event.type === 'ready-change' && event.ready !== 'true'), 'ready must never reset for ordinary chat switches').toEqual([]);
    expect(final.frameCount).toBeGreaterThan(snapshots[0].frameCount);
    expect(calls.filter((call: { name: string }) => call.name !== 'fixture-event')).toEqual([]);
    expect(calls.filter((call: { name: string }) => call.name === 'fixture-event')).toEqual([{ name: 'fixture-event', value: 'storyboard' }]);
    expect(network.rejected).toEqual([]);
  });
}

test('pending intake and working production reactions cannot leak into a new chat', async ({ page }) => {
  const network = await configure(page, 390); await load(page); await ready(page); await markReadyRenderer(page);
  const requestStart = network.requests.length;
  await input(page).fill('A pending coffee question'); await input(page).press('Enter');
  await expect(page.getByRole('status', { name: 'Grifon is typing', exact: true })).toBeVisible();
  const intakeId = (await currentId(page))!;
  await page.getByRole('button', { name: 'New chat', exact: true }).click();
  await expect(page.getByTestId('companion-chat')).not.toHaveAttribute('data-chat-id', intakeId); await ready(page);
  await expect.poll(async () => (await observation(page)).reaction).toBe('idle');
  // Exceed the existing600ms reply window to observe any retained old callback.
  await page.waitForTimeout(700); await expect(page.locator('.companion-message-user')).toHaveCount(0);
  await expect(input(page)).toHaveValue(''); expect((await observation(page)).reaction).toBe('idle');
  const productionId = (await currentId(page))!;
  await page.evaluate(() => (window as any).companionFixture.emit('researching'));
  await expect.poll(async () => (await observation(page)).reaction).toBe('working');
  await expect(input(page)).toBeDisabled();
  await page.getByRole('button', { name: 'New chat', exact: true }).click();
  await expect(page.getByTestId('companion-chat')).not.toHaveAttribute('data-chat-id', productionId); await ready(page);
  await expect(input(page)).toBeEnabled(); await expect.poll(async () => (await observation(page)).reaction).toBe('idle');
  await expect(page.getByRole('status').filter({ hasText: 'Researching your product' })).toHaveCount(0);
  await openChat(page, intakeId); await ready(page);
  await expect(page.locator('.companion-message-user')).toHaveText('A pending coffee question');
  await expect(page.getByRole('status', { name: 'Grifon is typing', exact: true })).toHaveCount(0);
  const final = await observation(page), warmRequests = network.requests.slice(requestStart);
  await capture(page, 'reaction-isolation-390', { final, warmRequests, rejected: network.rejected });
  expect(final.sameIframe).toBe(true); expect(final.sameWindow).toBe(true); expect(final.sameCanvas).toBe(true);
  expect(final.events.filter(event => ['iframe-added', 'iframe-removed', 'fallback-added'].includes(event.type))).toEqual([]);
  expect(warmRequests).toEqual([]); expect(network.rejected).toEqual([]);
});

test('cold load reserves the avatar slot without a still while chat works', async ({ page }) => {
  const network = await configure(page, 375); let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/companion/scene.bin', async route => { await held; await route.continue(); });
  try {
    await load(page); await expect(page.locator(FALLBACK)).not.toBeVisible();
    await expect(page.locator(FRAME)).not.toHaveAttribute('data-ready', 'true');
    await send(page, 'Typing while the companion loads');
    await expect(page.locator('.companion-message-user')).toHaveText('Typing while the companion loads');
    await expect(page.locator('.companion-avatar [role="status"]')).toBeVisible();
    await capture(page, 'cold-loading', { fallbackCount: await page.locator(FALLBACK).count(), requests: network.requests });
  } finally { release(); }
  await ready(page); await expect(page.locator(FALLBACK)).toHaveCount(0);
  await capture(page, 'cold-ready', { requests: network.requests, rejected: network.rejected });
  expect(await page.evaluate(() => (window as any).companionFixture.snapshot().calls)).toEqual([]);
  expect(network.rejected).toEqual([]);
});

test('real asset failure keeps an honest still fallback and explicit retry restores motion', async ({ page }) => {
  const network = await configure(page, 390); let fail = true;
  await page.route('**/companion/scene.bin', route => fail ? route.fulfill({ status: 503, body: 'Fixture asset failure' }) : route.continue());
  await load(page); const retry = page.getByRole('button', { name: 'Retry companion motion', exact: true });
  await expect(retry).toBeVisible(); await expect(page.locator(FALLBACK)).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Companion shown as a still image. Chat is available.' })).toBeVisible();
  await send(page, 'Chat remains available after an asset failure');
  await capture(page, 'failed-fallback', { requests: network.requests, fallbackCount: await page.locator(FALLBACK).count() });
  fail = false; await retry.click(); await ready(page);
  await expect(page.locator(FALLBACK)).toHaveCount(0); await expect(retry).toHaveCount(0);
  await expect(page.locator('.companion-message-user')).toHaveText('Chat remains available after an asset failure');
  await capture(page, 'retry-ready', { requests: network.requests, rejected: network.rejected });
  expect(network.requests.filter(value => value === '/companion/scene.bin').length).toBe(2);
  expect(network.rejected).toEqual([]);
});

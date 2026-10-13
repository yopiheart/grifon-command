import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const QA = path.resolve(process.env.COMPANION_STARTUP_QA_DIR || 'assets/design/companion-startup/qa');
const phase = process.env.COMPANION_STARTUP_PHASE || 'final';
const FRAME = 'iframe[title="Grifon animated companion"]';
const STILL = 'img[src$="/companion/neutral.png"]';
const input = (page: Page) => page.getByRole('textbox', { name: 'Message Grifon', exact: true });

async function configure(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.addInitScript(() => {
    delete (window as any).SpeechRecognition; delete (window as any).webkitSpeechRecognition;
    // Observe the browser's actual draw seam, independently of app debug/ready flags.
    const pixelEvidence = { firstPaint: null as null | { at: number; alphaPixels: number; coloredPixels: number; width: number; height: number } };
    (window as any).startupPixels = pixelEvidence;
    for (const method of ['drawElements', 'drawArrays'] as const) {
      const original = WebGL2RenderingContext.prototype[method];
      (WebGL2RenderingContext.prototype as any)[method] = function (...args: any[]) {
        const result = (original as any).apply(this, args);
        if (pixelEvidence.firstPaint || this.canvas.parentElement?.id !== 'canvas-host' || this.isContextLost()) return result;
        const width = this.drawingBufferWidth, height = this.drawingBufferHeight;
        const pixels = new Uint8Array(width * height * 4);
        this.readPixels(0, 0, width, height, this.RGBA, this.UNSIGNED_BYTE, pixels);
        let alphaPixels = 0, coloredPixels = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i + 3] > 0) alphaPixels++;
          if (pixels[i + 3] > 0 && pixels[i] + pixels[i + 1] + pixels[i + 2] > 0) coloredPixels++;
        }
        if (coloredPixels > 1) pixelEvidence.firstPaint = { at: performance.timeOrigin + performance.now(), alphaPixels, coloredPixels, width, height };
        return result;
      };
    }
    if (window !== window.top) return;
    const ledger = { samples: [] as any[], readyMessages: [] as any[], revealAnimations: [] as any[], frameInsertedAt: null as number | null, frameInsertedTimeline: null as number | null, running: true };
    let heldReveal: Animation | null = null;
    const observedReady = new WeakSet<Element>();
    (window as any).startupEvidence = ledger;
    (window as any).resumeStartupReveal = () => { heldReveal?.play(); heldReveal = null; };
    new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof Element && (node.matches('iframe[title="Grifon animated companion"]') || node.querySelector('iframe[title="Grifon animated companion"]'))) {
            ledger.frameInsertedAt = performance.timeOrigin + performance.now();
            ledger.frameInsertedTimeline = document.timeline.currentTime as number;
          }
        }
        const frame = record.target;
        if (record.type !== 'attributes' || !(frame instanceof HTMLIFrameElement) || frame.title !== 'Grifon animated companion'
          || frame.dataset.ready !== 'true' || observedReady.has(frame)) continue;
        observedReady.add(frame);
        // Capture the browser-created transition before a slow parent RAF can miss it.
        for (const animation of frame.getAnimations()) {
          if (!(animation instanceof CSSTransition) || animation.transitionProperty !== 'opacity' || !(animation.effect instanceof KeyframeEffect)) continue;
          const timing = animation.effect.getTiming(), keyframes = animation.effect.getKeyframes();
          animation.pause();
          animation.currentTime = Number(timing.duration) / 2;
          ledger.revealAnimations.push({ at: performance.timeOrigin + performance.now(), duration: timing.duration, keyframes,
            midpointOpacity: Number(getComputedStyle(frame).opacity), playbackRate: animation.playbackRate });
          heldReveal = animation;
        }
      }
    }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-ready', 'style'] });
    const visible = (element: Element | null) => {
      if (!element) return false;
      const b = element.getBoundingClientRect();
      if (!b.width || !b.height) return false;
      for (let current: Element | null = element; current; current = current.parentElement) {
        const s = getComputedStyle(current);
        if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
      }
      return true;
    };
    window.addEventListener('message', event => {
      const frame = document.querySelector('iframe[title="Grifon animated companion"]') as HTMLIFrameElement | null;
      if (event.origin === location.origin && event.source === frame?.contentWindow && event.data?.channel === 'grifon-companion' && event.data.event === 'ready') {
        ledger.readyMessages.push({ at: performance.timeOrigin + performance.now(), firstPaint: (frame!.contentWindow as any).startupPixels?.firstPaint });
      }
    });
    const observe = () => {
      if (!ledger.running) return;
      const frame = document.querySelector('iframe[title="Grifon animated companion"]') as HTMLIFrameElement | null;
      if (frame) {
        const b = frame.parentElement!.getBoundingClientRect(), style = getComputedStyle(frame);
        const cue = frame.parentElement!.querySelector('[role="status"]');
        const state = {
          opacity: Number(Number(style.opacity).toFixed(3)), visible: visible(frame), still: visible(document.querySelector('img[src$="/companion/neutral.png"]')),
          ready: frame.getAttribute('data-ready'),
          cueVisible: visible(cue), cueText: cue?.textContent,
          cueStyle: cue ? { opacity: getComputedStyle(cue).opacity, delay: getComputedStyle(cue).animationDelay, duration: getComputedStyle(cue).animationDuration } : null,
          cueAnimations: cue?.getAnimations().map(animation => ({ startTime: animation.startTime, currentTime: animation.currentTime, playbackRate: animation.playbackRate, timing: animation.effect?.getTiming() })),
          timeline: document.timeline.currentTime,
          slot: { left: Number(b.left.toFixed(2)), top: Number(b.top.toFixed(2)), width: b.width, height: b.height },
          animations: frame.getAnimations().map(animation => ({ duration: animation.effect?.getTiming().duration, keyframes: (animation.effect as KeyframeEffect)?.getKeyframes() })),
        };
        const previous = ledger.samples.at(-1);
        if (!previous || JSON.stringify(state) !== JSON.stringify(previous.state)) ledger.samples.push({ at: performance.timeOrigin + performance.now(), state });
      }
      requestAnimationFrame(observe);
    };
    requestAnimationFrame(observe);
  });
  const rejected: string[] = [], pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() === 'GET' && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
    if (!['http://127.0.0.1:5173', 'http://localhost:5173'].includes(url.origin) || url.pathname.startsWith('/api/')) {
      rejected.push(`${request.method()} ${url.origin}${url.pathname}`); return route.abort();
    }
    return route.continue();
  });
  fs.mkdirSync(QA, { recursive: true });
  return { rejected, pageErrors };
}

async function load(page: Page) {
  await page.goto('/companion-chat-preview.html', { waitUntil: 'domcontentloaded' });
  await expect(input(page)).toBeVisible();
  await assertPublishedSlot(page);
}
async function assertPublishedSlot(page: Page) {
  const initialReservation = await page.locator('[data-companion-avatar-slot]').evaluate(element => {
    const b = element.getBoundingClientRect();
    return { left: b.left, top: b.top, width: b.width, height: b.height };
  });
  await expect(page.locator('.companion-avatar-layer')).toHaveCSS('visibility', 'visible');
  const value = await observation(page);
  assertStableSlot(value.reservedSlot, initialReservation);
  assertStableSlot(value.slot, initialReservation);
}
async function observation(page: Page) {
  return page.evaluate(() => {
    const frame = document.querySelector('iframe[title="Grifon animated companion"]') as HTMLIFrameElement;
    const b = frame.parentElement!.getBoundingClientRect();
    const reserved = document.querySelector('[data-companion-avatar-slot]')!.getBoundingClientRect();
    const style = getComputedStyle(frame);
    const inner = frame.contentDocument!, canvas = inner.querySelector('canvas');
    const fallback = inner.querySelector('#fallback');
    return {
      ready: frame.getAttribute('data-ready'), opacity: Number(style.opacity),
      slot: { left: b.left, top: b.top, width: b.width, height: b.height },
      reservedSlot: { left: reserved.left, top: reserved.top, width: reserved.width, height: reserved.height },
      canvas: canvas ? { width: canvas.width, height: canvas.height } : null,
      innerFallbackVisible: !!fallback && getComputedStyle(fallback).display !== 'none' && getComputedStyle(fallback).visibility !== 'hidden' && Number(getComputedStyle(fallback).opacity) > 0,
      firstPaint: (frame.contentWindow as any).startupPixels?.firstPaint,
      ledger: (window as any).startupEvidence,
      overflow: document.documentElement.scrollWidth - innerWidth,
      calls: (window as any).companionFixture.snapshot().calls,
    };
  });
}
async function capture(page: Page, name: string, details: unknown) {
  fs.writeFileSync(path.join(QA, `${phase}-${name}.json`), JSON.stringify(details, null, 2));
  await page.screenshot({ path: path.join(QA, `${phase}-${name}.png`), fullPage: true });
}
async function assertLoading(page: Page, width: number) {
  await expect(page.locator(FRAME)).not.toHaveAttribute('data-ready', 'true');
  await expect(page.locator(STILL)).not.toBeVisible();
  const value = await observation(page), size = width < 768 ? 56 : 64;
  expect(value.opacity).toBe(0);
  expect(value.slot.width).toBe(size); expect(value.slot.height).toBe(size);
  assertStableSlot(value.slot, value.reservedSlot);
  expect(value.firstPaint).toBeNull();
  expect(value.ledger.readyMessages).toEqual([]);
  expect(value.overflow).toBeLessThanOrEqual(0);
  return value;
}
function assertStableSlot(actual: Awaited<ReturnType<typeof observation>>['slot'], before: Awaited<ReturnType<typeof observation>>['slot']) {
  expect(actual.width).toBe(before.width); expect(actual.height).toBe(before.height);
  // Chromium may quantize the same position by one 1/64px layout unit.
  for (const axis of ['left', 'top'] as const) expect(Math.abs(actual[axis] - before[axis]), `avatar slot ${axis} stays stable`).toBeLessThanOrEqual(0.02);
}
async function assertReady(page: Page, before?: Awaited<ReturnType<typeof observation>>, reduced = false) {
  await expect(page.locator(FRAME)).toHaveAttribute('data-ready', 'true', { timeout: 30_000 });
  await page.evaluate(() => { (window as any).resumeStartupReveal(); });
  await expect.poll(() => page.locator(FRAME).evaluate(element => Number(getComputedStyle(element).opacity))).toBe(1);
  const value = await observation(page);
  expect(value.firstPaint?.coloredPixels, 'ready must be backed by actual nontransparent colored WebGL pixels').toBeGreaterThan(1);
  expect(value.ledger.readyMessages).toHaveLength(1);
  expect(value.ledger.readyMessages[0].firstPaint?.at).toBeLessThanOrEqual(value.ledger.readyMessages[0].at);
  expect(value.innerFallbackVisible).toBe(false);
  await expect(page.locator(STILL)).not.toBeVisible();
  assertStableSlot(value.slot, value.reservedSlot);
  if (before) assertStableSlot(value.slot, before.slot);
  const positive = value.ledger.samples.filter((sample: any) => sample.state.visible && sample.state.opacity > 0);
  expect(positive.length).toBeGreaterThan(0);
  expect(positive[0].at).toBeGreaterThanOrEqual(value.firstPaint.at);
  let reveals = 0, lastOpacity = 0;
  for (const sample of value.ledger.samples) {
    const opacity = sample.state.visible ? sample.state.opacity : 0;
    if (opacity > 0 && lastOpacity === 0) reveals++;
    if (lastOpacity > 0) expect(opacity, 'the first reveal must not flash back to hidden').toBeGreaterThanOrEqual(lastOpacity);
    lastOpacity = opacity;
  }
  expect(reveals, 'one reveal after the first rendered frame').toBe(1);
  if (reduced) {
    expect(positive.every((sample: any) => sample.state.opacity === 1)).toBe(true);
    expect(positive.flatMap((sample: any) => sample.state.animations)).toEqual([]);
    expect(value.ledger.revealAnimations).toEqual([]);
  } else {
    expect(value.ledger.revealAnimations, 'normal motion gets one real opacity transition').toHaveLength(1);
    for (const animation of value.ledger.revealAnimations) {
      expect(animation.at).toBeGreaterThanOrEqual(value.firstPaint.at);
      expect(Number(animation.duration)).toBeGreaterThan(0); expect(Number(animation.duration)).toBeLessThanOrEqual(500);
      expect(animation.keyframes[0].opacity).toBe('0'); expect(animation.keyframes.at(-1).opacity).toBe('1');
      expect(animation.midpointOpacity, 'the actual browser effect interpolates a gentle reveal').toBeGreaterThan(0);
      expect(animation.midpointOpacity).toBeLessThan(1); expect(animation.playbackRate).toBe(1);
    }
  }
  expect(value.overflow).toBeLessThanOrEqual(0); expect(value.calls).toEqual([]);
  return value;
}

test('held model startup never shows an outer static mascot', async ({ page }) => {
  const network = await configure(page, 375, 667);
  let release!: () => void, requested = false;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/companion/scene.bin', async route => {
    requested = true; await held; await route.continue();
  });
  try {
    await load(page);
    await expect.poll(() => requested).toBe(true);
    const loading = await page.evaluate(() => {
      const frame = document.querySelector('iframe[title="Grifon animated companion"]') as HTMLIFrameElement;
      const b = frame.parentElement!.getBoundingClientRect();
      const still = document.querySelector('img[src$="/companion/neutral.png"]');
      return {
        ready: frame.getAttribute('data-ready'),
        slot: { left: b.left, top: b.top, width: b.width, height: b.height },
        visibleStill: !!still && getComputedStyle(still).display !== 'none' && getComputedStyle(still).visibility !== 'hidden' && Number(getComputedStyle(still).opacity) > 0,
        fixtureCalls: (window as any).companionFixture.snapshot().calls,
      };
    });
    fs.writeFileSync(path.join(QA, `${phase}-held-model-375.json`), JSON.stringify({ loading, network }, null, 2));
    await page.screenshot({ path: path.join(QA, `${phase}-held-model-375.png`), fullPage: true });
    await expect(page.locator(FRAME)).not.toHaveAttribute('data-ready', 'true');
    expect(loading.visibleStill, 'loading must reserve the avatar slot without showing neutral.png').toBe(false);
    expect(loading.slot.width).toBe(56); expect(loading.slot.height).toBe(56);
    await expect(page.locator(STILL)).not.toBeVisible();
    expect(network.rejected).toEqual([]); expect(loading.fixtureCalls).toEqual([]);
  } finally { release(); }
});

for (const [width, height] of [[375, 667], [390, 844], [1280, 900]]) {
  test(`cold slow load and full refresh keep a stable empty slot then reveal real pixels at ${width}px`, async ({ page }) => {
    const network = await configure(page, width, height);
    let release!: () => void, held!: Promise<void>, requests = 0;
    const hold = () => { held = new Promise<void>(resolve => { release = resolve; }); };
    hold();
    await page.route('**/companion/scene.bin', async route => { requests++; await held; await route.continue(); });
    try {
      await load(page); await expect.poll(() => requests).toBe(1);
      const before = await assertLoading(page, width);
      await page.waitForTimeout(1400);
      const slow = await assertLoading(page, width); assertStableSlot(slow.slot, before.slot);
      await capture(page, `slow-${width}`, { before, slow, network });
      const firstCue = slow.ledger.samples.find((sample: any) => sample.state.cueVisible);
      expect(firstCue, 'slow startup must paint an informative loading cue').toBeDefined();
      // Native CSS animation time and performance.now drift in headless Edge.
      // Compare insertion/paint on the same document animation timeline.
      expect(firstCue.state.timeline - slow.ledger.frameInsertedTimeline, 'loading cue waits through the brief fast-load window').toBeGreaterThanOrEqual(280);
      expect(slow.ledger.samples.filter((sample: any) => sample.state.timeline - slow.ledger.frameInsertedTimeline < 280 && sample.state.cueVisible)).toEqual([]);
      const indicator = page.locator('.companion-avatar [role="status"]');
      await expect(indicator).toBeVisible(); await expect(indicator).toContainText(/loading|starting|connecting|preparing/i);
      expect(await indicator.evaluate(element => {
        for (let current: Element | null = element; current; current = current.parentElement) {
          const css = getComputedStyle(current);
          if (Number(css.opacity) === 0 || css.visibility === 'hidden' || css.display === 'none') return false;
        }
        return true;
      }), 'the delayed loading cue must actually be painted, not merely present in the DOM').toBe(true);
      await input(page).fill('Chat while the model loads'); await input(page).press('Enter');
      await expect(page.getByRole('status', { name: 'Grifon is typing', exact: true })).toHaveCount(0);
      await expect(page.locator('.companion-message-user')).toHaveText('Chat while the model loads');
      await capture(page, `slow-${width}`, { before, slow, network });
      release(); const ready = await assertReady(page, before); await capture(page, `cold-ready-${width}`, { ready, network });
      hold(); await page.reload({ waitUntil: 'domcontentloaded' }); await expect(input(page)).toBeVisible();
      await assertPublishedSlot(page);
      await expect.poll(() => requests).toBe(2);
      const reloading = await assertLoading(page, width); await capture(page, `reload-loading-${width}`, { reloading, network });
      release(); const refreshed = await assertReady(page, reloading);
      await expect(page.locator('.companion-message-user')).toHaveText('Chat while the model loads');
      await capture(page, `reload-ready-${width}`, { refreshed, requests, network });
      expect(network.rejected).toEqual([]); expect(network.pageErrors).toEqual([]);
    } finally { release(); }
  });

  for (const reduced of [false, true]) {
    test(`${reduced ? 'reduced motion instantaneous' : 'fast normal motion'} startup reveals only after actual pixels at ${width}px`, async ({ page }) => {
      const network = await configure(page, width, height);
      await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
      await load(page); const value = await assertReady(page, undefined, reduced);
      await capture(page, `${reduced ? 'reduced' : 'fast'}-${width}`, { value, network });
      expect(value.ledger.samples.filter((sample: any) => !sample.state.ready && sample.state.still)).toEqual([]);
      expect(value.slot.width).toBe(width < 768 ? 56 : 64);
      expect(network.rejected).toEqual([]); expect(network.pageErrors).toEqual([]);
    });
  }

  test(`genuine model failure offers truthful still and retry hides it until new real pixels at ${width}px`, async ({ page }) => {
    const network = await configure(page, width, height);
    let fail = true, requests = 0, release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/companion/scene.bin', async route => {
      requests++;
      if (fail) return route.fulfill({ status: 503, body: 'Fixture model unavailable' });
      await held; await route.continue();
    });
    try {
      await load(page);
      const retry = page.getByRole('button', { name: 'Retry companion motion', exact: true });
      await expect(retry).toBeVisible(); await expect(page.locator(STILL)).toBeVisible();
      await expect(page.getByRole('status').filter({ hasText: 'Companion shown as a still image. Chat is available.' })).toBeVisible();
      await input(page).fill('The chat remains usable'); await input(page).press('Enter');
      await expect(page.getByRole('status', { name: 'Grifon is typing', exact: true })).toHaveCount(0);
      const failed = await observation(page); await capture(page, `failure-${width}`, { failed, network });
      fail = false;
      await page.evaluate(() => { (window as any).startupEvidence.samples.length = 0; (window as any).startupEvidence.readyMessages.length = 0; (window as any).startupEvidence.revealAnimations.length = 0; });
      await retry.click(); await expect.poll(() => requests).toBe(2);
      const retryLoading = await assertLoading(page, width); assertStableSlot(retryLoading.slot, failed.slot);
      await capture(page, `retry-loading-${width}`, { retryLoading, network });
      release(); const recovered = await assertReady(page, retryLoading);
      await expect(retry).toHaveCount(0);
      await expect(page.locator('.companion-message-user')).toHaveText('The chat remains usable');
      await capture(page, `retry-ready-${width}`, { recovered, requests, network });
      expect(network.rejected).toEqual([]); expect(network.pageErrors).toEqual([]);
    } finally { release(); }
  });
}

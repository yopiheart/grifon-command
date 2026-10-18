import { expect, test, type Page } from '@playwright/test';

// Synthetic capture proves browser plumbing, not the operator's microphone or audibility.
test.use({ launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] }, permissions: ['microphone'] });

async function isolatedLab(page: Page, exhausted = false) {
  const requests = { session: 0, otherApi: 0, sockets: 0 };
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.fallback() : route.abort());
  // Never forward any lab API request to the armed development server.
  await page.route('**/api/voice-lab/**', route => {
    if (new URL(route.request().url()).pathname === '/api/voice-lab/status') return route.fulfill({ json: { active: false, protocolVersion: 'audio-first-frame-v1', budget: { attempts: exhausted ? 10 : 0, reservedUsd: exhausted ? 5 : 0, maxAttempts: 10, maxUsd: 5, reservationUsd: 0.5, liveReady: !exhausted, blockedReason: exhausted ? 'Test allowance exhausted' : null, specSha256: 'SYNTHETIC-ONLY' }, service: { area: 'Test', ratePhp: 5000, capacityLiters: 4000, callbackHours: 'Test' }, mockNotice: 'Test' } });
    if (new URL(route.request().url()).pathname === '/api/voice-lab/session') requests.session++;
    else requests.otherApi++;
    return route.abort();
  });
  await page.routeWebSocket('**/voice-lab/ws**', route => { requests.sockets++; route.close(); });
  await page.goto('/voice-lab.html');
  return requests;
}

test('real AudioContext + AudioWorklet fake-device local check works with exhausted allowance and zero session requests', async ({ page }) => {
  const requests = await isolatedLab(page, true);
  await page.getByRole('button', { name: 'Check microphone & speaker · no spend', exact: true }).click();
  await expect(page.getByTestId('local-audio-check')).toContainText('Capture running');
  await expect.poll(() => page.getByRole('meter', { name: 'Local microphone level' }).getAttribute('value')).not.toBe('0');
  await expect(page.getByRole('status')).toContainText('short quiet tone');
  for (const viewport of [{ width: 1280, height: 900 }, { width: 375, height: 667 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.getByRole('button', { name: 'Stop local audio check', exact: true }).scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `.tmp/oceanides-voice-lab/local-audio-check-${viewport.width}.png` });
  }
  await page.getByRole('button', { name: 'Stop local audio check', exact: true }).click();
  expect(requests).toEqual({ session: 0, otherApi: 0, sockets: 0 });
});

test('pending permission then Stop never creates a paid REST request or socket', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: () => new Promise(resolve => Object.assign(window, { __resolveVoiceMic: () => resolve(new MediaStream()) })) });
  });
  const requests = await isolatedLab(page);
  await page.getByLabel('Session mode', { exact: true }).selectOption('live');
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('No paid session has opened');
  expect(requests.session).toBe(0);
  await page.getByRole('button', { name: 'Stop session', exact: true }).click();
  await page.evaluate(() => (window as unknown as { __resolveVoiceMic: () => void }).__resolveVoiceMic());
  await expect(page.getByTestId('session-status')).toContainText('Stopped');
  expect(requests).toEqual({ session: 0, otherApi: 0, sockets: 0 });
});

test('permission denial never opens a paid session', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: () => Promise.reject(new DOMException('Test denial', 'NotAllowedError')) }));
  const requests = await isolatedLab(page);
  await page.getByLabel('Session mode', { exact: true }).selectOption('live');
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('permission denied');
  expect(requests).toEqual({ session: 0, otherApi: 0, sockets: 0 });
});

test('missing worklet frame delivery times out without opening a paid session', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeWorklet = AudioWorkletNode;
    window.AudioWorkletNode = class extends NativeWorklet {
      constructor(context: BaseAudioContext, name: string) {
        super(context, name);
        Object.defineProperty(this.port, 'onmessage', { get: () => null, set: () => {} });
      }
    };
  });
  const requests = await isolatedLab(page);
  await page.getByLabel('Session mode', { exact: true }).selectOption('live');
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('timed out', { timeout: 16000 });
  expect(requests).toEqual({ session: 0, otherApi: 0, sockets: 0 });
});

import { test, expect, type Page } from '@playwright/test';

async function openVoiceFixture(page: Page, theme: string, width = 375, height = 812) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(theme => {
    localStorage.setItem('grifon-companion-appearance', theme);
    const stats = { stopped: 0, closed: 0, sockets: [] as unknown[] };
    const track = { enabled: true, stop: () => { stats.stopped++; } };
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => ({ getTracks: () => [track], getAudioTracks: () => [track] }) } });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { Object.assign(window, { copiedVoiceText: text }); } } });
    class AudioContextMock {
      state = 'running'; sampleRate = 48000; currentTime = 0; destination = {};
      audioWorklet = { addModule: async () => {} };
      resume = async () => {}; close = async () => { this.state = 'closed'; };
      createGain = () => ({ gain: { value: 0 }, connect() {}, disconnect() {} });
      createMediaStreamSource = () => ({ connect() {}, disconnect() {} });
    }
    class AudioWorkletMock { port = { onmessage: null, close() {} }; connect() {} disconnect() {} }
    class SocketMock {
      static OPEN = 1; readyState = 1; bufferedAmount = 0;
      onopen: (() => void) | null = null; onmessage: ((event: { data: string }) => void) | null = null;
      onerror: (() => void) | null = null; onclose: (() => void) | null = null;
      sent: unknown[] = [];
      constructor() { stats.sockets.push(this); setTimeout(() => { this.onopen?.(); this.emit({ setupComplete: {} }); }, 20); }
      send(data: string) { this.sent.push(JSON.parse(data)); }
      close() { stats.closed++; this.readyState = 3; }
      emit(data: object) { this.onmessage?.({ data: JSON.stringify(data) }); }
    }
    Object.assign(window, { AudioContext: AudioContextMock, AudioWorkletNode: AudioWorkletMock, WebSocket: SocketMock, voiceFixture: {
      stats, emit: (data: object) => (stats.sockets[stats.sockets.length - 1] as SocketMock)?.emit(data),
    } });
  }, theme);
  await page.route('**/services/supabaseClient.ts', route => route.fulfill({ contentType: 'application/javascript', body: 'export const getSupabase = () => ({ auth: { getSession: async () => ({data:{session:{access_token:"fixture-auth-only"}}}) } });' }));
  await page.route('**/api/gemini/live-session', route => route.fulfill({ json: { credential: 'auth_tokens/fixture-only', model: 'models/fixture-opaque', expiresAt: Date.now() + 60000 } }));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) return route.abort();
    return route.fallback();
  });
  await page.goto('/companion-chat-preview.html');
  await expect(page.getByRole('textbox', { name: 'Message Grifon' })).toBeVisible();
}
const emit = (page: Page, value: object) => page.evaluate(value => (window as unknown as { voiceFixture: { emit: (value: object) => void } }).voiceFixture.emit(value), value);

for (const theme of ['dark', 'light']) {
  test(`${theme} live voice fits at 375px, keeps typed draft, requires End and reviewed replacement, and never sends automatically`, async ({ page }) => {
    await openVoiceFixture(page, theme);
    const input = page.getByRole('textbox', { name: 'Message Grifon' });
    await input.fill('Keep my typed draft');
    const messages = await page.locator('.companion-message').allTextContents();
    const start = page.getByRole('button', { name: 'Start live voice chat' });
    expect((await start.boundingBox())!.width).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: `F:/CodexQA/grifon-live-voice-20261017/release-port/${theme}-composer-375.png` });
    await start.click();
    await expect(page.getByRole('region', { name: 'Live voice chat' })).toContainText('Listening…');
    await expect(input).toBeHidden();
    await page.screenshot({ path: `F:/CodexQA/grifon-live-voice-20261017/release-port/${theme}-live-375.png` });
    await emit(page, { serverContent: { inputTranscription: { text: 'Spoken answer' }, turnComplete: true } });
    await expect(page.getByRole('button', { name: 'Use as draft', exact: true })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Live voice chat' })).toContainText('Spoken answer');
    await page.getByRole('button', { name: 'Mute live microphone' }).click();
    await expect(page.getByRole('button', { name: 'Unmute live microphone' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'End and review', exact: true }).click();
    await page.getByRole('button', { name: 'Use as draft', exact: true }).click();
    await expect(input).toHaveValue('Keep my typed draft');
    await page.getByRole('button', { name: 'Keep typed draft' }).click();
    await expect(input).toHaveValue('Keep my typed draft');
    expect(await page.locator('.companion-message').allTextContents()).toEqual(messages);
    await start.click();
    await expect(page.getByRole('region', { name: 'Live voice chat' })).toContainText('Listening…');
    await emit(page, { serverContent: { inputTranscription: { text: 'Reviewed spoken answer' } } });
    await page.getByRole('button', { name: 'End and review', exact: true }).click();
    await page.getByRole('button', { name: 'Use as draft', exact: true }).click();
    await page.getByRole('button', { name: 'Replace draft', exact: true }).click();
    await expect(input).toHaveValue('Reviewed spoken answer');
    expect(await page.locator('.companion-message').allTextContents()).toEqual(messages);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.locator('.companion-message-user')).toHaveText('Reviewed spoken answer');
    await expect(page.locator('.companion-message-assistant').last()).toContainText('What is the brand name?');
    expect(await page.evaluate(() => (window as unknown as { voiceFixture: { stats: { stopped: number; closed: number } } }).voiceFixture.stats)).toMatchObject({ stopped: 2, closed: 2 });
  });

  test(`${theme} opening navigation and settings ends live voice without losing the draft`, async ({ page }) => {
    await openVoiceFixture(page, theme);
    const input = page.getByRole('textbox', { name: 'Message Grifon' });
    await input.fill('Draft survives navigation');
    await page.getByRole('button', { name: 'Start live voice chat' }).click();
    await expect(page.getByRole('region', { name: 'Live voice chat' })).toContainText('Listening…');
    await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Live voice chat' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Close conversations', exact: true }).click();
    await expect(input).toHaveValue('Draft survives navigation');
    await page.getByRole('button', { name: 'Start live voice chat' }).click();
    await expect(page.getByRole('region', { name: 'Live voice chat' })).toContainText('Listening…');
    await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
    await page.getByRole('button', { name: 'Account settings', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { voiceFixture: { stats: { stopped: number } } }).voiceFixture.stats.stopped)).toBe(2);
  });

  test(`${theme} unavailable bootstrap errors honestly and retains draft after dismiss`, async ({ page }) => {
    await openVoiceFixture(page, theme, 1280, 900);
    await page.route('**/api/gemini/live-session', route => route.fulfill({ status: 503, json: { error: 'not configured' } }));
    const input = page.getByRole('textbox', { name: 'Message Grifon' });
    await input.fill('No voice connection, keep this.');
    await page.getByRole('button', { name: 'Start live voice chat' }).click();
    await expect(page.getByRole('alert')).toContainText('Live voice is not available yet.');
    await page.getByRole('button', { name: 'Close live voice' }).click();
    await expect(input).toHaveValue('No voice connection, keep this.');
    expect(await page.evaluate(() => (window as unknown as { voiceFixture: { stats: { stopped: number } } }).voiceFixture.stats.stopped)).toBe(1);
  });


  test(`${theme} hidden page stops live capture and playback without clearing typed draft`, async ({ page }) => {
    await openVoiceFixture(page, theme, 1280, 900);
    const input = page.getByRole('textbox', { name: 'Message Grifon' });
    await input.fill('Keep hidden tab draft');
    await page.getByRole('button', { name: 'Start live voice chat' }).click();
    await expect(page.getByRole('region', { name: 'Live voice chat' })).toContainText('Listening…');
    await page.screenshot({ path: `F:/CodexQA/grifon-live-voice-20261017/release-port/${theme}-live-1280.png` });
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await expect(page.getByRole('region', { name: 'Live voice chat' })).toHaveCount(0);
    await expect(input).toHaveValue('Keep hidden tab draft');
    expect(await page.evaluate(() => (window as unknown as { voiceFixture: { stats: { stopped: number; closed: number } } }).voiceFixture.stats)).toMatchObject({ stopped: 1, closed: 1 });
  });


}

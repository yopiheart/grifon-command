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
    class RecognitionMock {
      onstart: (() => void) | null = null; onend: (() => void) | null = null;
      onresult: ((event: unknown) => void) | null = null;
      constructor() { Object.assign(window, { dictationFixture: this }); }
      start() { this.onstart?.(); } stop() { this.onend?.(); } abort() {}
    }
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
    Object.assign(window, { AudioContext: AudioContextMock, AudioWorkletNode: AudioWorkletMock, SpeechRecognition: RecognitionMock, WebSocket: SocketMock, voiceFixture: {
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

for (const theme of ['dark', 'light']) for (const [width, height] of [[375, 667], [1280, 900]]) {
  test(`${theme} composer swaps waveform and Send without a layout jump at ${width}px`, async ({ page }) => {
    await openVoiceFixture(page, theme, width, height);
    const input = page.getByRole('textbox', { name: 'Message Grifon' });
    const start = page.getByRole('button', { name: 'Start live voice chat', exact: true });
    const send = page.getByRole('button', { name: 'Send', exact: true });
    await expect(start).toBeVisible(); await expect(send).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Start voice input', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Attach product photo', exact: true })).toBeVisible();
    const empty = { action: (await start.boundingBox())!, input: (await input.boundingBox())!, composer: (await page.locator('.companion-composer').boundingBox())! };
    expect(empty.action.width).toBeGreaterThanOrEqual(44); expect(empty.action.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: `F:/CodexQA/grifon-live-voice-20261017/composer-swap/${theme}-${width}-empty.png` });
    await input.fill('A typed draft'); await expect(send).toBeVisible(); await expect(start).toHaveCount(0);
    const typed = { action: (await send.boundingBox())!, input: (await input.boundingBox())!, composer: (await page.locator('.companion-composer').boundingBox())! };
    for (const key of ['x', 'y', 'width', 'height'] as const) {
      expect(Math.abs(empty.action[key] - typed.action[key]), `action ${key} stays fixed`).toBeLessThanOrEqual(0.5);
      expect(Math.abs(empty.input[key] - typed.input[key]), `input ${key} stays fixed`).toBeLessThanOrEqual(0.5);
      expect(Math.abs(empty.composer[key] - typed.composer[key]), `composer ${key} stays fixed`).toBeLessThanOrEqual(0.5);
    }
    await page.screenshot({ path: `F:/CodexQA/grifon-live-voice-20261017/composer-swap/${theme}-${width}-typed.png` });
    await input.fill('   '); await expect(start).toBeVisible(); await expect(send).toHaveCount(0);
    await expect(page.locator('#companion-save-status')).toContainText('Draft saved on this device.');
    await page.reload(); await expect(input).toHaveValue('   '); await expect(start).toBeVisible(); await expect(send).toHaveCount(0);
    await input.fill('Restored typed draft'); await expect(page.locator('#companion-save-status')).toContainText('Draft saved on this device.');
    await page.reload(); await expect(input).toHaveValue('Restored typed draft'); await expect(send).toBeVisible(); await expect(start).toHaveCount(0);
    await input.fill(''); await expect(start).toBeVisible(); await expect(send).toHaveCount(0);
    await page.getByRole('button', { name: 'Start voice input', exact: true }).click();
    await page.evaluate(() => (window as unknown as { dictationFixture: { onresult: (event: unknown) => void } }).dictationFixture.onresult({ results: [{ isFinal: true, 0: { transcript: 'Dictated draft' } }] }));
    await expect(input).toHaveValue('Dictated draft'); await expect(send).toBeVisible(); await expect(start).toHaveCount(0);
    await page.getByRole('button', { name: 'Stop voice input', exact: true }).click();
    await expect(input).toHaveValue('Dictated draft'); await input.fill(''); await expect(start).toBeVisible(); await expect(send).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    expect(await page.evaluate(() => (window as any).voiceFixture.stats.sockets.filter((socket: { sent: { setup?: unknown }[] }) => socket.sent.some(message => message.setup)).length)).toBe(0);
  });
}

for (const theme of ['dark', 'light']) {
  test(`${theme} composer tooltips explain mouse and keyboard actions and dismiss cleanly`, async ({ page }) => {
    await openVoiceFixture(page, theme, 1280, 900);
    for (const name of ['Attach product photo', 'Start voice input', 'Start live voice chat']) {
      await page.getByRole('button', { name, exact: true }).hover();
      await expect(page.getByRole('tooltip')).toHaveText(name);
      await page.keyboard.press('Escape'); await expect(page.getByRole('tooltip')).toHaveCount(0);
    }
    const input = page.getByRole('textbox', { name: 'Message Grifon' }); await input.fill('A draft');
    const send = page.getByRole('button', { name: 'Send', exact: true }); await send.hover(); await expect(page.getByRole('tooltip')).toHaveText('Send');
    await page.screenshot({ path: `F:/CodexQA/grifon-live-voice-20261017/composer-swap/${theme}-1280-tooltip.png` });
    await page.mouse.move(0, 0); await expect(page.getByRole('tooltip')).toHaveCount(0);
    await input.focus(); await page.keyboard.press('Tab'); await expect(page.getByRole('tooltip')).toHaveText('Start voice input');
    await page.getByRole('button', { name: 'Start voice input', exact: true }).click();
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    await page.getByRole('button', { name: 'Stop voice input', exact: true }).hover(); await expect(page.getByRole('tooltip')).toHaveText('Stop voice input');
    await page.keyboard.press('Escape'); await expect(page.getByRole('tooltip')).toHaveCount(0);
    await page.setViewportSize({ width: 375, height: 400 });
    const stop = page.getByRole('button', { name: 'Stop voice input', exact: true });
    await stop.dispatchEvent('pointerover', { pointerType: 'touch' }); await expect(page.getByRole('tooltip')).toHaveCount(0);
    await stop.dispatchEvent('pointerdown', { pointerType: 'touch' }); await expect(page.getByRole('tooltip')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  });
}

test('actual Composer imperative voice draft guard preserves Keep/Replace, disabled and IME semantics', async ({ page }) => {
  await openVoiceFixture(page, 'dark');
  await page.evaluate(async () => {
    const { default: { createElement, createRef } } = await import('/node_modules/.vite/deps/react.js');
    const { default: { createRoot } } = await import('/node_modules/.vite/deps/react-dom_client.js');
    const { CompanionComposer } = await import('/components/CompanionChat/CompanionComposer.tsx');
    const host = document.createElement('section'); host.id = 'isolated-composer';
    Object.assign(host.style, { position: 'fixed', inset: '0', zIndex: '1000', padding: '24px', background: '#09090b' }); document.body.append(host);
    const ref = createRef(), stats = { sent: [] as string[], started: 0 };
    const props = { ref, initialText: 'Keep my typed draft', disabled: false, sendDisabled: false, uploading: false, allowAttachment: true, placeholder: 'Test composer', onAttach() {}, onSend(text: string) { stats.sent.push(text); return true; }, onDraftPresence() {}, onLiveVoice() { stats.started++; } };
    const root = createRoot(host), render = (changes = {}) => root.render(createElement(CompanionComposer, { ...props, ...changes }));
    render(); Object.assign(window, { isolatedComposer: { ref, stats, render } });
  });
  const scope = page.locator('#isolated-composer'), input = scope.getByRole('textbox', { name: 'Message Grifon' });
  const useVoiceDraft = (text: string) => page.evaluate(text => (window as any).isolatedComposer.ref.current.useVoiceDraft(text), text);
  await expect(input).toHaveValue('Keep my typed draft'); await useVoiceDraft('Reviewed spoken answer');
  await expect(scope.getByRole('region', { name: 'Review voice draft' })).toBeVisible(); await expect(input).toHaveValue('Keep my typed draft');
  await scope.getByRole('button', { name: 'Keep typed draft', exact: true }).click(); await expect(input).toHaveValue('Keep my typed draft');
  await useVoiceDraft('Reviewed spoken answer'); await scope.getByRole('button', { name: 'Replace draft', exact: true }).click();
  await expect(input).toHaveValue('Reviewed spoken answer'); await expect(scope.getByRole('button', { name: 'Start live voice chat' })).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).isolatedComposer.stats.sent)).toEqual([]);
  await page.evaluate(() => (window as any).isolatedComposer.render({ disabled: true })); await expect(input).toBeDisabled(); await expect(scope.getByRole('button', { name: 'Send', exact: true })).toBeDisabled();
  await page.evaluate(() => (window as any).isolatedComposer.render()); await expect(input).toBeEnabled();
  await input.dispatchEvent('compositionstart'); await input.press('Enter'); expect(await page.evaluate(() => (window as any).isolatedComposer.stats.sent)).toEqual([]);
  const composedDraft = await input.inputValue();
  await input.dispatchEvent('compositionend'); await input.press('Enter'); await expect(input).toHaveValue('');
  await expect(scope.getByRole('button', { name: 'Start live voice chat' })).toBeVisible(); await expect(scope.getByRole('button', { name: 'Send', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).isolatedComposer.stats.sent)).toEqual([composedDraft]);
  await page.evaluate(() => (window as any).isolatedComposer.render({ uploading: true })); await expect(scope.getByRole('button', { name: 'Start live voice chat' })).toBeDisabled();
  await page.evaluate(() => (window as any).isolatedComposer.render()); await useVoiceDraft('Use as draft answer'); await expect(input).toHaveValue('Use as draft answer');
  await expect(scope.getByRole('button', { name: 'Send', exact: true })).toBeVisible(); await expect(scope.getByRole('button', { name: 'Start live voice chat' })).toHaveCount(0);
});

for (const theme of ['dark', 'light']) {
  test(`${theme} live voice fits at 375px, requires End, inserts a reviewed draft and never sends automatically`, async ({ page }) => {
    await openVoiceFixture(page, theme);
    const input = page.getByRole('textbox', { name: 'Message Grifon' });
    await input.fill('   ');
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
    await expect(input).toHaveValue('Spoken answer');
    await expect(start).toHaveCount(0); await expect(page.getByRole('button', { name: 'Send', exact: true })).toBeVisible();
    expect(await page.locator('.companion-message').allTextContents()).toEqual(messages);
    await input.fill('');
    await start.click();
    await expect(page.getByRole('region', { name: 'Live voice chat' })).toContainText('Listening…');
    await emit(page, { serverContent: { inputTranscription: { text: 'Reviewed spoken answer' } } });
    await page.getByRole('button', { name: 'End and review', exact: true }).click();
    await page.getByRole('button', { name: 'Use as draft', exact: true }).click();
    await expect(input).toHaveValue('Reviewed spoken answer');
    await expect(start).toHaveCount(0);
    expect(await page.locator('.companion-message').allTextContents()).toEqual(messages);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.locator('.companion-message-user')).toHaveText('Reviewed spoken answer');
    await expect(page.locator('.companion-message-assistant').last()).toContainText('What is the brand name?');
    expect(await page.evaluate(() => (window as unknown as { voiceFixture: { stats: { stopped: number; closed: number } } }).voiceFixture.stats)).toMatchObject({ stopped: 2, closed: 2 });
  });

  test(`${theme} opening navigation and settings ends live voice without losing the whitespace draft`, async ({ page }) => {
    await openVoiceFixture(page, theme);
    const input = page.getByRole('textbox', { name: 'Message Grifon' });
    await input.fill('   ');
    await page.getByRole('button', { name: 'Start live voice chat' }).click();
    await expect(page.getByRole('region', { name: 'Live voice chat' })).toContainText('Listening…');
    await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Live voice chat' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Close conversations', exact: true }).click();
    await expect(input).toHaveValue('   ');
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
    await input.fill('   ');
    await page.getByRole('button', { name: 'Start live voice chat' }).click();
    await expect(page.getByRole('alert')).toContainText('Live voice is not available yet.');
    await page.getByRole('button', { name: 'Close live voice' }).click();
    await expect(input).toHaveValue('   ');
    expect(await page.evaluate(() => (window as unknown as { voiceFixture: { stats: { stopped: number } } }).voiceFixture.stats.stopped)).toBe(1);
  });


  test(`${theme} hidden page stops live capture and playback without clearing the whitespace draft`, async ({ page }) => {
    await openVoiceFixture(page, theme, 1280, 900);
    const input = page.getByRole('textbox', { name: 'Message Grifon' });
    await input.fill('   ');
    await page.getByRole('button', { name: 'Start live voice chat' }).click();
    await expect(page.getByRole('region', { name: 'Live voice chat' })).toContainText('Listening…');
    await page.screenshot({ path: `F:/CodexQA/grifon-live-voice-20261017/release-port/${theme}-live-1280.png` });
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await expect(page.getByRole('region', { name: 'Live voice chat' })).toHaveCount(0);
    await expect(input).toHaveValue('   ');
    expect(await page.evaluate(() => (window as unknown as { voiceFixture: { stats: { stopped: number; closed: number } } }).voiceFixture.stats)).toMatchObject({ stopped: 1, closed: 1 });
  });


}

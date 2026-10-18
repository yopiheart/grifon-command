import { expect, test, type Page, type WebSocketRoute } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { base64ToFloat32, pcm16ToBase64 } from '../../funnels/oceanides-price-page/src/voice-lab/audio-math.js';
import { VOICE_LAB_PROTOCOL, type ClientEvent, type LabSnapshot, type LabStatus, type PlaybackDiagnostics, type ServerEvent } from '../../funnels/oceanides-price-page/src/voice-lab/contracts.js';

// This fixture never forwards API requests or WebSockets to the development server.
// Native generated media and a rendered PCM tone prove plumbing, not speech or human audibility.
async function guardedBridge(page: Page) {
  const requests = { sessions: 0, otherApi: 0, external: 0, bridgeSockets: 0 };
  const sent: ClientEvent[] = [];
  let socket: WebSocketRoute | undefined;
  const budget = { attempts: 0, reservedUsd: 0, maxAttempts: 1, maxUsd: 0.5, reservationUsd: 0.5, liveReady: true, blockedReason: null, specSha256: 'SYNTHETIC-NO-PROVIDER' };
  const snapshot: LabSnapshot = { sessionId: 'synthetic-native-playback', mode: 'live', phase: 'active', scenarioId: 'natural-inquiry', startedAt: Date.now(), expiresAt: Date.now() + 180000, scripted: false, requestStatus: 'collecting', details: { name: 'Synthetic', contact: 'TEST-NOT-DIALABLE', city: 'Quezon City', address: 'Synthetic Street', problem: 'Synthetic only', access: 'Synthetic only', preferredTime: 'Synthetic only' }, detailsConfirmed: false, dispatch: { version: 0, decision: 'pending', pricePhp: null, slot: '', conditions: '' }, acceptedVersion: null, owner: 'Neil/Zam', nextStep: 'Synthetic only', transcript: [], toolLog: [], timings: [], budget };
  const status: LabStatus = { active: false, protocolVersion: VOICE_LAB_PROTOCOL, budget, service: { area: 'Metro Manila', ratePhp: 5000, capacityLiters: 4000, callbackHours: 'Synthetic only' }, mockNotice: 'Synthetic browser transport only' };
  await page.route('**/*', route => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') return route.fallback();
    requests.external++;
    return route.abort();
  });
  await page.route('**/api/voice-lab/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/voice-lab/status' && route.request().method() === 'GET') return route.fulfill({ json: status });
    if (path === '/api/voice-lab/session' && route.request().method() === 'POST') {
      requests.sessions++;
      expect(route.request().postDataJSON()).toEqual({ scenarioId: 'natural-inquiry', mode: 'live', protocolVersion: VOICE_LAB_PROTOCOL });
      return route.fulfill({ json: { sessionId: snapshot.sessionId, wsPath: '/voice-lab/ws?token=SYNTHETIC-NO-PROVIDER', state: { ...snapshot, phase: 'preparing' } } });
    }
    requests.otherApi++;
    return route.abort();
  });
  await page.routeWebSocket('**/*', route => {
    const url = new URL(route.url());
    if (url.hostname !== '127.0.0.1' || url.pathname !== '/voice-lab/ws' || url.searchParams.get('token') !== 'SYNTHETIC-NO-PROVIDER') { route.close(); return; }
    requests.bridgeSockets++;
    socket = route;
    route.onMessage(message => {
      const event = JSON.parse(String(message)) as ClientEvent;
      sent.push(event);
      if (event.type === 'interrupt') route.send(JSON.stringify({ type: 'speech_started', at: Date.now() }));
    });
    route.send(JSON.stringify({ type: 'state', snapshot }));
  });
  await page.addInitScript(() => {
    const NativeContext = AudioContext;
    const proof = { started: 0, ended: 0, maxRms: 0, renderSamples: 0, gain: null as GainNode | null, captureContext: null as AudioContext | null };
    Object.assign(window, { __voiceNativeProof: proof });
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => {
      const context = new NativeContext();
      await context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      gain.gain.value = 0;
      const destination = context.createMediaStreamDestination();
      oscillator.frequency.value = 180;
      oscillator.connect(gain); gain.connect(destination); oscillator.start();
      proof.gain = gain; proof.captureContext = context;
      return destination.stream;
    } });
    window.AudioContext = class extends NativeContext {
      createBufferSource() {
        const source = super.createBufferSource();
        const connect = source.connect.bind(source);
        source.connect = ((destination: AudioNode) => {
          if (destination !== this.destination) return connect(destination);
          const analyser = this.createAnalyser();
          analyser.fftSize = 256;
          const values = new Float32Array(analyser.fftSize);
          analyser.connect(destination);
          const timer = setInterval(() => {
            analyser.getFloatTimeDomainData(values);
            const rms = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
            proof.maxRms = Math.max(proof.maxRms, rms);
            if (rms > 0.001) proof.renderSamples++;
          }, 5);
          source.addEventListener('ended', () => { proof.ended++; clearInterval(timer); analyser.disconnect(); });
          proof.started++;
          return connect(analyser);
        }) as typeof source.connect;
        return source;
      }
    };
  });
  await page.goto('/voice-lab.html');
  await page.getByLabel('Session mode', { exact: true }).selectOption('live');
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await expect.poll(() => sent.filter(event => event.type === 'audio_ready').length).toBe(1);
  await expect.poll(() => sent.filter(event => event.type === 'audio').length).toBeGreaterThan(0);
  return { requests, sent, push: (event: ServerEvent) => socket!.send(JSON.stringify(event)) };
}

function tone(samples = 12000): string {
  return pcm16ToBase64(Int16Array.from({ length: samples }, (_, index) => Math.round(Math.sin(2 * Math.PI * 440 * index / 24000) * 5000)));
}

function latestCounts(sent: ClientEvent[]): PlaybackDiagnostics | undefined {
  return sent.filter((event): event is Extract<ClientEvent, { type: 'playback_diagnostics' }> => event.type === 'playback_diagnostics').at(-1)?.counts;
}

async function rendered(page: Page) {
  return page.evaluate(() => {
    const proof = (window as unknown as { __voiceNativeProof: { started: number; ended: number; maxRms: number; renderSamples: number } }).__voiceNativeProof;
    return { started: proof.started, ended: proof.ended, maxRms: proof.maxRms, renderSamples: proof.renderSamples };
  });
}

test('native bridge PCM renders, drains, cancels late audio and recovers after interruption without any provider request', async ({ page }) => {
  const bridge = await guardedBridge(page);
  const audio = tone();
  bridge.push({ type: 'response_started', responseId: 'opening' });
  bridge.push({ type: 'audio', data: audio, sampleRate: 24000, responseId: 'opening' });
  bridge.push({ type: 'response_end', responseId: 'opening' });
  await expect.poll(() => latestCounts(bridge.sent)?.endedChunks).toBe(1);
  await expect.poll(async () => (await rendered(page)).maxRms).toBeGreaterThan(0.02);
  await expect.poll(() => bridge.sent.filter(event => event.type === 'playback_drained').length).toBe(1);
  expect(latestCounts(bridge.sent)).toMatchObject({ receivedChunks: 1, decodedChunks: 1, scheduledChunks: 1, endedChunks: 1, canceledChunks: 0, decodedSamples: 12000, localInterrupts: 0 });

  bridge.push({ type: 'response_started', responseId: 'interrupted' });
  bridge.push({ type: 'audio', data: tone(48000), sampleRate: 24000, responseId: 'interrupted' });
  await expect.poll(() => latestCounts(bridge.sent)?.scheduledChunks).toBe(2);
  bridge.push({ type: 'speech_started', at: Date.now() });
  await expect.poll(() => latestCounts(bridge.sent)?.canceledChunks).toBe(1);
  bridge.push({ type: 'audio', data: audio, sampleRate: 24000, responseId: 'interrupted' });
  await expect.poll(() => latestCounts(bridge.sent)?.droppedChunks).toBe(1);
  expect(latestCounts(bridge.sent)?.scheduledChunks).toBe(2);

  bridge.push({ type: 'speech_stopped', at: Date.now() });
  bridge.push({ type: 'response_started', responseId: 'answer' });
  bridge.push({ type: 'audio', data: audio, sampleRate: 24000, responseId: 'answer' });
  bridge.push({ type: 'response_end', responseId: 'answer' });
  await expect.poll(() => latestCounts(bridge.sent)?.endedChunks).toBe(2);
  expect(latestCounts(bridge.sent)).toMatchObject({ receivedChunks: 4, decodedChunks: 3, scheduledChunks: 3, canceledChunks: 1, droppedChunks: 1, serverInterruptNotifications: 1, localInterrupts: 0 });
  expect((await rendered(page)).renderSamples).toBeGreaterThan(2);

  bridge.push({ type: 'response_started', responseId: 'local-interruption' });
  bridge.push({ type: 'audio', data: tone(48000), sampleRate: 24000, responseId: 'local-interruption' });
  await expect.poll(() => latestCounts(bridge.sent)?.scheduledChunks).toBe(4);
  await page.evaluate(() => { (window as unknown as { __voiceNativeProof: { gain: GainNode } }).__voiceNativeProof.gain.gain.value = 0.1; });
  await expect.poll(() => latestCounts(bridge.sent)?.localInterrupts).toBe(1);
  await expect.poll(() => latestCounts(bridge.sent)?.serverInterruptNotifications).toBe(2);
  await page.evaluate(() => { (window as unknown as { __voiceNativeProof: { gain: GainNode } }).__voiceNativeProof.gain.gain.value = 0; });
  await expect.poll(() => {
    const frame = bridge.sent.filter((event): event is Extract<ClientEvent, { type: 'audio' }> => event.type === 'audio').at(-1);
    return frame ? base64ToFloat32(frame.data).every(sample => sample === 0) : false;
  }).toBe(true);
  expect(bridge.sent.filter(event => event.type === 'interrupt')).toHaveLength(1);
  bridge.push({ type: 'audio', data: audio, sampleRate: 24000, responseId: 'local-interruption' });
  await expect.poll(() => latestCounts(bridge.sent)?.droppedChunks).toBe(2);

  bridge.push({ type: 'response_started', responseId: 'final-answer' });
  bridge.push({ type: 'audio', data: audio, sampleRate: 24000, responseId: 'final-answer' });
  bridge.push({ type: 'response_end', responseId: 'final-answer' });
  await expect.poll(() => latestCounts(bridge.sent)?.endedChunks).toBe(3);
  await page.getByRole('button', { name: 'Stop session', exact: true }).click();
  const finalCounts = latestCounts(bridge.sent)!;
  expect(finalCounts).toMatchObject({ receivedChunks: 7, decodedChunks: 5, scheduledChunks: 5, endedChunks: 3, canceledChunks: 2, droppedChunks: 2, decodedSamples: 132000, localInterrupts: 1, serverInterruptNotifications: 2 });
  expect(finalCounts.nonZeroSamples).toBeGreaterThan(100000);
  const stopAt = bridge.sent.findIndex(event => event.type === 'stop');
  expect(bridge.sent[stopAt - 1]).toEqual({ type: 'playback_diagnostics', counts: finalCounts });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download local test report', exact: true }).click();
  const path = await (await download).path();
  const report = JSON.parse(await readFile(path!, 'utf8'));
  expect(report.playbackDiagnostics).toEqual(finalCounts);
  expect(Object.keys(report.playbackDiagnostics).sort()).toEqual(Object.keys(finalCounts).sort());
  expect(bridge.requests).toEqual({ sessions: 1, otherApi: 0, external: 0, bridgeSockets: 1 });
  await page.evaluate(() => (window as unknown as { __voiceNativeProof: { captureContext: AudioContext } }).__voiceNativeProof.captureContext.close());
});

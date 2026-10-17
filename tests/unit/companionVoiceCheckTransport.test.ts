import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectCompanionVoice, createBrowserVoiceAudio } from '../../services/companionVoiceSession.js';
import { createApprovedVoiceCheck } from '../../dev/companionVoiceCheck.js';

const runs: { stop: () => void }[] = [];
afterEach(() => { runs.splice(0).forEach(run => run.stop()); vi.unstubAllGlobals(); });

describe('QA-only transport observation and fixture playback', () => {
  it('capture false resumes playback without accessing a microphone or audio worklet', async () => {
    const close = vi.fn(async () => {});
    class Context { state = 'running'; resume = vi.fn(async () => {}); close = close; }
    const browser = { isSecureContext: true, AudioContext: Context };
    Object.defineProperty(browser, 'AudioWorkletNode', { get: () => { throw new Error('Worklet accessed'); } });
    vi.stubGlobal('window', browser); vi.stubGlobal('AudioContext', Context);
    vi.stubGlobal('navigator', { get mediaDevices() { throw new Error('Microphone accessed'); } });
    const audio = createBrowserVoiceAudio({ capture: false }); await audio.start(() => { throw new Error('Unexpected capture'); });
    audio.close(); expect(close).toHaveBeenCalledTimes(1);
  });
  it('observes only sanitized numeric usage before the corresponding response event', async () => {
    class Socket {
      static current: Socket; static OPEN = 1; readyState = 1;
      onopen = null; onmessage: ((event: { data: string }) => void) | null = null; onerror = null; onclose = null;
      constructor() { Socket.current = this; } send() {} close() {}
    }
    vi.stubGlobal('WebSocket', Socket);
    const calls: unknown[] = [];
    const transport = connectCompanionVoice({ credential: 'auth_tokens/fixture-only', model: 'models/fixture', expiresAt: Date.now() + 60000 }, event => calls.push(event), usage => calls.push(usage));
    Socket.current.onmessage!({ data: JSON.stringify({ usageMetadata: { totalTokenCount: 10, promptTokenCount: 8, responseTokenCount: 2, upstreamUrl: 'must-not-forward', arbitrary: { data: 'must-not-forward' } }, serverContent: { outputTranscription: { text: 'test' } } }) });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(calls).toEqual([{ totalTokenCount: 10, promptTokenCount: 8, responseTokenCount: 2 }, { type: 'output-transcript', text: 'test' }]); transport.close();
  });
});

function runtime(attested = true, mode: 'microphone' | 'fixture' = 'microphone') {
  let receive!: Parameters<typeof connectCompanionVoice>[1], usage!: NonNullable<Parameters<typeof connectCompanionVoice>[2]>;
  let capture!: (data: string) => void, now = 0;
  const wire = { sendAudio: vi.fn(), audioEnd: vi.fn(), close: vi.fn() };
  const audio = { start: vi.fn(async (send: (data: string) => void) => { capture = send; }), mute: vi.fn(), play: vi.fn(), interrupt: vi.fn(), close: vi.fn() };
  const fixtures = vi.fn(async () => [new Uint8Array(185920), new Uint8Array(69120)]);
  const bootstrap = vi.fn(async () => ({ credential: 'auth_tokens/fixture-only', model: 'models/gemini-3.8-live', expiresAt: Date.now() + 60000 }));
  const connect = vi.fn((_session: Parameters<typeof connectCompanionVoice>[0], next: Parameters<typeof connectCompanionVoice>[1], observe?: Parameters<typeof connectCompanionVoice>[2]) => { receive = next; usage = observe!; return wire; });
  const run = createApprovedVoiceCheck(mode, {
    audio: () => audio, fixtures, now: () => now, bootstrap, connect,
  }, attested);
  runs.push(run);
  return { run, wire, audio, fixtures, bootstrap, connect, setNow: (value: number) => { now = value; }, emit: (event: Parameters<typeof receive>[0]) => receive(event), usage: (value: Parameters<typeof usage>[0]) => usage(value), capture: (length: number) => capture(Buffer.alloc(length).toString('base64')),
    start: async () => { run.start(); await new Promise(resolve => setTimeout(resolve, 0)); receive({ type: 'ready' }); } };
}
const settle = () => new Promise(resolve => setTimeout(resolve, 1100));

describe('unmodified QA runtime closes real seams when guards trip', () => {
  it('fails closed instead of silently advancing through a prematurely closed fixture input', async () => {
    const f = runtime(true, 'fixture'); await f.start();
    f.emit({ type: 'audio', data: 'AAAA' }); f.emit({ type: 'turn-complete' });
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(f.run.view().outcome).toBe('input-order'); expect(f.wire.close).toHaveBeenCalledTimes(1);
    expect(f.run.view().completedTurns).toBe(0);
  });
  it('closes transport/capture before sending bytes beyond the PCM cap', async () => {
    const f = runtime(); await f.start(); f.capture(1440000); f.capture(2);
    expect(f.wire.sendAudio).toHaveBeenCalledTimes(1); expect(f.run.view().bounds.stopReason).toBe('pcm-limit');
    expect(f.wire.close).toHaveBeenCalledTimes(1); expect(f.audio.close).toHaveBeenCalledTimes(1);
  });
  it('closes before an oversized user transcription reaches the session state', async () => {
    const f = runtime(); await f.start(); f.emit({ type: 'input-transcript', text: 'x'.repeat(1025) });
    expect(f.run.view().bounds.stopReason).toBe('transcript-limit'); expect(f.wire.close).toHaveBeenCalledTimes(1);
  });
  it('rejects missing usage at response completion and never retries issuance', async () => {
    const f = runtime(); await f.start(); f.emit({ type: 'audio', data: 'AAAA' }); f.emit({ type: 'turn-complete' });
    expect(f.run.view().awaitingUsage).toBe(true);
    await new Promise(resolve => setTimeout(resolve, 1100));
    expect(f.run.view().bounds.stopReason).toBe('usage-missing'); expect(f.audio.close).toHaveBeenCalledTimes(1);
    f.run.start(); expect(f.run.view().active).toBe(false);
  });
  it('fails closed if interruption is followed by another response without a completed boundary', async () => {
    const f = runtime(); await f.start(); f.emit({ type: 'audio', data: 'AAAA' }); f.emit({ type: 'interrupted' }); f.emit({ type: 'audio', data: 'AAAA' });
    expect(f.run.view().outcome).toBe('response-order'); expect(f.audio.play).toHaveBeenCalledTimes(1); expect(f.wire.close).toHaveBeenCalledTimes(1);
  });
  it('awaits separate first-response usage while sending no additional microphone audio', async () => {
    const f = runtime(); await f.start(); f.emit({ type: 'audio', data: 'AAAA' }); f.emit({ type: 'turn-complete' });
    expect(f.run.view().active).toBe(true); f.capture(640); expect(f.wire.sendAudio).not.toHaveBeenCalled();
    f.usage({ totalTokenCount: 500, responseTokenCount: 30 });
    expect(f.run.view().bounds.responseEnds).toBe(0); await settle();
    expect(f.run.view().bounds.responseEnds).toBe(1); expect(f.run.view().active).toBe(true);
  });
  it('allows an already-open approved second line to finish during first-response accounting', async () => {
    const f = runtime(); await f.start(); f.run.finishLine(); f.run.nextLine();
    f.emit({ type: 'audio', data: 'AAAA' }); f.emit({ type: 'turn-complete' }); f.capture(640);
    expect(f.wire.sendAudio).toHaveBeenCalledTimes(1); f.run.finishLine(); f.capture(640); f.run.nextLine();
    expect(f.run.view()).toMatchObject({ inputTurns: 2, completedTurns: 2, inputOpen: false });
    expect(f.wire.sendAudio).toHaveBeenCalledTimes(1);
    f.usage({ totalTokenCount: 500, responseTokenCount: 30 }); await settle();
    expect(f.run.view().bounds.responseEnds).toBe(1); expect(f.run.view().active).toBe(true);
  });
  it('keeps final transport open for usage arriving after second-response and playback completion', async () => {
    const f = runtime(); await f.start(); f.emit({ type: 'audio', data: 'AAAA' }); f.usage({ totalTokenCount: 500, responseTokenCount: 30 }); f.emit({ type: 'turn-complete' });
    await settle();
    f.emit({ type: 'audio', data: 'AAAA' }); f.emit({ type: 'turn-complete' });
    f.audio.play.mock.calls[1][1]();
    expect(f.run.view().active).toBe(true); expect(f.wire.close).not.toHaveBeenCalled();
    f.usage({ totalTokenCount: 600, responseTokenCount: 40 });
    expect(f.wire.close).not.toHaveBeenCalled(); await settle();
    expect(f.run.view().outcome).toBe('complete'); expect(f.run.view().bounds.responseEnds).toBe(2); expect(f.wire.close).toHaveBeenCalledTimes(1);
  });
  it('drains late final usage even when each response had an earlier partial usage report', async () => {
    const f = runtime(); await f.start(); f.emit({ type: 'audio', data: 'AAAA' }); f.usage({ totalTokenCount: 500, responseTokenCount: 30 }); f.emit({ type: 'turn-complete' });
    await new Promise(resolve => setTimeout(resolve, 1100));
    f.emit({ type: 'audio', data: 'AAAA' }); f.usage({ totalTokenCount: 500, responseTokenCount: 30 }); f.emit({ type: 'turn-complete' });
    expect(f.wire.close).not.toHaveBeenCalled(); f.usage({ totalTokenCount: 600, responseTokenCount: 40 });
    expect(f.run.view().bounds.usageTokens).toBe(1600);
    expect(f.wire.close).not.toHaveBeenCalled(); await settle();
    expect(f.run.view().bounds.responseEnds).toBe(2); expect(f.wire.close).toHaveBeenCalledTimes(1);
    f.emit({ type: 'output-transcript', text: 'Final late transcript evidence' });
    expect(f.run.view().bounds.responseStarts).toBe(2); expect(f.run.view().outputTranscript).toBe(true);
  });
  it('waits for measured output usage after an early total-only partial report', async () => {
    const f = runtime(); await f.start(); f.emit({ type: 'audio', data: 'AAAA' }); f.usage({ totalTokenCount: 500 }); f.emit({ type: 'turn-complete' });
    expect(f.run.view().bounds.outputTokensAvailable).toBe(false);
    f.usage({ totalTokenCount: 600, responseTokenCount: 40 }); await settle();
    expect(f.run.view().bounds).toMatchObject({ responseEnds: 1, usageTokens: 1100, outputTokens: 40, outputTokensAvailable: true });
  });
  it('fails settlement when output-token counts remain unavailable', async () => {
    const f = runtime(); await f.start(); f.emit({ type: 'audio', data: 'AAAA' }); f.usage({ totalTokenCount: 500 }); f.emit({ type: 'turn-complete' }); await settle();
    expect(f.run.view().bounds).toMatchObject({ stopReason: 'usage-invalid', outputTokensAvailable: false, responseEnds: 0, usageTokens: 500 });
    expect(f.wire.close).toHaveBeenCalledTimes(1); expect(f.audio.close).toHaveBeenCalledTimes(1);
  });
  it('does not classify a late output transcription as a new model response', async () => {
    const f = runtime(); await f.start(); f.emit({ type: 'audio', data: 'AAAA' }); f.usage({ totalTokenCount: 500, responseTokenCount: 30 }); f.emit({ type: 'turn-complete' });
    f.emit({ type: 'output-transcript', text: 'Late transcript evidence' });
    expect(f.run.view().bounds.responseStarts).toBe(1); expect(f.run.view().outputTranscript).toBe(true);
  });
  it('does not start audio or provider setup without operator attestation', () => {
    const f = runtime(false); f.run.start(); expect(f.audio.start).not.toHaveBeenCalled(); expect(f.run.view().outcome).toBe('attestation-required');
    expect(f.fixtures).not.toHaveBeenCalled(); expect(f.bootstrap).not.toHaveBeenCalled(); expect(f.connect).not.toHaveBeenCalled(); expect(f.wire.sendAudio).not.toHaveBeenCalled();
  });
  it('closes a third response before forwarding its audio, allowing no further microphone bytes', async () => {
    const f = runtime(); await f.start();
    for (let index = 0; index < 2; index++) { f.emit({ type: 'audio', data: 'AAAA' }); f.usage({ totalTokenCount: 500, responseTokenCount: 30 }); f.emit({ type: 'turn-complete' }); await settle(); }
    expect(f.wire.close).toHaveBeenCalledTimes(1);
    f.emit({ type: 'audio', data: 'AAAA' }); f.capture(640);
    expect(f.audio.play).toHaveBeenCalledTimes(2); expect(f.run.view().bounds.stopReason).toBe('response-limit');
    expect(f.wire.sendAudio).not.toHaveBeenCalled(); expect(f.audio.close).toHaveBeenCalledTimes(1);
  });
  it('enforces deadline and USD1 limits independently of UI and mute controls', async () => {
    const time = runtime(); await time.start(); time.setNow(45000); time.capture(640);
    expect(time.run.view().bounds.stopReason).toBe('deadline'); expect(time.wire.sendAudio).not.toHaveBeenCalled();
    const cost = runtime(); await cost.start(); cost.usage({ totalTokenCount: 83334 });
    expect(cost.run.view().bounds.stopReason).toBe('cost-limit'); expect(cost.wire.close).toHaveBeenCalledTimes(1);
  });
  it('closed microphone windows cannot be reopened by mute or a third turn action', async () => {
    const f = runtime(); await f.start(); f.run.finishLine(); f.run.mute(); f.capture(640);
    expect(f.wire.sendAudio).not.toHaveBeenCalled(); f.run.nextLine(); f.capture(640); f.run.finishLine(); f.run.nextLine(); f.run.mute(); f.capture(640);
    expect(f.run.view()).toMatchObject({ inputTurns: 2, completedTurns: 2, inputOpen: false });
    expect(f.wire.sendAudio).toHaveBeenCalledTimes(1); f.run.stop();
    const evidence = JSON.stringify(f.run.evidence()); expect(evidence).not.toMatch(/auth_tokens|credential|fixture-only|upstreamUrl|transcripts/);
  });
});

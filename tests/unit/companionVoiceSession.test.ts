import { afterEach, describe, expect, it, vi } from 'vitest';
import { CompanionVoiceClient, connectCompanionVoice, createBrowserVoiceAudio, requestCompanionVoiceSession, type CompanionVoiceDependencies, type CompanionVoiceEvent } from '../../services/companionVoiceSession.js';

const auth = vi.hoisted(() => ({ getSession: vi.fn(async () => ({ data: { session: { access_token: 'fixture-auth-only' } as { access_token: string } | null } })) }));
vi.mock('../../services/supabaseClient.js', () => ({ getSupabase: () => ({ auth }) }));

function fixture() {
  let event: (event: CompanionVoiceEvent) => void = () => {};
  let capture: (samples: string) => void = () => {};
  let playbackDone: () => void = () => {};
  const audio = {
    start: vi.fn(async (receive: (samples: string) => void) => { capture = receive; }),
    mute: vi.fn(), play: vi.fn((_samples: string, done: () => void) => { playbackDone = done; }),
    interrupt: vi.fn(), close: vi.fn(),
  };
  const transport = { sendAudio: vi.fn(), audioEnd: vi.fn(), close: vi.fn() };
  const dependencies: CompanionVoiceDependencies = {
    bootstrap: vi.fn(async () => ({ credential: 'opaque-test-only', model: 'fixture-model', expiresAt: Date.now() + 60000 })),
    audio: () => audio,
    connect: vi.fn((_session, receive) => { event = receive; return transport; }),
  };
  const client = new CompanionVoiceClient(dependencies);
  const snapshots: ReturnType<typeof client.snapshot>[] = [];
  client.subscribe(value => snapshots.push(value));
  return { client, dependencies, audio, transport, snapshots, emit: (value: CompanionVoiceEvent) => event(value), capture: (value: string) => capture(value), playbackDone: () => playbackDone() };
}

describe('companion live voice lifecycle', () => {
  it('only sends microphone frames after ready and while unmuted', async () => {
    const f = fixture(); await f.client.start();
    f.capture('before'); expect(f.transport.sendAudio).not.toHaveBeenCalled();
    f.emit({ type: 'ready' }); f.capture('first');
    expect(f.transport.sendAudio).toHaveBeenCalledWith('first');
    f.client.setMuted(true); f.capture('muted');
    expect(f.transport.sendAudio).toHaveBeenCalledTimes(1);
    expect(f.audio.mute).toHaveBeenLastCalledWith(true);
    expect(f.transport.audioEnd).toHaveBeenCalledTimes(1);
    f.client.setMuted(false); f.capture('second');
    expect(f.transport.sendAudio).toHaveBeenLastCalledWith('second');
    f.client.end();
  });

  it('releases resources and ignores delayed transcript/audio after end', async () => {
    const f = fixture(); await f.client.start(); f.emit({ type: 'ready' }); f.client.end();
    const ended = f.client.snapshot();
    f.emit({ type: 'input-transcript', text: 'late speech' });
    f.emit({ type: 'audio', data: 'late audio' }); f.emit({ type: 'ready' }); f.capture('late frame');
    expect(f.client.snapshot()).toEqual(ended);
    expect(f.audio.close).toHaveBeenCalledTimes(1); expect(f.transport.close).toHaveBeenCalledTimes(1);
    expect(f.audio.play).not.toHaveBeenCalled(); expect(f.transport.sendAudio).not.toHaveBeenCalled();
  });

  it('closes a pending permission request before it can acquire a stale transport', async () => {
    const f = fixture(); let resolve!: () => void;
    f.audio.start.mockImplementationOnce(() => new Promise<void>(done => { resolve = done; }));
    const start = f.client.start(); f.client.end(); resolve(); await start;
    expect(f.dependencies.connect).not.toHaveBeenCalled();
    expect(f.client.snapshot().status).toBe('ended');
  });

  it('interrupts queued speech and invalidates its late completion callback', async () => {
    const f = fixture(); await f.client.start(); f.emit({ type: 'ready' });
    f.emit({ type: 'audio', data: 'AAAA' }); expect(f.client.snapshot().status).toBe('speaking');
    f.emit({ type: 'interrupted' });
    expect(f.audio.interrupt).toHaveBeenCalledTimes(1); expect(f.client.snapshot().status).toBe('listening');
    f.playbackDone(); expect(f.client.snapshot().status).toBe('listening'); f.client.end();
  });

  it('freezes collected voice text only when the user ends for review, never as a committed chat answer', async () => {
    const f = fixture(); await f.client.start(); f.emit({ type: 'ready' });
    f.emit({ type: 'input-transcript', text: 'A test' });
    expect(f.client.snapshot().transcripts).toHaveLength(0);
    f.emit({ type: 'input-transcript', text: ' brand' });
    f.emit({ type: 'turn-complete' }); f.emit({ type: 'turn-complete' });
    expect(f.client.snapshot().transcripts).toHaveLength(0); f.client.end();
    expect(f.client.snapshot().transcripts).toEqual([{ id: 1, role: 'user', text: 'A test brand' }]);
    f.emit({ type: 'input-transcript', text: ' late fragment' });
    expect(f.client.snapshot().transcripts[0].text).toBe('A test brand');
  });

  it('keeps an independently ordered input transcript interim through interruption and model completion', async () => {
    const f = fixture(); await f.client.start(); f.emit({ type: 'ready' });
    f.emit({ type: 'input-transcript', text: 'Only half' });
    f.emit({ type: 'interrupted' }); f.emit({ type: 'turn-complete' });
    expect(f.client.snapshot().transcripts).toHaveLength(0);
    f.emit({ type: 'input-transcript', text: ' the answer' });
    expect(f.client.snapshot().transcripts).toHaveLength(0); f.client.end();
    expect(f.client.snapshot().transcripts).toEqual([{ id: 1, role: 'user', text: 'Only half the answer' }]);
  });

  it('makes errors explicit, stops all resources, and can retry without stale session events', async () => {
    const f = fixture(); await f.client.start(); f.emit({ type: 'ready' });
    const previousReceive = (f.dependencies.connect as ReturnType<typeof vi.fn>).mock.calls[0][1];
    f.emit({ type: 'error', code: 'connection' });
    expect(f.client.snapshot()).toMatchObject({ status: 'error', error: 'Live voice lost its connection. Try again or keep typing.' });
    await f.client.start(); f.emit({ type: 'ready' }); previousReceive({ type: 'error', code: 'connection' });
    expect(f.client.snapshot().status).toBe('listening'); f.client.end();
  });
});

describe('constrained provider transport', () => {
  afterEach(() => vi.unstubAllGlobals());
  function socketFixture() {
    const events: CompanionVoiceEvent[] = [];
    class MockSocket {
      static OPEN = 1;
      static current: MockSocket;
      readyState = 1; bufferedAmount = 0;
      onopen: (() => void) | null = null; onmessage: ((event: { data: string | Blob }) => void) | null = null;
      onerror: (() => void) | null = null; onclose: (() => void) | null = null;
      send = vi.fn(); close = vi.fn();
      constructor(readonly url: string) { MockSocket.current = this; }
    }
    vi.stubGlobal('WebSocket', MockSocket);
    const transport = connectCompanionVoice({ credential: 'auth_tokens/test+/=', model: 'models/fixture-opaque', expiresAt: Date.now() + 60000 }, event => events.push(event));
    const socket = MockSocket.current;
    const flush = () => new Promise(resolve => setTimeout(resolve, 0));
    return { transport, socket, events, flush, emit: (value: object) => socket.onmessage!({ data: JSON.stringify(value) }) };
  }
  it('uses only ephemeral credentials and server-locked model setup, waits for ready and encodes input/end', async () => {
    const f = socketFixture();
    expect(f.socket.url).toBe('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=auth_tokens%2Ftest%2B%2F%3D');
    expect(() => f.transport.sendAudio('AAAA')).toThrow('connection');
    f.socket.onopen!(); expect(JSON.parse(f.socket.send.mock.calls[0][0])).toEqual({ setup: { model: 'models/fixture-opaque' } });
    f.emit({ setupComplete: {} }); await f.flush(); f.transport.sendAudio('AAAA'); f.transport.audioEnd();
    expect(f.socket.send.mock.calls.slice(1).map(call => JSON.parse(call[0]))).toEqual([{ realtimeInput: { audio: { data: 'AAAA', mimeType: 'audio/pcm;rate=16000' } } }, { realtimeInput: { audioStreamEnd: true } }]);
    f.transport.close();
  });
  it('uses the current REST voiceActivity.type field for an honest responding state', async () => {
    const f = socketFixture(); f.emit({ voiceActivity: { type: 'ACTIVITY_END' } }); await f.flush();
    expect(f.events).toEqual([{ type: 'responding' }]); f.transport.close();
  });
  it('preserves Blob message order, handles every audio part, and drops interrupted audio immediately', async () => {
    const f = socketFixture();
    f.socket.onmessage!({ data: new Blob([JSON.stringify({ serverContent: { inputTranscription: { text: 'first' }, modelTurn: { parts: [{ inlineData: { data: 'AAAA', mimeType: 'audio/pcm;rate=24000' } }, { inlineData: { data: 'AQABAA==', mimeType: 'audio/pcm;rate=24000' } }] } } })]) });
    f.emit({ serverContent: { interrupted: true, modelTurn: { parts: [{ inlineData: { data: 'ignore', mimeType: 'audio/pcm;rate=24000' } }] } } });
    await f.flush();
    expect(f.events).toEqual([{ type: 'input-transcript', text: 'first' }, { type: 'audio', data: 'AAAA' }, { type: 'audio', data: 'AQABAA==' }, { type: 'interrupted' }]);
    f.transport.close();
  });
  it('rejects malformed packets without exposing provider errors or credentials', async () => {
    const f = socketFixture(); f.socket.onmessage!({ data: '{broken' }); await f.flush();
    expect(f.events).toEqual([{ type: 'error', code: 'connection' }]);
    f.transport.close();
    expect(f.socket.onmessage).toBeNull(); expect(f.socket.onerror).toBeNull();
  });
});

describe('browser audio resource ownership', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('stops a microphone which arrives after a pending permission request was cancelled', async () => {
    let resolve!: (stream: unknown) => void;
    const stop = vi.fn(), close = vi.fn(async () => {});
    class Context { state = 'running'; resume = async () => {}; close = close; }
    vi.stubGlobal('window', { isSecureContext: true, AudioContext: Context, AudioWorkletNode: class {} });
    vi.stubGlobal('AudioContext', Context);
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: () => new Promise(done => { resolve = done; }) } });
    const audio = createBrowserVoiceAudio(); const pending = audio.start(() => {});
    await Promise.resolve(); audio.close(); resolve({ getTracks: () => [{ stop }] }); await pending;
    expect(stop).toHaveBeenCalledTimes(1); expect(close).toHaveBeenCalledTimes(1);
  });
  it('rejects an insecure page before opening audio or asking microphone permission', async () => {
    const getUserMedia = vi.fn(); vi.stubGlobal('window', { isSecureContext: false });
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    await expect(createBrowserVoiceAudio().start(() => {})).rejects.toThrow('unavailable');
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});

describe('authenticated bootstrap validation and retry timing', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); auth.getSession.mockResolvedValue({ data: { session: { access_token: 'fixture-auth-only' } } }); });
  it.each([NaN, Infinity, '2026-10-17', undefined])('rejects invalid expiry %s before opening a provider transport', async expiresAt => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ credential: 'auth_tokens/fixture', model: 'models/fixture', expiresAt }) })));
    await expect(requestCompanionVoiceSession(new AbortController().signal)).rejects.toThrow('configuration');
  });
  it('rejects absent authentication without issuing a bootstrap request', async () => {
    auth.getSession.mockResolvedValueOnce({ data: { session: null } });
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(requestCompanionVoiceSession(new AbortController().signal)).rejects.toThrow('authentication');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('releases the microphone on authenticated lease rejection and cannot retry paid issuance before server timing', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 429, json: async () => ({ error: 'live_voice_session_active', retry_after_seconds: 330 }) })));
    const f = fixture(); f.dependencies.bootstrap = requestCompanionVoiceSession;
    await f.client.start();
    expect(f.client.snapshot()).toMatchObject({ status: 'error', error: 'Your previous voice session is still closing. Retry when the button becomes available.', retryAt: Date.now() + 330000 });
    expect(f.audio.close).toHaveBeenCalledTimes(1);
    await f.client.start(); expect(fetch).toHaveBeenCalledTimes(1);
    f.client.end(); await f.client.start(); expect(f.client.snapshot().status).toBe('error');
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(330000); expect(f.client.snapshot().retryAt).toBeNull(); f.client.end();
  });
});

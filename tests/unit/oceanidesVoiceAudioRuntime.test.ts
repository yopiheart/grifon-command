import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceAudio } from '../../funnels/oceanides-price-page/src/voice-lab/audio';
import { pcm16ToBase64 } from '../../funnels/oceanides-price-page/src/voice-lab/audio-math';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

class FakeSource {
  buffer: { duration: number } | null = null;
  onended: (() => void) | null = null;
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state = 'running';
  onstatechange: (() => void) | null = null;
  sampleRate = 48000;
  currentTime = 0;
  baseLatency = 0.01;
  destination = {};
  sources: FakeSource[] = [];
  resume = vi.fn(async () => undefined);
  close = vi.fn(async () => { this.state = 'closed'; });
  audioWorklet = { addModule: vi.fn(async (_url: URL) => undefined) };
  createMediaStreamSource = vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() }));
  createGain = vi.fn(() => ({ gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() }));
  createBuffer = vi.fn((_channels: number, length: number, sampleRate: number) => {
    const samples = new Float32Array(length);
    return { duration: length / sampleRate, getChannelData: () => samples };
  });
  createBufferSource = vi.fn(() => {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  });
  constructor() { FakeAudioContext.instances.push(this); }
}

class FakeWorklet {
  static instances: FakeWorklet[] = [];
  port: { onmessage: ((event: unknown) => void) | null } = { onmessage: null };
  connect = vi.fn();
  disconnect = vi.fn();
  onprocessorerror: (() => void) | null = null;
  constructor() { FakeWorklet.instances.push(this); }
}

function createStream() {
  const track = { stop: vi.fn(), onended: null as (() => void) | null };
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  return { track, stream };
}

function createAudio() {
  const callbacks = { onInput: vi.fn(), onBargeIn: vi.fn(), onSpeechEnd: vi.fn(), onAudibleStart: vi.fn(), onDrained: vi.fn(), onError: vi.fn() };
  return { audio: new VoiceAudio(callbacks), callbacks };
}

async function startWithFrame(audio: VoiceAudio) {
  const starting = audio.start();
  await vi.waitFor(() => expect(FakeWorklet.instances.length).toBeGreaterThan(0));
  FakeWorklet.instances.at(-1)!.port.onmessage?.({ data: { samples: new Float32Array(960).buffer, rms: 0, frames: 960 } });
  await starting;
}

describe('Oceanides microphone and playback resource boundaries', () => {
  const media = { getUserMedia: vi.fn<() => Promise<MediaStream>>() };

  beforeEach(() => {
    FakeAudioContext.instances = [];
    FakeWorklet.instances = [];
    media.getUserMedia.mockReset();
    vi.stubGlobal('AudioContext', FakeAudioContext);
    vi.stubGlobal('AudioWorkletNode', FakeWorklet);
    vi.stubGlobal('navigator', { mediaDevices: media });
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it.each(['resume', 'permission', 'module', 'frame'])('bounds stalled %s before any microphone input can leave the browser', async stage => {
    vi.useFakeTimers();
    const { audio, callbacks } = createAudio();
    media.getUserMedia.mockResolvedValue(createStream().stream);
    await audio.prepare();
    const context = FakeAudioContext.instances[0];
    if (stage === 'resume') context.resume.mockImplementation(() => new Promise(() => {}));
    if (stage === 'permission') media.getUserMedia.mockImplementation(() => new Promise(() => {}));
    if (stage === 'module') context.audioWorklet.addModule.mockImplementation(() => new Promise(() => {}));
    const result = audio.start().catch(error => error);
    await vi.advanceTimersByTimeAsync(12000);
    expect(await result).toMatchObject({ message: expect.stringContaining('timed out') });
    expect(callbacks.onInput).not.toHaveBeenCalled();
    expect(context.close).toHaveBeenCalledOnce();
  });

  it('stops late granted tracks after the bounded permission timeout', async () => {
    vi.useFakeTimers();
    const permission = deferred<MediaStream>();
    media.getUserMedia.mockReturnValue(permission.promise);
    const { audio } = createAudio();
    const result = audio.start().catch(error => error);
    await vi.advanceTimersByTimeAsync(12000);
    expect(await result).toBeInstanceOf(Error);
    const { stream, track } = createStream();
    permission.resolve(stream);
    await vi.advanceTimersByTimeAsync(0);
    expect(track.stop).toHaveBeenCalledOnce();
    expect(FakeWorklet.instances).toHaveLength(0);
  });

  it('keeps capture local until explicit input enablement, and schedules only a local quiet tone', async () => {
    media.getUserMedia.mockResolvedValue(createStream().stream);
    const { audio, callbacks } = createAudio();
    await startWithFrame(audio);
    const frame = { data: { samples: new Float32Array(960).buffer, rms: 0.05, frames: 960 } };
    FakeWorklet.instances[0].port.onmessage?.(frame);
    expect(callbacks.onInput).not.toHaveBeenCalled();
    audio.playCheckTone();
    expect(FakeAudioContext.instances[0].sources[0].start).toHaveBeenCalledOnce();
    audio.enableInput();
    FakeWorklet.instances[0].port.onmessage?.(frame);
    expect(callbacks.onInput).toHaveBeenCalledOnce();
    await audio.stop();
  });

  it('does not count discarded preflight speech as a caller turn', async () => {
    media.getUserMedia.mockResolvedValue(createStream().stream);
    const { audio, callbacks } = createAudio();
    await startWithFrame(audio);
    const worklet = FakeWorklet.instances[0];
    const frame = (rms: number) => worklet.port.onmessage?.({ data: { samples: new Float32Array(960).buffer, rms, frames: 960 } });
    frame(0.05);
    for (let index = 0; index < 10; index++) frame(0);
    expect(callbacks.onSpeechEnd).not.toHaveBeenCalled();
    audio.enableInput();
    frame(0.05);
    for (let index = 0; index < 10; index++) frame(0);
    expect(callbacks.onSpeechEnd).toHaveBeenCalledOnce();
    await audio.stop();
  });

  it('requires a real capture frame before declaring microphone readiness', async () => {
    media.getUserMedia.mockResolvedValue(createStream().stream);
    const { audio, callbacks } = createAudio();
    let ready = false;
    const starting = audio.start().then(() => { ready = true; });
    await vi.waitFor(() => expect(FakeWorklet.instances).toHaveLength(1));
    expect(ready).toBe(false);
    FakeWorklet.instances[0].port.onmessage?.({ data: { samples: new Float32Array(960).buffer, rms: 0, frames: 960 } });
    await starting;
    expect(ready).toBe(true);
    expect(callbacks.onInput).not.toHaveBeenCalled();
    await audio.stop();
  });

  it('does not treat malformed frames or a suspended audio context as capture readiness', async () => {
    media.getUserMedia.mockResolvedValue(createStream().stream);
    const { audio } = createAudio();
    let ready = false;
    const starting = audio.start().then(() => { ready = true; }).catch(error => error);
    await vi.waitFor(() => expect(FakeWorklet.instances).toHaveLength(1));
    const worklet = FakeWorklet.instances[0];
    worklet.port.onmessage?.({ data: { samples: new Float32Array(960).buffer, rms: 0, frames: 12 } });
    FakeAudioContext.instances[0].state = 'suspended';
    worklet.port.onmessage?.({ data: { samples: new Float32Array(960).buffer, rms: 0, frames: 960 } });
    await Promise.resolve();
    expect(ready).toBe(false);
    await audio.stop();
    expect(await starting).toBeInstanceOf(Error);
  });

  it.each(['track', 'processor', 'context'])('ends capture visibly when the %s fails after readiness', async failure => {
    const { stream, track } = createStream();
    media.getUserMedia.mockResolvedValue(stream);
    const { audio, callbacks } = createAudio();
    await startWithFrame(audio);
    audio.enableInput();
    const context = FakeAudioContext.instances[0];
    const worklet = FakeWorklet.instances[0];
    if (failure === 'track') track.onended?.();
    if (failure === 'processor') worklet.onprocessorerror?.();
    if (failure === 'context') { context.state = 'suspended'; context.onstatechange?.(); }
    expect(callbacks.onError).toHaveBeenCalledOnce();
    expect(track.stop).toHaveBeenCalledOnce();
    expect(context.close).toHaveBeenCalledOnce();
    expect(worklet.port.onmessage).toBeNull();
    expect(callbacks.onInput).not.toHaveBeenCalled();
  });

  it('unlocks audio on the explicit click without requesting the microphone', async () => {
    const { audio } = createAudio();
    await audio.prepare();
    expect(media.getUserMedia).not.toHaveBeenCalled();
    expect(FakeAudioContext.instances[0].resume).toHaveBeenCalledOnce();
    await audio.stop();
    expect(FakeAudioContext.instances[0].close).toHaveBeenCalledOnce();
  });

  it('stops late microphone tracks after stop or unmount while permission is pending', async () => {
    const permission = deferred<MediaStream>();
    media.getUserMedia.mockReturnValue(permission.promise);
    const { audio, callbacks } = createAudio();
    const starting = audio.start().catch(error => error);
    await vi.waitFor(() => expect(media.getUserMedia).toHaveBeenCalledOnce());
    const context = FakeAudioContext.instances[0];
    await audio.stop();
    const { stream, track } = createStream();
    permission.resolve(stream);
    expect(await starting).toBeInstanceOf(Error);
    expect(track.stop).toHaveBeenCalledOnce();
    expect(context.close).toHaveBeenCalledOnce();
    expect(context.createMediaStreamSource).not.toHaveBeenCalled();
    expect(FakeWorklet.instances).toHaveLength(0);
    expect(callbacks.onInput).not.toHaveBeenCalled();
  });

  it('does not activate capture after stop while the worklet module is loading', async () => {
    const moduleReady = deferred<void>();
    const { stream, track } = createStream();
    media.getUserMedia.mockResolvedValue(stream);
    const { audio } = createAudio();
    await audio.prepare();
    const context = FakeAudioContext.instances[0];
    context.audioWorklet.addModule.mockReturnValue(moduleReady.promise);
    const starting = audio.start().catch(error => error);
    await vi.waitFor(() => expect(context.audioWorklet.addModule).toHaveBeenCalledOnce());
    await audio.stop();
    moduleReady.resolve();
    expect(await starting).toBeInstanceOf(Error);
    expect(track.stop).toHaveBeenCalledOnce();
    expect(context.createMediaStreamSource).not.toHaveBeenCalled();
    expect(FakeWorklet.instances).toHaveLength(0);
  });

  it('cancels every scheduled source and ignores late chunks of the cancelled response', async () => {
    const { stream, track } = createStream();
    media.getUserMedia.mockResolvedValue(stream);
    const { audio, callbacks } = createAudio();
    await startWithFrame(audio);
    const context = FakeAudioContext.instances[0];
    const encoded = pcm16ToBase64(new Int16Array(480).fill(1000));
    audio.responseStart('old-response');
    audio.enqueue(encoded, 'old-response');
    audio.enqueue(encoded, 'old-response');
    expect(audio.playing).toBe(true);
    expect(context.sources).toHaveLength(2);
    audio.interrupt();
    for (const source of context.sources) {
      expect(source.stop).toHaveBeenCalledOnce();
      expect(source.disconnect).toHaveBeenCalledOnce();
      expect(source.onended).toBeNull();
    }
    expect(audio.playing).toBe(false);
    audio.enqueue(encoded, 'old-response');
    expect(context.sources).toHaveLength(2);
    audio.responseStart('next-response');
    audio.enqueue(encoded, 'next-response');
    expect(context.sources).toHaveLength(3);
    audio.responseEnd();
    expect(callbacks.onDrained).not.toHaveBeenCalled();
    context.sources[2].onended?.();
    expect(callbacks.onDrained).toHaveBeenCalledOnce();
    await audio.stop();
    expect(track.stop).toHaveBeenCalledOnce();
    expect(FakeWorklet.instances[0].port.onmessage).toBeNull();
    expect(FakeWorklet.instances[0].disconnect).toHaveBeenCalledOnce();
    expect(context.close).toHaveBeenCalledOnce();
  });

  it('closes a failed audio context and never requests capture when resume fails', async () => {
    const { audio } = createAudio();
    // prepare is also used by the click handler, whose catch calls stop().
    await audio.prepare();
    const context = FakeAudioContext.instances[0];
    context.resume.mockRejectedValue(new Error('Audio output unavailable'));
    await expect(audio.start()).rejects.toThrow('Audio output unavailable');
    expect(context.close).toHaveBeenCalledOnce();
    expect(media.getUserMedia).not.toHaveBeenCalled();
  });
});

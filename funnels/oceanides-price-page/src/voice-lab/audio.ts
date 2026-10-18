import { base64ToFloat32, pcm16ToBase64, PcmResampler, ResponseAudioGate } from './audio-math';

interface AudioCallbacks {
  onInput: (base64: string) => void;
  onBargeIn: (cutoffMs: number) => void;
  onSpeechEnd: (lastVoicedAt: number) => void;
  onAudibleStart: (responseId: string | undefined, scheduledAt: number) => void;
  onDrained: () => void;
  onError: (message: string) => void;
  onCapture?: (frames: number, level: number) => void;
}

/** Capture starts only for an explicit live start or local audio check. */
export class VoiceAudio {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private capture: AudioWorkletNode | null = null;
  private input: MediaStreamAudioSourceNode | null = null;
  private silent: GainNode | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private gate = new ResponseAudioGate();
  private nextAt = 0;
  private ended = false;
  private onset: number | null = null;
  private voicedMs = 0;
  private stopped = false;
  private responseStarts = new Set<string>();
  private lastVoicedAt: number | null = null;
  private silenceMs = 0;
  private inputEnabled = false;
  private captureFrames = 0;
  private cancelPreflight: (() => void) | null = null;

  constructor(private readonly callbacks: AudioCallbacks, private readonly preflightTimeoutMs = 12000) {}

  get playing(): boolean { return this.sources.size > 0; }

  async prepare(): Promise<void> {
    if (this.stopped) return;
    this.context ??= new AudioContext({ latencyHint: 'interactive' });
    await this.context.resume();
  }

  async start(): Promise<void> {
    if (this.stopped) throw new Error('Audio check stopped. No paid session was opened.');
    let frameReady!: () => void;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const firstFrame = new Promise<void>((resolve) => { frameReady = resolve; });
    const cancelled = new Promise<never>((_resolve, reject) => {
      this.cancelPreflight = () => reject(new Error('Audio check stopped. No paid session was opened.'));
      timer = setTimeout(() => reject(new Error('Audio check timed out. Check microphone permission and input, then try the local audio check. No paid session was opened.')), this.preflightTimeoutMs);
    });
    try {
      await Promise.race([this.captureAudio(frameReady, firstFrame), cancelled]);
    } catch (error) {
      await this.stop();
      if (error instanceof Error && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) throw new Error('Microphone permission denied. Allow it in this browser, then run the local audio check. No paid session was opened.');
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
      this.cancelPreflight = null;
    }
  }

  private async captureAudio(frameReady: () => void, firstFrame: Promise<void>): Promise<void> {
      await this.prepare();
      if (this.stopped) return firstFrame;
      const context = this.context!;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (this.stopped) { stream.getTracks().forEach((track) => track.stop()); return firstFrame; }
      this.stream = stream;
      for (const track of stream.getTracks()) track.onended = () => { if (!this.stopped) { this.callbacks.onError('Microphone input ended. Stop and run the local audio check before another session.'); void this.stop(); } };
      await context.audioWorklet.addModule(new URL('./capture-worklet.js', import.meta.url));
      if (this.stopped) return firstFrame;
      const resampler = new PcmResampler(context.sampleRate);
      this.capture = new AudioWorkletNode(context, 'voice-lab-capture');
      this.capture.onprocessorerror = () => { if (!this.stopped) { this.callbacks.onError('Microphone capture stopped. Run the local audio check before another session.'); void this.stop(); } };
      context.onstatechange = () => { if (!this.stopped && this.captureFrames > 0 && context.state !== 'running') { this.callbacks.onError('Browser audio was suspended or closed. Run the local audio check before another session.'); void this.stop(); } };
      this.input = context.createMediaStreamSource(this.stream);
      this.silent = context.createGain();
      this.silent.gain.value = 0;
      this.capture.port.onmessage = (event: MessageEvent<{ samples: ArrayBuffer; rms: number; frames: number }>) => {
        if (this.stopped || !this.context) return;
        const { samples, rms, frames } = event.data;
        if (!(samples instanceof ArrayBuffer) || samples.byteLength === 0 || samples.byteLength % 4 || frames !== samples.byteLength / 4 || !Number.isFinite(rms) || rms < 0 || this.context.state !== 'running') return;
        const pcm = resampler.push(new Float32Array(samples));
        if (!pcm.length) return;
        this.captureFrames++;
        this.callbacks.onCapture?.(this.captureFrames, Math.min(1, rms));
        frameReady();
        if (!this.inputEnabled) return;
        this.callbacks.onInput(pcm16ToBase64(pcm));
        const now = performance.now();
        const blockMs = frames / this.context.sampleRate * 1000;
        if (rms >= 0.018) {
          this.lastVoicedAt = now;
          this.silenceMs = 0;
        } else if (this.lastVoicedAt !== null) {
          this.silenceMs += blockMs;
          if (this.silenceMs >= 160) {
            this.callbacks.onSpeechEnd(this.lastVoicedAt);
            this.lastVoicedAt = null;
          }
        }
        if (this.playing && rms >= 0.025) {
          this.onset ??= now - blockMs;
          this.voicedMs += blockMs;
          if (this.voicedMs >= 60) {
            const onset = this.onset;
            this.interrupt();
            // AudioContext output latency is an estimate, not an acoustic measurement.
            this.callbacks.onBargeIn(Math.max(0, performance.now() - onset + this.context.baseLatency * 1000));
          }
        } else {
          this.onset = null;
          this.voicedMs = 0;
        }
      };
      this.input.connect(this.capture);
      this.capture.connect(this.silent);
      this.silent.connect(context.destination);
      await firstFrame;
  }

  enableInput(): void { if (!this.stopped && this.captureFrames > 0) this.inputEnabled = true; }

  playCheckTone(): void {
    const samples = new Int16Array(4800);
    for (let index = 0; index < samples.length; index++) samples[index] = Math.round(Math.sin(2 * Math.PI * 440 * index / 24000) * 1100 * Math.min(index / 240, (samples.length - index) / 240, 1));
    this.enqueue(pcm16ToBase64(samples), 'local-audio-check');
  }

  enqueue(encoded: string, responseId?: string): void {
    const context = this.context;
    if (!context || this.stopped || !this.gate.accept(responseId)) return;
    try {
      const samples = base64ToFloat32(encoded);
      if (!samples.length) return;
      const buffer = context.createBuffer(1, samples.length, 24000);
      buffer.getChannelData(0).set(samples);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      const startAt = Math.max(context.currentTime + 0.012, this.nextAt);
      this.nextAt = startAt + buffer.duration;
      this.ended = false;
      this.sources.add(source);
      source.onended = () => {
        this.sources.delete(source);
        source.disconnect();
        if (this.ended && !this.playing) this.callbacks.onDrained();
      };
      source.start(startAt);
      const key = responseId ?? 'unidentified';
      if (!this.responseStarts.has(key)) {
        this.responseStarts.add(key);
        const audibleAt = performance.now() + (startAt - context.currentTime + context.baseLatency) * 1000;
        this.callbacks.onAudibleStart(responseId, audibleAt);
      }
    } catch {
      this.callbacks.onError('Invalid voice audio received. Stop and review the session.');
    }
  }

  responseStart(responseId: string): void {
    this.gate.accept(responseId);
  }

  responseEnd(): void {
    this.ended = true;
    if (!this.playing) this.callbacks.onDrained();
  }

  interrupt(): void {
    this.gate.cancel();
    this.ended = false;
    for (const source of this.sources) {
      source.onended = null;
      source.stop();
      source.disconnect();
    }
    this.sources.clear();
    this.nextAt = 0;
    this.onset = null;
    this.voicedMs = 0;
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.inputEnabled = false;
    this.cancelPreflight?.();
    this.interrupt();
    if (this.capture) this.capture.port.onmessage = null;
    if (this.capture) this.capture.onprocessorerror = null;
    this.capture?.disconnect();
    this.input?.disconnect();
    this.silent?.disconnect();
    this.stream?.getTracks().forEach((track) => { track.onended = null; track.stop(); });
    const context = this.context;
    this.context = null;
    this.stream = null;
    this.capture = null;
    this.input = null;
    this.silent = null;
    if (context) context.onstatechange = null;
    if (context && context.state !== 'closed') await context.close();
  }
}

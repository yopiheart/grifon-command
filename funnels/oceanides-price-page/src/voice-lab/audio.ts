import { base64ToFloat32, pcm16ToBase64, PcmResampler, ResponseAudioGate } from './audio-math';

interface AudioCallbacks {
  onInput: (base64: string) => void;
  onBargeIn: (cutoffMs: number) => void;
  onSpeechEnd: (lastVoicedAt: number) => void;
  onAudibleStart: (responseId: string | undefined, scheduledAt: number) => void;
  onDrained: () => void;
  onError: (message: string) => void;
}

/** No microphone is requested until start() is explicitly called for a live session. */
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

  constructor(private readonly callbacks: AudioCallbacks) {}

  get playing(): boolean { return this.sources.size > 0; }

  async prepare(): Promise<void> {
    if (this.stopped) return;
    this.context ??= new AudioContext({ latencyHint: 'interactive' });
    await this.context.resume();
  }

  async start(): Promise<void> {
    try {
      await this.prepare();
      if (this.stopped) return;
      const context = this.context!;
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (this.stopped) { this.stream.getTracks().forEach((track) => track.stop()); return; }
      await context.audioWorklet.addModule(new URL('./capture-worklet.js', import.meta.url));
      if (this.stopped) return;
      const resampler = new PcmResampler(context.sampleRate);
      this.capture = new AudioWorkletNode(context, 'voice-lab-capture');
      this.input = context.createMediaStreamSource(this.stream);
      this.silent = context.createGain();
      this.silent.gain.value = 0;
      this.capture.port.onmessage = (event: MessageEvent<{ samples: ArrayBuffer; rms: number; frames: number }>) => {
        if (this.stopped || !this.context) return;
        const { samples, rms, frames } = event.data;
        const pcm = resampler.push(new Float32Array(samples));
        if (pcm.length) this.callbacks.onInput(pcm16ToBase64(pcm));
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
    } catch (error) {
      await this.stop();
      throw error;
    }
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
    this.interrupt();
    if (this.capture) this.capture.port.onmessage = null;
    this.capture?.disconnect();
    this.input?.disconnect();
    this.silent?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    const context = this.context;
    this.context = null;
    this.stream = null;
    this.capture = null;
    this.input = null;
    this.silent = null;
    if (context && context.state !== 'closed') await context.close();
  }
}

import { getSupabase } from './supabaseClient';
import { decodePcm16, Pcm16Encoder } from './companionVoicePcm';

export type CompanionVoiceStatus = 'idle' | 'connecting' | 'listening' | 'responding' | 'speaking' | 'ended' | 'error';
export interface CompanionVoiceTranscript { id: number; role: 'user' | 'assistant'; text: string; }
export interface CompanionVoiceSnapshot {
  status: CompanionVoiceStatus;
  muted: boolean;
  error: string | null;
  retryAt: number | null;
  transcriptTruncated: boolean;
  interim: { user: string; assistant: string };
  transcripts: CompanionVoiceTranscript[];
}
export interface CompanionVoiceBootstrap {
  credential: string;
  model: string;
  expiresAt: number;
}
export type CompanionVoiceEvent =
  | { type: 'ready' | 'interrupted' | 'turn-complete' | 'responding' }
  | { type: 'input-transcript' | 'output-transcript'; text: string }
  | { type: 'audio'; data: string }
  | { type: 'error'; code: string };
export interface CompanionVoiceAudio {
  start: (receive: (data: string) => void, fail?: () => void) => Promise<void>;
  mute: (muted: boolean) => void;
  play: (data: string, done: () => void) => void;
  interrupt: () => void;
  close: () => void;
}
export interface CompanionVoiceTransport {
  sendAudio: (data: string) => void;
  audioEnd: () => void;
  close: () => void;
}
export interface CompanionVoiceDependencies {
  bootstrap: (signal: AbortSignal) => Promise<CompanionVoiceBootstrap>;
  audio: () => CompanionVoiceAudio;
  connect: (session: CompanionVoiceBootstrap, receive: (event: CompanionVoiceEvent) => void) => CompanionVoiceTransport;
}
const messages: Record<string, string> = {
  permission: 'Microphone permission was denied. You can keep typing.',
  unavailable: 'Live voice needs a secure connection and a supported microphone. You can keep typing.',
  authentication: 'Sign in again before starting live voice.',
  configuration: 'Live voice is not available yet. You can keep typing.',
  allowance: 'Live voice is unavailable for your account right now. You can keep typing.',
  expired: 'This voice session ended. Start a new voice chat to continue.',
  connection: 'Live voice lost its connection. Try again or keep typing.',
  live_voice_session_active: 'Your previous voice session is still closing. Retry when the button becomes available.',
  live_voice_rate_limited: 'Too many voice starts. Retry when the button becomes available.',
  live_voice_daily_limit: 'The live voice limit has been reached. Try again later or keep typing.',
};
class VoiceRequestError extends Error {
  constructor(code: string, readonly retryAfterSeconds?: number) { super(code); }
}

export class CompanionVoiceClient {
  private state: CompanionVoiceSnapshot = { status: 'idle', muted: false, error: null, retryAt: null, transcriptTruncated: false, interim: { user: '', assistant: '' }, transcripts: [] };
  private listeners = new Set<(value: CompanionVoiceSnapshot) => void>();
  private epoch = 0;
  private playbackEpoch = 0;
  private ready = false;
  private audio: CompanionVoiceAudio | null = null;
  private transport: CompanionVoiceTransport | null = null;
  private abort: AbortController | null = null;
  private timeout: ReturnType<typeof setTimeout> | undefined;
  private expires: ReturnType<typeof setTimeout> | undefined;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private retryMessage: string | null = null;
  private transcriptId = 0;
  constructor(private dependencies: CompanionVoiceDependencies) {}
  snapshot = () => this.state;
  subscribe = (listener: (value: CompanionVoiceSnapshot) => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private publish(update: Partial<CompanionVoiceSnapshot>) {
    this.state = { ...this.state, ...update };
    this.listeners.forEach(listener => listener(this.state));
  }
  private release() {
    this.epoch++; this.playbackEpoch++; this.ready = false;
    clearTimeout(this.timeout); clearTimeout(this.expires); clearTimeout(this.retryTimer);
    this.abort?.abort(); this.abort = null;
    const transport = this.transport, audio = this.audio;
    this.transport = null; this.audio = null;
    transport?.close(); audio?.close();
  }
  end = () => {
    const text = this.state.interim.user.trim();
    this.release();
    this.publish({ status: 'ended', muted: false, error: null, transcripts: text ? [...this.state.transcripts.filter(transcript => transcript.role !== 'user'), { id: ++this.transcriptId, role: 'user' as const, text }].slice(-20) : this.state.transcripts, interim: { user: '', assistant: '' } });
  };
  dismiss = () => {
    this.release();
    this.publish({ status: 'idle', muted: false, error: null, transcriptTruncated: false, transcripts: [], interim: { user: '', assistant: '' } });
  };
  private fail(code: string, retryAfterSeconds?: number) {
    this.release();
    const wait = retryAfterSeconds ? Math.min(Math.max(retryAfterSeconds, 1), 86400) : 0;
    this.retryMessage = wait ? messages[code] ?? messages.connection : null;
    this.publish({ status: 'error', muted: false, error: messages[code] ?? messages.connection, retryAt: wait ? Date.now() + wait * 1000 : null, interim: { user: '', assistant: '' } });
    if (wait) this.retryTimer = setTimeout(() => this.publish({ retryAt: null }), wait * 1000);
  }
  setMuted = (muted: boolean) => {
    if (!this.ready || !this.audio) return;
    try {
      this.audio.mute(muted);
      if (muted) this.transport?.audioEnd();
      this.publish({ muted });
    } catch { this.fail('connection'); }
  };
  start = async () => {
    if (['connecting', 'listening', 'responding', 'speaking'].includes(this.state.status)) return;
    if (this.state.retryAt !== null && this.state.retryAt > Date.now()) {
      this.publish({ status: 'error', error: this.retryMessage ?? messages.allowance });
      clearTimeout(this.retryTimer);
      this.retryTimer = setTimeout(() => this.publish({ retryAt: null }), this.state.retryAt - Date.now());
      return;
    }
    this.release();
    const epoch = this.epoch;
    this.abort = new AbortController();
    this.publish({ status: 'connecting', muted: false, error: null, retryAt: null, transcriptTruncated: false, interim: { user: '', assistant: '' }, transcripts: [] });
    this.timeout = setTimeout(() => { if (epoch === this.epoch) this.fail('connection'); }, 15000);
    try {
      const audio = this.dependencies.audio(); this.audio = audio;
      await audio.start(data => {
        if (epoch === this.epoch && this.ready && !this.state.muted) {
          try { this.transport?.sendAudio(data); } catch { this.fail('connection'); }
        }
      }, () => { if (epoch === this.epoch) this.fail('connection'); });
      if (epoch !== this.epoch) return;
      const session = await this.dependencies.bootstrap(this.abort.signal);
      if (epoch !== this.epoch) return;
      if (session.expiresAt <= Date.now()) throw new Error('expired');
      this.transport = this.dependencies.connect(session, event => { if (epoch === this.epoch) this.receive(event); });
      this.expires = setTimeout(() => { if (epoch === this.epoch) this.fail('expired'); }, Math.min(session.expiresAt - Date.now(), 2147483647));
    } catch (error) {
      if (epoch !== this.epoch) return;
      this.fail(error instanceof DOMException && error.name === 'NotAllowedError' ? 'permission' : error instanceof Error ? error.message : 'connection', error instanceof VoiceRequestError ? error.retryAfterSeconds : undefined);
    }
  };
  private finalize(role: 'user' | 'assistant') {
    const text = this.state.interim[role].trim();
    if (!text) return;
    this.publish({ transcripts: [...this.state.transcripts, { id: ++this.transcriptId, role, text }].slice(-20), interim: { ...this.state.interim, [role]: '' } });
  }
  private receive(event: CompanionVoiceEvent) {
    if (event.type === 'ready') {
      this.ready = true; clearTimeout(this.timeout); this.publish({ status: 'listening' });
    } else if (event.type === 'error') this.fail(event.code);
    else if (event.type === 'input-transcript' || event.type === 'output-transcript') {
      const role = event.type === 'input-transcript' ? 'user' : 'assistant';
      const text = this.state.interim[role] + event.text;
      this.publish({ interim: { ...this.state.interim, [role]: text.slice(0, 8000) }, transcriptTruncated: this.state.transcriptTruncated || (role === 'user' && text.length > 8000) });
    } else if (event.type === 'audio') {
      const playback = this.playbackEpoch;
      this.publish({ status: 'speaking' });
      try {
        this.audio?.play(event.data, () => {
          if (playback === this.playbackEpoch && this.ready) this.publish({ status: 'listening' });
        });
      } catch { this.fail('connection'); }
    } else if (event.type === 'interrupted') {
      this.playbackEpoch++; this.audio?.interrupt();
      this.publish({ status: 'listening', interim: { ...this.state.interim, assistant: '' } });
    } else if (event.type === 'turn-complete') {
      // User transcription is independently ordered. Only the user's End
      // action freezes the received fragments for review, never a model turn.
      this.finalize('assistant');
      if (this.state.status !== 'speaking') this.publish({ status: 'listening' });
    } else if (event.type === 'responding' && this.state.status !== 'speaking') this.publish({ status: 'responding' });
  }
}

const recorderCode = `class GrifonVoiceRecorder extends AudioWorkletProcessor {
  constructor() { super(); this.samples = new Float32Array(2048); this.used = 0; }
  process(inputs) {
    const input = inputs[0] && inputs[0][0];
    if (input) for (const sample of input) {
      this.samples[this.used++] = sample;
      if (this.used === this.samples.length) { this.port.postMessage(this.samples, [this.samples.buffer]); this.samples = new Float32Array(2048); this.used = 0; }
    }
    return true;
  }
}
registerProcessor('grifon-voice-recorder', GrifonVoiceRecorder);`;

export function createBrowserVoiceAudio(options: { capture?: boolean } = {}): CompanionVoiceAudio {
  let context: AudioContext | null = null, stream: MediaStream | null = null;
  let input: MediaStreamAudioSourceNode | null = null, worklet: AudioWorkletNode | null = null;
  let silence: GainNode | null = null, moduleUrl: string | null = null;
  let closed = false, muted = false, nextPlayAt = 0;
  const playing = new Set<AudioBufferSourceNode>();
  const interrupt = () => {
    const sources = [...playing]; playing.clear(); nextPlayAt = 0;
    sources.forEach(source => { source.onended = null; try { source.stop(); } catch { /* Already ended. */ } source.disconnect(); });
  };
  const close = () => {
    closed = true; interrupt();
    stream?.getTracks().forEach(track => { track.onended = null; track.stop(); }); stream = null;
    if (worklet) { worklet.port.onmessage = null; worklet.port.close(); worklet.disconnect(); worklet = null; }
    input?.disconnect(); input = null; silence?.disconnect(); silence = null;
    if (moduleUrl) { URL.revokeObjectURL(moduleUrl); moduleUrl = null; }
    const previous = context; context = null;
    if (previous) { previous.onstatechange = null; if (previous.state !== 'closed') void previous.close().catch(() => {}); }
  };
  return {
    start: async (receive, fail) => {
      const capture = options.capture !== false;
      if (!window.isSecureContext || !window.AudioContext || (capture && (!navigator.mediaDevices?.getUserMedia || !window.AudioWorkletNode))) throw new Error('unavailable');
      context = new AudioContext();
      const active = context;
      await active.resume();
      if (closed) return;
      if (active.state !== 'running') throw new Error('unavailable');
      active.onstatechange = () => { if (!closed && active.state !== 'running') fail?.(); };
      if (!capture) return;
      const microphone = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (closed) { microphone.getTracks().forEach(track => track.stop()); return; }
      stream = microphone;
      microphone.getAudioTracks().forEach(track => { track.onended = () => { if (!closed) fail?.(); }; });
      moduleUrl = URL.createObjectURL(new Blob([recorderCode], { type: 'text/javascript' }));
      await active.audioWorklet.addModule(moduleUrl);
      if (closed) return;
      URL.revokeObjectURL(moduleUrl); moduleUrl = null;
      const encoder = new Pcm16Encoder(active.sampleRate);
      input = active.createMediaStreamSource(microphone);
      worklet = new AudioWorkletNode(active, 'grifon-voice-recorder');
      worklet.port.onmessage = event => {
        if (closed || muted || !(event.data instanceof Float32Array)) return;
        try { const encoded = encoder.encode(event.data); if (encoded) receive(encoded); }
        catch { fail?.(); }
      };
      silence = active.createGain(); silence.gain.value = 0;
      input.connect(worklet); worklet.connect(silence); silence.connect(active.destination);
    },
    mute: value => { muted = value; stream?.getAudioTracks().forEach(track => { track.enabled = !value; }); },
    play: (data, done) => {
      if (closed || !context) return;
      const samples = decodePcm16(data);
      if (!samples.length) return;
      if (nextPlayAt - context.currentTime > 10) throw new Error('connection');
      const buffer = context.createBuffer(1, samples.length, 24000);
      buffer.getChannelData(0).set(samples);
      const source = context.createBufferSource(); source.buffer = buffer; source.connect(context.destination);
      const start = Math.max(context.currentTime, nextPlayAt); nextPlayAt = start + buffer.duration;
      playing.add(source);
      source.onended = () => { playing.delete(source); source.disconnect(); if (!playing.size) done(); };
      source.start(start);
    }, interrupt, close,
  };
}

export async function requestCompanionVoiceSession(signal: AbortSignal): Promise<CompanionVoiceBootstrap> {
  const { data } = await getSupabase().auth.getSession();
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  const token = data.session?.access_token;
  if (!token) throw new Error('authentication');
  const response = await fetch('/api/gemini/live-session', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}', cache: 'no-store', signal });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    if (response.status === 429 && ['live_voice_rate_limited', 'live_voice_session_active', 'live_voice_daily_limit'].includes(body?.error)) {
      const retry = body.retry_after_seconds;
      throw new VoiceRequestError(body.error, typeof retry === 'number' && Number.isFinite(retry) && retry > 0 ? retry : undefined);
    }
    throw new Error(response.status === 401 ? 'authentication' : response.status === 403 || response.status === 429 ? 'allowance' : response.status === 404 || response.status === 503 ? 'configuration' : 'connection');
  }
  const session: unknown = await response.json();
  if (!session || typeof session !== 'object') throw new Error('configuration');
  const value = session as Partial<CompanionVoiceBootstrap>;
  if (typeof value.credential !== 'string' || !value.credential.startsWith('auth_tokens/') || typeof value.model !== 'string' || !value.model || typeof value.expiresAt !== 'number' || !Number.isFinite(value.expiresAt)) throw new Error('configuration');
  return value as CompanionVoiceBootstrap;
}

export interface CompanionVoiceUsage {
  totalTokenCount?: number;
  promptTokenCount?: number;
  responseTokenCount?: number;
  thoughtsTokenCount?: number;
  cachedContentTokenCount?: number;
}
export interface CompanionVoiceDiagnostics {
  incomingMessages: number;
  setupCompleteMessages: number;
  serverContentMessages: number;
  usageMetadataMessages: number;
  errorMessages: number;
  goAwayMessages: number;
  toolCallMessages: number;
  toolCallCancellationMessages: number;
  sessionResumptionUpdateMessages: number;
  voiceActivityMessages: number;
  voiceActivityDetectionSignalMessages: number;
  inputTranscriptionMessages: number;
  outputTranscriptionMessages: number;
  interimInputTranscriptionMessages: number;
  waitingForInputMessages: number;
  interactionStatusMessages: number;
  modelTurnMessages: number;
  interruptedMessages: number;
  turnCompleteMessages: number;
  generationCompleteMessages: number;
  voiceActivityStartMessages: number;
  voiceActivityEndMessages: number;
  inlineAudioPartsSeen: number;
  inlineAudioPartsSupported: number;
  inlineAudioPartsUnsupported: number;
  inlinePcmParts: number;
  inlineOtherAudioParts: number;
  inlineNonAudioParts: number;
  audioFramesEnqueued: number;
  audioEndFramesEnqueued: number;
  errors: number;
  closeCode: number | null;
}
export function connectCompanionVoice(session: CompanionVoiceBootstrap, receive: (event: CompanionVoiceEvent) => void, observeUsage?: (usage: CompanionVoiceUsage | null) => void, observeDiagnostics?: (diagnostics: CompanionVoiceDiagnostics) => void): CompanionVoiceTransport {
  const socket = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(session.credential)}`);
  let closed = false, ready = false;
  let incoming = Promise.resolve();
  const diagnostics: CompanionVoiceDiagnostics | null = observeDiagnostics ? {
    incomingMessages: 0, setupCompleteMessages: 0, serverContentMessages: 0, usageMetadataMessages: 0, errorMessages: 0, goAwayMessages: 0,
    toolCallMessages: 0, toolCallCancellationMessages: 0, sessionResumptionUpdateMessages: 0, voiceActivityMessages: 0, voiceActivityDetectionSignalMessages: 0,
    inputTranscriptionMessages: 0, outputTranscriptionMessages: 0, interimInputTranscriptionMessages: 0, waitingForInputMessages: 0, interactionStatusMessages: 0,
    modelTurnMessages: 0, interruptedMessages: 0, turnCompleteMessages: 0, generationCompleteMessages: 0, voiceActivityStartMessages: 0, voiceActivityEndMessages: 0,
    inlineAudioPartsSeen: 0, inlineAudioPartsSupported: 0, inlineAudioPartsUnsupported: 0, inlinePcmParts: 0, inlineOtherAudioParts: 0, inlineNonAudioParts: 0,
    audioFramesEnqueued: 0, audioEndFramesEnqueued: 0, errors: 0, closeCode: null,
  } : null;
  const reportDiagnostics = () => {
    if (closed || !diagnostics) return;
    try { observeDiagnostics?.({ ...diagnostics }); } catch { /* Observation must not affect transport. */ }
  };
  socket.onopen = () => { if (!closed) socket.send(JSON.stringify({ setup: { model: session.model } })); };
  socket.onmessage = event => {
    if (closed) return;
    if (diagnostics) { diagnostics.incomingMessages++; reportDiagnostics(); if (closed) return; }
    // Blob conversion is async; serial parsing preserves provider message order.
    incoming = incoming.then(async () => {
      if (closed) return;
      const text = typeof event.data === 'string' ? event.data : event.data instanceof Blob ? await event.data.text() : null;
      if (closed) return;
      if (!text || text.length > 2000000) throw new Error('connection');
      const message = JSON.parse(text);
      if (!message || typeof message !== 'object') throw new Error('connection');
      if (diagnostics) {
        for (const [key, counter] of [
          ['setupComplete', 'setupCompleteMessages'], ['serverContent', 'serverContentMessages'], ['usageMetadata', 'usageMetadataMessages'], ['error', 'errorMessages'], ['goAway', 'goAwayMessages'],
          ['toolCall', 'toolCallMessages'], ['toolCallCancellation', 'toolCallCancellationMessages'], ['sessionResumptionUpdate', 'sessionResumptionUpdateMessages'], ['voiceActivity', 'voiceActivityMessages'], ['voiceActivityDetectionSignal', 'voiceActivityDetectionSignalMessages'],
        ] as const) if (key in message) diagnostics[counter]++;
        if (message.voiceActivity?.type === 'ACTIVITY_START') diagnostics.voiceActivityStartMessages++;
        if (message.voiceActivity?.type === 'ACTIVITY_END') diagnostics.voiceActivityEndMessages++;
        const content = message.serverContent;
        if (content && typeof content === 'object') {
          for (const [key, counter] of [
            ['inputTranscription', 'inputTranscriptionMessages'], ['outputTranscription', 'outputTranscriptionMessages'], ['interimInputTranscription', 'interimInputTranscriptionMessages'], ['waitingForInput', 'waitingForInputMessages'], ['interactionStatus', 'interactionStatusMessages'],
            ['modelTurn', 'modelTurnMessages'], ['interrupted', 'interruptedMessages'], ['turnComplete', 'turnCompleteMessages'], ['generationComplete', 'generationCompleteMessages'],
          ] as const) if (key in content) diagnostics[counter]++;
          if (Array.isArray(content.modelTurn?.parts)) for (const part of content.modelTurn.parts) {
            const audio = part?.inlineData;
            if (!audio || typeof audio !== 'object') continue;
            const mime = typeof audio.mimeType === 'string' ? audio.mimeType : '';
            if (!mime.startsWith('audio/')) { diagnostics.inlineNonAudioParts++; continue; }
            diagnostics.inlineAudioPartsSeen++;
            if (/^audio\/pcm(?:;|$)/.test(mime)) diagnostics.inlinePcmParts++;
            else diagnostics.inlineOtherAudioParts++;
            if (typeof audio.data === 'string' && /^audio\/pcm(?:;rate=24000)?$/.test(mime)) diagnostics.inlineAudioPartsSupported++;
            else diagnostics.inlineAudioPartsUnsupported++;
          }
        }
        if (message.error || message.goAway) diagnostics.errors++;
        reportDiagnostics();
        if (closed) return;
      }
      if (observeUsage && 'usageMetadata' in message) {
        const raw = message.usageMetadata;
        const usage: CompanionVoiceUsage = {};
        let valid = !!raw && typeof raw === 'object' && !Array.isArray(raw);
        if (valid) for (const key of ['totalTokenCount', 'promptTokenCount', 'responseTokenCount', 'thoughtsTokenCount', 'cachedContentTokenCount'] as const) {
          if (raw[key] === undefined) continue;
          if (!Number.isSafeInteger(raw[key]) || raw[key] < 0) { valid = false; break; }
          usage[key] = raw[key];
        }
        observeUsage(valid && Object.keys(usage).length ? usage : null);
        if (closed) return;
      }
      if (message.error || message.goAway) { receive({ type: 'error', code: message.goAway ? 'expired' : 'connection' }); return; }
      if (message.setupComplete) { ready = true; receive({ type: 'ready' }); }
      if (message.voiceActivity?.type === 'ACTIVITY_END') receive({ type: 'responding' });
      const content = message.serverContent;
      if (!content || typeof content !== 'object') return;
      if (content.interrupted) receive({ type: 'interrupted' });
      for (const [key, type] of [['inputTranscription', 'input-transcript'], ['outputTranscription', 'output-transcript']] as const) {
        const transcript = content[key];
        if (transcript && typeof transcript.text === 'string') receive({ type, text: transcript.text });
      }
      // An interrupted packet must not requeue the audio it just cancelled.
      if (!content.interrupted && Array.isArray(content.modelTurn?.parts)) {
        for (const part of content.modelTurn.parts) {
          const audio = part?.inlineData;
          if (typeof audio?.data === 'string' && /^audio\/pcm(?:;rate=24000)?$/.test(audio.mimeType ?? '')) receive({ type: 'audio', data: audio.data });
        }
      }
      if (content.turnComplete) receive({ type: 'turn-complete' });
    }).catch(() => { if (!closed) { if (diagnostics) { diagnostics.errors++; reportDiagnostics(); } if (!closed) receive({ type: 'error', code: 'connection' }); } });
  };
  socket.onerror = () => { if (!closed) { if (diagnostics) { diagnostics.errors++; reportDiagnostics(); } if (!closed) receive({ type: 'error', code: 'connection' }); } };
  socket.onclose = event => {
    if (!closed) {
      if (diagnostics) { diagnostics.errors++; diagnostics.closeCode = Number.isSafeInteger(event.code) && event.code >= 1000 && event.code <= 4999 ? event.code : null; reportDiagnostics(); }
      if (!closed) receive({ type: 'error', code: 'connection' });
    }
  };
  const send = (value: object) => {
    if (closed || !ready || socket.readyState !== WebSocket.OPEN || socket.bufferedAmount > 512000) throw new Error('connection');
    socket.send(JSON.stringify(value));
  };
  return {
    sendAudio: data => { send({ realtimeInput: { audio: { data, mimeType: 'audio/pcm;rate=16000' } } }); if (diagnostics) { diagnostics.audioFramesEnqueued++; reportDiagnostics(); } },
    audioEnd: () => { send({ realtimeInput: { audioStreamEnd: true } }); if (diagnostics) { diagnostics.audioEndFramesEnqueued++; reportDiagnostics(); } },
    close: () => { closed = true; ready = false; socket.onopen = null; socket.onmessage = null; socket.onerror = null; socket.onclose = null; socket.close(); },
  };
}

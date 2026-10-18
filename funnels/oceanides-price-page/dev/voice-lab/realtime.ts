import type { PlaybackDiagnostics, ServerEvent, VoiceLifecycle, VoiceStage } from '../../src/voice-lab/contracts';
import { VoiceDomain } from './domain';
import type { PaidSpec } from './spec';
import { diagnosticMessage, safeCloseCode, safeHttpStatus, safeProviderCode, safeTransportCode, type ProviderDiagnostic, type ProviderPhase } from './diagnostics';

export interface ProviderSocket {
  readyState: number;
  send(data: string): void;
  close(): void;
  on(event: 'open' | 'message' | 'error' | 'close' | 'unexpected-response', listener: (...data: unknown[]) => void): unknown;
}

/** Session-local adapter. Never reconnects or resumes a paid connection. */
export class RealtimeAdapter {
  private responseId = '';
  private responseDone = false;
  private drained = false;
  private pendingTools = false;
  private hasTools = false;
  private canceled = new Set<string>();
  private seenCalls = new Set<string>();
  private textInputs = 0;
  private toolCalls = 0;
  private disposed = false;
  private configured = false;
  private audioReady = false;
  private openingSent = false;
  private openingWritten = false;
  private pendingTurn = false;
  private responseRequested = false;
  private callerSpeaking = false;
  private cancelWhenCreated = false;
  private cancelUpstreamWhenCreated = false;
  private failed = false;
  private phase: ProviderPhase = 'connecting';
  private readonly connectedAt: number;
  private inputFrames = 0;
  private outputChunks = 0;
  private serverSpeechStarts = 0;
  private serverSpeechStops = 0;
  private responsesCreated = 0;
  private responsesDone = 0;
  private clientInterrupts = 0;
  private canceledAudioChunks = 0;
  private outputPcmBytes = 0;
  private playback: PlaybackDiagnostics | null = null;
  private lastStage: VoiceStage = 'connecting';

  lifecycle(): VoiceLifecycle { return { configured: this.configured, audioReady: this.audioReady, openingSent: this.openingWritten, inputFrames: this.inputFrames, outputChunks: this.outputChunks, serverSpeechStarts: this.serverSpeechStarts, serverSpeechStops: this.serverSpeechStops, responsesCreated: this.responsesCreated, responsesDone: this.responsesDone, clientInterrupts: this.clientInterrupts, canceledAudioChunks: this.canceledAudioChunks, outputPcmBytes: this.outputPcmBytes, playback: this.playback && { ...this.playback }, lastStage: this.lastStage, stopReason: null }; }

  observePlayback(counts: PlaybackDiagnostics) { this.playback = { ...counts }; }

  constructor(private readonly socket: ProviderSocket, private readonly spec: PaidSpec, private readonly domain: VoiceDomain, private readonly send: (event: ServerEvent) => void, private readonly finish: (reason: string) => void, private readonly now = Date.now, private readonly observeFailure?: (diagnostic: ProviderDiagnostic) => void) {
    this.connectedAt = now();
    socket.on('open', () => {
      if (this.disposed || this.failed) return;
      this.phase = 'socket_open';
      this.lastStage = 'socket_open';
      this.write({ type: 'session.update', session: { voice: spec.voice, instructions: `${spec.instructions}\n${JSON.stringify({ selectedScenario: domain.state.scenarioId, knownLead: domain.state.details })}`, turn_detection: spec.turnDetection, audio: spec.audio, tools: spec.tools, resumption: { enabled: false } } });
    });
    socket.on('message', raw => {
      try {
        if (this.disposed) return;
        const text = typeof raw === 'string' ? raw : Buffer.isBuffer(raw) ? raw.toString('utf8') : '';
        if (text.length > 1_000_000) return this.fail('provider_message_too_large');
        this.onEvent(JSON.parse(text) as Record<string, unknown>);
      } catch { this.fail('provider_protocol_error'); }
    });
    socket.on('unexpected-response', (_request, response) => {
      if (this.disposed || this.failed) return;
      // Only statusCode is projected. dispose() explicitly aborts this handshake;
      // handling this event suppresses ws's default abort.
      const httpStatus = response && typeof response === 'object' ? safeHttpStatus((response as { statusCode?: unknown }).statusCode) : null;
      this.fail('provider_handshake_rejected', { httpStatus });
    });
    socket.on('error', error => { if (!this.disposed && !this.failed) this.fail('provider_connection_failed', { transportCode: safeTransportCode(error) }); });
    socket.on('close', code => { if (!this.disposed && !this.failed) this.fail('provider_disconnected', { closeCode: safeCloseCode(code) }); });
  }

  private write(event: unknown) { if (!this.disposed && this.socket.readyState === 1) this.socket.send(JSON.stringify(event)); }
  private fail(code: string, details: Partial<Pick<ProviderDiagnostic, 'httpStatus' | 'closeCode' | 'transportCode' | 'providerCode'>> = {}) {
    if (this.disposed || this.failed) return;
    this.failed = true;
    this.lastStage = 'provider_error';
    const diagnostic: ProviderDiagnostic = { phase: this.phase, elapsedMs: Math.max(0, Math.min(180000, Math.round(this.now() - this.connectedAt))), httpStatus: null, closeCode: null, transportCode: null, providerCode: null, ...details };
    this.observeFailure?.(diagnostic);
    try { this.send({ type: 'error', code, message: diagnosticMessage(diagnostic) }); }
    finally { try { this.finish(code); } finally { this.dispose(); } }
  }

  private continueIfReady() {
    if (this.domain.automationStopped()) return;
    if (!this.callerSpeaking && !this.responseRequested && this.responseDone && this.drained && (this.pendingTools || this.pendingTurn)) {
      this.pendingTools = false;
      this.pendingTurn = false;
      this.requestResponse();
    }
  }

  private greetIfReady() {
    if (this.disposed || this.failed || !this.configured || !this.audioReady || this.openingSent || this.domain.automationStopped()) return;
    this.openingSent = true;
    this.openingWritten = true;
    this.lastStage = 'opening_sent';
    this.responseRequested = true;
    this.responseDone = false;
    this.drained = false;
    // force_message owns its response lifecycle; response.create would start a second response.
    this.write({ type: 'conversation.item.create', item: { type: 'force_message', role: 'assistant', interruptible: true, content: [{ type: 'output_text', text: this.spec.openingMessage }] } });
  }

  private requestResponse() {
    if (this.domain.automationStopped()) return;
    if (this.responseRequested || this.callerSpeaking) { this.pendingTurn = true; return; }
    this.responseRequested = true;
    this.responseId = '';
    this.responseDone = false;
    this.drained = false;
    this.write({ type: 'response.create' });
  }

  private queueText(text: string) {
    if (this.domain.automationStopped()) return this.stopTerminalWorkflow();
    if (!this.configured || !this.audioReady) throw new Error('provider_preparing');
    if (text.length > this.spec.limits.maxTextCharacters || ++this.textInputs > this.spec.limits.maxTextInputs) { this.fail('text_input_limit'); return; }
    this.write({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] } });
    if (!this.responseRequested && !this.callerSpeaking && (!this.responseId || (this.responseDone && this.drained))) {
      this.pendingTurn = false;
      this.requestResponse();
    } else this.pendingTurn = true;
  }

  private onEvent(event: Record<string, unknown>) {
    const type = event.type;
    if (type === 'error') return this.fail('provider_rejected_request', { providerCode: safeProviderCode(event.error) });
    if (type === 'session.created') { this.phase = 'session_created'; this.lastStage = 'session_created'; return; }
    if (type === 'session.updated') {
      this.phase = 'configured';
      this.configured = true;
      this.lastStage = 'configured';
      this.domain.state.phase = 'active';
      this.send({ type: 'state', snapshot: this.domain.snapshot() });
      this.greetIfReady();
      return;
    }
    if (type === 'response.created') {
      const response = event.response as { id?: unknown } | undefined;
      if (typeof response?.id !== 'string') return;
      this.responsesCreated = Math.min(1000000000, this.responsesCreated + 1);
      this.responseId = response.id;
      this.lastStage = 'response_created';
      this.responseRequested = true;
      this.responseDone = false;
      this.drained = false;
      this.hasTools = false;
      this.send({ type: 'response_started', responseId: this.responseId });
      if (this.cancelWhenCreated) {
        const cancelUpstream = this.cancelUpstreamWhenCreated;
        this.cancelWhenCreated = false;
        this.cancelUpstreamWhenCreated = false;
        this.interruptResponse(cancelUpstream);
      }
      return;
    }
    if (type === 'input_audio_buffer.speech_started') {
      this.serverSpeechStarts = Math.min(1000000000, this.serverSpeechStarts + 1);
      this.callerSpeaking = true;
      this.lastStage = 'caller_speaking';
      // A caller who speaks first owns this turn; never add a late greeting over its VAD response.
      this.openingSent = true;
      this.cancelWhenCreated = false;
      this.cancelUpstreamWhenCreated = false;
      this.interruptResponse(false);
      return;
    }
    if (type === 'input_audio_buffer.speech_stopped') { this.serverSpeechStops = Math.min(1000000000, this.serverSpeechStops + 1); this.callerSpeaking = false; this.lastStage = 'caller_stopped'; this.send({ type: 'speech_stopped', at: this.now() }); return; }
    if (type === 'conversation.item.input_audio_transcription.completed') {
      if (typeof event.transcript === 'string') this.send({ type: 'transcript', entry: this.domain.transcript('caller', event.transcript) });
      return;
    }
    const eventResponseId = typeof event.response_id === 'string' ? event.response_id : this.responseId;
    if (this.canceled.has(eventResponseId) && type !== 'response.done') {
      if (type === 'response.output_audio.delta' || type === 'response.audio.delta') this.canceledAudioChunks = Math.min(1000000000, this.canceledAudioChunks + 1);
      return;
    }
    if (type === 'response.output_audio.delta' || type === 'response.audio.delta') {
      if (typeof event.delta === 'string' && eventResponseId) { this.outputChunks = Math.min(1000000, this.outputChunks + 1); this.outputPcmBytes = Math.min(1000000000, this.outputPcmBytes + Buffer.from(event.delta, 'base64').byteLength); this.lastStage = 'output_audio'; this.send({ type: 'audio', data: event.delta, sampleRate: 24000, responseId: eventResponseId }); }
      return;
    }
    if (type === 'response.output_audio_transcript.done' || type === 'response.audio_transcript.done') {
      if (typeof event.transcript === 'string') this.send({ type: 'transcript', entry: this.domain.transcript('assistant', event.transcript) });
      return;
    }
    if (type === 'response.function_call_arguments.done') {
      if (typeof event.call_id !== 'string' || this.seenCalls.has(event.call_id)) return;
      this.seenCalls.add(event.call_id);
      if (++this.toolCalls > this.spec.limits.maxToolCalls) return this.fail('tool_limit');
      if (typeof event.name !== 'string' || !this.spec.tools.some(t => t.name === event.name) || typeof event.arguments !== 'string' || event.arguments.length > 4000) return this.fail('invalid_tool_call');
      let input: Record<string, unknown>;
      try { input = JSON.parse(event.arguments) as Record<string, unknown>; } catch { return this.fail('invalid_tool_arguments'); }
      if (!input || Array.isArray(input) || typeof input !== 'object') return this.fail('invalid_tool_arguments');
      const entry = this.domain.tool(event.name, input);
      this.send({ type: 'tool', entry });
      this.send({ type: 'state', snapshot: this.domain.snapshot() });
      this.write({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: event.call_id, output: JSON.stringify(entry.result) } });
      if (this.domain.automationStopped()) return this.stopTerminalWorkflow();
      this.pendingTools = true;
      this.hasTools = true;
      // response.done collects all parallel function outputs before one continuation.
      return;
    }
    if (type === 'response.done') {
      this.responsesDone = Math.min(1000000000, this.responsesDone + 1);
      const response = event.response as { id?: string; output?: Array<{ type?: string }> } | undefined;
      const id = response?.id ?? eventResponseId;
      if (id !== this.responseId) return;
      this.responseRequested = false;
      this.responseDone = true;
      this.lastStage = 'response_done';
      const hasToolCalls = this.hasTools || Boolean(response?.output?.some(item => item.type === 'function_call'));
      this.send({ type: 'response_end', responseId: id, hasToolCalls });
      this.continueIfReady();
    }
  }

  audio(data: string) {
    if (this.domain.automationStopped()) return this.stopTerminalWorkflow();
    if (!this.configured || !this.audioReady) return;
    this.inputFrames = Math.min(1000000, this.inputFrames + 1);
    this.write({ type: 'input_audio_buffer.append', audio: data });
  }

  readyAudio() {
    this.audioReady = true;
    this.lastStage = 'audio_ready';
    this.greetIfReady();
  }

  text(text: string) {
    this.queueText(text);
  }

  notifyStaffState() {
    if (!this.configured || !this.audioReady) return;
    if (this.domain.automationStopped()) return this.stopTerminalWorkflow();
    this.queueText('SIMULATED STAFF EVENT: The local request status or staff decision changed. Use get_dispatch to read the authoritative status, final price, slot and conditions before responding.');
  }

  drainedPlayback(responseId?: string) {
    if (responseId && responseId !== this.responseId) return;
    if (!this.responseDone) return;
    this.drained = true;
    this.continueIfReady();
  }

  interrupt() {
    this.clientInterrupts = Math.min(1000000000, this.clientInterrupts + 1);
    this.interruptResponse(true);
  }

  private interruptResponse(cancelUpstream: boolean) {
    const active = this.responseId && !this.responseDone && !this.canceled.has(this.responseId);
    // Server VAD already owns cancellation; an unidentified future response may be the caller's reply.
    if (cancelUpstream && !this.responseId && this.responseRequested) {
      this.cancelWhenCreated = true;
      this.cancelUpstreamWhenCreated ||= cancelUpstream;
    }
    if (active) this.canceled.add(this.responseId);
    this.pendingTurn = false;
    this.pendingTools = false;
    if (active && cancelUpstream) this.write({ type: 'response.cancel' });
    this.send({ type: 'speech_started', at: this.now() });
  }

  private stopTerminalWorkflow() {
    this.interruptResponse(true);
    this.finish(this.domain.state.requestStatus === 'declined' ? 'caller_declined' : this.domain.state.requestStatus === 'human_needed' ? 'human_handoff' : 'workflow_failed');
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.socket.close();
  }
}

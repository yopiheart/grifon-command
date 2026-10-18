import { randomBytes, randomUUID } from 'node:crypto';
import { setTimeout as nodeSetTimeout, clearTimeout as nodeClearTimeout } from 'node:timers';
import WebSocket from 'ws';
import { RATE } from '../../src/lib/rates';
import { SCENARIOS } from '../../src/voice-lab/scenarios';
import type { BudgetSummary, ClientEvent, LabSnapshot, LabStatus, ServerEvent, SessionMode, SessionResponse } from '../../src/voice-lab/contracts';
import { VOICE_LAB_PROTOCOL, type VoiceLifecycle } from '../../src/voice-lab/contracts';
import { VoiceDomain } from './domain';
import { HARD_LIMITS, VoiceLedger } from './ledger';
import { RealtimeAdapter, type ProviderSocket } from './realtime';
import { loadLiveSpec } from './spec';
import { checkProviderKey, type ProviderCheck, type ProviderDiagnostic } from './diagnostics';

export interface VoiceLabOptions {
  ledgerDirectory: string;
  specPath: string;
  env?: NodeJS.ProcessEnv;
  now?: () => number;
  openProvider?: (url: string, key: string) => ProviderSocket;
  setTimer?: (callback: () => void, milliseconds: number) => ReturnType<typeof nodeSetTimeout>;
  clearTimer?: (timer: ReturnType<typeof nodeSetTimeout> | number) => void;
  fetchProvider?: typeof fetch;
}
interface Session {
  id: string;
  token: string;
  domain: VoiceDomain;
  release: () => void;
  timer: ReturnType<typeof nodeSetTimeout> | number;
  attached: boolean;
  sink?: (event: ServerEvent) => void;
  closeBrowser?: () => void;
  adapter?: RealtimeAdapter;
  textInputs: number;
  specSha256: string;
}

const errorMessage = (code: string) => ({ type: 'error' as const, code, message: 'Action rejected. Check the documented inputs and current session state.' });

export class VoiceLabService {
  private readonly ledger: VoiceLedger;
  private readonly now: () => number;
  private readonly env: NodeJS.ProcessEnv;
  private active: Session | null = null;
  private lastProviderCheck: ProviderCheck | null = null;
  private lastProviderFailure: ProviderDiagnostic | null = null;
  private providerCheckInFlight: Promise<ProviderCheck> | null = null;
  private lastLifecycle: VoiceLifecycle | null = null;

  constructor(private readonly options: VoiceLabOptions) {
    this.now = options.now ?? Date.now;
    this.env = options.env ?? process.env;
    this.ledger = new VoiceLedger(options.ledgerDirectory, this.now);
  }

  budget(): BudgetSummary {
    const config = loadLiveSpec(this.options.specPath, this.env);
    const limits = this.ledger.summary();
    const exhausted = limits.attempts >= config.spec.limits.maxAttempts || limits.reservedUsd + HARD_LIMITS.reservationUsd > config.spec.limits.maxUsd;
    return { attempts: limits.attempts, reservedUsd: limits.reservedUsd, maxAttempts: config.spec.limits.maxAttempts, maxUsd: config.spec.limits.maxUsd, reservationUsd: HARD_LIMITS.reservationUsd, liveReady: config.liveReady && !exhausted, blockedReason: exhausted ? 'The persistent paid test allowance is exhausted.' : config.blockedReason, specSha256: config.sha256 };
  }

  status(): LabStatus & { providerCheck: ProviderCheck | null; providerFailure: ProviderDiagnostic | null } {
    this.expireSessions();
    return { active: Boolean(this.active), protocolVersion: VOICE_LAB_PROTOCOL, lifecycle: this.active?.adapter?.lifecycle() ?? (this.lastLifecycle && { ...this.lastLifecycle }), budget: this.budget(), service: { area: 'Metro Manila household septic-tank siphoning', ratePhp: Number(RATE.mmSiphon.replace(/[^0-9]/g, '')), capacityLiters: 4000, callbackHours: 'Daily 08:00–17:00 Asia/Manila' }, mockNotice: 'SCRIPTED MOCK: no microphone, speech recognition, AI generation, naturalness, or latency evidence.', providerCheck: this.lastProviderCheck && { ...this.lastProviderCheck }, providerFailure: this.lastProviderFailure && { ...this.lastProviderFailure } };
  }

  checkProvider(): Promise<ProviderCheck> {
    if (this.providerCheckInFlight) return this.providerCheckInFlight;
    this.providerCheckInFlight = checkProviderKey(this.env.XAI_API_KEY, this.options.fetchProvider).then(result => { this.lastProviderCheck = result; return { ...result }; }).finally(() => { this.providerCheckInFlight = null; });
    return this.providerCheckInFlight;
  }

  createSession(scenarioId: string, mode: SessionMode): SessionResponse {
    this.expireSessions();
    if (this.active) throw new Error('session_already_active');
    const scenario = SCENARIOS.find(item => item.id === scenarioId);
    if (!scenario || (mode !== 'mock' && mode !== 'live')) throw new Error('invalid_session_input');
    const config = loadLiveSpec(this.options.specPath, this.env);
    const budget = this.budget();
    if (mode === 'live' && !budget.liveReady) throw new Error('live_not_approved_or_budget_unavailable');
    const release = this.ledger.acquireSession();
    try {
      const startedAt = this.now();
      const id = randomUUID();
      const specScenario = config.spec.scenarios.find(item => item.id === scenarioId);
      if (mode === 'live' && !specScenario) throw new Error('scenario_not_in_approved_spec');
      const state: LabSnapshot = { sessionId: id, mode, phase: 'preparing', scenarioId, startedAt, expiresAt: startedAt + (mode === 'live' ? config.spec.limits.sessionMs : HARD_LIMITS.sessionMs), scripted: mode === 'mock', requestStatus: 'collecting', details: structuredClone(mode === 'live' ? { ...config.spec.sharedSyntheticLead, ...specScenario?.overrides } : scenario.initial), detailsConfirmed: false, dispatch: { version: 0, decision: 'pending', pricePhp: null, slot: '', conditions: '' }, acceptedVersion: null, owner: 'Neil/Zam', nextStep: 'Verify the caller details, then request Neil/Zam dispatch approval.', transcript: [], toolLog: [], timings: [], budget };
      const token = randomBytes(32).toString('hex');
      const timer = (this.options.setTimer ?? nodeSetTimeout)(() => this.stop(id, 'session_time_limit'), state.expiresAt - startedAt);
      if (typeof timer !== 'number') timer.unref();
      const session: Session = { id, token, domain: new VoiceDomain(state, this.now), release, timer, attached: false, textInputs: 0, specSha256: config.sha256 };
      this.active = session;
      if (mode === 'live') this.lastLifecycle = null;
      return { sessionId: id, wsPath: `/voice-lab/ws?token=${token}`, state: session.domain.snapshot() };
    } catch (error) { release(); throw error; }
  }

  attach(token: string, sink: (event: ServerEvent) => void, closeBrowser?: () => void) {
    this.expireSessions();
    const session = this.active;
    if (!session || session.token !== token || session.attached) throw new Error('invalid_or_used_session_token');
    session.attached = true;
    session.token = '';
    session.sink = sink;
    session.closeBrowser = closeBrowser;
    if (session.domain.state.mode === 'mock') {
      session.domain.state.phase = 'active';
      session.domain.transcript('system', 'SCRIPTED MOCK. No AI voice, speech recognition, audio pacing or provider performance is being evaluated. Synthetic local records only.');
      session.domain.transcript('assistant', 'This is the scripted Oceanides test assistant. Use the scenario lines or explicit controls to test the workflow.');
      sink({ type: 'snapshot', snapshot: session.domain.snapshot() });
      return session.id;
    }
    try {
      const config = loadLiveSpec(this.options.specPath, this.env);
      if (!config.liveReady || config.sha256 !== session.specSha256) throw new Error('live_not_approved');
      // The paid reservation is durable before any network connection is opened.
      this.ledger.reserve(config.sha256, config.spec.limits.maxAttempts, config.spec.limits.maxUsd);
      session.domain.state.budget = this.budget();
      sink({ type: 'snapshot', snapshot: session.domain.snapshot() });
      const opener = this.options.openProvider ?? ((url: string, key: string) => new WebSocket(url, { headers: { Authorization: `Bearer ${key}` }, maxPayload: 1_000_000, handshakeTimeout: 10_000 }));
      const upstream = opener(`wss://api.x.ai/v1/realtime?model=${encodeURIComponent(config.spec.model)}`, this.env.XAI_API_KEY!.trim());
      session.adapter = new RealtimeAdapter(upstream, config.spec, session.domain, sink, reason => this.stop(session.id, reason), this.now, diagnostic => { this.lastProviderFailure = diagnostic; });
      return session.id;
    } catch {
      sink({ type: 'error', code: 'live_start_failed', message: 'Live startup failed. Any durable reservation remains counted. No automatic retry.' });
      this.stop(session.id, 'live_start_failed');
      return session.id;
    }
  }

  cancelPreparing(token: string) {
    const session = this.active;
    if (!session || session.attached || !token || session.token !== token) return false;
    this.stop(session.id, 'tester_stopped');
    return true;
  }

  receive(sessionId: string, event: ClientEvent) {
    this.expireSessions();
    const session = this.active;
    if (!session || session.id !== sessionId || !session.attached) return;
    const send = session.sink!;
    const domain = session.domain;
    try {
      if (!event || typeof event !== 'object' || Array.isArray(event)) throw new Error('invalid_event');
      switch (event.type) {
        case 'stop': this.stop(sessionId, 'tester_stopped'); return;
        case 'audio_ready':
          if (domain.state.mode !== 'live' || Object.keys(event).length !== 1) throw new Error('invalid_audio_ready');
          session.adapter?.readyAudio(); return;
        case 'audio':
          if (domain.state.mode !== 'live' || typeof event.data !== 'string' || event.data.length > 64_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(event.data) || Buffer.from(event.data, 'base64').length % 2) throw new Error('invalid_audio');
          session.adapter?.audio(event.data); return;
        case 'playback_drained': session.adapter?.drainedPlayback(event.responseId); return;
        case 'interrupt':
          if (session.adapter) session.adapter.interrupt();
          else send({ type: 'speech_started', at: this.now() });
          return;
        case 'user_text': {
          if (typeof event.text !== 'string' || !event.text.trim() || event.text.length > 500) throw new Error('invalid_text');
          if (++session.textInputs > HARD_LIMITS.maxTextInputs) { this.stop(sessionId, 'text_input_limit'); return; }
          const text = event.text.trim();
          send({ type: 'transcript', entry: domain.transcript('caller', text) });
          if (session.adapter) {
            if (text.toLowerCase() === 'fail tool') {
              const entry = domain.tool('fail_tool', {});
              send({ type: 'tool', entry });
              session.adapter.notifyStaffState();
            } else session.adapter.text(text);
          } else {
            const result = domain.scriptedTurn(text);
            if (result.tool) send({ type: 'tool', entry: result.tool });
            send({ type: 'transcript', entry: domain.transcript('assistant', result.reply) });
          }
          break;
        }
        case 'dispatch': {
          if (!['pending', 'approved', 'rejected'].includes(event.decision) || (event.slot !== undefined && (typeof event.slot !== 'string' || event.slot.length > 300)) || (event.conditions !== undefined && (typeof event.conditions !== 'string' || event.conditions.length > 300))) throw new Error('invalid_dispatch');
          const result = domain.dispatch(event);
          const entry = { id: randomUUID(), name: 'simulated_staff_dispatch', input: event, result, at: this.now(), ok: result.ok };
          domain.state.toolLog.push(entry);
          send({ type: 'tool', entry });
          if (!result.ok) throw new Error(result.error);
          session.adapter?.notifyStaffState();
          break;
        }
        case 'customer_accept': {
          const result = domain.customerAccept(event.version, true);
          const entry = { id: randomUUID(), name: 'explicit_test_customer_acceptance', input: event, result, at: this.now(), ok: result.ok };
          domain.state.toolLog.push(entry);
          send({ type: 'tool', entry });
          if (!result.ok) throw new Error(result.error);
          session.adapter?.notifyStaffState();
          break;
        }
        case 'human_request': {
          const entry = domain.tool('human_callback', {});
          send({ type: 'tool', entry });
          session.adapter?.notifyStaffState();
          break;
        }
        case 'timing':
          if (domain.state.mode !== 'live' || !['ordinary', 'tool', 'interruption'].includes(event.kind) || !Number.isFinite(event.milliseconds) || event.milliseconds < 0 || event.milliseconds > HARD_LIMITS.sessionMs || domain.state.timings.length >= 200) throw new Error('invalid_timing');
          domain.state.timings.push({ kind: event.kind, milliseconds: event.milliseconds, at: this.now() });
          break;
        default: throw new Error('unknown_event');
      }
      send({ type: 'state', snapshot: domain.snapshot() });
    } catch (error) {
      const code = error instanceof Error && /^[a-z_]+$/.test(error.message) ? error.message : 'invalid_event';
      send(errorMessage(code));
      send({ type: 'state', snapshot: domain.snapshot() });
    }
  }

  expireSessions() { if (this.active && this.now() >= this.active.domain.state.expiresAt) this.stop(this.active.id, 'session_time_limit'); }

  stop(sessionId: string, reason = 'tester_stopped') {
    const session = this.active;
    if (!session || session.id !== sessionId) return;
    this.active = null;
    (this.options.clearTimer ?? nodeClearTimeout)(session.timer);
    if (session.adapter) this.lastLifecycle = { ...session.adapter.lifecycle(), stopReason: reason === 'tester_stopped' || reason === 'server_stopped' ? 'operator_stopped' : reason === 'session_time_limit' ? 'time_limit' : reason.startsWith('provider_') || reason === 'live_start_failed' ? 'provider_failed' : reason.startsWith('browser_') ? 'connection_closed' : 'workflow_stopped' };
    session.adapter?.dispose();
    session.domain.state.phase = 'closed';
    const failed = !['tester_stopped', 'server_stopped'].includes(reason);
    if (failed && !['booked', 'declined', 'human_needed', 'failed'].includes(session.domain.state.requestStatus)) {
      session.domain.state.requestStatus = 'failed';
      session.domain.state.acceptedVersion = null;
      session.domain.state.nextStep = `Neil/Zam must review the incomplete local request (${reason}). No booking, transfer or callback ETA is confirmed.`;
    }
    if (['collecting', 'awaiting_dispatch', 'dispatch_approved'].includes(session.domain.state.requestStatus)) {
      session.domain.state.nextStep = 'Neil/Zam must review this unfinished local test request. No booking or callback ETA is confirmed.';
    }
    session.sink?.({ type: 'state', snapshot: session.domain.snapshot() });
    session.sink?.({ type: 'closed', reason });
    session.release();
    session.closeBrowser?.();
  }

  dispose() { if (this.active) this.stop(this.active.id, 'server_stopped'); }
}

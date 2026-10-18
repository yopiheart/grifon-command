import { useEffect, useRef, useState, type FormEvent } from 'react';
import { VoiceAudio } from './audio';
import { timingSummary } from './audio-math';
import { LabConnection } from './connection';
import { SCENARIOS } from './scenarios';
import type { ClientEvent, LabSnapshot, LabStatus, RequestStatus, ServerEvent, SessionMode, TimingSample } from './contracts';

const STATUS_LABEL: Record<RequestStatus, string> = {
  collecting: 'Collecting details', awaiting_dispatch: 'Awaiting dispatch', dispatch_approved: 'Dispatch approved',
  booked: 'Booked', human_needed: 'Human needed', declined: 'Declined', failed: 'Failed',
};
const CHECKS = [
  { id: 'price', label: 'Rate remains per truckload; no invented fees or discounts', live: false },
  { id: 'details', label: 'Critical details read back; corrections clear earlier approval', live: false },
  { id: 'approval', label: 'Dispatch approval and customer acceptance stay separate', live: false },
  { id: 'handoff', label: 'Pending or failed action has an owner and an honest next step', live: false },
  { id: 'interrupt', label: 'Audible playback stops when the caller interrupts', live: true },
  { id: 'answer', label: 'Measured responses answer the caller, without filler counting', live: true },
] as const;
const RATINGS = ['Natural Taglish', 'Warmth', 'Pacing', 'Appropriate tone'] as const;
type CheckResult = 'not_tested' | 'pass' | 'fail';
type RatingName = typeof RATINGS[number];

function formatMs(value: number | null): string { return value === null ? 'Not measured' : `${Math.round(value)} ms`; }
function clock(at: number): string { return new Date(at).toLocaleTimeString('en-PH', { hour12: false, timeZone: 'Asia/Manila' }); }

function TimingCard({ label, kind, samples, target }: { label: string; kind: TimingSample['kind']; samples: TimingSample[]; target?: string }) {
  const raw = samples.filter((sample) => sample.kind === kind);
  const stats = timingSummary(raw.map((sample) => sample.milliseconds));
  return <section className="vl-metric" aria-label={`${label} timings`}>
    <p className="vl-label">{label}</p>
    <p className="vl-metric-value">{formatMs(stats.median)}</p>
    <p className="vl-small">{stats.count} samples · median</p>
    <dl className="vl-metric-detail"><div><dt>Worst</dt><dd>{formatMs(stats.worst)}</dd></div><div><dt>p95*</dt><dd>{formatMs(stats.p95)}</dd></div></dl>
    {target && <p className="vl-small">Provisional target {target}. No automatic pass.</p>}
    <details><summary>Raw samples</summary><p className="vl-small">{raw.length ? raw.map((sample) => `${Math.round(sample.milliseconds)} ms`).join(', ') : 'No observed live audio. Mock text is not voice evidence.'}</p></details>
  </section>;
}

export function VoiceLab() {
  const [status, setStatus] = useState<LabStatus | null>(null);
  const [snapshot, setSnapshot] = useState<LabSnapshot | null>(null);
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const [mode, setMode] = useState<SessionMode>('mock');
  const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'active' | 'closed'>('idle');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('Ready for a synthetic mock session.');
  const [error, setError] = useState('');
  const [price, setPrice] = useState('5000');
  const [slot, setSlot] = useState('');
  const [conditions, setConditions] = useState('');
  const [checks, setChecks] = useState<Record<string, CheckResult>>({});
  const [ratings, setRatings] = useState<Partial<Record<RatingName, number>>>({});
  const [notes, setNotes] = useState('');
  const [now, setNow] = useState(Date.now());
  const [observedTimings, setObservedTimings] = useState<TimingSample[]>([]);
  const connection = useRef<LabConnection | null>(null);
  const audio = useRef<VoiceAudio | null>(null);
  const mounted = useRef(false);
  const speechEndedAt = useRef<number | null>(null);
  const toolInTurn = useRef(false);
  const firstAudio = useRef(new Map<string, number>());
  const measuredTurns = useRef(new Set<string>());
  const activeMode = useRef<SessionMode>('mock');
  const turnSerial = useRef(0);
  const currentResponse = useRef<string | null>(null);
  const cancelledResponses = useRef(new Set<string>());
  const drainingResponse = useRef<string | undefined>(undefined);
  const micStarting = useRef(false);
  const sessionEpoch = useRef(0);

  const scenario = SCENARIOS.find((item) => item.id === scenarioId)!;
  const active = connectionState === 'active';
  const busy = active || connectionState === 'connecting';
  const budget = status?.budget;
  const isLive = snapshot?.mode === 'live';
  const remainingSeconds = snapshot && busy ? Math.max(0, Math.ceil((snapshot.expiresAt - now) / 1000)) : null;

  async function refreshStatus(epoch = sessionEpoch.current) {
    try {
      const response = await fetch('/api/voice-lab/status');
      if (!response.ok) throw new Error('Local test server is unavailable.');
      const data = await response.json() as LabStatus;
      if (mounted.current && epoch === sessionEpoch.current) setStatus(data);
    } catch (failure) { if (mounted.current && epoch === sessionEpoch.current) setError(failure instanceof Error ? failure.message : 'Could not load test status.'); }
  }

  useEffect(() => {
    mounted.current = true;
    void refreshStatus();
    return () => { mounted.current = false; sessionEpoch.current++; connection.current?.stop(); void audio.current?.stop(); };
  }, []);

  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [busy]);

  function send(event: ClientEvent) {
    if (!connection.current?.send(event)) setError('Session is not connected. Start a new test explicitly.');
  }

  function recordTiming(kind: TimingSample['kind'], milliseconds: number) {
    if (activeMode.current !== 'live' || !Number.isFinite(milliseconds) || milliseconds < 0) return;
    const sample: TimingSample = { kind, milliseconds, at: Date.now() };
    setObservedTimings((previous) => [...previous, sample]);
    connection.current?.send({ type: 'timing', kind, milliseconds });
  }

  function onServerEvent(event: ServerEvent) {
    if (!mounted.current) return;
    switch (event.type) {
      case 'snapshot': case 'state':
        setSnapshot(event.snapshot);
        if (event.snapshot.mode === 'live' && event.snapshot.phase === 'active' && !micStarting.current) {
          micStarting.current = true;
          const epoch = sessionEpoch.current;
          const voice = audio.current;
          setNotice('Provider ready. Allow the microphone to begin the synthetic voice test.');
          void voice?.start().then(() => {
            if (mounted.current && epoch === sessionEpoch.current) { setConnectionState('active'); setNotice('Live voice connected. Synthetic scenarios only.'); }
          }).catch(() => {
            if (mounted.current && epoch === sessionEpoch.current) { setError('Microphone could not start. This session has stopped; no automatic retry.'); stopSession(); }
          });
        }
        break;
      case 'transcript':
        setSnapshot((previous) => previous && !previous.transcript.some((entry) => entry.id === event.entry.id) ? { ...previous, transcript: [...previous.transcript, event.entry] } : previous);
        break;
      case 'tool':
        toolInTurn.current = true;
        setSnapshot((previous) => previous && !previous.toolLog.some((entry) => entry.id === event.entry.id) ? { ...previous, toolLog: [...previous.toolLog, event.entry] } : previous);
        break;
      case 'audio': audio.current?.enqueue(event.data, event.responseId); break;
      case 'response_started': currentResponse.current = event.responseId; audio.current?.responseStart(event.responseId); break;
      case 'speech_started':
        if (currentResponse.current) cancelledResponses.current.add(currentResponse.current);
        audio.current?.interrupt();
        break;
      case 'speech_stopped': break; // Server timestamps are not the browser's capture clock.
      case 'response_end': {
        const ended = event;
        const key = ended.responseId;
        const startAt = firstAudio.current.get(key);
        if (!ended.hasToolCalls && !cancelledResponses.current.has(key) && startAt !== undefined && speechEndedAt.current !== null && !measuredTurns.current.has(key)) {
          recordTiming(toolInTurn.current ? 'tool' : 'ordinary', Math.max(0, startAt - speechEndedAt.current));
          measuredTurns.current.add(key);
        }
        drainingResponse.current = event.responseId;
        audio.current?.responseEnd();
        if (activeMode.current === 'mock') connection.current?.send({ type: 'playback_drained', responseId: event.responseId });
        break;
      }
      case 'error': setError(event.message); break;
      case 'closed':
        sessionEpoch.current++;
        setConnectionState('closed'); setNotice(event.reason);
        setSnapshot((previous) => previous ? { ...previous, phase: 'closed' } : previous);
        void audio.current?.stop(); connection.current?.stop(); void refreshStatus();
        break;
    }
  }

  async function startSession() {
    if (busy) return;
    setError(''); setNotice('Connecting to the local test server.'); setConnectionState('connecting');
    setSnapshot(null); setObservedTimings([]); setChecks({}); setRatings({}); setNotes(''); setMessage('');
    setSlot(''); setConditions(''); setPrice('5000');
    const epoch = ++sessionEpoch.current;
    micStarting.current = false;
    speechEndedAt.current = null; toolInTurn.current = false; firstAudio.current.clear(); measuredTurns.current.clear(); currentResponse.current = null; cancelledResponses.current.clear(); drainingResponse.current = undefined;
    activeMode.current = mode;
    let voice: VoiceAudio | null = null;
    const isCurrent = () => mounted.current && epoch === sessionEpoch.current && connection.current === client;
    const client = new LabConnection({
      onSnapshot: (state) => { if (isCurrent()) setSnapshot(state); },
      onEvent: (event) => { if (isCurrent()) onServerEvent(event); },
      onOpen: () => { if (isCurrent()) { if (mode === 'mock') setConnectionState('active'); setNotice(mode === 'mock' ? 'Scripted mock connected. No microphone or paid voice.' : 'Local bridge connected. Waiting for the voice provider.'); void refreshStatus(epoch); } },
      onClose: (reason) => {
        void voice?.stop();
        if (isCurrent()) {
          sessionEpoch.current++;
          setConnectionState('closed'); setNotice(reason); setSnapshot((previous) => previous ? { ...previous, phase: 'closed' } : previous); void refreshStatus();
        }
      },
    });
    connection.current = client;
    audio.current = null;
    try {
      if (mode === 'live') {
        voice = new VoiceAudio({
          onInput: (data) => { if (isCurrent()) client.send({ type: 'audio', data }); },
          onBargeIn: (cutoff) => { if (isCurrent()) { if (currentResponse.current) cancelledResponses.current.add(currentResponse.current); client.send({ type: 'interrupt' }); recordTiming('interruption', cutoff); } },
          onSpeechEnd: (at) => { if (isCurrent()) { speechEndedAt.current = at; toolInTurn.current = false; turnSerial.current++; } },
          onAudibleStart: (responseId, at) => { if (isCurrent()) { const key = responseId ?? `turn-${turnSerial.current}`; if (!firstAudio.current.has(key)) firstAudio.current.set(key, at); } },
          onDrained: () => { if (isCurrent()) client.send({ type: 'playback_drained', responseId: drainingResponse.current }); },
          onError: (reason) => { if (isCurrent()) { setError(reason); stopSession(); } },
        });
        audio.current = voice;
        // Unlock audio on the explicit click. Microphone capture waits for provider readiness.
        await voice.prepare();
      }
      if (!isCurrent()) { client.stop(); void voice?.stop(); return; }
      await client.start(scenarioId, mode);
    } catch (failure) {
      client.stop(); void voice?.stop();
      if (isCurrent()) { sessionEpoch.current++; setConnectionState('closed'); setError(failure instanceof Error ? failure.message : 'Could not start this test.'); void refreshStatus(); }
    }
  }

  function stopSession() {
    sessionEpoch.current++;
    connection.current?.stop(); void audio.current?.stop();
    setConnectionState('closed'); setNotice('Stopped by operator. Start a new session explicitly.');
    setSnapshot((previous) => previous ? { ...previous, phase: 'closed' } : previous);
    void refreshStatus();
  }

  function submitMessage(event: FormEvent) { event.preventDefault(); if (message.trim()) { send({ type: 'user_text', text: message.trim() }); setMessage(''); } }
  function dispatch(decision: 'pending' | 'approved' | 'rejected') {
    send({ type: 'dispatch', decision, ...(decision === 'approved' ? { pricePhp: Number(price), slot: slot.trim(), conditions: conditions.trim() } : {}) });
  }

  function exportReport() {
    const report = {
      generatedAt: new Date().toISOString(), evidence: isLive ? 'Live browser test; timing estimates require listening review' : 'SCRIPTED MOCK ONLY. No voice-quality or latency evidence.',
      session: snapshot, observedTimings, checklist: checks, voiceRatings: isLive ? ratings : null, operatorNotes: notes,
      timingProvenance: 'Estimated local microphone speech-energy end to scheduled AudioContext playback plus baseLatency. Interruption uses local sustained-energy onset to queue cancellation plus baseLatency. Not an acoustic measurement. Pre-tool and cancelled responses excluded; relevance needs human review.',
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `oceanides-voice-${snapshot?.sessionId ?? 'draft'}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const voiceAverage = RATINGS.every((name) => ratings[name] !== undefined) ? RATINGS.reduce((sum, name) => sum + ratings[name]!, 0) / RATINGS.length : null;
  const dispatchApproved = active && snapshot?.requestStatus === 'dispatch_approved' && snapshot.dispatch.decision === 'approved';

  return <main className="vl-shell">
    <a className="vl-skip" href="#voice-session">Skip to session controls</a>
    <header className="vl-masthead"><span className="vl-wordmark">OCEANIDES</span><span className="vl-masthead-note">Internal workbench · local only</span></header>
    <div className="vl-title-row"><div><span className="vl-chip">Voice lab</span><h1 aria-label="Oceanides Voice Lab">Voice test <span>desk</span></h1><p className="vl-intro">Prove the conversation. Check the promises. Then test the phone.</p></div><div className="vl-local"><span className="vl-status-dot" /><span>127.0.0.1:5184<br /><small>Synthetic leads only</small></span></div></div>
    <aside className="vl-boundary" aria-label="Test boundary"><strong>{mode === 'mock' ? 'SCRIPTED MOCK' : 'LIVE TEST MODE'}</strong><span>{mode === 'mock' ? 'No AI, microphone, phone calls, or production records. Mock text cannot prove voice quality.' : 'Approved internal voice tests only. No phone calls or production records.'}</span></aside>
    <div className="vl-facts"><div><p className="vl-label">Pilot service</p><p>Household siphoning</p></div><div><p className="vl-label">Coverage</p><p>Metro Manila</p></div><div><p className="vl-label">Baseline rate</p><p>₱5,000 <small>/ truckload · up to 4,000 L</small></p></div><div><p className="vl-label">Callback window</p><p>8AM–5PM <small>daily · Manila</small></p></div></div>
    {error && <div className="vl-error" role="alert">{error}<button type="button" onClick={() => setError('')} aria-label="Dismiss error">Dismiss</button></div>}

    <div className="vl-workspace">
      <div className="vl-controls">
        <section className="vl-panel" id="voice-session"><div className="vl-panel-heading"><h2>Test session</h2><span className="vl-ticket">01</span></div>
          <label className="vl-field">Scenario<select aria-label="Scenario" value={scenarioId} disabled={busy} onChange={(event) => setScenarioId(event.target.value)}>{SCENARIOS.map((item, index) => <option key={item.id} value={item.id}>{String(index + 1).padStart(2, '0')} · {item.title}</option>)}</select></label>
          <p className="vl-help">{scenario.description}</p>
          <label className="vl-field">Session mode<select aria-label="Session mode" value={mode} disabled={busy} onChange={(event) => setMode(event.target.value as SessionMode)}><option value="mock">Scripted mock · no spend</option><option value="live" disabled={!budget?.liveReady}>Live voice{budget?.liveReady ? ' · approved spec required' : ' · blocked'}</option></select></label>
          <div className="vl-button-row"><button type="button" className="vl-primary" aria-label="Start session" disabled={busy || !status || status.active} onClick={() => void startSession()}>{connectionState === 'connecting' ? 'Connecting…' : `Start ${mode} session`}</button><button type="button" aria-label="Stop session" disabled={!busy} onClick={stopSession}>Stop</button></div>
          <p className="vl-session-line" aria-label="Session status" data-testid="session-status"><span className={`vl-status-dot ${active ? 'is-active' : ''}`} />{connectionState === 'active' ? 'Active' : connectionState === 'connecting' ? 'Connecting' : connectionState === 'closed' ? 'Stopped' : 'Not started'}{snapshot && <strong>{STATUS_LABEL[snapshot.requestStatus]}</strong>}{remainingSeconds !== null && <span className="vl-countdown">{Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')}</span>}</p>
          <p className="vl-help" role="status">{notice}</p>
          <div className="vl-budget" data-testid="budget"><p className="vl-label">Server spend guard</p><p>{budget ? `${budget.attempts} / ${budget.maxAttempts} paid sessions reserved · $${budget.reservedUsd.toFixed(2)} / $${budget.maxUsd.toFixed(2)}` : 'Checking server allowance…'}</p><p className="vl-help">{budget?.blockedReason || 'Live access follows the server approval state. No automatic retry.'}</p></div>
        </section>

        <section className="vl-panel"><div className="vl-panel-heading"><h2>Dispatch simulator</h2><span className="vl-ticket">02</span></div><p className="vl-help">Pretend Neil/Zam has checked with Boss Jay. Approval is separate from customer acceptance.</p>
          <label className="vl-field">Final price (PHP)<input aria-label="Final price (PHP)" type="number" min="1" step="1" value={price} disabled={!active} onChange={(event) => setPrice(event.target.value)} /></label>
          <label className="vl-field">Service slot<input aria-label="Service slot" value={slot} disabled={!active} onChange={(event) => setSlot(event.target.value)} placeholder="Synthetic date and time" /></label>
          <label className="vl-field">Conditions<input value={conditions} disabled={!active} onChange={(event) => setConditions(event.target.value)} placeholder="Test conditions, if any" /></label>
          <button className="vl-full" type="button" aria-label="Approve dispatch" disabled={!active || !slot.trim() || !(Number(price) > 0) || !Number.isFinite(Number(price))} onClick={() => dispatch('approved')}>Approve dispatch</button>
          <div className="vl-button-row"><button type="button" aria-label="Reject dispatch" disabled={!active} onClick={() => dispatch('rejected')}>Reject dispatch</button><button type="button" disabled={!active} onClick={() => dispatch('pending')}>Leave pending</button></div>
          <div className="vl-accept"><p className="vl-label">Separate customer decision</p><button className="vl-full" type="button" aria-label="Customer accepts quote" disabled={!dispatchApproved} onClick={() => send({ type: 'customer_accept', version: snapshot!.dispatch.version })}>Customer accepts quote</button><p className="vl-help">Available after a valid dispatch approval. Never auto-accepted.</p></div>
        </section>
      </div>

      <div className="vl-main-column">
        <section className="vl-panel vl-conversation"><div className="vl-panel-heading"><h2>Conversation</h2><span className="vl-tag">{isLive ? 'Live browser audio' : 'Scripted text'}</span></div>
          <div className="vl-transcript" data-testid="transcript" role="log" aria-label="Conversation transcript" aria-live="polite" aria-relevant="additions text">{snapshot?.transcript.length ? snapshot.transcript.map((entry) => <article key={entry.id} className={`vl-message vl-message-${entry.role}`}><div className="vl-message-meta"><strong>{entry.role === 'assistant' ? 'Oceanides assistant' : entry.role === 'caller' ? 'Synthetic caller' : 'Test system'}</strong><time>{clock(entry.at)}</time></div><p>{entry.text}</p></article>) : <div className="vl-empty"><p className="vl-label">Ready when you are</p><p>Start a mock session, then send a caller line.<br />Everything stays inside this test desk.</p></div>}</div>
          <form className="vl-caller-form" onSubmit={submitMessage}><label className="vl-field">Caller message<textarea aria-label="Caller message" rows={2} placeholder="Use synthetic details only" disabled={!active || isLive} value={message} onChange={(event) => setMessage(event.target.value)} /></label><button type="submit" aria-label="Send caller line" disabled={!active || isLive || !message.trim()}>Send caller line</button></form>
          <div className="vl-suggestions"><p className="vl-label">Scenario lines · scripted mock only</p><div>{scenario.callerTurns.map((line) => <button key={line} type="button" disabled={!active || isLive} onClick={() => send({ type: 'user_text', text: line })}>{line}</button>)}</div></div>
          <div className="vl-test-actions"><button type="button" disabled={!active || isLive} onClick={() => send({ type: 'user_text', text: 'Confirm details' })}>Confirm details</button><button type="button" disabled={!active || isLive} onClick={() => send({ type: 'user_text', text: 'Submit request' })}>Submit request</button><button type="button" aria-label="Request human callback" disabled={!active} onClick={() => send({ type: 'human_request' })}>Request human callback</button><button type="button" disabled={!active} onClick={() => { if (currentResponse.current) cancelledResponses.current.add(currentResponse.current); audio.current?.interrupt(); send({ type: 'interrupt' }); }}>Interrupt playback</button><button type="button" disabled={!active || isLive} onClick={() => send({ type: 'user_text', text: 'Fail tool' })}>Fail tool</button><button type="button" disabled={!active} onClick={() => connection.current?.disconnect()}>Disconnect</button></div>
        </section>

        <section className="vl-panel"><div className="vl-panel-heading"><h2>Request &amp; next step</h2><span className={`vl-request-status ${snapshot?.requestStatus === 'booked' ? 'is-good' : ''}`} data-testid="request-status">{snapshot ? STATUS_LABEL[snapshot.requestStatus] : 'No request'}</span></div>
          <dl className="vl-record"><div><dt>Owner</dt><dd>{snapshot?.owner ?? 'Neil/Zam'}</dd></div><div className="vl-record-wide"><dt>Next step</dt><dd>{snapshot?.nextStep ?? 'Start a synthetic session to test the booking flow.'}</dd></div><div><dt>Customer</dt><dd>{snapshot?.details.name ?? scenario.initial.name}</dd></div><div><dt>Contact · not dialable</dt><dd>{snapshot?.details.contact ?? scenario.initial.contact}</dd></div><div><dt>City</dt><dd>{snapshot?.details.city ?? scenario.initial.city}</dd></div><div className="vl-record-wide"><dt>Address</dt><dd>{snapshot?.details.address ?? scenario.initial.address}</dd></div><div><dt>Problem</dt><dd>{snapshot?.details.problem ?? scenario.initial.problem}</dd></div><div><dt>Access</dt><dd>{snapshot?.details.access ?? scenario.initial.access}</dd></div><div><dt>Preferred time</dt><dd>{snapshot?.details.preferredTime ?? scenario.initial.preferredTime}</dd></div><div><dt>Details verified</dt><dd>{snapshot?.detailsConfirmed ? 'Confirmed in this test' : 'Not confirmed'}</dd></div></dl>
          {snapshot && <div className="vl-approval-record"><p>Dispatch: <strong>{snapshot.dispatch.decision}</strong> · revision {snapshot.dispatch.version}</p>{snapshot.dispatch.decision === 'approved' && <p>₱{snapshot.dispatch.pricePhp?.toLocaleString('en-PH')} · {snapshot.dispatch.slot}</p>}<p>Customer acceptance: <strong>{snapshot.acceptedVersion === null ? 'Not accepted' : `revision ${snapshot.acceptedVersion}`}</strong></p></div>}
        </section>

        <section className="vl-panel"><div className="vl-panel-heading"><h2>Tool activity</h2><span className="vl-tag">{snapshot?.toolLog.length ?? 0} events</span></div><div className="vl-tool-log" data-testid="tool-log">{snapshot?.toolLog.length ? snapshot.toolLog.map((entry) => <details key={entry.id}><summary><span className={entry.ok ? 'vl-text-good' : 'vl-text-danger'}>{entry.ok ? 'OK' : 'FAILED'}</span> {entry.name}<time>{clock(entry.at)}</time></summary><p className="vl-label">Input</p><pre>{JSON.stringify(entry.input, null, 2)}</pre><p className="vl-label">Result</p><pre>{JSON.stringify(entry.result, null, 2)}</pre></details>) : <p className="vl-help">No tool calls yet. Mock actions create local test records only.</p>}</div></section>
      </div>
    </div>

    <section className="vl-evidence"><div className="vl-section-intro"><h2>Measure before judging</h2><p>Estimated browser timings. No mock scores or automatic passes.</p></div><div className="vl-metrics"><TimingCard label="Ordinary response" kind="ordinary" samples={observedTimings} target="median ≤1,500 ms" /><TimingCard label="Tool response" kind="tool" samples={observedTimings} /><TimingCard label="Interruption cutoff" kind="interruption" samples={observedTimings} target="≤300 ms" /></div><p className="vl-provenance">Estimates: local microphone speech-energy end to scheduled playback plus browser base latency. Cutoff: local sustained voice-energy onset to queue cancellation plus base latency. Not acoustic measurements. Pre-tool and cancelled turns excluded; reviewer must check answer relevance. *p95 is descriptive only, especially with few samples.</p></section>

    <div className="vl-review-grid"><section className="vl-panel" data-testid="checklist"><div className="vl-panel-heading"><h2>Reviewer checklist</h2><span className="vl-tag">Manual review</span></div>{CHECKS.map((check) => <label className="vl-check" key={check.id}><span>{check.label}{check.live && <small>Live listening required</small>}</span><select aria-label={check.label} value={checks[check.id] ?? 'not_tested'} disabled={check.live && !isLive} onChange={(event) => setChecks((previous) => ({ ...previous, [check.id]: event.target.value as CheckResult }))}><option value="not_tested">Not tested</option><option value="pass">Pass</option><option value="fail">Fail</option></select></label>)}<div className="vl-expected"><p className="vl-label">This scenario should prove</p><ul>{scenario.expected.map((item) => <li key={item}>{item}</li>)}</ul></div></section>
      <section className="vl-panel"><div className="vl-panel-heading"><h2>Listening review</h2><span className="vl-tag">Neil / Zam</span></div><p className="vl-help">Score 1 (poor) to 5 (natural). Available after a live voice session. Scripted text cannot earn a voice score.</p><div className="vl-ratings">{RATINGS.map((name) => <label className="vl-rating" key={name}><span>{name}</span><select aria-label={name} value={ratings[name] ?? ''} disabled={!isLive} onChange={(event) => setRatings((previous) => ({ ...previous, [name]: event.target.value ? Number(event.target.value) : undefined }))}><option value="">Not scored</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} / 5</option>)}</select></label>)}</div><p className="vl-score">Average: <strong>{voiceAverage === null ? 'Not scored' : `${voiceAverage.toFixed(2)} / 5`}</strong><small>Target ≥4, with zero critical misunderstanding.</small></p><label className="vl-field">Reviewer notes<textarea aria-label="Reviewer notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What failed, what to replay, and what remains unverified" /></label><button className="vl-full" type="button" disabled={!snapshot} onClick={exportReport}>Download local test report</button><p className="vl-help">JSON only. No raw audio recording or automatic upload.</p></section></div>
    <footer className="vl-footer"><span>OCEANIDES · INTERNAL VOICE LAB</span><span>Browser success does not prove phone quality or crew availability.</span></footer>
  </main>;
}

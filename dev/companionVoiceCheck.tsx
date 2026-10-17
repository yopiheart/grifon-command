import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CompanionVoiceClient, connectCompanionVoice, createBrowserVoiceAudio, requestCompanionVoiceSession, type CompanionVoiceAudio, type CompanionVoiceDiagnostics, type CompanionVoiceEvent, type CompanionVoiceTransport } from '../services/companionVoiceSession';
import { createCompanionVoiceCheckBounds } from './companionVoiceCheckBounds';
import '../assets/fonts/oxanium/oxanium.css';

const lines = ['Hi Grifon. Give me one short advertising idea for a cold brew coffee.', 'Keep it to one sentence.'];
const expectedModel = 'models/gemini-3.8-live';
const promptHash = '3fc2f084a0bd8105232222c588711cd486d680c15dec600b25ed0f92557935c3';
const fixtureSpecs = [
  { url: new URL('./voice-fixtures/approved-turn-1.wav', import.meta.url).href, hash: '7150819a5f3c2a41d4290b1845c8a5f4bcb3f9f7fa380da52dd961d1c0f5fa2a', bytes: 185920 },
  { url: new URL('./voice-fixtures/approved-turn-2.wav', import.meta.url).href, hash: 'c6dc5644ff48613488773f0b1167bd14370f25e13b95929d4f80e37666402cb2', bytes: 69120 },
];
const base64 = (data: Uint8Array) => { let text = ''; for (let offset = 0; offset < data.length; offset += 32768) text += String.fromCharCode(...data.subarray(offset, offset + 32768)); return btoa(text); };
const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');

export async function loadApprovedVoiceFixtures(): Promise<Uint8Array[]> {
  return Promise.all(fixtureSpecs.map(async spec => {
    const response = await fetch(spec.url, { cache: 'no-store' });
    if (!response.ok) throw new Error('fixture-preflight');
    const bytes = await response.arrayBuffer();
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');
    if (digest !== spec.hash) throw new Error('fixture-preflight');
    const view = new DataView(bytes);
    const tag = (offset: number) => String.fromCharCode(...new Uint8Array(bytes, offset, 4));
    if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('fixture-preflight');
    let pcm: Uint8Array | null = null, format = false;
    for (let offset = 12; offset + 8 <= bytes.byteLength;) {
      const size = view.getUint32(offset + 4, true), begin = offset + 8;
      if (begin + size > bytes.byteLength) throw new Error('fixture-preflight');
      if (tag(offset) === 'fmt ') format = view.getUint16(begin, true) === 1 && view.getUint16(begin + 2, true) === 1 && view.getUint32(begin + 4, true) === 16000 && view.getUint16(begin + 14, true) === 16;
      if (tag(offset) === 'data') pcm = new Uint8Array(bytes.slice(begin, begin + size));
      offset = begin + size + (size % 2);
    }
    if (!format || !pcm || pcm.byteLength !== spec.bytes) throw new Error('fixture-preflight');
    return pcm;
  }));
}

type Mode = 'fixture' | 'microphone';
interface CheckDependencies {
  bootstrap: typeof requestCompanionVoiceSession;
  connect: typeof connectCompanionVoice;
  audio: (options: { capture: boolean }) => CompanionVoiceAudio;
  fixtures: typeof loadApprovedVoiceFixtures;
  now?: () => number;
}
const browserDependencies: CheckDependencies = { bootstrap: requestCompanionVoiceSession, connect: connectCompanionVoice, audio: createBrowserVoiceAudio, fixtures: loadApprovedVoiceFixtures };

export function createApprovedVoiceCheck(mode: Mode, dependencies: CheckDependencies = browserDependencies, operatorAttested = false) {
  const guard = createCompanionVoiceCheckBounds({ now: dependencies.now });
  const engine = dependencies.audio({ capture: mode === 'microphone' });
  const archive: Uint8Array[] = [];
  let client: CompanionVoiceClient, transport: CompanionVoiceTransport | null = null, fixtures: Uint8Array[] = [];
  let active = true, ready = false, inputOpen = false, responseActive = false, firstAudio = false, firstFixtureDone = false;
  let inputTurns = 0, completedTurns = 0, audioChunks = 0, playbackCompletions = 0, interruptions = 0, mutedDrops = 0, audioClosed = 0, transportClosed = 0;
  let receivedInput = '', outputTranscript = false, outcome = 'running', modelConfirmed = false;
  let wireDiagnostics: CompanionVoiceDiagnostics | null = null;
  let awaitingUsage = false;
  let usageTimer: ReturnType<typeof setTimeout> | undefined, interruptionTimer: ReturnType<typeof setTimeout> | undefined, awaitingInterruptedTurn = false;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(listener => listener());
  const timer = setTimeout(() => stop('deadline'), 45000);
  const pulse = setInterval(() => { if (!guard.checkDeadline()) stop(guard.snapshot().stopReason ?? 'bounds'); else notify(); }, 100);
  const stop = (reason: string) => {
    if (!active) return;
    active = false; inputOpen = false; outcome = reason; guard.stop(); clearTimeout(timer); clearInterval(pulse); clearTimeout(usageTimer); clearTimeout(interruptionTimer); client?.dismiss(); notify();
  };
  const enforce = (allowed: boolean) => { if (!allowed) stop(guard.snapshot().stopReason ?? 'bounds'); return allowed && active; };
  const closeTransport = () => transport?.close();
  const complete = () => {
    inputOpen = false; engine.mute(true); closeTransport();
    if (client.snapshot().status !== 'speaking') stop('complete');
  };
  const audio: CompanionVoiceAudio = {
    start: (receive, fail) => engine.start(data => { if (!inputOpen) { mutedDrops++; return; } receive(data); }, fail),
    mute: value => engine.mute(value),
    play: (data, done) => {
      engine.play(data, () => { playbackCompletions++; done(); if (guard.snapshot().responseEnds === 2) stop('complete'); notify(); });
      audioChunks++;
      if (mode === 'fixture') archive.push(Uint8Array.from(atob(data), value => value.charCodeAt(0)));
    },
    interrupt: () => { interruptions++; engine.interrupt(); },
    close: () => { audioClosed++; engine.close(); },
  };
  const sendFixture = async (index: number) => {
    if (!active || !ready || index !== inputTurns || inputTurns >= 2) return;
    inputTurns++; inputOpen = true; notify();
    const bytes = fixtures[index];
    for (let offset = 0; offset < bytes.length && active;) {
      if (!enforce(guard.checkDeadline())) return;
      if (!inputOpen) { stop('input-order'); return; }
      if (client.snapshot().muted) { await new Promise(resolve => setTimeout(resolve, 20)); continue; }
      const packet = bytes.subarray(offset, Math.min(offset + 640, bytes.length));
      try { transport?.sendAudio(base64(packet)); } catch { stop('transport-error'); return; }
      offset += packet.length;
      await new Promise(resolve => setTimeout(resolve, packet.length / 32));
    }
    if (!active) return;
    inputOpen = false; completedTurns++;
    try { transport?.audioEnd(); } catch { stop('transport-error'); return; }
    if (index === 0) { firstFixtureDone = true; if (firstAudio) void sendFixture(1); }
    notify();
  };
  client = new CompanionVoiceClient({
    audio: () => audio,
    bootstrap: async signal => {
      fixtures = await dependencies.fixtures();
      if (!enforce(guard.checkDeadline()) || signal.aborted) throw new Error('expired');
      return dependencies.bootstrap(signal);
    },
    connect: (session, receive) => {
      if (session.model !== expectedModel) throw new Error('configuration');
      modelConfirmed = true;
      const finishResponse = () => {
        if (!active || !enforce(guard.endResponse())) return;
        clearTimeout(usageTimer); awaitingUsage = false; responseActive = false;
        receive({ type: 'turn-complete' });
        if (guard.snapshot().responseEnds === 2) complete();
        else engine.mute(client.snapshot().muted || !inputOpen);
        notify();
      };
      const raw = dependencies.connect(session, (event: CompanionVoiceEvent) => {
        if (!active || !enforce(guard.checkDeadline())) return;
        if (event.type === 'input-transcript') { if (!enforce(guard.allowTranscript(event.text))) return; receivedInput += event.text; }
        if (event.type === 'output-transcript') outputTranscript = outputTranscript || !!event.text.trim();
        if (event.type === 'audio') {
          if (awaitingUsage || awaitingInterruptedTurn) { stop('response-order'); return; }
          if (!responseActive) { if (!enforce(guard.startResponse())) return; responseActive = true; }
        }
        if (event.type === 'interrupted') {
          awaitingInterruptedTurn = true;
          interruptionTimer = setTimeout(() => { if (active && awaitingInterruptedTurn) stop('response-order'); }, 1000);
        }
        if (event.type === 'turn-complete') {
          clearTimeout(interruptionTimer); awaitingInterruptedTurn = false;
          if (awaitingUsage || !responseActive) { stop('response-order'); return; }
          if (responseActive) {
            awaitingUsage = true;
            // Always drain late accounting, even after an earlier partial report.
            // Only an already-open second input may finish during the first drain.
            if (guard.snapshot().responseStarts === 2 || inputTurns !== 2 || !inputOpen) { inputOpen = false; engine.mute(true); }
            usageTimer = setTimeout(finishResponse, 1000);
            notify();
            return;
          }
        }
        receive(event);
        if (event.type === 'ready') {
          ready = true;
          if (mode === 'fixture') void sendFixture(0);
          else { inputTurns = 1; inputOpen = true; engine.mute(false); }
        }
        if (event.type === 'audio') { firstAudio = true; if (mode === 'fixture' && firstFixtureDone && inputTurns === 1) void sendFixture(1); }
        if (event.type === 'error') stop('provider-error');
        notify();
      }, usage => { if (active) enforce(guard.recordUsage(usage)); }, diagnostics => { if (active) { wireDiagnostics = diagnostics; notify(); } });
      transport = {
        sendAudio: data => {
          if (!active || !ready || !inputOpen || inputTurns > 2 || client.snapshot().muted || (awaitingUsage && (inputTurns !== 2 || guard.snapshot().responseStarts !== 1))) return;
          const size = atob(data).length;
          if (enforce(guard.allowPcm(size))) raw.sendAudio(data);
        },
        audioEnd: () => { if (active && ready && !transportClosed) raw.audioEnd(); },
        close: () => { if (!transportClosed) { transportClosed++; raw.close(); } },
      };
      return transport;
    },
  });
  client.subscribe(() => { if (active && client.snapshot().status === 'error') stop('session-error'); else notify(); });
  return {
    start: () => { if (!operatorAttested) stop('attestation-required'); else if (active) void client.start(); },
    stop: () => stop('operator-ended'),
    finishLine: () => { if (!active || mode !== 'microphone' || !inputOpen || !ready) return; inputOpen = false; completedTurns++; client.setMuted(true); notify(); },
    nextLine: () => { if (!active || awaitingUsage || mode !== 'microphone' || inputTurns !== 1 || completedTurns !== 1) return; inputTurns = 2; inputOpen = true; client.setMuted(false); notify(); },
    mute: () => { if (active && ready && inputOpen && !awaitingUsage) client.setMuted(!client.snapshot().muted); },
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    view: () => ({ active, ready, mode, status: client.snapshot().status, muted: client.snapshot().muted, awaitingUsage, inputOpen, inputTurns, completedTurns, outcome, bounds: guard.snapshot(), audioChunks, playbackCompletions, interruptions, mutedDrops, audioClosed, transportClosed, inputLinesMatch: lines.map(line => normalize(receivedInput).includes(normalize(line))), outputTranscript, modelConfirmed, wireDiagnostics: wireDiagnostics ? { ...wireDiagnostics } : null }),
    evidence: () => ({ version: 1, testOnly: true, model: modelConfirmed ? expectedModel : null, approvedPromptHash: promptHash, operatorAttested, userAgent: typeof navigator === 'undefined' ? 'unit-test' : navigator.userAgent, mode, outcome, bounds: guard.snapshot(), inputTurns, completedTurns, audioChunks, playbackCompletions, interruptions, mutedDrops, audioClosed, transportClosed, inputLinesMatch: lines.map(line => normalize(receivedInput).includes(normalize(line))), outputTranscript, wireDiagnostics: wireDiagnostics ? { ...wireDiagnostics } : null }),
    output: () => {
      if (mode !== 'fixture' || active || !archive.length) return null;
      const size = archive.reduce((sum, chunk) => sum + chunk.length, 0), data = new Uint8Array(44 + size), view = new DataView(data.buffer);
      const tag = (offset: number, text: string) => [...text].forEach((value, index) => data[offset + index] = value.charCodeAt(0));
      tag(0, 'RIFF'); view.setUint32(4, 36 + size, true); tag(8, 'WAVE'); tag(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, 24000, true); view.setUint32(28, 48000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); tag(36, 'data'); view.setUint32(40, size, true);
      let offset = 44; archive.forEach(chunk => { data.set(chunk, offset); offset += chunk.length; });
      return new Blob([data], { type: 'audio/wav' });
    },
  };
}

type Run = ReturnType<typeof createApprovedVoiceCheck>;
let startedOnce = false;
function download(blob: Blob, name: string) { const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function VoiceCheck() {
  const [attested, setAttested] = useState(false), [run, setRun] = useState<Run | null>(null), [, update] = useState(0);
  const android = /Android/.test(navigator.userAgent), chrome = /Chrome\//.test(navigator.userAgent), desktop = !android && /Chrome\/|Chromium\/|Firefox\//.test(navigator.userAgent);
  useEffect(() => {
    if (!run) return;
    const unsubscribe = run.subscribe(() => update(value => value + 1));
    const hidden = () => { if (document.hidden) run.stop(); };
    document.addEventListener('visibilitychange', hidden); window.addEventListener('pagehide', run.stop);
    return () => { unsubscribe(); document.removeEventListener('visibilitychange', hidden); window.removeEventListener('pagehide', run.stop); run.stop(); };
  }, [run]);
  const start = (mode: Mode) => {
    if (!attested || startedOnce || !window.isSecureContext || (mode === 'fixture' ? !desktop : !android || !chrome)) return;
    startedOnce = true; const next = createApprovedVoiceCheck(mode, browserDependencies, true); setRun(next); next.start();
  };
  const state = run?.view();
  return <main style={{ maxWidth: 680, margin: '0 auto', padding: 24 }}>
    <h1>Approved voice verification</h1><p>Controlled QA only. Nothing starts on page load. Sign in normally to this deployment first.</p><a href="/app" target="_blank" rel="noreferrer">Open Grifon to sign in</a>
    <p>One attempt per page. Three approved sessions total across devices are tracked by the operator. No retry or reconnect.</p>
    <label style={{ display: 'flex', gap: 12, paddingBlock: 16 }}><input type="checkbox" checked={attested} disabled={startedOnce} onChange={event => setAttested(event.target.checked)} />Operator verified the deployed commit, approved prompt hash and remaining USD2 ledger before this case.</label>
    <ol>{lines.map(line => <li key={line}>{line}</li>)}</ol>
    {!window.isSecureContext && <p role="alert">An HTTPS staged deployment is required.</p>}
    <div className="actions"><button disabled={!attested || startedOnce || !desktop} onClick={() => start('fixture')}>Run approved fixture</button><button disabled={!attested || startedOnce || !android || !chrome} onClick={() => start('microphone')}>Start microphone check</button></div>
    {state && <><p role="status">{state.active ? state.status : state.outcome} · Input turns {state.inputTurns}/2 · Responses {state.bounds.responseStarts}/2</p>
      {state.active && state.mode === 'microphone' && <><p>{!state.ready ? 'Wait for Listening before speaking.' : state.inputOpen ? `Read line ${state.inputTurns}, then finish that line.` : state.awaitingUsage ? 'Wait. The microphone is paused while usage is checked.' : state.completedTurns === 1 ? 'When you hear Grifon, start line 2 to check interruption.' : 'Both microphone windows are closed.'}</p><div className="actions"><button disabled={!state.ready || !state.inputOpen} onClick={run!.finishLine}>Finish line {state.inputTurns}</button><button disabled={state.completedTurns !== 1 || state.inputTurns !== 1 || state.awaitingUsage} onClick={run!.nextLine}>Speak second line</button></div></>}
      {state.active && <div className="actions"><button disabled={!state.ready || !state.inputOpen || state.awaitingUsage} onClick={run!.mute}>{state.muted ? 'Unmute' : 'Mute'}</button><button onClick={run!.stop}>End check</button></div>}
      <p>{state.bounds.pcmBytes} PCM bytes · {state.bounds.transcriptBytes} transcription bytes · {state.bounds.usageReports} usage reports · Output tokens {state.bounds.outputTokensAvailable ? state.bounds.outputTokens : 'unavailable'} · conservative ${state.bounds.estimatedCostUsd.toFixed(6)} · {(state.bounds.elapsedMs / 1000).toFixed(1)}s /45s</p>
      {state.wireDiagnostics && <><p>Wire messages {state.wireDiagnostics.incomingMessages} · Interim input {state.wireDiagnostics.interimInputTranscriptionMessages} · Waiting for input {state.wireDiagnostics.waitingForInputMessages} · Interaction status {state.wireDiagnostics.interactionStatusMessages} · Voice activity start/end {state.wireDiagnostics.voiceActivityStartMessages}/{state.wireDiagnostics.voiceActivityEndMessages}</p><p>Inline audio seen/supported/unsupported {state.wireDiagnostics.inlineAudioPartsSeen}/{state.wireDiagnostics.inlineAudioPartsSupported}/{state.wireDiagnostics.inlineAudioPartsUnsupported} · Audio/end frames enqueued {state.wireDiagnostics.audioFramesEnqueued}/{state.wireDiagnostics.audioEndFramesEnqueued} (socket enqueue, no provider acknowledgement) · Errors {state.wireDiagnostics.errors} · Close code {state.wireDiagnostics.closeCode ?? 'unavailable'}</p></>}
      {!state.active && <div className="actions"><button onClick={() => download(new Blob([JSON.stringify(run!.evidence(), null, 2)], { type: 'application/json' }), 'grifon-voice-check-evidence.json')}>Download sanitized evidence</button>{state.mode === 'fixture' && <button onClick={() => { const blob = run!.output(); if (blob) download(blob, 'grifon-voice-check-output.wav'); }}>Download model output audio</button>}</div>}
    </>}
    <p>Stop automatically if time, bytes, responses, output tokens or conservative cost reach their bounds, or usage is missing or uninterpretable. Microphone audio is never saved. The Android test uses exactly two explicitly opened microphone windows.</p>
    <style>{`body{margin:0;background:#09090b;color:#f4f4f5;font:15px/1.6 Oxanium,sans-serif}h1{font-size:24px;line-height:1.3}a{color:#ffcc00}p,li{overflow-wrap:anywhere}.actions{display:flex;gap:8px;flex-wrap:wrap}button{min-height:44px;padding:8px 14px;border-radius:12px;border:1px solid #ffffff30;background:#18181b;color:#f4f4f5;font:inherit}button:disabled{opacity:.45}button:focus-visible,input:focus-visible{outline:2px solid #ffcc00;outline-offset:2px}input{min-width:22px;min-height:22px}label{align-items:flex-start}`}</style>
  </main>;
}
if (typeof document !== 'undefined' && document.getElementById('root')) createRoot(document.getElementById('root')!).render(<VoiceCheck />);

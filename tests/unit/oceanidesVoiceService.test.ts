import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VoiceLabService } from '../../funnels/oceanides-price-page/dev/voice-lab/service';
import { VoiceLedger } from '../../funnels/oceanides-price-page/dev/voice-lab/ledger';
import type { ClientEvent, PlaybackDiagnostics, ServerEvent } from '../../funnels/oceanides-price-page/src/voice-lab/contracts';

const specPath = fileURLToPath(new URL('../../funnels/oceanides-price-page/dev/voice-lab/paid-test-spec.DRAFT.json', import.meta.url));
const hash = createHash('sha256').update(readFileSync(specPath)).digest('hex');
class FakeProvider extends EventEmitter {
  readyState = 0;
  sent: Array<Record<string, any>> = [];
  closes = 0;
  send(value: string) { this.sent.push(JSON.parse(value)); }
  close() { this.closes++; this.readyState = 3; }
  open() { this.readyState = 1; this.emit('open'); this.event({ type: 'session.updated' }); }
  event(value: unknown) { this.emit('message', Buffer.from(JSON.stringify(value))); }
}
const fixtures: Array<{ directory: string; service: VoiceLabService }> = [];
function fixture(live = false, failOpen = false, approvedHash = hash) {
  const directory = mkdtempSync(join(tmpdir(), 'oceanides-service-test-'));
  const provider = new FakeProvider();
  const events: ServerEvent[] = [];
  let now = 1000;
  let attemptsWhenOpened = -1;
  const opener = vi.fn(() => {
    attemptsWhenOpened = new VoiceLedger(directory).summary().attempts;
    if (failOpen) throw new Error('Simulated provider failure');
    return provider;
  });
  const service = new VoiceLabService({
    ledgerDirectory: directory, specPath, now: () => now,
    env: live ? { OCEANIDES_VOICE_LIVE: '1', OCEANIDES_VOICE_APPROVED_SPEC_SHA256: approvedHash, XAI_API_KEY: 'TEST-NOT-A-CREDENTIAL' } : {},
    openProvider: opener,
  });
  fixtures.push({ directory, service });
  function start() {
    const response = service.createSession('natural-inquiry', live ? 'live' : 'mock');
    const token = new URL(response.wsPath, 'http://127.0.0.1:5184').searchParams.get('token')!;
    const id = service.attach(token, event => events.push(event));
    return { id, token };
  }
  return { service, directory, provider, events, opener, start, advance: (milliseconds: number) => { now += milliseconds; service.expireSessions(); }, openedAfterReservation: () => attemptsWhenOpened };
}
afterEach(() => {
  for (const { service, directory } of fixtures.splice(0)) {
    service.dispose();
    if (!resolve(directory).startsWith(`${resolve(tmpdir())}${sep}oceanides-service-test-`)) throw new Error('Unexpected service directory');
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('Oceanides mock and live bridge boundaries (fake provider only)', () => {
  const opening = 'Magandang araw po! Ako si Michael, AI assistant ng Oceanides. Anong service po ang kailangan n’yo?';
  const ready: ClientEvent = { type: 'audio_ready' };

  it('retains bounded safe audio lifecycle flags and counts after operator Stop', () => {
    const value = fixture(true);
    const { id } = value.start();
    value.provider.open();
    value.service.receive(id, ready);
    value.service.receive(id, { type: 'audio', data: 'AAA=' });
    value.provider.event({ type: 'response.created', response: { id: 'private-provider-id' } });
    value.provider.event({ type: 'response.output_audio.delta', response_id: 'private-provider-id', delta: 'PRIVATE-AUDIO-CANARY' });
    value.service.stop(id);
    expect(value.service.status().lifecycle).toEqual({ configured: true, audioReady: true, openingSent: true, inputFrames: 1, outputChunks: 1, serverSpeechStarts: 0, serverSpeechStops: 0, responsesCreated: 1, responsesDone: 0, clientInterrupts: 0, canceledAudioChunks: 0, outputPcmBytes: Buffer.from('PRIVATE-AUDIO-CANARY', 'base64').byteLength, playback: null, lastStage: 'output_audio', stopReason: 'operator_stopped' });
    expect(JSON.stringify(value.service.status())).not.toContain('PRIVATE-AUDIO-CANARY');
    expect(JSON.stringify(value.service.status())).not.toContain('private-provider-id');
  });

  it('retains useful response and VAD milestones while microphone input continues', () => {
    const value = fixture(true);
    const { id } = value.start();
    value.provider.open();
    value.service.receive(id, ready);
    value.provider.event({ type: 'response.created', response: { id: 'private-response' } });
    value.service.receive(id, { type: 'audio', data: 'AAA=' });
    expect(value.service.status().lifecycle?.lastStage).toBe('response_created');
    value.provider.event({ type: 'input_audio_buffer.speech_started' });
    value.service.receive(id, { type: 'audio', data: 'AAA=' });
    expect(value.service.status().lifecycle?.lastStage).toBe('caller_speaking');
    value.provider.event({ type: 'response.output_audio.delta', response_id: 'private-response', delta: 'AAAA' });
    value.provider.event({ type: 'input_audio_buffer.speech_stopped' });
    value.provider.event({ type: 'response.done', response: { id: 'private-response' } });
    value.service.stop(id);
    expect(value.service.status().lifecycle).toMatchObject({ inputFrames: 2, serverSpeechStarts: 1, serverSpeechStops: 1, responsesCreated: 1, responsesDone: 1, canceledAudioChunks: 1, outputChunks: 0, outputPcmBytes: 0, lastStage: 'response_done' });
    expect(JSON.stringify(value.service.status())).not.toContain('private-response');
  });

  it('copies allowlisted playback counters into retained status without provider traffic or mutable aliases', () => {
    const value = fixture(true);
    const { id } = value.start();
    value.provider.open();
    const counts: PlaybackDiagnostics = { receivedChunks: 3, decodedChunks: 3, scheduledChunks: 2, endedChunks: 1, canceledChunks: 1, droppedChunks: 1, decodedSamples: 4800, nonZeroSamples: 1200, localInterrupts: 1, serverInterruptNotifications: 2 };
    const expected = { ...counts };
    const writes = value.provider.sent.length;
    value.service.receive(id, { type: 'playback_diagnostics', counts });
    expect(value.provider.sent).toHaveLength(writes);
    counts.receivedChunks = 100;
    expect(value.service.status().lifecycle?.playback).toEqual(expected);
    const activeCopy = value.service.status().lifecycle?.playback;
    if (!activeCopy) throw new Error('Playback counts missing');
    activeCopy.decodedChunks = 100;
    value.service.stop(id);
    expect(value.service.status().lifecycle?.playback).toEqual(expected);
    const stoppedCopy = value.service.status().lifecycle?.playback;
    if (!stoppedCopy) throw new Error('Stopped playback counts missing');
    stoppedCopy.scheduledChunks = 100;
    expect(value.service.status().lifecycle?.playback).toEqual(expected);
  });

  it('rejects missing, extra, raw, nonnumeric and out-of-bound playback metadata without poisoning retained counts', () => {
    const value = fixture(true);
    const { id } = value.start();
    value.provider.open();
    const counts: PlaybackDiagnostics = { receivedChunks: 1000000000, decodedChunks: 0, scheduledChunks: 0, endedChunks: 0, canceledChunks: 0, droppedChunks: 0, decodedSamples: 0, nonZeroSamples: 0, localInterrupts: 0, serverInterruptNotifications: 0 };
    value.service.receive(id, { type: 'playback_diagnostics', counts });
    const { receivedChunks: _received, ...missing } = counts;
    const invalid = [null, [], missing, { ...counts, rawAudio: 'PRIVATE-RAW-AUDIO' }, ...[-1, 0.5, NaN, Infinity, 1000000001, 'PRIVATE-RAW-AUDIO'].map(receivedChunks => ({ ...counts, receivedChunks }))];
    const writes = value.provider.sent.length;
    for (const metadata of invalid) {
      value.service.receive(id, { type: 'playback_diagnostics', counts: metadata } as ClientEvent);
      expect(value.service.status().lifecycle?.playback).toEqual(counts);
      expect(value.events.at(-2)).toMatchObject({ type: 'error', code: 'invalid_playback_diagnostics' });
    }
    value.service.receive(id, { type: 'playback_diagnostics', counts, rawAudio: 'PRIVATE-RAW-AUDIO' } as ClientEvent);
    expect(value.events.at(-2)).toMatchObject({ type: 'error', code: 'invalid_playback_diagnostics' });
    expect(JSON.stringify(value.service.status())).not.toContain('PRIVATE-RAW-AUDIO');
    expect(JSON.stringify(value.events)).not.toContain('PRIVATE-RAW-AUDIO');
    expect(value.provider.sent).toHaveLength(writes);
    expect(value.service.status().active).toBe(true);
  });

  it('speaks the approved opening verbatim once only after audio and provider readiness', () => {
    const value = fixture(true);
    const { id } = value.start();
    value.provider.open();
    expect(value.provider.sent.filter(event => event.item?.type === 'force_message')).toHaveLength(0);
    value.service.receive(id, ready);
    value.service.receive(id, ready);
    value.provider.event({ type: 'session.updated' });
    expect(value.provider.sent.filter(event => event.item?.type === 'force_message')).toEqual([
      { type: 'conversation.item.create', item: { type: 'force_message', role: 'assistant', interruptible: true, content: [{ type: 'output_text', text: opening }] } },
    ]);
    expect(value.provider.sent.filter(event => event.type === 'response.create')).toHaveLength(0);
    expect(value.service.budget()).toMatchObject({ attempts: 1, reservedUsd: 0.5 });
  });

  it('waits for configuration when microphone readiness arrives first and discards earlier capture', () => {
    const value = fixture(true);
    const { id } = value.start();
    value.service.receive(id, { type: 'audio', data: 'AAA=' });
    value.service.receive(id, ready);
    expect(value.provider.sent).toHaveLength(0);
    value.provider.open();
    expect(value.provider.sent.filter(event => event.item?.type === 'force_message')).toHaveLength(1);
    expect(value.provider.sent.filter(event => event.type === 'input_audio_buffer.append')).toHaveLength(0);
    value.service.receive(id, { type: 'audio', data: 'AAA=' });
    expect(value.provider.sent.filter(event => event.type === 'input_audio_buffer.append')).toHaveLength(1);
  });

  it('does not upload capture or generate text while microphone readiness is pending', () => {
    const value = fixture(true);
    const { id } = value.start();
    value.provider.open();
    value.service.receive(id, { type: 'audio', data: 'AAA=' });
    value.service.receive(id, { type: 'user_text', text: 'What is the rate?' });
    expect(value.provider.sent.filter(event => event.type === 'input_audio_buffer.append' || event.type === 'response.create')).toHaveLength(0);
  });

  it('holds another turn until the opening response completes and its playback drains', () => {
    const value = fixture(true);
    const { id } = value.start();
    value.provider.open();
    value.service.receive(id, ready);
    value.service.receive(id, { type: 'user_text', text: 'What is the rate?' });
    expect(value.provider.sent.filter(event => event.type === 'response.create')).toHaveLength(0);
    value.provider.event({ type: 'response.created', response: { id: 'opening-1' } });
    value.provider.event({ type: 'response.done', response: { id: 'opening-1' } });
    expect(value.provider.sent.filter(event => event.type === 'response.create')).toHaveLength(0);
    value.service.receive(id, { type: 'playback_drained', responseId: 'opening-1' });
    expect(value.provider.sent.filter(event => event.type === 'response.create')).toHaveLength(1);
    value.service.receive(id, ready);
    expect(value.provider.sent.filter(event => event.item?.type === 'force_message')).toHaveLength(1);
  });

  it('cancels a not-yet-created opening and suppresses its late audio', () => {
    const value = fixture(true);
    const { id } = value.start();
    value.provider.open();
    value.service.receive(id, ready);
    value.service.receive(id, { type: 'interrupt' });
    value.provider.event({ type: 'response.created', response: { id: 'opening-cancelled' } });
    value.provider.event({ type: 'response.output_audio.delta', response_id: 'opening-cancelled', delta: 'AAAA' });
    value.provider.event({ type: 'response.done', response: { id: 'opening-cancelled' } });
    value.service.receive(id, { type: 'playback_drained', responseId: 'opening-cancelled' });
    expect(value.events.filter(event => event.type === 'audio')).toHaveLength(0);
    expect(value.provider.sent.filter(event => event.type === 'response.cancel')).toHaveLength(1);
    expect(value.provider.sent.filter(event => event.type === 'response.create')).toHaveLength(0);
  });

  it('does not greet after Stop even when configuration or microphone readiness arrives late', () => {
    const value = fixture(true);
    const { id } = value.start();
    value.service.receive(id, ready);
    value.service.receive(id, { type: 'stop' });
    value.provider.open();
    value.service.receive(id, ready);
    expect(value.provider.sent.filter(event => event.item?.type === 'force_message')).toHaveLength(0);
    expect(value.opener).toHaveBeenCalledTimes(1);
    expect(value.service.budget()).toMatchObject({ attempts: 1, reservedUsd: 0.5 });
  });

  it('does not cancel the caller reply when server VAD already canceled an uncreated opening', () => {
    const value = fixture(true);
    const { id } = value.start();
    value.provider.open();
    value.service.receive(id, ready);
    value.provider.event({ type: 'input_audio_buffer.speech_started' });
    value.provider.event({ type: 'input_audio_buffer.speech_stopped' });
    value.provider.event({ type: 'response.created', response: { id: 'caller-vad-reply' } });
    value.provider.event({ type: 'response.output_audio.delta', response_id: 'caller-vad-reply', delta: 'AAAA' });
    expect(value.events.filter(event => event.type === 'audio')).toEqual([
      { type: 'audio', data: 'AAAA', sampleRate: 24000, responseId: 'caller-vad-reply' },
    ]);
    expect(value.provider.sent.filter(event => event.type === 'response.cancel')).toHaveLength(0);
  });

  it('clears an uncorrelated pending client cancellation when server VAD takes ownership', () => {
    const value = fixture(true);
    const { id } = value.start();
    value.provider.open();
    value.service.receive(id, ready);
    value.service.receive(id, { type: 'interrupt' });
    value.provider.event({ type: 'input_audio_buffer.speech_started' });
    value.provider.event({ type: 'input_audio_buffer.speech_stopped' });
    value.provider.event({ type: 'response.created', response: { id: 'caller-owned-reply' } });
    value.provider.event({ type: 'response.output_audio.delta', response_id: 'caller-owned-reply', delta: 'AAAA' });
    expect(value.events.filter(event => event.type === 'audio')).toEqual([
      { type: 'audio', data: 'AAAA', sampleRate: 24000, responseId: 'caller-owned-reply' },
    ]);
    expect(value.provider.sent.filter(event => event.type === 'response.cancel')).toHaveLength(0);
    expect(value.service.status().lifecycle).toMatchObject({ clientInterrupts: 1, serverSpeechStarts: 1, serverSpeechStops: 1 });
  });

  it('forwards caller transcription before the next response exists while suppressing canceled assistant events', () => {
    const value = fixture(true);
    const { id } = value.start();
    value.provider.open();
    value.service.receive(id, ready);
    value.provider.event({ type: 'response.created', response: { id: 'canceled-opening' } });
    value.service.receive(id, { type: 'interrupt' });
    value.provider.event({ type: 'input_audio_buffer.speech_started' });
    value.provider.event({ type: 'input_audio_buffer.speech_stopped' });
    value.provider.event({ type: 'conversation.item.input_audio_transcription.completed', transcript: 'Hi, magkano po magpa-siphon sa Quezon City?' });
    value.provider.event({ type: 'response.output_audio_transcript.done', response_id: 'canceled-opening', transcript: 'Canceled assistant transcript' });
    value.provider.event({ type: 'response.output_audio.delta', response_id: 'canceled-opening', delta: 'AAAA' });
    value.provider.event({ type: 'response.function_call_arguments.done', response_id: 'canceled-opening', call_id: 'canceled-rate', name: 'lookup_rate', arguments: '{"city":"Quezon City"}' });
    expect(value.events.filter(event => event.type === 'transcript')).toEqual([
      { type: 'transcript', entry: expect.objectContaining({ role: 'caller', text: 'Hi, magkano po magpa-siphon sa Quezon City?' }) },
    ]);
    expect(value.events.filter(event => event.type === 'audio' || event.type === 'tool')).toHaveLength(0);
    expect(value.provider.sent.filter(event => event.item?.type === 'function_call_output')).toHaveLength(0);
    value.service.stop(id);
    const finalState = value.events.filter(event => event.type === 'state').at(-1);
    expect(finalState && 'snapshot' in finalState && finalState.snapshot.transcript).toEqual([
      expect.objectContaining({ role: 'caller', text: 'Hi, magkano po magpa-siphon sa Quezon City?' }),
    ]);
  });

  it('drops late audio from the known VAD-canceled response while forwarding the next reply and its tool continuation', () => {
    const value = fixture(true);
    const { id } = value.start();
    value.provider.open();
    value.service.receive(id, ready);
    value.provider.event({ type: 'response.created', response: { id: 'opening-known' } });
    value.provider.event({ type: 'input_audio_buffer.speech_started' });
    value.provider.event({ type: 'response.output_audio.delta', response_id: 'opening-known', delta: 'AAAA' });
    value.provider.event({ type: 'response.done', response: { id: 'opening-known' } });
    value.provider.event({ type: 'input_audio_buffer.speech_stopped' });
    value.provider.event({ type: 'response.created', response: { id: 'caller-tools' } });
    value.provider.event({ type: 'response.function_call_arguments.done', response_id: 'caller-tools', call_id: 'rate', name: 'lookup_rate', arguments: '{"city":"Quezon City"}' });
    value.provider.event({ type: 'response.done', response: { id: 'caller-tools', output: [{ type: 'function_call' }] } });
    expect(value.provider.sent.filter(event => event.type === 'response.create')).toHaveLength(0);
    value.service.receive(id, { type: 'playback_drained', responseId: 'caller-tools' });
    expect(value.provider.sent.filter(event => event.type === 'response.create')).toHaveLength(1);
    value.provider.event({ type: 'response.created', response: { id: 'caller-answer' } });
    value.provider.event({ type: 'response.output_audio.delta', response_id: 'opening-known', delta: 'AAAA' });
    value.provider.event({ type: 'response.output_audio.delta', response_id: 'caller-answer', delta: 'AAAA' });
    expect(value.events.filter(event => event.type === 'audio')).toEqual([
      { type: 'audio', data: 'AAAA', sampleRate: 24000, responseId: 'caller-answer' },
    ]);
    expect(value.provider.sent.filter(event => event.type === 'response.cancel')).toHaveLength(0);
  });

  it('rejects client-supplied greeting text instead of substituting for the server spec', () => {
    const value = fixture(true);
    const { id } = value.start();
    value.provider.open();
    value.service.receive(id, { type: 'audio_ready', text: 'Unapproved opening' } as ClientEvent);
    expect(value.events).toContainEqual(expect.objectContaining({ type: 'error', code: 'invalid_audio_ready' }));
    expect(value.provider.sent.filter(event => event.item?.type === 'force_message')).toHaveLength(0);
    value.service.receive(id, ready);
    expect(value.provider.sent.find(event => event.item?.type === 'force_message')?.item.content[0].text).toBe(opening);
  });

  it('does not stack a late welcome over a caller-first VAD response', () => {
    const value = fixture(true);
    const { id } = value.start();
    value.provider.open();
    value.provider.event({ type: 'input_audio_buffer.speech_started' });
    value.service.receive(id, ready);
    value.provider.event({ type: 'input_audio_buffer.speech_stopped' });
    value.provider.event({ type: 'response.created', response: { id: 'caller-first' } });
    value.provider.event({ type: 'response.output_audio.delta', response_id: 'caller-first', delta: 'AAAA' });
    expect(value.provider.sent.filter(event => event.item?.type === 'force_message' || event.type === 'response.create')).toHaveLength(0);
    expect(value.events.filter(event => event.type === 'audio')).toHaveLength(1);
    expect(value.service.status().lifecycle?.openingSent).toBe(false);
  });

  it('does not let staff notifications start a second response during the opening lifecycle', () => {
    const value = fixture(true);
    const { id } = value.start();
    value.provider.open();
    value.service.receive(id, ready);
    value.provider.event({ type: 'response.created', response: { id: 'opening-staff' } });
    value.provider.event({ type: 'response.function_call_arguments.done', response_id: 'opening-staff', call_id: 'confirm', name: 'confirm_details', arguments: '{"confirmed":true}' });
    value.provider.event({ type: 'response.function_call_arguments.done', response_id: 'opening-staff', call_id: 'request', name: 'create_service_request', arguments: '{}' });
    value.service.receive(id, { type: 'dispatch', decision: 'approved', pricePhp: 5000, slot: 'TEST slot' });
    expect(value.provider.sent.filter(event => event.type === 'response.create')).toHaveLength(0);
    value.provider.event({ type: 'response.done', response: { id: 'opening-staff' } });
    expect(value.provider.sent.filter(event => event.type === 'response.create')).toHaveLength(0);
    value.service.receive(id, { type: 'playback_drained', responseId: 'opening-staff' });
    expect(value.provider.sent.filter(event => event.type === 'response.create')).toHaveLength(1);
  });

  it('does not fabricate a response during silence in a thinking-pause mock', () => {
    const value = fixture();
    const session = value.service.createSession('thinking-pauses', 'mock');
    const token = new URL(session.wsPath, 'http://127.0.0.1:5184').searchParams.get('token')!;
    value.service.attach(token, event => value.events.push(event));
    const before = structuredClone(value.events);
    value.advance(3000);
    expect(value.events).toEqual(before);
    expect(value.service.budget()).toMatchObject({ attempts: 0, reservedUsd: 0 });
    expect(value.opener).not.toHaveBeenCalled();
  });

  it('never opens a provider in mock mode or for an unapproved live request', () => {
    const value = fixture();
    const { id } = value.start();
    value.service.receive(id, { type: 'user_text', text: 'Confirm details' });
    value.service.stop(id);
    expect(() => value.service.createSession('natural-inquiry', 'live')).toThrow('live_not_approved_or_budget_unavailable');
    expect(value.opener).not.toHaveBeenCalled();
    expect(value.service.budget().attempts).toBe(0);
  });

  it('has one active session and one use per opaque session token', () => {
    const value = fixture();
    const { id, token } = value.start();
    expect(() => value.service.createSession('price-objection', 'mock')).toThrow('session_already_active');
    expect(() => value.service.attach(token, () => {})).toThrow('invalid_or_used_session_token');
    value.service.stop(id);
    expect(value.service.status().active).toBe(false);
  });

  it('cancels a preparing session without opening a paid provider or reserving funds', () => {
    const value = fixture(true);
    const response = value.service.createSession('natural-inquiry', 'live');
    const token = new URL(response.wsPath, 'http://127.0.0.1:5184').searchParams.get('token')!;
    expect(value.service.cancelPreparing(token)).toBe(true);
    expect(value.service.cancelPreparing(token)).toBe(false);
    expect(() => value.service.attach(token, () => {})).toThrow('invalid_or_used_session_token');
    expect(value.service.budget().attempts).toBe(0);
    expect(value.opener).not.toHaveBeenCalled();
    expect(value.service.status().active).toBe(false);
  });

  it('durably reserves before opening and never refunds an uncertain startup', () => {
    const value = fixture(true, true);
    value.start();
    expect(value.openedAfterReservation()).toBe(1);
    expect(value.opener).toHaveBeenCalledTimes(1);
    expect(new VoiceLedger(value.directory).summary()).toMatchObject({ attempts: 1, reservedUsd: 0.5 });
    expect(value.service.status().active).toBe(false);
    expect(value.events).toContainEqual(expect.objectContaining({ type: 'closed', reason: 'live_start_failed' }));
  });

  it('opens exactly one recovery provider after ten retained attempts and blocks a twelfth after restart', () => {
    const value = fixture(true);
    for (let i = 0; i < 10; i++) new VoiceLedger(value.directory).reserve('a'.repeat(64), 10, 5);
    const path = join(value.directory, 'budget.json');
    const original = JSON.parse(readFileSync(path, 'utf8')).reservations;
    const { id } = value.start();
    expect(value.openedAfterReservation()).toBe(11);
    expect(value.opener).toHaveBeenCalledTimes(1);
    expect(value.service.budget()).toMatchObject({ attempts: 11, reservedUsd: 5.5, liveReady: false });
    expect(JSON.parse(readFileSync(path, 'utf8')).reservations.slice(0, 10)).toEqual(original);
    value.service.stop(id);
    const afterRecovery = readFileSync(path, 'utf8');
    const nextOpener = vi.fn(() => new FakeProvider());
    const restarted = new VoiceLabService({
      ledgerDirectory: value.directory, specPath,
      env: { OCEANIDES_VOICE_LIVE: '1', OCEANIDES_VOICE_APPROVED_SPEC_SHA256: hash, XAI_API_KEY: 'TEST-NOT-A-CREDENTIAL' },
      openProvider: nextOpener,
    });
    try {
      expect(() => restarted.createSession('natural-inquiry', 'live')).toThrow('live_not_approved_or_budget_unavailable');
      expect(restarted.budget()).toMatchObject({ attempts: 11, reservedUsd: 5.5, liveReady: false });
      expect(nextOpener).not.toHaveBeenCalled();
      expect(readFileSync(path, 'utf8')).toBe(afterRecovery);
    } finally { restarted.dispose(); }
    expect(value.opener).toHaveBeenCalledTimes(1);
  });

  it('does not reserve or open a recovery provider with stale spec approval', () => {
    const value = fixture(true, false, 'a'.repeat(64));
    for (let i = 0; i < 10; i++) new VoiceLedger(value.directory).reserve('a'.repeat(64), 10, 5);
    const path = join(value.directory, 'budget.json');
    const original = readFileSync(path, 'utf8');
    expect(() => value.start()).toThrow('live_not_approved_or_budget_unavailable');
    expect(value.opener).not.toHaveBeenCalled();
    expect(readFileSync(path, 'utf8')).toBe(original);
  });

  it('enforces timeout even if the browser sends no more events', () => {
    const value = fixture(true);
    value.start();
    value.provider.open();
    value.advance(180000);
    expect(value.service.status().active).toBe(false);
    expect(value.provider.closes).toBe(1);
    expect(value.events).toContainEqual(expect.objectContaining({ type: 'closed', reason: 'session_time_limit' }));
    expect(value.opener).toHaveBeenCalledTimes(1);
  });

  it('stops the upstream when the operator stops the session', () => {
    const value = fixture(true);
    const { id } = value.start();
    value.provider.open();
    value.service.receive(id, { type: 'stop' });
    expect(value.provider.closes).toBe(1);
    expect(value.service.status().active).toBe(false);
    expect(value.service.budget().attempts).toBe(1);
  });

  it('does not cancel a nonexistent response on the first caller speech', () => {
    const value = fixture(true);
    value.start();
    value.provider.open();
    value.provider.event({ type: 'input_audio_buffer.speech_started' });
    expect(value.provider.sent.filter(event => event.type === 'response.cancel')).toHaveLength(0);
    expect(value.provider.closes).toBe(0);
    expect(value.events).toContainEqual(expect.objectContaining({ type: 'speech_started' }));
  });

  it('clears an active response and ignores its delayed audio chunks', () => {
    const value = fixture(true);
    const { id } = value.start();
    value.provider.open();
    value.provider.event({ type: 'response.created', response: { id: 'audio-1' } });
    value.provider.event({ type: 'response.output_audio.delta', response_id: 'audio-1', delta: 'AAAA' });
    value.service.receive(id, { type: 'interrupt' });
    value.provider.event({ type: 'response.output_audio.delta', response_id: 'audio-1', delta: 'AAAA' });
    expect(value.events.filter(event => event.type === 'audio')).toHaveLength(1);
    expect(value.provider.sent.filter(event => event.type === 'response.cancel')).toHaveLength(1);
  });

  it('waits for response completion and actual playback drain before continuing tool results', () => {
    const value = fixture(true);
    const { id } = value.start();
    value.provider.open();
    value.provider.event({ type: 'response.created', response: { id: 'tools-1' } });
    value.provider.event({ type: 'response.function_call_arguments.done', response_id: 'tools-1', call_id: 'call-1', name: 'lookup_rate', arguments: '{"city":"Pasig"}' });
    value.provider.event({ type: 'response.function_call_arguments.done', response_id: 'tools-1', call_id: 'call-2', name: 'get_dispatch', arguments: '{}' });
    value.provider.event({ type: 'response.done', response: { id: 'tools-1', output: [{ type: 'function_call' }, { type: 'function_call' }] } });
    expect(value.provider.sent.filter(event => event.type === 'response.create')).toHaveLength(0);
    value.service.receive(id, { type: 'playback_drained', responseId: 'tools-1' });
    expect(value.provider.sent.filter(event => event.type === 'response.create')).toHaveLength(1);
    expect(value.provider.sent.filter(event => event.item?.type === 'function_call_output')).toHaveLength(2);
    value.service.receive(id, { type: 'playback_drained', responseId: 'tools-1' });
    expect(value.provider.sent.filter(event => event.type === 'response.create')).toHaveLength(1);
  });

  it('does not start concurrent responses for rapid text before the first response.created', () => {
    const value = fixture(true);
    const { id } = value.start();
    value.provider.open();
    value.service.receive(id, ready);
    value.provider.event({ type: 'response.created', response: { id: 'opening-complete' } });
    value.provider.event({ type: 'response.done', response: { id: 'opening-complete' } });
    value.service.receive(id, { type: 'playback_drained', responseId: 'opening-complete' });
    value.service.receive(id, { type: 'user_text', text: 'What is the rate?' });
    value.service.receive(id, { type: 'user_text', text: 'Please explain the per-load price.' });
    expect(value.provider.sent.filter(event => event.type === 'response.create')).toHaveLength(1);
  });

  it('counts simulated staff input messages in the same paid text allowance', () => {
    const value = fixture(true);
    const { id } = value.start();
    value.provider.open();
    value.service.receive(id, ready);
    value.provider.event({ type: 'response.function_call_arguments.done', call_id: 'confirm', name: 'confirm_details', arguments: '{"confirmed":true}' });
    value.provider.event({ type: 'response.function_call_arguments.done', call_id: 'request', name: 'create_service_request', arguments: '{}' });
    for (let index = 0; index < 21; index++) value.service.receive(id, { type: 'dispatch', decision: 'approved', pricePhp: 5000, slot: 'TEST slot' });
    const inputs = value.provider.sent.filter(event => event.type === 'conversation.item.create' && event.item?.type === 'message');
    expect(inputs.length).toBeLessThanOrEqual(20);
    expect(value.service.status().active).toBe(false);
    expect(value.opener).toHaveBeenCalledTimes(1);
  });

  it('keeps valid long dispatch conditions available without overflowing a text notification', () => {
    const value = fixture(true);
    const { id } = value.start();
    value.provider.open();
    value.provider.event({ type: 'response.function_call_arguments.done', call_id: 'confirm', name: 'confirm_details', arguments: '{"confirmed":true}' });
    value.provider.event({ type: 'response.function_call_arguments.done', call_id: 'request', name: 'create_service_request', arguments: '{}' });
    value.service.receive(id, { type: 'dispatch', decision: 'approved', pricePhp: 5000, slot: 'TEST slot', conditions: 'x'.repeat(300) });
    expect(value.service.status().active).toBe(true);
    const states = value.events.filter(event => event.type === 'state');
    const final = states.at(-1);
    expect(final && 'snapshot' in final && final.snapshot.dispatch.conditions).toHaveLength(300);
  });

  it('cancels the next response when interrupted between a tool continuation and response.created', () => {
    const value = fixture(true);
    const { id } = value.start();
    value.provider.open();
    value.provider.event({ type: 'response.created', response: { id: 'tools-1' } });
    value.provider.event({ type: 'response.function_call_arguments.done', response_id: 'tools-1', call_id: 'call-1', name: 'lookup_rate', arguments: '{"city":"Pasig"}' });
    value.provider.event({ type: 'response.done', response: { id: 'tools-1', output: [{ type: 'function_call' }] } });
    value.service.receive(id, { type: 'playback_drained', responseId: 'tools-1' });
    value.service.receive(id, { type: 'interrupt' });
    value.provider.event({ type: 'response.created', response: { id: 'answer-2' } });
    value.provider.event({ type: 'response.output_audio.delta', response_id: 'answer-2', delta: 'AAAA' });
    expect(value.events.filter(event => event.type === 'audio')).toHaveLength(0);
    expect(value.provider.sent.filter(event => event.type === 'response.cancel')).toHaveLength(1);
  });

  it('preserves a reviewable unconfirmed failure when the provider disconnects', () => {
    const value = fixture(true);
    value.start();
    value.provider.open();
    value.provider.emit('close');
    const snapshots = value.events.filter(event => event.type === 'state' || event.type === 'snapshot');
    const final = snapshots.at(-1);
    expect(final && 'snapshot' in final && final.snapshot.phase).toBe('closed');
    expect(final && 'snapshot' in final && final.snapshot.requestStatus).toBe('failed');
    expect(value.events).toContainEqual(expect.objectContaining({ type: 'closed', reason: 'provider_disconnected' }));
    expect(value.opener).toHaveBeenCalledTimes(1);
  });
});

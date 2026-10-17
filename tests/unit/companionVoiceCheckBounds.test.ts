import { describe, expect, it, vi } from 'vitest';
import { createCompanionVoiceCheckBounds } from '../../dev/companionVoiceCheckBounds.js';

describe('controlled Companion Live voice check bounds', () => {
  it('rejects a PCM packet before it would exceed 1,440,000 session bytes', () => {
    const guard = createCompanionVoiceCheckBounds({ now: () => 0 });
    expect(guard.allowPcm(1440000)).toBe(true);
    expect(guard.allowPcm(1)).toBe(false);
    expect(guard.snapshot()).toMatchObject({ stopped: true, stopReason: 'pcm-limit', pcmBytes: 1440000 });
  });

  it.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER, '100', null])('rejects invalid PCM byte count %s', bytes => {
    const guard = createCompanionVoiceCheckBounds({ now: () => 0 });
    expect(guard.allowPcm(bytes as number)).toBe(false);
    expect(guard.snapshot()).toMatchObject({ stopReason: 'pcm-limit', pcmBytes: 0 });
  });

  it('counts successive PCM packets against the same cap', () => {
    const guard = createCompanionVoiceCheckBounds({ now: () => 0 });
    expect(guard.allowPcm(185920)).toBe(true);
    expect(guard.allowPcm(69120)).toBe(true);
    expect(guard.snapshot().pcmBytes).toBe(255040);
    expect(guard.allowPcm(1184961)).toBe(false);
    expect(guard.snapshot().pcmBytes).toBe(255040);
  });

  it.each(['a'.repeat(1024), 'é'.repeat(512), '💛'.repeat(256)])('limits transcription by UTF-8 bytes for %s', text => {
    const guard = createCompanionVoiceCheckBounds({ now: () => 0 });
    expect(guard.allowTranscript(text)).toBe(true);
    expect(guard.snapshot().transcriptBytes).toBe(1024);
    expect(guard.allowTranscript('a')).toBe(false);
    expect(guard.snapshot()).toMatchObject({ stopReason: 'transcript-limit', transcriptBytes: 1024 });
  });

  it('rejects an oversized initial transcript without retaining any text', () => {
    const guard = createCompanionVoiceCheckBounds({ now: () => 0 });
    expect(guard.allowTranscript('x'.repeat(1025))).toBe(false);
    expect(guard.snapshot()).toMatchObject({ stopReason: 'transcript-limit', transcriptBytes: 0 });
    expect(JSON.stringify(guard.snapshot())).not.toContain('xxx');
  });

  it('accepts two accounted responses then rejects a third before forwarding', () => {
    const guard = createCompanionVoiceCheckBounds({ now: () => 0 });
    expect(guard.recordUsage({ totalTokenCount: 1000, responseTokenCount: 512 })).toBe(true);
    expect(guard.startResponse()).toBe(true);
    expect(guard.endResponse()).toBe(true);
    expect(guard.startResponse()).toBe(true);
    expect(guard.recordUsage({ totalTokenCount: 1512, responseTokenCount: 512 })).toBe(true);
    expect(guard.endResponse()).toBe(true);
    expect(guard.snapshot()).toMatchObject({ responseStarts: 2, responseEnds: 2, outputTokens: 1024, usageTokens: 2512, estimatedCostUsd: 0.030144 });
    expect(guard.startResponse()).toBe(false);
    expect(guard.snapshot()).toMatchObject({ stopReason: 'response-limit', responseStarts: 2, responseEnds: 2 });
  });

  it('fails closed when a response finishes without its own reported usage', () => {
    const guard = createCompanionVoiceCheckBounds({ now: () => 0 });
    guard.startResponse(); guard.recordUsage({ totalTokenCount: 100, responseTokenCount: 1 }); guard.endResponse();
    expect(guard.startResponse()).toBe(true);
    expect(guard.endResponse()).toBe(false);
    expect(guard.recordUsage({ totalTokenCount: 100 })).toBe(false);
    expect(guard.snapshot()).toMatchObject({ stopReason: 'usage-missing', responseStarts: 2, responseEnds: 1, usageReports: 1, usageTokens: 100 });
  });

  it.each(['start', 'end'])('rejects an out-of-order response %s', action => {
    const guard = createCompanionVoiceCheckBounds({ now: () => 0 });
    if (action === 'start') { guard.startResponse(); expect(guard.startResponse()).toBe(false); }
    else expect(guard.endResponse()).toBe(false);
    expect(guard.snapshot().stopReason).toBe('response-order');
  });

  it('charges all repeated usage reports, including context billed again', () => {
    const guard = createCompanionVoiceCheckBounds({ now: () => 0 });
    guard.startResponse();
    expect(guard.recordUsage({ totalTokenCount: 900, promptTokenCount: 800, responseTokenCount: 100 })).toBe(true);
    expect(guard.recordUsage({ totalTokenCount: 900, promptTokenCount: 800, responseTokenCount: 100 })).toBe(true);
    expect(guard.endResponse()).toBe(true);
    guard.startResponse();
    expect(guard.recordUsage({ totalTokenCount: 900, promptTokenCount: 800, responseTokenCount: 100 })).toBe(true);
    expect(guard.endResponse()).toBe(true);
    expect(guard.snapshot()).toMatchObject({ usageReports: 3, usageTokens: 2700, outputTokens: 300, estimatedCostUsd: 0.0324 });
  });

  it('conservatively charges component counts when they exceed the reported total', () => {
    const guard = createCompanionVoiceCheckBounds({ now: () => 0 });
    expect(guard.recordUsage({ totalTokenCount: 100, promptTokenCount: 200, responseTokenCount: 10, thoughtsTokenCount: 3, cachedContentTokenCount: 7 })).toBe(true);
    expect(guard.snapshot()).toMatchObject({ usageTokens: 220, outputTokens: 10, estimatedCostUsd: 0.00264 });
  });

  it('can interpret complete prompt/response counts when total count is absent', () => {
    const guard = createCompanionVoiceCheckBounds({ now: () => 0 });
    expect(guard.recordUsage({ promptTokenCount: 100, responseTokenCount: 10, thoughtsTokenCount: 5, cachedContentTokenCount: 10 })).toBe(true);
    expect(guard.snapshot()).toMatchObject({ usageTokens: 125, outputTokens: 10, estimatedCostUsd: 0.0015 });
  });

  it('charges total-only reports but fails settlement without measured output counts', () => {
    const guard = createCompanionVoiceCheckBounds({ now: () => 0 });
    guard.startResponse();
    expect(guard.recordUsage({ totalTokenCount: 100 })).toBe(true);
    expect(guard.snapshot()).toMatchObject({ usageTokens: 100, outputTokensAvailable: false });
    expect(guard.endResponse()).toBe(false);
    expect(guard.snapshot()).toMatchObject({ stopReason: 'usage-invalid', responseEnds: 0, outputTokensAvailable: false });
  });

  it('accepts a later measured output count after a total-only partial report', () => {
    const guard = createCompanionVoiceCheckBounds({ now: () => 0 });
    guard.startResponse(); guard.recordUsage({ totalTokenCount: 100 });
    expect(guard.recordUsage({ totalTokenCount: 120, responseTokenCount: 20 })).toBe(true);
    expect(guard.endResponse()).toBe(true);
    expect(guard.snapshot()).toMatchObject({ usageTokens: 220, outputTokens: 20, outputTokensAvailable: true });
    guard.startResponse();
    expect(guard.snapshot().outputTokensAvailable).toBe(false);
  });

  it('distinguishes an explicit measured zero from an unavailable output count', () => {
    const guard = createCompanionVoiceCheckBounds({ now: () => 0 });
    guard.startResponse(); guard.recordUsage({ totalTokenCount: 100, responseTokenCount: 0 });
    expect(guard.endResponse()).toBe(true);
    expect(guard.snapshot()).toMatchObject({ outputTokens: 0, outputTokensAvailable: true });
  });

  it.each([
    null, undefined, {}, [], '100', { totalTokenCount: '100' }, { totalTokenCount: -1 },
    { totalTokenCount: 0.5 }, { totalTokenCount: NaN }, { totalTokenCount: Infinity },
    { totalTokenCount: 9007199254740992 }, { totalTokenCount: 0 },
    { promptTokenCount: 100 }, { responseTokenCount: 100 },
    { totalTokenCount: 100, responseTokenCount: undefined },
    { totalTokenCount: 100, candidatesTokenCount: 10 },
    { totalTokenCount: 100, rawProviderError: 'must not be retained' },
    { promptTokenCount: Number.MAX_SAFE_INTEGER, responseTokenCount: Number.MAX_SAFE_INTEGER },
  ])('immediately fails closed for uninterpretable or unsanitized usage %j', usage => {
    const guard = createCompanionVoiceCheckBounds({ now: () => 0 });
    guard.startResponse();
    expect(guard.recordUsage(usage)).toBe(false);
    expect(guard.snapshot()).toMatchObject({ stopReason: 'usage-invalid', usageReports: 0, usageTokens: 0, estimatedCostUsd: 0 });
    expect(JSON.stringify(guard.snapshot())).not.toContain('must not be retained');
  });

  it('halts at the first whole token reaching the USD1 session limit', () => {
    const guard = createCompanionVoiceCheckBounds({ now: () => 0 });
    expect(guard.recordUsage({ totalTokenCount: 83333 })).toBe(true);
    expect(guard.snapshot()).toMatchObject({ usageTokens: 83333, estimatedCostUsd: 0.999996 });
    expect(guard.recordUsage({ totalTokenCount: 1 })).toBe(false);
    expect(guard.snapshot()).toMatchObject({ stopReason: 'cost-limit', usageReports: 2, usageTokens: 83334, estimatedCostUsd: 1.000008 });
  });

  it('rejects reported output above 512 tokens in one response', () => {
    const guard = createCompanionVoiceCheckBounds({ now: () => 0 });
    guard.startResponse();
    expect(guard.recordUsage({ totalTokenCount: 512, responseTokenCount: 512 })).toBe(true);
    expect(guard.recordUsage({ totalTokenCount: 1, responseTokenCount: 1 })).toBe(false);
    expect(guard.snapshot()).toMatchObject({ stopReason: 'output-token-limit', outputTokens: 513, usageTokens: 513 });
  });

  it('rejects cumulative reported output above 1,024 tokens even before another response starts', () => {
    const guard = createCompanionVoiceCheckBounds({ now: () => 0 });
    guard.startResponse(); guard.recordUsage({ totalTokenCount: 512, responseTokenCount: 512 }); guard.endResponse();
    guard.startResponse(); guard.recordUsage({ totalTokenCount: 512, responseTokenCount: 512 }); guard.endResponse();
    expect(guard.recordUsage({ totalTokenCount: 1, responseTokenCount: 1 })).toBe(false);
    expect(guard.snapshot()).toMatchObject({ stopReason: 'output-token-limit', outputTokens: 1025, responseStarts: 2 });
  });

  it('uses a 45-second deadline from construction with no additional ready/mute time', () => {
    let time = 500;
    const guard = createCompanionVoiceCheckBounds({ now: () => time });
    time = 45499;
    expect(guard.checkDeadline()).toBe(true);
    expect(guard.snapshot().elapsedMs).toBe(44999);
    time = 45500;
    expect(guard.checkDeadline()).toBe(false);
    expect(guard.snapshot()).toMatchObject({ stopReason: 'deadline', elapsedMs: 45000 });
  });

  it('uses performance.now for the default monotonic clock', () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(100);
    try {
      const guard = createCompanionVoiceCheckBounds();
      now.mockReturnValue(45099);
      expect(guard.checkDeadline()).toBe(true);
      now.mockReturnValue(45100);
      expect(guard.checkDeadline()).toBe(false);
      expect(guard.snapshot()).toMatchObject({ stopReason: 'deadline', elapsedMs: 45000 });
    } finally { now.mockRestore(); }
  });

  it.each(['pcm', 'transcript', 'start', 'usage', 'end', 'snapshot'])('checks the deadline before %s work', operation => {
    let time = 0;
    const guard = createCompanionVoiceCheckBounds({ now: () => time });
    time = 45000;
    if (operation === 'pcm') expect(guard.allowPcm(100)).toBe(false);
    if (operation === 'transcript') expect(guard.allowTranscript('text')).toBe(false);
    if (operation === 'start') expect(guard.startResponse()).toBe(false);
    if (operation === 'usage') expect(guard.recordUsage({ totalTokenCount: 100 })).toBe(false);
    if (operation === 'end') expect(guard.endResponse()).toBe(false);
    expect(guard.snapshot()).toMatchObject({ stopReason: 'deadline', pcmBytes: 0, transcriptBytes: 0, responseStarts: 0, usageTokens: 0 });
  });

  it.each([NaN, Infinity, -1])('rejects an invalid initial monotonic clock %s', time => {
    const guard = createCompanionVoiceCheckBounds({ now: () => time });
    expect(guard.checkDeadline()).toBe(false);
    expect(guard.snapshot().stopReason).toBe('clock-invalid');
  });

  it('fails closed when the clock moves backward or throws', () => {
    let time = 100;
    const guard = createCompanionVoiceCheckBounds({ now: () => time });
    time = 99;
    expect(guard.checkDeadline()).toBe(false);
    expect(guard.snapshot().stopReason).toBe('clock-invalid');
    const throwing = createCompanionVoiceCheckBounds({ now: () => { throw new Error('clock unavailable'); } });
    expect(throwing.snapshot().stopReason).toBe('clock-invalid');
  });

  it.each(['ended', 'pcm-limit', 'usage-missing'])('cannot resume, reset, or increase any cap after %s', reason => {
    const guard = createCompanionVoiceCheckBounds({ now: () => 0 });
    guard.allowPcm(185920); guard.allowTranscript('Hi');
    if (reason === 'ended') guard.stop();
    if (reason === 'pcm-limit') guard.allowPcm(1440000);
    if (reason === 'usage-missing') { guard.startResponse(); guard.endResponse(); }
    const stopped = guard.snapshot();
    expect(guard.allowPcm(2)).toBe(false);
    expect(guard.allowTranscript('extra')).toBe(false);
    expect(guard.startResponse()).toBe(false);
    expect(guard.recordUsage({ totalTokenCount: 100 })).toBe(false);
    expect(guard.endResponse()).toBe(false);
    expect(guard.checkDeadline()).toBe(false);
    expect(guard.stop()).toBe(false);
    expect(guard.snapshot()).toEqual(stopped);
    expect(stopped.stopReason).toBe(reason);
    expect(guard).not.toHaveProperty('reset');
    expect(guard).not.toHaveProperty('resume');
    expect(guard).not.toHaveProperty('setMuted');
  });

  it('returns detached sanitized counters so consumers cannot change the bounds', () => {
    const guard = createCompanionVoiceCheckBounds({ now: () => 0 });
    const snapshot = guard.snapshot();
    snapshot.pcmBytes = -1440000; snapshot.stopped = false;
    expect(guard.allowPcm(1440001)).toBe(false);
    expect(guard.snapshot()).toMatchObject({ stopReason: 'pcm-limit', pcmBytes: 0 });
  });
});

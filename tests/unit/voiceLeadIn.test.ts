import { describe, it, expect } from 'vitest';
import {
  planLeadInCut,
  shiftWords,
  LEAD_IN_FLOOR_SEC,
  LEAD_IN_MIN_GAP_SEC,
  type AlignedWord,
} from '../../api/_lib/voiceLeadIn.js';

// The cut decision and the word shift are pure, so they are tested without ffmpeg.
// Expected values are worked by hand from the rule Neil set (leave 0.15s, ignore a
// gap under 0.25s), not recomputed from the implementation.

const words = (starts: number[]): AlignedWord[] =>
  starts.map((s, i) => ({ text: `w${i}`, start: s, end: s + 0.3 }));

describe('planLeadInCut', () => {
  it('cuts a real lead-in down to the floor', () => {
    // The measured scene 1 of apr_69e5adc6: speech started at 1.42s.
    expect(planLeadInCut(words([1.42]))).toBeCloseTo(1.27, 5);
  });

  it('leaves a natural breath alone', () => {
    // 0.08s is how every other scene in that run started — that is a breath,
    // not dead air, and cutting it makes the read sound clipped.
    expect(planLeadInCut(words([0.08]))).toBe(0);
  });

  it('treats the min-gap as the threshold, not the floor', () => {
    // Just under the gap: untouched. At the gap: trimmed to the floor.
    expect(planLeadInCut(words([LEAD_IN_MIN_GAP_SEC - 0.001]))).toBe(0);
    expect(planLeadInCut(words([LEAD_IN_MIN_GAP_SEC]))).toBeCloseTo(
      LEAD_IN_MIN_GAP_SEC - LEAD_IN_FLOOR_SEC,
      5
    );
  });

  it('never cuts without alignment — the issue #96 path stays byte-identical', () => {
    expect(planLeadInCut(undefined)).toBe(0);
    expect(planLeadInCut([])).toBe(0);
  });

  it('ignores a nonsense onset instead of cutting backwards', () => {
    expect(planLeadInCut(words([0]))).toBe(0);
    expect(planLeadInCut(words([-1]))).toBe(0);
    expect(planLeadInCut([{ text: 'x', start: NaN, end: 1 }])).toBe(0);
  });
});

describe('shiftWords', () => {
  it('slides every word back by the cut', () => {
    const out = shiftWords(words([1.42, 2.0]), 1.27);
    expect(out[0].start).toBeCloseTo(0.15, 5);
    expect(out[0].end).toBeCloseTo(0.45, 5);
    expect(out[1].start).toBeCloseTo(0.73, 5);
  });

  it('clamps at zero rather than emitting negative timings', () => {
    const out = shiftWords(words([0.1]), 0.5);
    expect(out[0].start).toBe(0);
    expect(out[0].end).toBe(0);
  });

  it('is a no-op when there is no cut', () => {
    const input = words([0.08]);
    expect(shiftWords(input, 0)).toBe(input);
  });

  it('round-trips with planLeadInCut so the first word lands on the floor', () => {
    const input = words([1.42]);
    const cut = planLeadInCut(input);
    expect(shiftWords(input, cut)[0].start).toBeCloseTo(LEAD_IN_FLOOR_SEC, 5);
  });
});

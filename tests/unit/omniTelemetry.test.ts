import { describe, it, expect } from 'vitest';
import {
  buildOmniOutcomeMeta,
  type OmniSceneOutcome,
} from '../../services/omniStyleService.js';

// Per-scene outcome telemetry payload (services/omniStyleService.ts,
// buildOmniOutcomeMeta). PURE — no network. Encodes the Slice-4 meta contract:
//   - fallbackReason is omitted on a styled outcome, present on a fallback.
//   - gateUnavailable is true iff gateReasons includes 'gate_unavailable'.
//   - gateReasons is omitted when absent, passed through when present.
//   - context ('initial' | 'reroll') passes through unchanged.

const styled: OmniSceneOutcome = {
  sceneIdx: 2,
  outcome: 'styled',
  styledUrl: 'https://x/clip.mp4',
  attemptsUsed: 1,
};

const fallback: OmniSceneOutcome = {
  sceneIdx: 3,
  outcome: 'fallback',
  fallbackReason: 'timeout',
  attemptsUsed: 2,
};

const base = {
  presetId: 'premium-reel-v2' as const,
  sceneType: 'talking',
  finishedAdId: 'ad-1',
  context: 'initial' as const,
};

describe('buildOmniOutcomeMeta', () => {
  it('omits fallbackReason for a styled outcome and passes core fields', () => {
    const meta = buildOmniOutcomeMeta(styled, base);
    expect(meta).toMatchObject({
      presetId: 'premium-reel-v2',
      sceneType: 'talking',
      sceneIdx: 2,
      outcome: 'styled',
      attemptsUsed: 1,
      finishedAdId: 'ad-1',
      context: 'initial',
      gateUnavailable: false,
    });
    expect('fallbackReason' in meta).toBe(false);
    expect('gateReasons' in meta).toBe(false);
  });

  it('includes fallbackReason for a fallback outcome', () => {
    const meta = buildOmniOutcomeMeta(fallback, base);
    expect(meta.outcome).toBe('fallback');
    expect(meta.fallbackReason).toBe('timeout');
    expect(meta.attemptsUsed).toBe(2);
  });

  it('sets gateUnavailable true iff gateReasons includes gate_unavailable', () => {
    const open = buildOmniOutcomeMeta(styled, { ...base, gateReasons: ['gate_unavailable'] });
    expect(open.gateUnavailable).toBe(true);
    expect(open.gateReasons).toEqual(['gate_unavailable']);

    const judged = buildOmniOutcomeMeta(fallback, { ...base, gateReasons: ['invented_captions'] });
    expect(judged.gateUnavailable).toBe(false);
    expect(judged.gateReasons).toEqual(['invented_captions']);
  });

  it('passes context through unchanged', () => {
    const meta = buildOmniOutcomeMeta(styled, { ...base, context: 'reroll' });
    expect(meta.context).toBe('reroll');
  });
});

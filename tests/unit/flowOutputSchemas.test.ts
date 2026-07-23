import { describe, it, expect } from 'vitest';

// P1 "truth at the boundaries": the permissive zod schemas that gate each server
// flow's parsed output before it ships downstream. Each schema's JOB is to reject
// UNUSABLE output (empty hooks, no scenes, missing tiers) — NOT to enforce style.
// So the contract per flow is: a valid fixture passes; a coercible fixture (extra
// unknown keys / absent optionals) still passes via passthrough; an unusable fixture
// (a load-bearing field missing/empty) fails. Fixtures mirror the real parsed shapes
// (post the _lib/prompts.ts parsers), independent of any prompt.

import {
  AdScriptOutputSchema,
  StoryboardOutputSchema,
  OfferOptimizerOutputSchema,
  InfluencerScriptOutputSchema,
  MarketResearchOutputSchema,
} from '../../api/_lib/prompts.js';

describe('AdScriptOutputSchema', () => {
  it('passes a valid parsed Script unchanged', () => {
    const valid = { hook1: ['Stop drying your face'], hook2: ['Your skin is thirsty'], body: ['a', 'b', 'c'], strategicAudit: 's' };
    expect(AdScriptOutputSchema.safeParse(valid).success).toBe(true);
  });

  it('passes a coercible fixture (extra unknown keys + resolved sub-format) via passthrough', () => {
    const coercible = {
      hook1: ['h1'], hook2: ['h2'], body: ['x'],
      strategicAudit: 's', ugcProFormatResolved: 'transformation',
      __unknownFutureKey: 42,
    };
    expect(AdScriptOutputSchema.safeParse(coercible).success).toBe(true);
  });

  it('fails an unusable fixture (empty hook1 — hook starvation survived all regens)', () => {
    const unusable = { hook1: [], hook2: ['h2'], body: ['x'] };
    expect(AdScriptOutputSchema.safeParse(unusable).success).toBe(false);
  });

  it('fails when body is empty (no beats to render)', () => {
    expect(AdScriptOutputSchema.safeParse({ hook1: ['h1'], hook2: ['h2'], body: [] }).success).toBe(false);
  });
});

describe('StoryboardOutputSchema', () => {
  it('passes a valid parsed StoryboardResponse', () => {
    const valid = {
      scenes: [
        { scriptLine: 'Line one', sceneDescription: 'desc', imagePrompt: 'p' },
        { scriptLine: '', sceneDescription: 'cinematic b-roll', startFramePrompt: 'a', endFramePrompt: 'b', transitionEffect: 'zoom' },
      ],
      strategicAudit: 's',
    };
    expect(StoryboardOutputSchema.safeParse(valid).success).toBe(true);
  });

  it('passes a coercible fixture (unknown per-scene keys survive passthrough)', () => {
    const coercible = {
      scenes: [{ scriptLine: 'x', sceneDescription: 'y', referenceImage: 'both', venueSlot: 'before', __future: true }],
    };
    expect(StoryboardOutputSchema.safeParse(coercible).success).toBe(true);
  });

  it('fails on empty scenes (nothing to render)', () => {
    expect(StoryboardOutputSchema.safeParse({ scenes: [] }).success).toBe(false);
  });

  it('fails a scene missing its required text fields', () => {
    expect(StoryboardOutputSchema.safeParse({ scenes: [{ imagePrompt: 'p' }] }).success).toBe(false);
  });
});

describe('OfferOptimizerOutputSchema', () => {
  const tier = { name: 'The Bleeding-Neck Reset', actualPrice: '₱1,997' };

  it('passes a valid three-tier result with directorPayload', () => {
    const valid = {
      analysis: 'why', tripwire: tier, coreOffer: tier, highTicket: tier,
      conversionAssets: { brandName: 'B' },
      directorPayload: { offer: 'Get the reset for ₱1,997' },
    };
    expect(OfferOptimizerOutputSchema.safeParse(valid).success).toBe(true);
  });

  it('passes a coercible fixture (nested valueStack/hormoziLogic + extra keys pass through)', () => {
    const coercible = {
      tripwire: { ...tier, valueStack: [{ item: 'x', value: '₱1' }], hormoziLogic: { dreamOutcome: 'd' } },
      coreOffer: tier, highTicket: tier,
      directorPayload: { offer: 'o', productName: 'p' },
      __future: 1,
    };
    expect(OfferOptimizerOutputSchema.safeParse(coercible).success).toBe(true);
  });

  it('fails when a tier is missing (unusable offer stack)', () => {
    const unusable = { tripwire: tier, coreOffer: tier, directorPayload: { offer: 'o' } };
    expect(OfferOptimizerOutputSchema.safeParse(unusable).success).toBe(false);
  });
});

describe('InfluencerScriptOutputSchema', () => {
  it('passes a valid influencer script', () => {
    const valid = { hook: 'Your funnel is failing because...', body: ['l1', 'l2'], strategicAudit: 's', daySummary: 'd' };
    expect(InfluencerScriptOutputSchema.safeParse(valid).success).toBe(true);
  });

  it('passes a coercible fixture (no daySummary, extra key)', () => {
    expect(InfluencerScriptOutputSchema.safeParse({ hook: 'h', body: ['l1'], __x: 1 }).success).toBe(true);
  });

  it('fails an empty hook and fails empty body', () => {
    expect(InfluencerScriptOutputSchema.safeParse({ hook: '', body: ['l1'] }).success).toBe(false);
    expect(InfluencerScriptOutputSchema.safeParse({ hook: 'h', body: [] }).success).toBe(false);
  });
});

describe('MarketResearchOutputSchema', () => {
  it('passes a report with subject + non-empty narrativeReport', () => {
    const valid = { subject: 'Coffee', winningAvatar: 'Manny', narrativeReport: '# REPORT\n...' };
    expect(MarketResearchOutputSchema.safeParse(valid).success).toBe(true);
  });

  it('passes a coercible fixture (rich structured fields pass through)', () => {
    const coercible = { subject: 'X', narrativeReport: 'body', headlines: ['a'], videoHooks: [], __future: 9 };
    expect(MarketResearchOutputSchema.safeParse(coercible).success).toBe(true);
  });

  it('fails when narrativeReport is missing (nothing to show the user)', () => {
    expect(MarketResearchOutputSchema.safeParse({ subject: 'X' }).success).toBe(false);
  });
});

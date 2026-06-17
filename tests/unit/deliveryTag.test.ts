import { describe, it, expect } from 'vitest';
import { pickDeliveryTag } from '../../components/SignalModulator/deliveryTag.js';
import { TTS_TAGS } from '../../components/SignalModulator/utils.js';

// Encodes the emotion-aware delivery intent (Move #1): a scene's narrative
// position → an eleven_v3 delivery tag drawn ONLY from the shared TTS_TAGS
// vocabulary. chainRole (cinematic-relay only) wins where present; otherwise
// energy lives at the hook/CTA bookends and the middle reads natural.

describe('pickDeliveryTag — chainRole drives cinematic-relay scenes', () => {
  it('Metaphor_A → [whispers] (cold-open intrigue)', () => {
    expect(pickDeliveryTag({ type: 'cinematic', chainRole: 'Metaphor_A', sceneIdx: 0, sceneCount: 4 }))
      .toBe('[whispers]');
  });

  it('Anchor_B → no tag (grounded authority, read straight)', () => {
    expect(pickDeliveryTag({ type: 'cinematic', chainRole: 'Anchor_B', sceneIdx: 1, sceneCount: 4 }))
      .toBe('');
  });

  it('Action_C → [excited] (momentum build)', () => {
    expect(pickDeliveryTag({ type: 'cinematic', chainRole: 'Action_C', sceneIdx: 2, sceneCount: 4 }))
      .toBe('[excited]');
  });

  it('Hero_D → [excited] (hero payoff)', () => {
    expect(pickDeliveryTag({ type: 'cinematic', chainRole: 'Hero_D', sceneIdx: 3, sceneCount: 4 }))
      .toBe('[excited]');
  });

  it('chainRole overrides position — a mid-batch Hero_D still gets [excited]', () => {
    expect(pickDeliveryTag({ type: 'cinematic', chainRole: 'Hero_D', sceneIdx: 1, sceneCount: 5 }))
      .toBe('[excited]');
  });
});

describe('pickDeliveryTag — talking/b-roll shaped by position', () => {
  it('first scene (hook) → [excited]', () => {
    expect(pickDeliveryTag({ type: 'talking', sceneIdx: 0, sceneCount: 5 })).toBe('[excited]');
  });

  it('last scene (CTA) → [excited]', () => {
    expect(pickDeliveryTag({ type: 'b-roll', sceneIdx: 4, sceneCount: 5 })).toBe('[excited]');
  });

  it('middle scenes → no tag (let them breathe)', () => {
    expect(pickDeliveryTag({ type: 'talking', sceneIdx: 1, sceneCount: 5 })).toBe('');
    expect(pickDeliveryTag({ type: 'b-roll', sceneIdx: 2, sceneCount: 5 })).toBe('');
    expect(pickDeliveryTag({ type: 'talking', sceneIdx: 3, sceneCount: 5 })).toBe('');
  });

  it('single scene is its own hook+CTA → [excited]', () => {
    expect(pickDeliveryTag({ type: 'talking', sceneIdx: 0, sceneCount: 1 })).toBe('[excited]');
  });
});

describe('pickDeliveryTag — restraint + invariants', () => {
  it('cinematic with NO chainRole stays restrained (visual-led) even at the bookends', () => {
    expect(pickDeliveryTag({ type: 'cinematic', sceneIdx: 0, sceneCount: 3 })).toBe('');
    expect(pickDeliveryTag({ type: 'cinematic', sceneIdx: 2, sceneCount: 3 })).toBe('');
  });

  it('every non-empty result is a member of the shared TTS_TAGS vocabulary', () => {
    const ctxs = [
      { type: 'cinematic' as const, chainRole: 'Metaphor_A' as const, sceneIdx: 0, sceneCount: 4 },
      { type: 'cinematic' as const, chainRole: 'Action_C' as const, sceneIdx: 2, sceneCount: 4 },
      { type: 'talking' as const, sceneIdx: 0, sceneCount: 3 },
      { type: 'b-roll' as const, sceneIdx: 2, sceneCount: 3 },
    ];
    for (const ctx of ctxs) {
      const tag = pickDeliveryTag(ctx);
      if (tag !== '') expect(TTS_TAGS).toContain(tag);
    }
  });
});

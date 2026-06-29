import { describe, it, expect } from 'vitest';
import {
  mapShotIntent,
  applyShotIntents,
  overrideVideoPromptTypes,
  reconcileSceneCount,
  type AssetAvailability,
} from '../../utils/expertScenePostProcess.js';
import {
  recommendedSceneCount,
  beatsForCount,
  formatsFor,
  getExpertFormat,
  validateBeat,
  HOOK_WORD_CAP,
  BODY_WORD_CAP,
} from '../../utils/scriptGuardrails.js';
import type { Scene, VideoPrompt } from '../../types.js';

const BOTH: AssetAvailability = { hasAvatar: true, hasProduct: true };
const AVATAR_ONLY: AssetAvailability = { hasAvatar: true, hasProduct: false };
const PRODUCT_ONLY: AssetAvailability = { hasAvatar: false, hasProduct: true };
const NEITHER: AssetAvailability = { hasAvatar: false, hasProduct: false };

const scene = (over: Partial<Scene> = {}): Scene => ({
  scriptLine: 'line',
  sceneDescription: 'a neutral scene',
  referenceImage: 'none',
  ...over,
});

describe('mapShotIntent — shot → structural fields', () => {
  it('auto / undefined never forces anything (current AI behaviour untouched)', () => {
    expect(mapShotIntent('auto', BOTH)).toEqual({ referenceImage: null, type: null });
    expect(mapShotIntent(undefined, BOTH)).toEqual({ referenceImage: null, type: null });
  });

  it('talking-avatar forces avatar + talking when an avatar exists', () => {
    expect(mapShotIntent('talking-avatar', BOTH)).toEqual({ referenceImage: 'avatar', type: 'talking' });
  });

  it('talking-avatar degrades (keeps AI choice) when no avatar is available', () => {
    expect(mapShotIntent('talking-avatar', PRODUCT_ONLY)).toEqual({ referenceImage: null, type: null });
  });

  it('product-highlight forces product + b-roll', () => {
    expect(mapShotIntent('product-highlight', BOTH)).toEqual({ referenceImage: 'product', type: 'b-roll' });
  });

  it('avatar-product forces both + talking when both assets exist', () => {
    expect(mapShotIntent('avatar-product', BOTH, 'avatar smiles at camera')).toEqual({
      referenceImage: 'both',
      type: 'talking',
    });
  });

  it('avatar-product falls back to b-roll on mouth-obstruction', () => {
    expect(mapShotIntent('avatar-product', BOTH, 'woman sipping the coffee, cup at her mouth').type).toBe('b-roll');
  });

  it('avatar-product degrades to the one asset that exists', () => {
    expect(mapShotIntent('avatar-product', AVATAR_ONLY).referenceImage).toBe('avatar');
    expect(mapShotIntent('avatar-product', PRODUCT_ONLY).referenceImage).toBe('product');
    expect(mapShotIntent('avatar-product', PRODUCT_ONLY).type).toBe('b-roll');
    expect(mapShotIntent('avatar-product', NEITHER).referenceImage).toBeNull();
  });

  it('b-roll forces only the type, never drops the AI reference', () => {
    expect(mapShotIntent('b-roll', BOTH)).toEqual({ referenceImage: null, type: 'b-roll' });
  });
});

describe('applyShotIntents — invariant: never drop a needed reference', () => {
  it('forces referenceImage per intent but leaves auto scenes untouched', () => {
    const scenes = [
      scene({ shotIntent: 'product-highlight', referenceImage: 'avatar' }),
      scene({ shotIntent: 'auto', referenceImage: 'avatar' }),
      scene({ shotIntent: 'b-roll', referenceImage: 'avatar' }),
    ];
    const out = applyShotIntents(scenes, BOTH);
    expect(out[0].referenceImage).toBe('product'); // forced
    expect(out[1].referenceImage).toBe('avatar'); // auto untouched
    expect(out[2].referenceImage).toBe('avatar'); // b-roll keeps AI ref
  });

  it('does not force avatar when no avatar asset exists (no empty reference)', () => {
    const out = applyShotIntents([scene({ shotIntent: 'talking-avatar', referenceImage: 'product' })], PRODUCT_ONLY);
    expect(out[0].referenceImage).toBe('product'); // unchanged — avatar would have no source
  });
});

describe('overrideVideoPromptTypes — hard type guarantee', () => {
  it('forces types per shotIntent by index, leaves auto prompts alone', () => {
    const scenes = [
      scene({ shotIntent: 'product-highlight' }),
      scene({ shotIntent: 'auto' }),
      scene({ shotIntent: 'talking-avatar' }),
    ];
    const prompts: VideoPrompt[] = [
      { scriptLine: 'a', type: 'talking', prompt: 'p0' },
      { scriptLine: 'b', type: 'talking', prompt: 'p1' },
      { scriptLine: 'c', type: 'b-roll', prompt: 'p2' },
    ];
    const out = overrideVideoPromptTypes(prompts, scenes, BOTH);
    expect(out[0].type).toBe('b-roll'); // forced
    expect(out[1].type).toBe('talking'); // auto untouched
    expect(out[2].type).toBe('talking'); // forced
    expect(out[0].prompt).toBe('p0'); // prompt text preserved
  });

  it('falls back to scriptLine matching when prompt count != scene count (drift-safe)', () => {
    const scenes = [
      scene({ scriptLine: 'a', shotIntent: 'auto' }),
      scene({ scriptLine: 'b', shotIntent: 'product-highlight' }),
      scene({ scriptLine: 'c', shotIntent: 'talking-avatar' }),
    ];
    // Model dropped scene 'a' → fewer prompts, reordered: index alignment would mis-tag.
    const prompts: VideoPrompt[] = [
      { scriptLine: 'b', type: 'talking', prompt: 'pb' },
      { scriptLine: 'c', type: 'b-roll', prompt: 'pc' },
    ];
    const out = overrideVideoPromptTypes(prompts, scenes, BOTH);
    expect(out[0].type).toBe('b-roll'); // matched scene 'b' (product-highlight), not index 0
    expect(out[1].type).toBe('talking'); // matched scene 'c' (talking-avatar)
  });
});

describe('reconcileSceneCount — 1:1 adapter (premortem F4)', () => {
  const lines = ['hook line', 'body line', 'cta line'];

  it('exact count: preserves visuals, forces each scriptLine in order', () => {
    const scenes = [
      scene({ scriptLine: 'AI rewrote this', referenceImage: 'avatar' }),
      scene({ scriptLine: 'and this', referenceImage: 'product' }),
      scene({ scriptLine: 'and this too', referenceImage: 'both' }),
    ];
    const out = reconcileSceneCount(scenes, lines);
    expect(out).toHaveLength(3);
    expect(out.map((s) => s.scriptLine)).toEqual(lines);
    expect(out[0].referenceImage).toBe('avatar'); // visual kept
  });

  it('AI returned MORE scenes: truncates to N, keeps order', () => {
    const scenes = [scene(), scene(), scene(), scene(), scene()];
    const out = reconcileSceneCount(scenes, lines);
    expect(out).toHaveLength(3);
    expect(out.map((s) => s.scriptLine)).toEqual(lines);
  });

  it('AI returned FEWER scenes: pads with filler for the missing lines', () => {
    const out = reconcileSceneCount([scene({ referenceImage: 'avatar' })], lines);
    expect(out).toHaveLength(3);
    expect(out.map((s) => s.scriptLine)).toEqual(lines);
    expect(out[2].scriptLine).toBe('cta line');
    // Filler must carry a prompt so it actually renders (not a silently-blank "rendered" scene).
    expect(out[2].imagePrompt).toBeTruthy();
  });
});

describe('scriptGuardrails — duration + format templates', () => {
  it('recommendedSceneCount clamps to the plan cap', () => {
    expect(recommendedSceneCount(15, 'starter')).toBe(3);
    expect(recommendedSceneCount(30, 'starter')).toBe(4); // clamped to Starter cap
    expect(recommendedSceneCount(30, 'business')).toBe(6);
    expect(recommendedSceneCount(20, 'business')).toBe(4);
    expect(recommendedSceneCount(30, 'free')).toBe(0); // Free renders no video
  });

  it('beatsForCount keeps first (hook) + last (CTA) and returns exactly N', () => {
    const mrbeast = getExpertFormat('MrBeast')!;
    const four = beatsForCount(mrbeast, 4);
    expect(four).toHaveLength(4);
    expect(four[0].label).toBe('Hook');
    expect(four[four.length - 1].label).toBe('CTA');
  });

  it('beatsForCount pads when N exceeds the template, keeping CTA last', () => {
    const services = getExpertFormat('Services')!; // 6 beats
    const eight = beatsForCount(services, 8);
    expect(eight).toHaveLength(8);
    expect(eight[7].label).toBe('Offer + CTA');
  });

  it('Custom format yields generic numbered beats', () => {
    const custom = getExpertFormat('Custom')!;
    const five = beatsForCount(custom, 5);
    expect(five).toHaveLength(5);
    expect(five[0].label).toBe('Hook');
    expect(five[4].label).toBe('CTA');
  });

  it('formatsFor gates by businessType (Custom always present)', () => {
    expect(formatsFor('product').map((f) => f.id)).toEqual(['MrBeast', 'Testimonial', 'Temu', 'Custom']);
    expect(formatsFor('service').map((f) => f.id)).toEqual(['Services', 'Custom']);
    expect(formatsFor('realestate').map((f) => f.id)).toEqual(['RealEstate', 'Custom']);
  });

  it('validateBeat flags over-cap word count and the hook sentence cap', () => {
    const hookBeat = { label: 'Hook', hint: '', wordCap: HOOK_WORD_CAP, sentenceCap: 2 };
    const longHook = 'one two three four five six seven eight nine ten eleven twelve thirteen';
    expect(validateBeat(longHook, hookBeat).overWordCap).toBe(true);
    expect(validateBeat('First sentence. Second one. Third one.', hookBeat).overSentenceCap).toBe(true);
    const body = { label: 'Body', hint: '', wordCap: BODY_WORD_CAP };
    expect(validateBeat('short body line here', body).overWordCap).toBe(false);
    expect(validateBeat('x', body).estSeconds).toBeGreaterThan(0);
  });
});

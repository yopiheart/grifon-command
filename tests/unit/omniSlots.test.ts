import { describe, it, expect } from 'vitest';
import {
  mapSceneToOmniTarget,
  deriveSlots,
  pickEmphasisWord,
} from '../../services/omniStyleService.js';
import {
  OMNI_PRESETS,
  fillPromptTemplate,
  APPROVED_OMNI_PRESET_IDS,
} from '../../api/_lib/omniPresets.js';

// Deterministic slot derivation + scene routing for the Omni pass.
// Encodes the INTENT (plan §Decision 7), not the implementation:
//   - talking/b-roll scenes route; everything else is FFmpeg-only (null).
//   - emphasis word: ALL-CAPS wins, else longest non-stopword; Taglish stopwords
//     ('hindi', 'ang', ...) are never chosen.
//   - whatever deriveSlots returns must satisfy each preset's required slots
//     (fillPromptTemplate must not throw).

describe('mapSceneToOmniTarget', () => {
  it('routes talking → talking, b-roll → b-roll', () => {
    expect(mapSceneToOmniTarget('talking')).toBe('talking');
    expect(mapSceneToOmniTarget('b-roll')).toBe('b-roll');
  });

  it('routes ambiguous/unknown scene types to null (FFmpeg-only)', () => {
    expect(mapSceneToOmniTarget('cinematic')).toBeNull();
    expect(mapSceneToOmniTarget('something-else')).toBeNull();
    expect(mapSceneToOmniTarget('')).toBeNull();
  });
});

describe('pickEmphasisWord', () => {
  it('prefers the first ALL-CAPS word of 3+ letters', () => {
    expect(pickEmphasisWord('This SALE ends today')).toBe('SALE');
    expect(pickEmphasisWord('Only ONE spot left, act NOW')).toBe('ONE');
  });

  it('falls back to the longest non-stopword, uppercased', () => {
    expect(pickEmphasisWord('the quick brown fox')).toBe('QUICK');
  });

  it('never picks a Tagalog/English stopword (Taglish sample)', () => {
    const word = pickEmphasisWord('Hindi ka pagod, thirsty lang ang skin mo ngayon.');
    expect(word).toBe('THIRSTY');
    expect(word.toLowerCase()).not.toBe('hindi');
    expect(word.toLowerCase()).not.toBe('ang');
  });
});

describe('deriveSlots — per preset', () => {
  const ctx = {
    scriptLine: 'This SALE ends today',
    allScriptLines: 'This SALE ends today. Grab it before midnight.',
  };

  it('premium-reel-v2: transcript + emphasis + default brand hex', () => {
    const s = deriveSlots('premium-reel-v2', ctx);
    expect(s.transcript).toBe(ctx.scriptLine);
    expect(s.emphasis_words).toBe('SALE');
    expect(s.brand_primary_hex).toBe('#FFCC00');
  });

  it('premium-reel-v2: honors a supplied brand hex', () => {
    const s = deriveSlots('premium-reel-v2', { ...ctx, brandPrimaryHex: '#123456' });
    expect(s.brand_primary_hex).toBe('#123456');
  });

  it('vox-explainer-v1: topic_context = all lines, title = emphasis', () => {
    const s = deriveSlots('vox-explainer-v1', ctx);
    expect(s.topic_context).toBe(ctx.allScriptLines);
    expect(s.title_text).toBe('SALE');
  });

  it('dolly-zoom-v1: subject_desc from the script line', () => {
    const s = deriveSlots('dolly-zoom-v1', ctx);
    expect(s.subject_desc).toBe(ctx.scriptLine);
  });

  it('display-text-pop-v1: display_words + anchor_moment reference the emphasis', () => {
    const s = deriveSlots('display-text-pop-v1', ctx);
    expect(s.display_words).toBe('SALE');
    expect(s.anchor_moment).toContain('SALE');
  });
});

describe('deriveSlots — Slice 3 overrides + sceneDescription', () => {
  const base = {
    scriptLine: 'This SALE ends today',
    allScriptLines: 'This SALE ends today. Grab it before midnight.',
  };

  it('dolly-zoom-v1: subject_desc prefers sceneDescription over scriptLine', () => {
    const s = deriveSlots('dolly-zoom-v1', {
      ...base,
      sceneDescription: 'a frosted glass of iced coffee on marble',
    });
    expect(s.subject_desc).toBe('a frosted glass of iced coffee on marble');
  });

  it('dolly-zoom-v1: falls back to scriptLine when sceneDescription is absent or blank', () => {
    expect(deriveSlots('dolly-zoom-v1', base).subject_desc).toBe(base.scriptLine);
    expect(deriveSlots('dolly-zoom-v1', { ...base, sceneDescription: '   ' }).subject_desc).toBe(base.scriptLine);
  });

  it('premium-reel-v2: emphasisOverride wins over the derived word', () => {
    const s = deriveSlots('premium-reel-v2', { ...base, emphasisOverride: 'MIDNIGHT' });
    expect(s.emphasis_words).toBe('MIDNIGHT');
  });

  it('vox-explainer-v1: titleOverride wins over the derived word', () => {
    const s = deriveSlots('vox-explainer-v1', { ...base, titleOverride: 'FLASH DEAL' });
    expect(s.title_text).toBe('FLASH DEAL');
  });

  it('ignores empty / whitespace-only overrides (keeps the derived word)', () => {
    expect(deriveSlots('premium-reel-v2', { ...base, emphasisOverride: '   ' }).emphasis_words).toBe('SALE');
    expect(deriveSlots('vox-explainer-v1', { ...base, titleOverride: '' }).title_text).toBe('SALE');
  });
});

describe('deriveSlots satisfies every preset (fillPromptTemplate does not throw)', () => {
  const ctx = {
    scriptLine: 'Your skin deserves better HYDRATION every single day',
    allScriptLines: 'Your skin deserves better HYDRATION every single day. Try it risk free.',
    brandPrimaryHex: '#FFCC00',
  };
  for (const id of APPROVED_OMNI_PRESET_IDS) {
    it(`${id} — all required slots present`, () => {
      const slots = deriveSlots(id, ctx);
      expect(() => fillPromptTemplate(OMNI_PRESETS[id], slots)).not.toThrow();
    });
  }
});

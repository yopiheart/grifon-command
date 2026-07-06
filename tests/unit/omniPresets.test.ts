import { describe, it, expect } from 'vitest';
import {
  OMNI_PRESETS,
  OMNI_STYLE_ROUTING,
  APPROVED_OMNI_PRESET_IDS,
  isApprovedOmniPresetId,
  fillPromptTemplate,
  OmniMissingSlotsError,
  estimateOmniCostUsd,
  OMNI_RATE_USD_PER_SEC,
  OMNI_MAX_CLIP_SECONDS,
  OMNI_MAX_CALLS_PER_AD,
  type OmniPreset,
  type OmniStyleId,
  type OmniSceneTarget,
} from '../../api/_lib/omniPresets.js';

const STYLES: OmniStyleId[] = ['premium_reel', 'vox_explainer'];
const SCENE_TYPES: OmniSceneTarget[] = ['talking', 'b-roll', 'mixed'];

describe('omniPresets — routing table', () => {
  it('covers every style × scene-type with a valid preset id or null', () => {
    for (const style of STYLES) {
      for (const scene of SCENE_TYPES) {
        const routed = OMNI_STYLE_ROUTING[style][scene];
        if (routed === null) continue;
        expect(isApprovedOmniPresetId(routed)).toBe(true);
        expect(OMNI_PRESETS[routed].id).toBe(routed);
      }
    }
  });

  it('routes the two hero styles per the plan', () => {
    expect(OMNI_STYLE_ROUTING.premium_reel.talking).toBe('premium-reel-v2');
    expect(OMNI_STYLE_ROUTING.premium_reel['b-roll']).toBe('dolly-zoom-v1');
    expect(OMNI_STYLE_ROUTING.premium_reel.mixed).toBe('display-text-pop-v1');
    expect(OMNI_STYLE_ROUTING.vox_explainer.talking).toBe('vox-explainer-v1');
    expect(OMNI_STYLE_ROUTING.vox_explainer['b-roll']).toBe('dolly-zoom-v1');
    expect(OMNI_STYLE_ROUTING.vox_explainer.mixed).toBe('display-text-pop-v1');
  });

  it('exposes exactly the four approved preset ids', () => {
    expect([...APPROVED_OMNI_PRESET_IDS].sort()).toEqual(
      ['display-text-pop-v1', 'dolly-zoom-v1', 'premium-reel-v2', 'vox-explainer-v1'].sort()
    );
    expect(isApprovedOmniPresetId('angle-switch-v1')).toBe(false);
    expect(isApprovedOmniPresetId('premium-reel-v1')).toBe(false);
  });

  it('leaves the sanitized retry variant undefined for all four (Neil-gated)', () => {
    for (const id of APPROVED_OMNI_PRESET_IDS) {
      expect(OMNI_PRESETS[id].sanitizedVariant).toBeUndefined();
    }
  });
});

describe('omniPresets — fillPromptTemplate required slots', () => {
  it('throws a typed error listing every missing required slot', () => {
    const preset = OMNI_PRESETS['premium-reel-v2'];
    try {
      fillPromptTemplate(preset, {});
      throw new Error('expected fillPromptTemplate to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(OmniMissingSlotsError);
      const missing = (err as OmniMissingSlotsError).missingSlots;
      expect(missing).toEqual(
        expect.arrayContaining(['transcript', 'emphasis_words', 'brand_primary_hex'])
      );
      expect(missing).toHaveLength(3);
    }
  });

  it('treats an empty-string required slot as missing', () => {
    const preset = OMNI_PRESETS['dolly-zoom-v1'];
    expect(() => fillPromptTemplate(preset, { subject_desc: '   ' })).toThrow(OmniMissingSlotsError);
  });
});

describe('omniPresets — conditional blocks', () => {
  const preset = OMNI_PRESETS['premium-reel-v2'];
  const base = {
    transcript: 'hello world',
    emphasis_words: 'THIRSTY',
    brand_primary_hex: '#FFCC00',
  };

  it('renders the optional block (with inner substitution) when the slot is provided', () => {
    const out = fillPromptTemplate(preset, { ...base, brand_secondary_hexes: '#FF0000' });
    expect(out).toContain('blending toward #FF0000');
  });

  it('strips the optional block cleanly when the slot is absent', () => {
    const out = fillPromptTemplate(preset, base);
    expect(out).not.toContain('blending toward');
    expect(out).not.toContain('brand_secondary_hexes');
    // the surrounding prose must stitch back together
    expect(out).toContain('as the primary accent');
    expect(out).toContain('bright white with a soft glow');
  });

  it('drops the font-ref block when no font_ref_image is supplied', () => {
    const out = fillPromptTemplate(preset, base);
    expect(out).not.toContain('Match the typography aesthetic');
    expect(out).toContain('The spoken content (for timing context only): "hello world"');
  });

  it('renders the font-ref block when font_ref_image is supplied', () => {
    const out = fillPromptTemplate(preset, { ...base, font_ref_image: 'ref.png' });
    expect(out).toContain('Match the typography aesthetic to the attached font');
  });
});

describe('omniPresets — verbatim spot-checks + no residue', () => {
  it('premium-reel-v2 keeps the pixel-lock line verbatim', () => {
    const out = fillPromptTemplate(OMNI_PRESETS['premium-reel-v2'], {
      transcript: 'x',
      emphasis_words: 'X',
      brand_primary_hex: '#FFCC00',
    });
    // The verbatim template soft-wraps this line ("Keep everything\nelse ..."),
    // so normalise whitespace before the semantic spot-check.
    expect(out.replace(/\s+/g, ' ')).toContain(
      'Keep everything else exactly as filmed, including the room and background.'
    );
  });

  it('vox-explainer-v1 keeps the VOX opener verbatim', () => {
    const out = fillPromptTemplate(OMNI_PRESETS['vox-explainer-v1'], {
      topic_context: 'skin hydration facts',
      title_text: 'THIRSTY SKIN',
    });
    expect(out).toContain('Recreate this filmed talking-head video in a VOX-inspired tactile');
    expect(out).toContain('THIRSTY SKIN');
  });

  it('leaves no unfilled {{ }} placeholder after filling every slot', () => {
    const filled = [
      fillPromptTemplate(OMNI_PRESETS['premium-reel-v2'], {
        transcript: 't',
        emphasis_words: 'E',
        brand_primary_hex: '#FFCC00',
        brand_secondary_hexes: '#FF0000',
        font_ref_image: 'ref.png',
      }),
      fillPromptTemplate(OMNI_PRESETS['vox-explainer-v1'], {
        topic_context: 'ctx',
        title_text: 'TITLE',
      }),
      fillPromptTemplate(OMNI_PRESETS['dolly-zoom-v1'], { subject_desc: 'a serum bottle' }),
      fillPromptTemplate(OMNI_PRESETS['display-text-pop-v1'], {
        display_words: 'SOBRANG SULIT',
        anchor_moment: 'as the speaker says it',
      }),
    ];
    for (const out of filled) {
      expect(out).not.toContain('{{');
      expect(out).not.toContain('}}');
    }
  });
});

describe('omniPresets — default application', () => {
  it('applies declared slot defaults when the caller omits them', () => {
    // Synthetic preset exercising the default mechanism (the four real presets
    // only default aspect_ratio, which does not appear in their templates).
    const fake: OmniPreset = {
      id: 'premium-reel-v2',
      name: 'fake',
      target: 'talking',
      maxPasses: 1,
      slots: { required: [], optional: [], defaults: { greeting: 'hello' } },
      promptTemplate: 'say {{greeting}} now',
    };
    expect(fillPromptTemplate(fake, {})).toBe('say hello now');
    // caller value overrides the default
    expect(fillPromptTemplate(fake, { greeting: 'hi' })).toBe('say hi now');
  });

  it('declares aspect_ratio 9:16 as the default on every preset', () => {
    for (const id of APPROVED_OMNI_PRESET_IDS) {
      expect(OMNI_PRESETS[id].slots.defaults.aspect_ratio).toBe('9:16');
    }
  });
});

describe('omniPresets — budget math', () => {
  it('estimateOmniCostUsd(6) is 0.60', () => {
    expect(estimateOmniCostUsd(6)).toBeCloseTo(0.6, 10);
  });

  it('rounds the estimate up to the cent', () => {
    // 3.75s * $0.10 = $0.375 → ceil to $0.38
    expect(estimateOmniCostUsd(3.75)).toBeCloseTo(0.38, 10);
  });

  it('exports the budget constants', () => {
    expect(OMNI_RATE_USD_PER_SEC).toBe(0.1);
    expect(OMNI_MAX_CLIP_SECONDS).toBe(8);
    expect(OMNI_MAX_CALLS_PER_AD).toBe(12);
  });
});

import { describe, it, expect } from 'vitest';
import { deriveScriptType, deriveBusinessType } from '../../components/OneShotAd/launchDerivation.js';
import {
  RECIPES, RECIPES_BY_ID, visibleRecipes, ALLOWED_FORMATS, SUBFORMATS_BY_VERTICAL,
  type Recipe, type RecipeId,
} from '../../components/OneShotAd/recipes.js';

// Recipes are a PRESENTATION layer over the existing One-Shot axes — nothing more. The whole
// safety argument for the refactor lives here: the ProductionInput a recipe emits must be
// byte-identical to what the equivalent manual axis selection emitted before the flattening.

/** Replicates LaunchScreen.launch()'s field construction from a recipe's DERIVED axes. If this
 * drifts from launch(), the parity guarantee is broken — that is exactly what we're guarding. */
const emit = (vertical: string, r: Recipe) => {
  const format = r.format;
  const strategy = r.strategy ?? 'Testimonial';
  const ugcProChoice = r.ugcProFormat ?? 'auto';
  const asmr = r.asmr ?? false;
  const audioMode = r.audioMode;
  return {
    scriptType: deriveScriptType(vertical, format, strategy),
    businessType: deriveBusinessType(vertical),
    ugcProFormat: format === 'ugc_pro' && ugcProChoice !== 'auto' ? ugcProChoice : undefined,
    asmrFlag: format === 'ugc_pro' && ugcProChoice === 'unboxing' && asmr ? true : undefined,
    audioMode: audioMode === 'sfx_only' ? ('sfx_only' as const) : undefined,
  };
};

describe('recipe → axis parity (the load-bearing invariant)', () => {
  // The reference table is hand-written from the OLD manual axis flow, NOT read back from the
  // registry — so it catches a registry edit that silently changes the emitted ProductionInput.
  const EXPECTED_PRODUCT: Record<RecipeId, ReturnType<typeof emit>> = {
    real_talk:     { scriptType: 'Testimonial', businessType: 'product', ugcProFormat: undefined, asmrFlag: undefined, audioMode: undefined },
    hype_drop:     { scriptType: 'MrBeast',     businessType: 'product', ugcProFormat: undefined, asmrFlag: undefined, audioMode: undefined },
    rapid_fire:    { scriptType: 'Temu',        businessType: 'product', ugcProFormat: undefined, asmrFlag: undefined, audioMode: undefined },
    pure_hype:     { scriptType: 'Temu',        businessType: 'product', ugcProFormat: undefined, asmrFlag: undefined, audioMode: 'sfx_only' },
    try_on:        { scriptType: 'UGCPro',      businessType: 'product', ugcProFormat: 'tryon', asmrFlag: undefined, audioMode: undefined },
    before_after:  { scriptType: 'UGCPro',      businessType: 'product', ugcProFormat: 'transformation', asmrFlag: undefined, audioMode: undefined },
    unboxing:      { scriptType: 'UGCPro',      businessType: 'product', ugcProFormat: 'unboxing', asmrFlag: undefined, audioMode: undefined },
    unboxing_asmr: { scriptType: 'UGCPro',      businessType: 'product', ugcProFormat: 'unboxing', asmrFlag: true, audioMode: undefined },
    demo:          { scriptType: 'UGCPro',      businessType: 'product', ugcProFormat: 'demo', asmrFlag: undefined, audioMode: undefined },
    tutorial:      { scriptType: 'UGCPro',      businessType: 'product', ugcProFormat: 'tutorial', asmrFlag: undefined, audioMode: undefined },
    auto:          { scriptType: 'UGCPro',      businessType: 'product', ugcProFormat: undefined, asmrFlag: undefined, audioMode: undefined },
    commercial:    { scriptType: 'Testimonial', businessType: 'product', ugcProFormat: undefined, asmrFlag: undefined, audioMode: undefined },
  };

  it('every product recipe emits the same axes the manual selection produced', () => {
    for (const r of RECIPES) {
      expect(emit('product', r)).toEqual(EXPECTED_PRODUCT[r.id]);
    }
  });

  it('Before & After carries scriptType UGCPro + ugcProFormat transformation (the smoke case)', () => {
    expect(emit('product', RECIPES_BY_ID.before_after)).toMatchObject({ scriptType: 'UGCPro', ugcProFormat: 'transformation' });
  });

  it('Unboxing ASMR sets asmrFlag; plain Unboxing does not', () => {
    expect(emit('product', RECIPES_BY_ID.unboxing_asmr).asmrFlag).toBe(true);
    expect(emit('product', RECIPES_BY_ID.unboxing).asmrFlag).toBeUndefined();
  });

  it('cross-vertical UGC Pro: service/real_estate tutorial still derives UGCPro + the vertical businessType', () => {
    expect(emit('service', RECIPES_BY_ID.tutorial)).toMatchObject({ scriptType: 'UGCPro', businessType: 'service' });
    expect(emit('real_estate', RECIPES_BY_ID.tutorial)).toMatchObject({ scriptType: 'UGCPro', businessType: 'realestate' });
  });

  it('service/real_estate defaults (real_talk) keep their vertical scriptType', () => {
    expect(emit('service', RECIPES_BY_ID.real_talk).scriptType).toBe('Services');
    expect(emit('real_estate', RECIPES_BY_ID.real_talk).scriptType).toBe('RealEstate');
  });
});

describe('visibleRecipes — derived from the authoritative Slice-4 clamps', () => {
  it("real_estate exposes real_talk / hype_drop / tutorial, and tutorial reads 'Walkthrough'", () => {
    const vis = visibleRecipes('real_estate');
    expect(vis.map((r) => r.id)).toEqual(['real_talk', 'hype_drop', 'tutorial']);
    expect(vis.find((r) => r.id === 'tutorial')?.label).toBe('Walkthrough');
  });

  it('app exposes no recipes (the locked/"Auto" presentation stays)', () => {
    expect(visibleRecipes('app')).toEqual([]);
  });

  it('producer-only Pure Hype is hidden on the legacy path, shown on the producer engine', () => {
    expect(visibleRecipes('product').map((r) => r.id)).not.toContain('pure_hype');
    expect(visibleRecipes('product', { producerEngine: true }).map((r) => r.id)).toContain('pure_hype');
  });

  it('no non-product vertical ever exposes Pure Hype (even on the producer engine)', () => {
    for (const v of ['service', 'real_estate', 'app']) {
      expect(visibleRecipes(v, { producerEngine: true }).map((r) => r.id)).not.toContain('pure_hype');
    }
  });
});

describe('registry invariants', () => {
  it('no orphan recipe — every recipe is legal for at least one vertical', () => {
    const verticals = Object.keys(ALLOWED_FORMATS);
    for (const r of RECIPES) {
      const ok = verticals.some((v) =>
        (ALLOWED_FORMATS[v] ?? []).includes(r.format) &&
        (r.format !== 'ugc_pro' || (SUBFORMATS_BY_VERTICAL[v] ?? []).includes(r.ugcProFormat!)));
      expect(ok, `recipe ${r.id} is an orphan`).toBe(true);
    }
  });

  it('asmr === true only on a recipe whose ugcProFormat === unboxing', () => {
    for (const r of RECIPES) {
      if (r.asmr === true) expect(r.ugcProFormat).toBe('unboxing');
    }
  });

  it('every no-TTS recipe (audioMode sfx_only) is producer-engine-only', () => {
    for (const r of RECIPES) {
      if (r.audioMode === 'sfx_only') expect(r.producerOnly).toBe(true);
    }
  });

  it('ASMR and sfx_only never co-occur (audio identities are mutually exclusive)', () => {
    for (const r of RECIPES) {
      if (r.asmr === true) expect(r.audioMode).toBeUndefined();
    }
  });
});

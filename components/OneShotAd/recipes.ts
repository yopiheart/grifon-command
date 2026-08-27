// Recipe layer — a PRESENTATION grouping over the existing One-Shot creative axes
// (Format × Strategy × UGC-Pro sub-format × ASMR). A Recipe is nothing more than a named
// preset over those axes: the ProductionInput emitted for a recipe is byte-identical to what
// the equivalent manual axis selection emits today (enforced by tests/unit/recipes.test.ts).
// No new domain concept leaks into service/prompt code — see the Constraints in the plan.
//
// ALLOWED_FORMATS / SUBFORMATS_BY_VERTICAL were relocated here (verbatim, no value changes)
// from LaunchScreen.tsx so visibility is importable + unit-testable; LaunchScreen imports the
// former back. No React here so this stays cheap to import in tests.

import type { OneShotFormat, OneShotStrategy } from './launchDerivation';

/** UGC Pro sub-format pick. 'auto' → the server classifies the sub-format from the brief.
 * Mirrors the axis type LaunchScreen holds locally; relocated here so ALLOWED_FORMATS /
 * SUBFORMATS_BY_VERTICAL can live next to it. */
export type UgcProChoice = 'auto' | 'tryon' | 'unboxing' | 'demo' | 'transformation' | 'tutorial';

export type RecipeId =
  | 'real_talk' | 'hype_drop' | 'rapid_fire' | 'pure_hype' | 'try_on' | 'before_after'
  | 'unboxing' | 'unboxing_asmr' | 'demo' | 'tutorial' | 'auto' | 'commercial';

export interface Recipe {
  id: RecipeId;
  label: string;
  desc: string;                                  // one line, outcome-framed
  format: OneShotFormat;                          // existing axis
  strategy?: OneShotStrategy;                     // existing axis (ugc only)
  ugcProFormat?: UgcProChoice;                    // existing axis (ugc_pro only)
  asmr?: boolean;                                 // existing flag (unboxing only)
  /** No-TTS audio identity — music + SFX + burned overlay text carry the message (no voiceover). */
  audioMode?: 'sfx_only';
  /** Producer-engine-only recipe — the legacy one-shot path can't express no-TTS, so it's hidden there. */
  producerOnly?: boolean;
  locked?: boolean;                               // Business tier (commercial)
  /** Per-vertical copy override — same axes, different words. RE tutorial = "Walkthrough". */
  labelByVertical?: Partial<Record<string, { label: string; desc: string }>>;
}

/** A silent 9:16 sample loop + poster for a recipe card. Populated by Slice B (the paid
 * render batch); a recipe absent from SAMPLES keeps the "Sample soon" placeholder.
 *
 * `video` is OPTIONAL so a card can ship as a STILL while its loop is pending. Every producer
 * run already yields 8 stills, and a real still beats "Sample soon" — the grid is allowed to
 * mix static and moving tiles rather than waiting for all 12 loops to exist. */
export interface RecipeSample { video?: string; poster: string; }

// Axes taken verbatim from the old LaunchScreen FORMATS / STRATEGIES / UGC_PRO_SUBFORMATS.
export const RECIPES: Recipe[] = [
  { id: 'real_talk', label: 'Real Talk Review', desc: 'Honest first-person review, straight to camera', format: 'ugc', strategy: 'Testimonial' },
  { id: 'hype_drop', label: 'Hype Drop', desc: 'High-energy, big-promise hook', format: 'ugc', strategy: 'MrBeast' },
  { id: 'rapid_fire', label: 'Rapid Fire', desc: 'Fast, punchy product hype', format: 'product_ugc' },
  { id: 'pure_hype', label: 'Pure Hype', desc: 'No voiceover — beat drops, SFX, and bold deal text do the selling', format: 'product_ugc', audioMode: 'sfx_only', producerOnly: true },
  { id: 'try_on', label: 'Try-On Reveal', desc: 'Wear it, turn, sell it', format: 'ugc_pro', ugcProFormat: 'tryon' },
  { id: 'before_after', label: 'Before & After', desc: 'Show the transformation', format: 'ugc_pro', ugcProFormat: 'transformation' },
  { id: 'unboxing', label: 'Unboxing', desc: 'Packaging and tactile reveal', format: 'ugc_pro', ugcProFormat: 'unboxing', asmr: false },
  { id: 'unboxing_asmr', label: 'Unboxing ASMR', desc: 'Whisper-quiet. The taps are the audio', format: 'ugc_pro', ugcProFormat: 'unboxing', asmr: true },
  { id: 'demo', label: 'Watch It Work', desc: 'Show it working — payoff stunt', format: 'ugc_pro', ugcProFormat: 'demo' },
  {
    id: 'tutorial', label: 'Steps 1-2-3', desc: 'Teach it, then sell it', format: 'ugc_pro', ugcProFormat: 'tutorial',
    labelByVertical: {
      real_estate: { label: 'Walkthrough', desc: 'Room-by-room tour' },
      service: { label: 'How It Works', desc: 'Walk them through the service' },
    },
  },
  { id: 'auto', label: 'Let AI Pick', desc: 'Not sure? We choose from your brief', format: 'ugc_pro', ugcProFormat: 'auto' },
  { id: 'commercial', label: 'Commercial', desc: 'Cinematic spec ad · English only', format: 'commercial', locked: true },
];

/** id → Recipe lookup, so LaunchScreen can derive the four axes from the selected recipe. */
export const RECIPES_BY_ID: Record<RecipeId, Recipe> =
  Object.fromEntries(RECIPES.map((r) => [r.id, r])) as Record<RecipeId, Recipe>;

// Which Format options each vertical exposes. product → all four; service / real_estate →
// UGC + UGC Pro only ('ugc' stays first so it remains today's default → no existing flow
// changes); app stays fully locked (no format picker). A ≤1-entry list renders the old
// locked "Auto" presentation; ≥2 gets a real, enabled picker.
export const ALLOWED_FORMATS: Record<string, OneShotFormat[]> = {
  product: ['ugc', 'product_ugc', 'ugc_pro', 'commercial'],
  service: ['ugc', 'ugc_pro'],
  real_estate: ['ugc', 'ugc_pro'],
  app: [],
};

// Which UGC Pro sub-formats each vertical exposes. product keeps all 5 + Auto; service is
// Before & After (transformation) + Tutorial + Auto; real_estate is Tutorial ONLY (forced,
// no Auto). Try-On / Unboxing / Demo stay product-only.
export const SUBFORMATS_BY_VERTICAL: Record<string, UgcProChoice[]> = {
  product: ['auto', 'tryon', 'transformation', 'unboxing', 'demo', 'tutorial'],
  service: ['auto', 'transformation', 'tutorial'],
  real_estate: ['tutorial'],
};

/** The recipes a vertical exposes, derived from the authoritative Slice-4 clamps (never
 * duplicated). A ugc_pro recipe survives only if its sub-format is legal for the vertical, so
 * real_estate yields real_talk / hype_drop / tutorial(→"Walkthrough") for free, and app → [].
 * `producerOnly` recipes (no-TTS) are hidden unless `opts.producerEngine` is true — the legacy
 * one-shot path can't express them. Per-vertical copy overrides are applied here so the returned
 * cards read the right words. */
export const visibleRecipes = (vertical: string, opts?: { producerEngine?: boolean }): Recipe[] =>
  RECIPES
    .filter((r) =>
      (!r.producerOnly || opts?.producerEngine === true) &&
      (ALLOWED_FORMATS[vertical] ?? []).includes(r.format) &&
      (r.format !== 'ugc_pro' || (SUBFORMATS_BY_VERTICAL[vertical] ?? []).includes(r.ugcProFormat!)))
    .map((r) => {
      const o = r.labelByVertical?.[vertical];
      return o ? { ...r, label: o.label, desc: o.desc } : r;
    });

/** Which recipe ids have sample media. Filled in one card at a time as the render batch lands;
 * a recipe still absent renders the "Sample soon" placeholder, which is expected.
 *
 * `commercial` is Business-tier locked and needs no sample. Clips are cut from real finished
 * runs with ffmpeg (silent, 540x960, ~8s, no audio track at all) and live in public/samples/. */
export const SAMPLES: Partial<Record<RecipeId, RecipeSample>> = {
  // Run apr_34d06c7f (Hiraya Glow). Cut from 13.97s-22.03s of the finished ad: the presenter
  // holding the bottle, then the payoff line. Deliberately NOT the hook — that run's morph grew
  // the problem patch into a raised object, the failure api/_lib/prompts.ts now bans by name.
  real_talk: { video: '/samples/real_talk.mp4', poster: '/samples/real_talk.jpg' },
  // Cut from tests/fixtures/sample-batch/before_after-run1-complete-raw.mp4, already committed —
  // no new render. 3.9s-12.0s: applying the serum at the mirror, then the result. Scene 1 is
  // skipped on purpose: its morph resolved into a HALLUCINATED bottle (rose-gold, glitter, the
  // garbled label "RYA CWYA"), a PRODUCT_TRUTH_RULE break in the same family as the hook morph.
  // This cut carries no burned captions — the source is a RAW render, before the caption pass.
  before_after: { video: '/samples/before_after.mp4', poster: '/samples/before_after.jpg' },
};

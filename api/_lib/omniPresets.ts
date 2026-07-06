// ============================================================================
// TUNED FILE — this file is born TUNED (verbatim from the preset registry).
// ----------------------------------------------------------------------------
// The `promptTemplate` blocks below are copied BYTE-FOR-BYTE (including line
// breaks) from the `prompt_template:` YAML in workflows/omni_edit_presets.md
// for the four `neil_approved` presets. Do NOT reflow, reword, or "improve"
// the prompt wording, the routing table, or the slot specs — changes are
// gated exactly like services/geminiService.ts and api/_lib/prompts.ts and
// require Neil's explicit approval (see .claude/skills/surgical-edit/ and the
// TUNED-file guardrail in CLAUDE.md). Transport/types/structure are fair game;
// the prompt CONTENT is not.
//
// Provenance (registry rows, all neil_approved 2026-07-06):
//   premium-reel-v2    — Premium Reel (pixel-locked), talking, max_passes 1
//   vox-explainer-v1   — VOX Editorial Explainer, talking, max_passes 1
//   dolly-zoom-v1      — Dolly Zoom, b-roll, max_passes 3
//   display-text-pop-v1 — Directed Display Text Pop, mixed, max_passes 1
// ============================================================================

export type OmniPresetId =
  | 'premium-reel-v2'
  | 'vox-explainer-v1'
  | 'dolly-zoom-v1'
  | 'display-text-pop-v1';

export type OmniSceneTarget = 'talking' | 'b-roll' | 'mixed';

/**
 * Slot spec for a preset. `required` slots must be supplied by the caller;
 * `optional` slots drive `{{#name}}...{{/name}}` conditional blocks; `defaults`
 * are applied when the caller omits the slot (mirrors the registry
 * `default X` syntax, e.g. aspect_ratio → '9:16').
 */
export interface OmniSlotSpec {
  required: string[];
  optional: string[];
  defaults: Record<string, string>;
}

export interface OmniPreset {
  id: OmniPresetId;
  name: string;
  target: OmniSceneTarget;
  maxPasses: number;
  slots: OmniSlotSpec;
  /** Verbatim prompt template from the registry — do not edit (TUNED). */
  promptTemplate: string;
  /**
   * Sanitized retry-ladder variant. Left `undefined` for all four presets:
   * authoring a sanitized variant is Neil-gated (it is TUNED content). Until a
   * variant exists, the retry ladder re-uses the base `promptTemplate`.
   */
  sanitizedVariant?: string;
}

// --- Verbatim prompt templates (registry `prompt_template:` blocks) ---------

// premium-reel-v2 (workflows/omni_edit_presets.md)
const PREMIUM_REEL_V2_TEMPLATE = `Edit this talking-head video with cinematic motion graphics and premium
typography, added as layers over the original footage. Keep everything
else exactly as filmed, including the room and background.

Text rendering: render only these exact words, spelled exactly as written:
{{emphasis_words}}. When the speaker says them, show the words in bold
editorial typography — oversized, layered foreground and background type
with depth and a premium 3D look, kinetic and motion-tracked, with scale
animation, soft shadows, and subtle motion. Do not render any other text
anywhere in the frame. Do not add subtitles or captions.

Color: build the type and graphics palette around the footage's existing
colors, with {{brand_primary_hex}} as the primary accent
{{#brand_secondary_hexes}}blending toward {{brand_secondary_hexes}}
{{/brand_secondary_hexes}}; bright white with a soft glow for supporting
elements, naturally integrated into the scene.

Camera: add dynamic punch-ins and reframes synced to sentence emphasis —
every zoom is a smooth fast zoom with visible easing, natural smartphone
zoom feel; the viewer should FEEL the camera travel in and out; no instant
jump-cut reframes.

Graphics: add small motion graphics, icons, and callouts that illustrate
what is being said, layered over the original footage, timed to the
speech. A visual change every couple of seconds.

The spoken content (for timing context only): "{{transcript}}"
{{#font_ref_image}}Match the typography aesthetic to the attached font
style reference.{{/font_ref_image}}
`;

// vox-explainer-v1 (workflows/omni_edit_presets.md)
const VOX_EXPLAINER_V1_TEMPLATE = `Recreate this filmed talking-head video in a VOX-inspired tactile
documentary motion-graphics style. Do not add subtitles or word-for-word
captions. Use only occasional short title cards, labels, visual callouts,
maps, article clippings, search pages, diagrams, screenshots,
archival-style inserts, and data visuals when they help explain the topic.
Keep the talking face as it is, dont alter it.

Use this source material for all visuals, so every graphic, map, headline,
chart, article clipping, icon, and insert makes sense for the topic:
{{topic_context}}

In the first second, reframe the shot so the speaker moves lower in the
frame, leaving clear space above. In that upper space, introduce the main
title — spelled exactly as written: "{{title_text}}" — with a clean
VOX-style motion graphic. Make it feel like the frame opens up into an
explainer layout.

Visual style: tactile editorial documentary, warm off-white paper
backgrounds, subtle grid lines, roughened edges, halftone newspaper
texture, slight grain, light leaks, chromatic aberration, soft vignette,
analog imperfections, paper cutout collage, maps, screenshots, archival
inserts, and smooth camera moves across layered source material.

Motion style: frequent hard cuts, quick inserts, paper/card slide-ins,
masked reveals, zooms into screenshots, map moves, article highlights,
arrows and callouts, parallax between layers, and occasional choppy
posterized animation like hand-made motion graphics. Every 1.5 to 2
seconds, introduce a visual change: cut, zoom, insert, overlay, camera
move, texture shift, map, article, diagram, or archival-style visual. Do
not let the talking-head shot stay unchanged for too long.

Keep the video polished, journalistic, intelligent, and editorial. Make
screens feel like screens, paper feel like paper, and all graphics feel
slightly analog rather than perfectly digital.
`;

// dolly-zoom-v1 (workflows/omni_edit_presets.md)
const DOLLY_ZOOM_V1_TEMPLATE = `Apply a dolly zoom to this product b-roll clip: a strong continuous push
toward {{subject_desc}} while the background perspective stretches — the
classic vertigo effect. Smooth, natural camera physics with visible
easing. Keep the product and all of its label text exactly as filmed; do
not render any new text anywhere in the frame.
`;

// display-text-pop-v1 (workflows/omni_edit_presets.md)
const DISPLAY_TEXT_POP_V1_TEMPLATE = `Add a display text moment to this clip: render the words
"{{display_words}}" — spell it exactly as written — in clean bold
sans-serif with a drop shadow, popping in {{anchor_moment}} with a snappy
scale-in animation. The text must read clearly against the footage. Keep
everything else exactly as filmed. Do not render any other text anywhere
in the frame.
`;

// --- Preset definitions -----------------------------------------------------

export const OMNI_PRESETS: Record<OmniPresetId, OmniPreset> = {
  'premium-reel-v2': {
    id: 'premium-reel-v2',
    name: 'Premium Reel (pixel-locked)',
    target: 'talking',
    maxPasses: 1,
    slots: {
      required: ['transcript', 'emphasis_words', 'brand_primary_hex'],
      optional: ['brand_secondary_hexes', 'font_ref_image'],
      defaults: { aspect_ratio: '9:16' },
    },
    promptTemplate: PREMIUM_REEL_V2_TEMPLATE,
    sanitizedVariant: undefined,
  },
  'vox-explainer-v1': {
    id: 'vox-explainer-v1',
    name: 'VOX Editorial Explainer',
    target: 'talking',
    maxPasses: 1,
    slots: {
      required: ['topic_context', 'title_text'],
      optional: [],
      defaults: { aspect_ratio: '9:16' },
    },
    promptTemplate: VOX_EXPLAINER_V1_TEMPLATE,
    sanitizedVariant: undefined,
  },
  'dolly-zoom-v1': {
    id: 'dolly-zoom-v1',
    name: 'Dolly Zoom',
    target: 'b-roll',
    maxPasses: 3,
    slots: {
      required: ['subject_desc'],
      optional: [],
      defaults: { aspect_ratio: '9:16' },
    },
    promptTemplate: DOLLY_ZOOM_V1_TEMPLATE,
    sanitizedVariant: undefined,
  },
  'display-text-pop-v1': {
    id: 'display-text-pop-v1',
    name: 'Directed Display Text Pop',
    target: 'mixed',
    maxPasses: 1,
    slots: {
      required: ['display_words', 'anchor_moment'],
      optional: [],
      defaults: { aspect_ratio: '9:16' },
    },
    promptTemplate: DISPLAY_TEXT_POP_V1_TEMPLATE,
    sanitizedVariant: undefined,
  },
};

/** The four approved preset ids. Anything else is rejected by the proxy. */
export const APPROVED_OMNI_PRESET_IDS = Object.keys(OMNI_PRESETS) as OmniPresetId[];

export const isApprovedOmniPresetId = (id: string): id is OmniPresetId =>
  Object.prototype.hasOwnProperty.call(OMNI_PRESETS, id);

// --- Style → preset routing -------------------------------------------------

/** The two hero Edit Styles surfaced in the picker (Slice 3). */
export type OmniStyleId = 'premium_reel' | 'vox_explainer';

/**
 * Deterministic style × scene-type → preset routing. `dolly-zoom-v1` runs on
 * b-roll scenes inside both bundles; `display-text-pop-v1` is the internal
 * move where a display word fits (mixed scenes). A `null` cell means "no Omni
 * move — fall back to the FFmpeg-only render for that scene".
 */
export const OMNI_STYLE_ROUTING: Record<
  OmniStyleId,
  Record<OmniSceneTarget, OmniPresetId | null>
> = {
  premium_reel: {
    talking: 'premium-reel-v2',
    'b-roll': 'dolly-zoom-v1',
    mixed: 'display-text-pop-v1',
  },
  vox_explainer: {
    talking: 'vox-explainer-v1',
    'b-roll': 'dolly-zoom-v1',
    mixed: 'display-text-pop-v1',
  },
};

// --- Template filling -------------------------------------------------------

/**
 * Thrown by {@link fillPromptTemplate} when one or more required slots are
 * missing. `missingSlots` lists them so the caller can surface a precise error.
 */
export class OmniMissingSlotsError extends Error {
  readonly presetId: string;
  readonly missingSlots: string[];
  constructor(presetId: string, missingSlots: string[]) {
    super(
      `omni preset '${presetId}' is missing required slot(s): ${missingSlots.join(', ')}`
    );
    this.name = 'OmniMissingSlotsError';
    this.presetId = presetId;
    this.missingSlots = missingSlots;
  }
}

const SECTION_RE = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
const BARE_RE = /\{\{(\w+)\}\}/g;

/**
 * Fill a preset's `promptTemplate` with the provided slot values.
 *
 * Behaviour mirrors the PoC `tools/omni_edit.py` `_render_template`:
 *   1. Apply declared slot defaults for any slot the caller omitted.
 *   2. Throw {@link OmniMissingSlotsError} if any required slot is still absent
 *      (or empty).
 *   3. Render `{{#name}}...{{/name}}` conditional blocks: keep the inner text
 *      (with its own `{{name}}` substituted) when the slot is truthy, otherwise
 *      drop the block entirely.
 *   4. Substitute bare `{{name}}` placeholders (missing → empty string).
 *
 * Pure string substitution — no external template library.
 */
export function fillPromptTemplate(
  preset: OmniPreset,
  slots: Record<string, string>
): string {
  // 1. Defaults first, caller-supplied values win.
  const values: Record<string, string> = { ...preset.slots.defaults };
  for (const [key, value] of Object.entries(slots)) {
    if (value !== undefined && value !== null) values[key] = value;
  }

  // 2. Required-slot check (empty string counts as missing).
  const missing = preset.slots.required.filter(
    (name) => !values[name] || values[name].trim() === ''
  );
  if (missing.length > 0) {
    throw new OmniMissingSlotsError(preset.id, missing);
  }

  // 3. Conditional blocks — keep inner iff the slot is truthy (bare substitution
  //    in step 4 then fills any {{name}} inside the retained inner text).
  let out = preset.promptTemplate.replace(
    SECTION_RE,
    (_match, name: string, inner: string) => (values[name] ? inner : '')
  );

  // 4. Bare placeholders.
  out = out.replace(BARE_RE, (_match, name: string) => values[name] ?? '');

  return out;
}

// --- Budget / cost ----------------------------------------------------------

/** Gemini Omni Flash edit rate (matches tools/omni_edit.py RATE_USD_PER_SEC). */
export const OMNI_RATE_USD_PER_SEC = 0.1;

/** Per-clip second cap — a single scene clip may not exceed this. */
export const OMNI_MAX_CLIP_SECONDS = 8;

/** Per-finished-ad hard call budget: 6 scenes × (initial + one retry). */
export const OMNI_MAX_CALLS_PER_AD = 12;

/**
 * Estimated USD cost for `seconds` of Omni output, rounded UP to the cent
 * (mirrors the PoC `cost_for`: ceil(seconds * rate * 100) / 100).
 */
export function estimateOmniCostUsd(seconds: number): number {
  // Round the cents to micro-precision before ceiling so binary-float noise
  // (e.g. 6 * 0.1 * 100 = 60.00000000000001) doesn't push the estimate a whole
  // cent high.
  const cents = Math.round(seconds * OMNI_RATE_USD_PER_SEC * 100 * 1e6) / 1e6;
  return Math.ceil(cents) / 100;
}

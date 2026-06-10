import type { OverlayStyle, SfxBankId, CameraEffect } from '../../types.js';

// Edit-style presets for the final-render burn-in engine (Viral Editor 2.0).
// One preset = one complete "editor personality": caption typography + animation,
// hook reveal, cut transitions, camera energy, SFX palette. CLASSIC is byte-for-
// byte today's look (renderFfmpeg derives its style constants from it), so an
// explicit preset id of 'classic' is always a safe kill switch.
//
// Rotation: presets are picked deterministically from the scene videoUrls hash
// (NOT the jobId, which is generated after the request) — the same ad re-renders
// identically while successive ads rotate looks. Pools are keyed by script style
// so a Testimonial never gets the hype treatment (sincerity guard).

export type PresetId = 'classic' | 'impact' | 'hype' | 'clean';
export type ScriptStyle = 'mrbeast' | 'temu' | 'testimonial';
export type ChunkAnim = 'none' | 'pop' | 'word-pop' | 'karaoke';
export type HookRevealStyle = 'bounce' | 'slam' | 'flip';
export type HookLayoutStyle = 'wipe' | 'title-stack';
export type TransitionKind = 'none' | 'flash' | 'dip' | 'whip' | 'burn';

export interface CaptionStyle {
  /** Font file relative to api/_lib/assets/ (copied bare-named into the temp dir). */
  fontFile: string;
  /** Estimated glyph advance / fontsize for width fitting (per font, tuned visually). */
  advRatio: number;
  fillColor: string;
  /** Karaoke sweep / keyword emphasis color. */
  highlightColor: string;
  /** >0 → solid black box behind text (today's look). Mutually exclusive with borderWFrac. */
  boxAlpha: number;
  /** >0 → text outline (borderw = fontsize * frac) instead of a box — the CapCut look. */
  borderWFrac: number;
  shadow: { dx: number; dy: number; color: string } | null;
  chunkAnim: ChunkAnim;
  /** Caption chunk fontsize as a fraction of video height. */
  baseSizeFrac: number;
  /** EDL overlay (callout/punchline) fontsize fraction. */
  overlaySizeFrac: number;
  yFracTalking: number;
  yFracBroll: number;
}

export interface HookStyle {
  /** 'wipe' = classic single-block reveal behind a wipe box. 'title-stack' =
   * reference-grade word-by-word elastic pop title (no box), gold/white
   * two-tone — see edit_style_research.md websites5 hook + Neil 2026-06-10. */
  layout: HookLayoutStyle;
  reveal: HookRevealStyle;
  /** Hook title font (copied separately as hook.ttf; captions keep their own). */
  fontFile: string;
  /** Glyph advance ratio for the hook font (width estimation). */
  advRatio: number;
  textColor: string;
  /** Power-word color in the title stack (gold vs the white base — reference grammar). */
  highlightColor: string;
  wipeBox: boolean;
  wipeColor: string;
  /** Hook title fontsize as a fraction of video height. */
  sizeFrac: number;
  /** Seconds between sequential word pops (title-stack). */
  wordCadenceSec: number;
  /** Light-leak / film-burn transition at the hook→scene-2 cut. */
  burnTransition: boolean;
}

export interface TransitionStyle {
  kind: TransitionKind;
  /** Effect duration applied to EACH side of the cut (tail of outgoing + head of incoming). */
  halfDurSec: number;
  /** Apply on every Nth cut (1 = every cut). */
  everyN: number;
  maxPerAd: number;
}

export interface CameraStyle {
  /** 0 = ignore cameraEffect hints entirely (classic). 1 = subtle. 2 = punchy. */
  intensity: 0 | 1 | 2;
  /** Used when a scene carries no cameraEffect hint (or hint is 'none'). */
  defaultEffect: CameraEffect;
  /** Zoom target reached over the scene duration (e.g. 1.08 = 8% push-in). */
  sceneZoom: number;
  /** Instant punch at caption-chunk starts (the beat-cut feel without cutting). */
  chunkPunch: boolean;
  chunkPunchZoom: number;
  maxPunchesPerScene: number;
}

export interface SfxPalette {
  overlayMap: Record<OverlayStyle, SfxBankId | null>;
  maxWhoosh: number;
  volume: number;
}

export interface RenderPreset {
  id: PresetId;
  caption: CaptionStyle;
  hook: HookStyle;
  transition: TransitionStyle;
  camera: CameraStyle;
  sfx: SfxPalette;
}

/** Today's shipped look, lifted verbatim — renderFfmpeg derives its style
 * constants from this object so CLASSIC can never drift from the live render. */
export const CLASSIC: RenderPreset = {
  id: 'classic',
  caption: {
    fontFile: 'fonts/Inter-Black.ttf',
    advRatio: 0.62,
    fillColor: 'white',
    highlightColor: '0xFFCC00',
    boxAlpha: 0.85,
    borderWFrac: 0,
    shadow: { dx: 6, dy: 6, color: 'black@0.73' },
    chunkAnim: 'none',
    baseSizeFrac: 0.04,
    overlaySizeFrac: 0.044,
    yFracTalking: 0.67,
    yFracBroll: 0.72,
  },
  hook: {
    layout: 'wipe', reveal: 'flip', fontFile: 'fonts/Inter-Black.ttf', advRatio: 0.62,
    textColor: 'white', highlightColor: '0xFFCC00', wipeBox: true, wipeColor: '0xD90429', sizeFrac: 0.06,
    wordCadenceSec: 0, burnTransition: false,
  },
  transition: { kind: 'none', halfDurSec: 0, everyN: 1, maxPerAd: 0 },
  camera: {
    intensity: 0, defaultEffect: 'none', sceneZoom: 1,
    chunkPunch: false, chunkPunchZoom: 1, maxPunchesPerScene: 0,
  },
  sfx: {
    overlayMap: { hook: 'boom', callout: 'pop', punchline: 'ding', subtitle: null },
    maxWhoosh: 3,
    volume: 0.6,
  },
};

/** Bold direct-response look: Anton condensed caps, white-on-outline chunk pop
 * (the dominant 2026 meta per edit_style_research.md §3), white flash on
 * alternating cuts, slow scene push-in. */
export const IMPACT: RenderPreset = {
  id: 'impact',
  caption: {
    fontFile: 'fonts/Anton-Regular.ttf',
    advRatio: 0.5,
    fillColor: 'white',
    highlightColor: '0xFFCC00',
    boxAlpha: 0,
    borderWFrac: 0.08,
    shadow: { dx: 4, dy: 4, color: 'black@0.6' },
    chunkAnim: 'pop',
    baseSizeFrac: 0.042,
    overlaySizeFrac: 0.046,
    yFracTalking: 0.66,
    yFracBroll: 0.7,
  },
  hook: {
    layout: 'title-stack', reveal: 'slam', fontFile: 'fonts/Montserrat-ExtraBold.ttf', advRatio: 0.64,
    textColor: 'white', highlightColor: '0xFFD400', wipeBox: false, wipeColor: '0xFFCC00', sizeFrac: 0.058,
    wordCadenceSec: 0.32, burnTransition: true,
  },
  transition: { kind: 'flash', halfDurSec: 0.07, everyN: 2, maxPerAd: 3 },
  // Camera motion is the video-generation prompt's job — generated clips carry
  // their own moves, and renderer zoom on top reads as a pulse (Neil 2026-06-10).
  camera: {
    intensity: 0, defaultEffect: 'none', sceneZoom: 1,
    chunkPunch: false, chunkPunchZoom: 1, maxPunchesPerScene: 0,
  },
  sfx: {
    overlayMap: { hook: 'boom', callout: 'snap', punchline: 'ding', subtitle: null },
    maxWhoosh: 3,
    volume: 0.6,
  },
};

/** High-energy TikTok look: Bangers display caps, gold word-by-word pop captions,
 * whip-blur cuts, zoom + chunk punches — for MrBeast/Temu energy only. */
export const HYPE: RenderPreset = {
  id: 'hype',
  caption: {
    fontFile: 'fonts/Bangers-Regular.ttf',
    advRatio: 0.48,
    fillColor: '0xFFCC00',
    highlightColor: 'white',
    boxAlpha: 0,
    borderWFrac: 0.09,
    shadow: { dx: 5, dy: 5, color: 'black@0.65' },
    chunkAnim: 'word-pop',
    baseSizeFrac: 0.044,
    overlaySizeFrac: 0.048,
    yFracTalking: 0.64,
    yFracBroll: 0.68,
  },
  hook: {
    layout: 'title-stack', reveal: 'bounce', fontFile: 'fonts/Montserrat-ExtraBold.ttf', advRatio: 0.64,
    textColor: 'white', highlightColor: '0xFFD400', wipeBox: false, wipeColor: '0x111111', sizeFrac: 0.06,
    wordCadenceSec: 0.3, burnTransition: true,
  },
  transition: { kind: 'whip', halfDurSec: 0.05, everyN: 2, maxPerAd: 4 },
  // Camera motion lives in generation, not the renderer (pulse guard — see impact).
  camera: {
    intensity: 0, defaultEffect: 'none', sceneZoom: 1,
    chunkPunch: false, chunkPunchZoom: 1, maxPunchesPerScene: 0,
  },
  sfx: {
    overlayMap: { hook: 'boom', callout: 'pop', punchline: 'ding', subtitle: null },
    maxWhoosh: 4,
    volume: 0.6,
  },
};

/** Sincere testimonial look: Archivo Black, soft box, gentle fades, dip-to-black,
 * slow zoom-out — restraint is the style (no word-pop, quiet SFX). */
export const CLEAN: RenderPreset = {
  id: 'clean',
  caption: {
    fontFile: 'fonts/ArchivoBlack-Regular.ttf',
    advRatio: 0.66,
    fillColor: 'white',
    highlightColor: '0xFFCC00',
    boxAlpha: 0.6,
    borderWFrac: 0,
    shadow: { dx: 4, dy: 4, color: 'black@0.5' },
    chunkAnim: 'none',
    baseSizeFrac: 0.038,
    overlaySizeFrac: 0.042,
    yFracTalking: 0.67,
    yFracBroll: 0.72,
  },
  hook: {
    layout: 'title-stack', reveal: 'flip', fontFile: 'fonts/ArchivoBlack-Regular.ttf', advRatio: 0.66,
    textColor: 'white', highlightColor: '0xFFCC00', wipeBox: false, wipeColor: '0xD90429', sizeFrac: 0.052,
    wordCadenceSec: 0.34, burnTransition: false,
  },
  transition: { kind: 'dip', halfDurSec: 0.12, everyN: 3, maxPerAd: 2 },
  // Camera motion lives in generation, not the renderer (pulse guard — see impact).
  camera: {
    intensity: 0, defaultEffect: 'none', sceneZoom: 1,
    chunkPunch: false, chunkPunchZoom: 1, maxPunchesPerScene: 0,
  },
  sfx: {
    overlayMap: { hook: 'sparkle', callout: null, punchline: 'ding', subtitle: null },
    maxWhoosh: 1,
    volume: 0.5,
  },
};

export const PRESETS: Record<PresetId, RenderPreset> = {
  classic: CLASSIC,
  impact: IMPACT,
  hype: HYPE,
  clean: CLEAN,
};

/** Rotation pools per script style. Testimonial deliberately excludes the
 * high-energy looks — a hyped testimonial reads fake (premortem guard). */
export const ROTATION: Record<ScriptStyle, PresetId[]> = {
  mrbeast: ['impact', 'hype', 'classic'],
  temu: ['hype', 'impact', 'classic'],
  testimonial: ['clean', 'classic'],
};

/** FNV-1a 32-bit — stable across runs/platforms (no Math.random, no Date). */
export function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Stable rotation seed from the request's scene video URLs (order-independent). */
export function rotationSeed(videoUrls: string[]): string {
  return [...videoUrls].sort().join('|');
}

/**
 * Resolve the preset for a render. Explicit id always wins (client override /
 * kill switch); else rotate deterministically within the script style's pool;
 * else CLASSIC. Unknown ids/styles degrade to CLASSIC, never throw.
 */
export function resolvePreset(
  scriptStyle: string | null | undefined,
  explicitId: string | null | undefined,
  seed: string
): RenderPreset {
  if (explicitId && explicitId in PRESETS) return PRESETS[explicitId as PresetId];
  const pool = scriptStyle ? ROTATION[scriptStyle as ScriptStyle] : undefined;
  if (!pool?.length) return CLASSIC;
  return PRESETS[pool[fnv1a(seed) % pool.length]];
}

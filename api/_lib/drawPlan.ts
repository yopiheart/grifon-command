// Pure draw-planning + filtergraph-string-building engine, extracted verbatim
// from api/_lib/renderFfmpeg.ts (structural-only refactor). No render I/O (no
// spawnSync, no temp files) — every function here is a synchronous, deterministic
// computation over scenes/presets, so both the existing final-render path AND a
// future preview endpoint can call one shared source of truth. The one read is
// fontMetrics' cached lookup of a bundled TTF's own glyph widths (hookTitleLayout,
// F7); it degrades to the old estimate rather than throwing. Output must be
// byte-identical to the original; renderFfmpeg.ts re-exports these for back-compat.

import type { FinalRenderScene, FinalRenderEndCard, SfxBankId, CameraEffect, VoiceWord } from '../../types.js';
import {
  CLASSIC, pickHookPalette,
  type RenderPreset, type HookRevealStyle, type TransitionStyle, type CameraStyle,
  type HookPalette,
} from './renderPresets.js';
import { textWidthPx } from './fontMetrics.js';

// Transition-class SFX land on a CUT, not mid-scene. The renderer knows the exact
// cut (a scene boundary), so these snap to it deterministically — the text EDL's
// guessed anchorSec can't (it never sees the rendered frame). See snapSfxAnchor.
const TRANSITION_SFX: ReadonlySet<SfxBankId> = new Set<SfxBankId>(['whoosh', 'swish']);
// Each strategic overlay carries a paired sound that lands on its EXACT on-screen
// frame (planScene tags the layer from preset.sfx.overlayMap; renderFinalVideo
// places it at layer.startSec) — the "emphasize what the viewer sees" sync,
// deterministic unlike the text EDL's guessed anchorSec. Chunked spoken-word
// captions get none (restraint: 1/scene).
const CALLOUT_LEAD = 0.3; // delay a callout/punchline so its pop reads distinct from the cut whoosh

// Restraint — keep ads from sounding cheap (Neil: multiple stacked sounds read as
// AI slop). No two SFX within MIN_SFX_GAP (kills whoosh+pop stacking); transition
// whooshes capped per ad. Emphasis SFX (hook/callout/CTA) are uncapped — they're
// tied to overlays and self-limit, and they win when a whoosh collides with them.
export const MIN_SFX_GAP = 0.4;   // seconds between any two placed SFX
const MAX_WHOOSH = CLASSIC.sfx.maxWhoosh; // transition whooshes per ad
// Any single emphasis sound max 2x per ad: the EDL happily defaults the same
// cue onto every scene ("drop" ticked on all 7 scenes, 2026-06-13 final-render
// review) and an identical repeating SFX is itself an AI-slop tell. Transition
// whooshes are exempt — they already have their own maxWhoosh budget.
const MAX_PER_SOUND = 2;

// ---------------------------------------------------------------------------
// CapCut-grade overlay/caption engine — pure helpers (unit-tested), no ffmpeg.
// All "where/when" is computed here (or upstream in EditVideo); ffmpeg just draws.
// ---------------------------------------------------------------------------

// Styling lives in the presets (api/_lib/renderPresets.ts) — every color, font,
// box/outline, shadow and y-band is preset-driven; CLASSIC is the shipped look
// and the default everywhere, so omitting the preset reproduces today's render.
const INTER_ADV = CLASSIC.caption.advRatio;      // default glyph advance (Inter-Black; per-preset via advRatio)

// Safe zone (fractions). Erring toward Reels' aggressive bottom UI.
const SZ_SIDE = 0.10, SZ_TOP = 0.14, SZ_BOTTOM = 0.22;
// Hook text hugs the TOP safe band (just under SZ_TOP) instead of upper-center:
// the hook end-frame anchors the product center/lower-third, and 0.32 parked the
// title right on top of it — text and product fighting for the eye (Neil,
// 2026-06-10 final-render review). Top placement is also the viral-reference
// grammar: text top, subject below.
const HOOK_TOP_FRAC = 0.15;

// Hook reveal entrance + wipe. drawtext re-evals y/alpha/fontsize per-frame
// (verified 2026-06-08, see agent_lessons.md), so all three styles are REAL
// motion — not the old linear slide that read as a plain fade. HOOK_REVEAL picks
// the style; the env override lets the synthetic harness A/B all three with no edit.
const HOOK_DELAY = 0.4;
const HOOK_BOX_DELAY = 0.55, HOOK_WIPE_DUR = 0.4;
// flip = uniform scale-grow "pop" — Neil's pick (2026-06-08), now carried by the
// CLASSIC preset ('bounce' = easeOutBack overshoot | 'slam' = easeOutQuart hard
// slide | 'flip'). The wide annotation keeps the alternate branches type-valid.
const HOOK_REVEAL: HookRevealStyle = CLASSIC.hook.reveal;
const HOOK_FADE_SEC = 0.15;            // alpha snap-in, decoupled from motion (so it's NOT a slow fade)
// bounce: spring up PAST the target then settle (easeOutBack; c1=3 → ~25% overshoot)
const HOOK_BOUNCE_DUR = 0.45, HOOK_BOUNCE_RISE = 60, BOUNCE_C1 = 3.0, BOUNCE_C3 = 4.0;
// slam: fast hard-decelerating slide, no overshoot (easeOutQuart)
const HOOK_SLAM_DUR = 0.30, HOOK_SLAM_RISE = 120;
// flip: uniform scale-grow from 45%→100% (+slight overshoot) + small rise. drawtext
// scales glyphs uniformly, so this is a scale-pop "unfold", not a true axis flip.
const HOOK_FLIP_DUR = 0.35, HOOK_FLIP_RISE = 28, HOOK_FLIP_MINSCALE = 0.45;
const HOOK_FLIP_SPAN = 1 - HOOK_FLIP_MINSCALE;
// Exported so the I/O layer's buildWordFilters (which stays in renderFfmpeg.ts)
// can share the exact easeOutBack constants this engine uses.
export const FLIP_C1 = 1.70158, FLIP_C3 = 2.70158;

// Scene-2+ overlay + caption timing.
const OVERLAY_HOLD_SEC = 1.5, OVERLAY_FADE = 0.25, CAPTION_START_PAD = 0.3;
const MIN_CHUNK_SEC = 0.7;

export interface SafeZone { xMargin: number; topY: number; bottomY: number; usableW: number; }
export function safeZone([w, h]: [number, number]): SafeZone {
  return {
    xMargin: Math.round(w * SZ_SIDE),
    topY: Math.round(h * SZ_TOP),
    bottomY: Math.round(h * (1 - SZ_BOTTOM)),
    usableW: Math.round(w * (1 - 2 * SZ_SIDE)),
  };
}

/** Rough rendered width of a line at a font size (per-font glyph advance). */
export function estWidth(text: string, fontsize: number, advRatio: number = INTER_ADV): number {
  return text.length * fontsize * advRatio;
}

/**
 * Clean burned text: strip emoji/symbol glyphs Inter-Black can't render (tofu),
 * AND strip apostrophes (straight/curly/backtick) — Neil: a leading "'to"/"'tong"
 * reads as AI-generated; "TIGNAN MO 'TO" → "TIGNAN MO TO". Applied to BOTH overlays
 * and captions so nothing burned ever shows an apostrophe.
 */
export function stripUnrenderable(s: string): string {
  return s
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{2190}-\u{21FF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}]/gu, '')
    .replace(/['‘’ʼ`]/g, '')
    // Em/en dashes: script punctuation, not caption material — a chunk boundary
    // landing on one burned "— first 50 lang" (2026-06-10 review). Word hyphens
    // ("9-AM") are untouched.
    .replace(/[—–]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Fit text into maxWidthPx: shrink the font (to 70%), then wrap to ≤2 lines. */
export function fitText(
  text: string,
  maxWidthPx: number,
  baseSize: number,
  advRatio: number = INTER_ADV
): { fontsize: number; lines: string[] } {
  const minSize = Math.round(baseSize * 0.7);
  let size = baseSize;
  if (estWidth(text, size, advRatio) <= maxWidthPx) return { fontsize: size, lines: [text] };
  while (size > minSize && estWidth(text, size, advRatio) > maxWidthPx) size -= 2;
  if (estWidth(text, size, advRatio) <= maxWidthPx) return { fontsize: size, lines: [text] };
  // Still too wide → wrap to two balanced lines, then re-shrink to the longest.
  const lines = wrapTwoLines(text);
  size = baseSize;
  const longest = () => Math.max(...lines.map((l) => estWidth(l, size, advRatio)));
  while (size > minSize && longest() > maxWidthPx) size -= 2;
  return { fontsize: size, lines };
}

/** Split into two balanced lines; a single overlong token is hard-broken. */
export function wrapTwoLines(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    const t = words[0] ?? text;
    const mid = Math.ceil(t.length / 2);
    return [t.slice(0, mid), t.slice(mid)];
  }
  let best = 1, bestDiff = Infinity;
  const total = text.length;
  for (let i = 1; i < words.length; i++) {
    const left = words.slice(0, i).join(' ').length;
    const diff = Math.abs(left - (total - left));
    if (diff < bestDiff) { bestDiff = diff; best = i; }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

// Taglish/English particles that should never START a caption chunk.
const PARTICLES = new Set([
  'ng', 'na', 'sa', 'ay', 'at', 'si', 'ni', 'ko', 'mo', 'to', "'to", 'po',
  'ba', 'pa', 'rin', 'din', 'ka', 'yan', 'ito', 'iyan', 'and', 'the', 'a', 'of', 'to',
]);

/** Split a contiguous word list into `n` as-even-as-possible groups. */
export function evenSplit<T>(items: T[], n: number): T[][] {
  const out: T[][] = [];
  const base = Math.floor(items.length / n), extra = items.length % n;
  let i = 0;
  for (let g = 0; g < n; g++) {
    const len = base + (g < extra ? 1 : 0);
    out.push(items.slice(i, i + len));
    i += len;
  }
  return out.filter((g) => g.length);
}

/**
 * Chunk a spoken line into readable caption groups (~3–4 words), honoring a
 * minimum on-screen time of MIN_CHUNK_SEC/chunk given `availSec`, and never
 * starting a chunk with a particle (pulled back to the previous chunk).
 */
export function chunkCaption(
  line: string,
  availSec: number,
  wordsPerChunk: number = 3.5,
  minChunkSec: number = MIN_CHUNK_SEC
): string[] {
  const clean = stripUnrenderable(line);
  if (!clean) return [];
  const words = clean.split(/\s+/);
  const maxByTime = Math.max(1, Math.floor(availSec / minChunkSec));
  const target = Math.min(maxByTime, Math.max(1, Math.ceil(words.length / wordsPerChunk)));
  const groups = evenSplit(words, target);
  // Pull a particle that landed at a chunk head back onto the previous chunk.
  for (let g = 1; g < groups.length; g++) {
    while (groups[g].length && PARTICLES.has(groups[g][0].toLowerCase())) {
      groups[g - 1].push(groups[g].shift() as string);
    }
  }
  return groups.filter((g) => g.length).map((g) => g.join(' '));
}

// ---- Word-level caption timing. When the scene carries voiceWords (ElevenLabs
// forced alignment, shipped 2026-06-13) chunk windows pace on REAL speech
// times; otherwise words are interpolated across the chunk window by character
// weight, the same estimate class as estimateSpokenSec/advRatio. ----

export interface WordTiming {
  word: string;
  start: number; // scene-relative seconds
  end: number;
  xPx: number;   // absolute left edge of the word (line centered at frameW/2)
  /** Absolute top y when the word sits off the layer's base line (title stack). */
  yPx?: number;
  /** Render in the preset's highlight color (gold power word) instead of base. */
  highlight?: boolean;
}

// Power words pop GOLD in the title stack (reference grammar: numbers +
// superlatives/commands = gold, connectors = white — websites5 hook).
const POWER_WORDS = new Set([
  'tignan', 'grabe', 'best', 'free', 'libre', 'secret', 'sale', 'bago', 'new',
  'viral', 'stop', 'wag', 'huwag', 'top', 'sulit', 'mura', 'promo', 'alam',
]);

export function isPowerWord(word: string): boolean {
  const w = word.toLowerCase().replace(/[^a-z0-9]/g, '');
  return /\d/.test(w) || POWER_WORDS.has(w);
}

/**
 * Title-stack hook layout (reference-grade hook, Neil 2026-06-10): every word
 * pops sequentially with an elastic overshoot, lines stacked and centered,
 * power words in the highlight color. Synchronous + deterministic: returns word
 * timings with absolute x/y. Guarantees at least one highlighted word (falls
 * back to the first). `fontFile` is the preset's hook font (e.g.
 * 'fonts/Montserrat-ExtraBold.ttf'); omit it and word widths fall back to the
 * estimate, which is what every pre-F7 caller got.
 */
export function hookTitleLayout(
  lines: string[],
  fontsize: number,
  advRatio: number,
  frameW: number,
  yTop: number,
  startSec: number,
  cadenceSec: number,
  fontFile?: string
): WordTiming[] {
  const lineH = Math.round(fontsize * 1.18);
  // Explicit inter-word gap + REAL per-glyph advance. estWidth is length×advRatio —
  // a flat per-character average that can't see that W/M are wide and I/T/L narrow,
  // so the same ratio ran "HUWAG" 0.63em NARROW (more than the whole gap → the next
  // word printed fused onto it, F7 "HUWACNANG") while running "SULIT" 0.47em WIDE.
  // The uppercase bump below was the hand-tuned patch for that error and can only
  // trade one word's collision for another's over-spacing, so real metrics replace
  // it whenever the font is known; it survives verbatim as the fallback for callers
  // that pass no font (and for a glyph the font doesn't cover). With honest widths
  // the gap is now plain padding rather than error absorption, so it is unchanged.
  const gap = Math.round(fontsize * 0.34);
  const wAdv = (wd: string) =>
    (fontFile ? textWidthPx(fontFile, wd, fontsize) : null)
    ?? estWidth(wd, fontsize, advRatio + (/[A-Z]/.test(wd) && wd === wd.toUpperCase() ? 0.10 : 0));
  const out: WordTiming[] = [];
  let idx = 0;
  for (let li = 0; li < lines.length; li++) {
    const words = lines[li].split(/\s+/).filter(Boolean);
    const wordWs = words.map(wAdv);
    const lineW = wordWs.reduce((s, ww) => s + ww, 0) + gap * Math.max(0, words.length - 1);
    let x = (frameW - lineW) / 2;
    for (let wi = 0; wi < words.length; wi++) {
      const wd = words[wi];
      const start = +(startSec + idx * cadenceSec).toFixed(3);
      out.push({
        word: wd, start, end: start, // end is overwritten by the caller (persist)
        xPx: Math.round(x), yPx: yTop + li * lineH,
        highlight: isPowerWord(wd),
      });
      x += wordWs[wi] + gap;
      idx++;
    }
  }
  if (out.length && !out.some((w) => w.highlight)) out[0].highlight = true;
  return out;
}

/**
 * The scene's MEASURED speech window (seconds, scene-relative) from ElevenLabs
 * forced alignment: `onset` = when the first word is actually spoken, `end` =
 * when the last one finishes. This is the ground truth both the trim (#91) and
 * the overlay onset (#94.1) anchor to — silencedetect only knows where AUDIO
 * stops (breath/room tone reads as content above the noise floor), and a clip's
 * bounds know nothing about the voice at all.
 *
 * Returns null when the scene carries no usable alignment (absent, empty, or
 * degenerate times) — every caller then keeps its pre-alignment behavior.
 * Min/max rather than first/last so one out-of-order token can't shrink the
 * window; for well-formed (sorted) input they are identical.
 */
export function speechWindow(
  scene: Pick<FinalRenderScene, 'voiceWords'>
): { onset: number; end: number } | null {
  const words = scene.voiceWords;
  if (!words?.length) return null;
  let onset = Infinity;
  let end = -Infinity;
  for (const w of words) {
    if (Number.isFinite(w?.start)) onset = Math.min(onset, w.start);
    if (Number.isFinite(w?.end)) end = Math.max(end, w.end);
  }
  if (!Number.isFinite(onset) || !Number.isFinite(end) || end <= 0) return null;
  onset = Math.max(0, onset);
  return { onset, end: Math.max(onset, end) };
}

/**
 * Map caption chunks onto MEASURED speech times (forced alignment). Each
 * chunk's window opens when its first word is actually spoken and holds until
 * the next chunk opens (continuous, CapCut-style — what kills perceived lag is
 * a chunk appearing AFTER its words were said). Word-count mismatches between
 * the script split and the aligner's tokenization map proportionally — close
 * enough at chunk granularity, and still measured, not estimated. Returns null
 * when there is nothing to map (caller falls back to the even-spread estimate).
 */
export function voiceChunkWindows(
  chunks: string[],
  words: VoiceWord[],
  endCap: number
): Array<{ start: number; end: number }> | null {
  if (!chunks.length || !words.length) return null;
  const counts = chunks.map((c) => c.split(/\s+/).filter(Boolean).length);
  const total = counts.reduce((s, n) => s + n, 0);
  if (!total) return null;
  const scale = words.length / total;
  const out: Array<{ start: number; end: number }> = [];
  let acc = 0;
  for (const n of counts) {
    const a = Math.min(words.length - 1, Math.floor(acc * scale));
    const b = Math.min(words.length - 1, Math.max(a, Math.ceil((acc + n) * scale) - 1));
    out.push({ start: words[a].start, end: words[b].end });
    acc += n;
  }
  // Continuous + monotonic, two passes: (1) starts strictly increase, then
  // (2) each chunk holds to the next one's settled start; the last gets a
  // short read-out beat. Everything clamps to the scene trim.
  for (let i = 1; i < out.length; i++) {
    out[i].start = Math.max(out[i].start, out[i - 1].start + 0.1);
  }
  for (let i = 0; i < out.length; i++) {
    out[i].end = i < out.length - 1 ? out[i + 1].start : out[i].end + 0.4;
  }
  for (const w of out) {
    w.start = +Math.min(w.start, endCap).toFixed(3);
    w.end = +Math.min(Math.max(w.end, w.start), endCap).toFixed(3);
  }
  return out;
}

/**
 * Split one caption chunk's [startSec, endSec] window across its words by
 * character weight (longer words speak longer; trailing punctuation adds a
 * beat). x positions are cumulative estimated widths from the centered line
 * start — single-line chunks only (the caller falls back to chunk-pop when
 * fitText wrapped).
 */
export function wordTimings(
  chunk: string,
  startSec: number,
  endSec: number,
  fontsize: number,
  advRatio: number,
  frameW: number
): WordTiming[] {
  const words = chunk.split(/\s+/).filter(Boolean);
  if (!words.length || endSec <= startSec) return [];
  const weight = (wd: string) => wd.length + 1 + (/[,.!?]$/.test(wd) ? 1.5 : 0);
  const total = words.reduce((s, wd) => s + weight(wd), 0);
  const span = endSec - startSec;
  const lineX = (frameW - estWidth(chunk, fontsize, advRatio)) / 2;
  const out: WordTiming[] = [];
  let t = startSec;
  let x = lineX;
  for (const wd of words) {
    const dur = (weight(wd) / total) * span;
    out.push({ word: wd, start: +t.toFixed(3), end: +Math.min(endSec, t + dur).toFixed(3), xPx: Math.round(x) });
    t += dur;
    x += estWidth(`${wd} `, fontsize, advRatio);
  }
  out[out.length - 1].end = +endSec.toFixed(3); // absorb rounding into the last word
  return out;
}

/** Clamp a scene-relative [start,end] window to [0, trimSec]. Returns null when
 * the window falls entirely outside the trimmed clip (cue dropped). */
export function clampWindow(
  startSec: number,
  endSec: number,
  trimSec: number | null
): { start: number; end: number } | null {
  const cap = typeof trimSec === 'number' && trimSec > 0 ? trimSec : Infinity;
  const start = Math.max(0, Math.min(startSec, cap));
  const end = Math.max(start, Math.min(endSec, cap));
  if (start >= cap) return null;
  if (end - start < 0.05) return null; // too short to read
  return { start, end };
}

/** Clamp a single SFX anchor to [0, trimSec). Returns null if past the clip. */
export function clampAnchor(anchorSec: number, trimSec: number | null): number | null {
  const cap = typeof trimSec === 'number' && trimSec > 0 ? trimSec : Infinity;
  const a = Math.max(0, anchorSec);
  return a < cap ? a : null;
}

/**
 * Effective anchor for one EDL SFX cue. The text EDL never sees the rendered
 * frame, so its `anchorSec` is an unreliable guess — we keep only what we can
 * time deterministically:
 *  - Transition sounds (whoosh/swish) snap to t=0 of the incoming scene (the
 *    exact CUT). Dropped on the hook / first scene (nothing transitions INTO it —
 *    that spurious opener read as "too early").
 *  - Everything else is dropped here; in-scene emphasis now comes from the
 *    text-paired layers (OVERLAY_SFX), frame-locked to the overlay's appearance.
 * Returns the effective anchorSec, or null to drop the cue.
 */
export function snapSfxAnchor(
  sfxId: SfxBankId,
  sceneIndex: number,
  isHook: boolean
): number | null {
  if (TRANSITION_SFX.has(sfxId)) return isHook || sceneIndex === 0 ? null : 0;
  return null;
}

export interface SfxCandidate {
  sfxId: SfxBankId;
  globalSec: number;   // position on the whole-ad timeline
  transition: boolean; // true = cut whoosh/swish (capped); false = emphasis (uncapped)
}

/**
 * Pick which of a scene's SFX candidates to keep, given what's already placed
 * across the ad. Rules: emphasis wins over transitions (sorted first), nothing
 * lands within `minGap` of an already-placed sound (kills stacking), transition
 * whooshes are capped at `maxWhoosh` per ad, and any single emphasis sound is
 * capped at `maxPerSound` per ad (the every-scene "drop" tick). Pure +
 * order-stable so it unit-tests cleanly; the caller threads `placedSec` /
 * `whooshUsed` / `soundUse` across scenes.
 */
export function pickSceneSfx(
  candidates: SfxCandidate[],
  placedSec: number[],
  whooshUsed: number,
  maxWhoosh: number = MAX_WHOOSH,
  minGap: number = MIN_SFX_GAP,
  soundUse: Partial<Record<SfxBankId, number>> = {},
  maxPerSound: number = MAX_PER_SOUND
): SfxCandidate[] {
  const ordered = [...candidates].sort(
    (a, b) => Number(a.transition) - Number(b.transition) || a.globalSec - b.globalSec
  );
  const placed = [...placedSec];
  const use: Partial<Record<SfxBankId, number>> = { ...soundUse };
  const kept: SfxCandidate[] = [];
  let whoosh = whooshUsed;
  for (const c of ordered) {
    if (placed.some((t) => Math.abs(t - c.globalSec) < minGap)) continue;
    if (c.transition) {
      if (whoosh >= maxWhoosh) continue;
      whoosh++;
    } else {
      if ((use[c.sfxId] ?? 0) >= maxPerSound) continue;
      use[c.sfxId] = (use[c.sfxId] ?? 0) + 1;
    }
    kept.push(c);
    placed.push(c.globalSec);
  }
  return kept;
}

// ---- Per-scene draw plan (the single source of truth for what/when/where) ----

export interface TextLayer {
  kind: 'text';
  text: string;        // may contain \n for wrapped lines (written to a textfile)
  fontsize: number;
  color: string;       // ffmpeg color (white / 0xFFCC00 / ...)
  boxAlpha: number;    // 0 → no box; else black@<alpha> behind the text
  xExpr: string;       // ffmpeg x expression (usually centered)
  yBase: number;       // resolved top y in px
  startSec: number;
  endSec: number;
  anim: 'slideup' | 'fade' | 'pop' | 'word-pop' | 'karaoke' | 'bars' | 'karaoke-invert' | 'none';
  emphasisSfx?: SfxBankId; // a sound to fire ON this text's appearance (startSec)
  /** Word/line timing and position for word-level or per-line animations. */
  words?: WordTiming[];
  /** Which bundled font renders this layer (hook title may differ from captions). */
  font?: 'caption' | 'hook';
  /** Premium metallic fill: gradient palette clipped into the glyphs + light
   * sweep (hook title only; flat fill when absent). */
  gradient?: HookPalette;
}
export interface BoxLayer {
  kind: 'box';
  x: number; y: number; w: number; h: number;
  color: string; startSec: number; wipeDur: number;
}
export type DrawLayer = TextLayer | BoxLayer;

const normText = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Hook title fallback source: when the EDL carries no hook overlay, derive the
 * title from the FIRST SENTENCE of the spoken line — split on `.`/`!`/`?`,
 * keeping a terminal `?` or `!` (a full stop is dropped), capped at the first 7
 * words. Pure; the caller still runs stripUnrenderable, mirroring the overlay
 * path. The terminal mark is only kept when the sentence actually fit inside the
 * 7-word cap (a truncated sentence never reached its punctuation).
 */
function hookFallbackText(scriptLine: string | undefined): string {
  if (!scriptLine) return '';
  // Strip leading terminators/whitespace ("... Hiraya Glow ba talaga?") so an
  // ellipsis opener can't make the first-sentence capture come back empty.
  const trimmed = scriptLine.trim().replace(/^[.!?\s…]+/, '');
  if (!trimmed) return '';
  const m = /^([^.!?]*)([.!?])?/.exec(trimmed);
  const body = (m?.[1] ?? trimmed).trim();
  const term = m?.[2] === '?' || m?.[2] === '!' ? m[2] : '';
  const words = body.split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  const capped = words.slice(0, 7).join(' ');
  return capped + (words.length <= 7 ? term : '');
}

/** Y (top of text) for a scene's caption/overlay band, region-aware + safe-clamped.
 * Face-avoidance (captionRegion) clamps the band in EVERY preset (premortem guard). */
function captionY(
  [, h]: [number, number],
  sz: SafeZone,
  scene: FinalRenderScene,
  preset: RenderPreset = CLASSIC
): number {
  let frac = scene.sceneType && scene.sceneType !== 'talking'
    ? preset.caption.yFracBroll
    : preset.caption.yFracTalking;
  if (scene.captionRegion) {
    const mid = (scene.captionRegion.yFracTop + scene.captionRegion.yFracBottom) / 2;
    frac = Math.min(0.70, Math.max(0.50, mid));
  }
  return Math.min(Math.round(h * frac), sz.bottomY - 150);
}

/**
 * Compile a scene into ordered draw layers. Hook (scene 1): big slide-up text in
 * the upper band + a crimson L→R wipe-box behind the LAST word. Scenes 2+: the
 * EDL overlay (fade, ≥hold) then chunked script-line captions in the face-clear
 * band — never overlapping; overlay skipped if it duplicates the caption text.
 */
export function planScene(
  scene: FinalRenderScene,
  trimSec: number | null,
  dims: [number, number],
  preset: RenderPreset = CLASSIC,
  variantSeed: number = 0
): DrawLayer[] {
  const [w, h] = dims;
  const sz = safeZone(dims);
  const end = typeof trimSec === 'number' && trimSec > 0 ? trimSec : 999;
  const layers: DrawLayer[] = [];
  const overlay = scene.overlayText?.[0];
  const cls = preset.id === 'classic';
  const adv = preset.caption.advRatio;
  const overlaySfx = preset.sfx.overlayMap;

  if (scene.isHook) {
    // Title source: the EDL hook overlay when present, else the first sentence of
    // the spoken line (7-word cap). Only when BOTH are empty does the hook plan
    // no title layer.
    const text = overlay?.text
      ? stripUnrenderable(overlay.text)
      : stripUnrenderable(hookFallbackText(scene.scriptLine));
    if (!text) return layers;
    const hookAdv = preset.hook.advRatio;
    const { fontsize, lines } = fitText(text, sz.usableW, Math.round(h * preset.hook.sizeFrac), hookAdv);
    const yTop = Math.round(h * HOOK_TOP_FRAC);

    if (preset.hook.layout === 'title-stack') {
      // Reference-grade hook: word-by-word elastic pop, gold/white two-tone,
      // no box (websites5 grammar; Neil 2026-06-10 redesign).
      const words = hookTitleLayout(
        lines, fontsize, hookAdv, w, yTop, 0.05, preset.hook.wordCadenceSec, preset.hook.fontFile
      );
      words.forEach((wd) => { wd.end = end; }); // every word persists to scene end
      layers.push({
        kind: 'text', text: lines.join('\n'), fontsize, color: preset.hook.textColor, boxAlpha: 0,
        xExpr: `${Math.round((w - Math.max(...lines.map((l) => estWidth(l, fontsize, hookAdv)))) / 2)}`,
        yBase: yTop, startSec: 0.05, endSec: end, anim: 'word-pop', words, font: 'hook',
        emphasisSfx: overlaySfx.hook ?? undefined,
        // Premium metallic fill + light sweep, palette rotated per render so
        // consecutive ads don't match (Neil 2026-06-10 polish round).
        gradient: pickHookPalette(variantSeed),
      });
      return layers;
    }

    // Classic 'wipe' layout: single-block reveal behind the wipe box.
    // Non-classic: text on frame ~0 (references put the hook caption on frame 1 —
    // edit_style_research.md §3.8); classic keeps the shipped 0.4s entrance.
    const hookDelay = cls ? HOOK_DELAY : 0.05;
    const boxDelay = cls ? HOOK_BOX_DELAY : 0.2;
    if (preset.hook.wipeBox) {
      // Wipe-box behind the WHOLE title (Neil: highlight the full line, not just
      // the last word). Spans the widest line; height covers all lines' lower band.
      const maxLineW = Math.max(...lines.map((l) => estWidth(l, fontsize, adv)));
      const pad = Math.round(fontsize * 0.14);
      const lineH = Math.round(fontsize * 1.15);
      layers.push({
        kind: 'box',
        x: Math.max(sz.xMargin, Math.round((w - maxLineW) / 2 - pad)),
        y: Math.round(yTop + fontsize * 0.42),
        w: Math.round(maxLineW) + 2 * pad,
        h: (lines.length - 1) * lineH + Math.round(fontsize * 0.58),
        color: preset.hook.wipeColor, startSec: boxDelay, wipeDur: HOOK_WIPE_DUR,
      });
    }
    layers.push({
      kind: 'text', text: lines.join('\n'), fontsize, color: preset.hook.textColor, boxAlpha: 0,
      xExpr: '(w-text_w)/2', yBase: yTop, startSec: hookDelay, endSec: end, anim: 'slideup',
      emphasisSfx: overlaySfx.hook ?? undefined, // boom on the flip pop
    });
    return layers;
  }

  // Scenes 2+: EDL overlay (≥hold) → chunked script-line captions.
  const oText = overlay?.text ? stripUnrenderable(overlay.text) : '';
  const cap = scene.scriptLine ? stripUnrenderable(scene.scriptLine) : '';
  const dup = !!(oText && cap && normText(oText) === normText(cap));
  const cy = captionY(dims, sz, scene, preset);
  const capStart = CAPTION_START_PAD;
  // Captions may not draw before this moment (overlay owns the band until then).
  let overlayClearSec = 0;

  // A `subtitle` overlay IS the spoken line — that is what the style means to the
  // model, so it writes the whole line in (unlike `callout`/`hook`, which it keeps
  // short). The caption layer below then chunks the SAME line off voiceWords, so the
  // scene plays the line twice: once as a static block that lands BEFORE she says it
  // (spoiling it), then again as karaoke. `dup` above exists to catch exactly this
  // and misses on any spelling difference — here "8 hours" vs "Eight hours" (Neil,
  // 2026-08-09).
  //
  // So don't compare strings: when the scene carries word timings, the karaoke
  // caption is strictly better (tracks the mouth, no spoiler) and the static copy is
  // dropped. No timings → no karaoke to replace it → it stays and carries the line.
  // `callout`/`punchline` are untouched: they are short, face-aware, and say
  // something the line does not.
  const subtitleCoveredByKaraoke =
    overlay?.style === 'subtitle' && !!cap && !!scene.voiceWords?.length;

  if (oText && !dup && !subtitleCoveredByKaraoke) {
    const { fontsize, lines } = fitText(oText, sz.usableW, Math.round(h * preset.caption.overlaySizeFrac), adv);
    const color = overlay!.style === 'callout' || overlay!.style === 'punchline'
      ? preset.caption.highlightColor
      : preset.caption.fillColor;
    const emphasisSfx = overlaySfx[overlay!.style] ?? undefined;
    // Non-classic: a punchline (CTA) holds to the END of the scene — the baseline
    // autopsy showed "ORDER NA" vanishing 3s before the video ends (research §1.4).
    const oEnd = !cls && overlay!.style === 'punchline' ? end : Math.min(end, OVERLAY_HOLD_SEC);
    // Offset a sound-paired overlay so its pop reads after the cut whoosh — but
    // never so far that the overlay shows < 0.4s.
    const oLead = emphasisSfx ? Math.min(CALLOUT_LEAD, Math.max(0, oEnd - 0.4)) : 0;
    // #94.1: an overlay must never pop before the voice it belongs to. When the
    // scene carries forced-alignment words, hold it until the VO's first word is
    // actually spoken (measured onset — a scene can open on 1.4s of silence).
    // The END is left alone: extending it would push overlayClearSec and start
    // sacrificing caption chunks, so an overlay whose whole hold sits before the
    // onset is dropped by the ≥0.4s readable floor below instead (the properly
    // timed caption still carries the line). Unaligned scenes are unchanged.
    const oStart = Math.max(oLead, speechWindow(scene)?.onset ?? 0);
    if (oEnd - oStart >= 0.4) {
      layers.push({
        kind: 'text', text: lines.join('\n'), fontsize, color, boxAlpha: preset.caption.boxAlpha,
        xExpr: '(w-text_w)/2', yBase: cy, startSec: oStart, endSec: oEnd, anim: 'fade',
        emphasisSfx,
      });
      overlayClearSec = oEnd + 0.1;
    }
  }

  if (cap) {
    // Word-level presets read best as small fast chunks (1–3 words swapped on VO
    // cadence — research §3.1); classic keeps the shipped 3–4-word pacing.
    const wordLevel = preset.caption.chunkAnim === 'word-pop'
      || preset.caption.chunkAnim === 'karaoke'
      || preset.caption.chunkAnim === 'karaoke-invert';
    const wordsPer = preset.caption.chunkAnim === 'none' ? 3.5 : 2.5;
    const minChunk = preset.caption.chunkAnim === 'none' ? MIN_CHUNK_SEC : 0.5;
    // Captions pace across the FULL speech window — the same layout an
    // overlay-less scene gets — so they stay synced to the VO (no compress,
    // which lagged the speaker — Neil, 2026-06-10). C1 (Neil, 2026-06-16): if a
    // callout owns the slot while the line BEGINS, show ONLY the callout and
    // skip the subtitle entirely. The old per-chunk sacrifice kept the surviving
    // TAIL, which stranded the line's opening and could invert meaning (scene-6:
    // VO "hindi kailangan ng kape" → caption "kailangan ng kape"). The callout
    // already carries the message and is face-aware (can't block the subject), so
    // a partial/misleading fragment is never worth showing.
    const avail = end - capStart;
    if (avail >= minChunk) {
      const chunks = chunkCaption(cap, avail, wordsPer, minChunk);
      const each = avail / Math.max(1, chunks.length);
      // Measured speech times beat the even-spread estimate whenever the scene
      // carries forced-alignment words (2026-06-13: captions popped late on
      // every talking scene because the estimate ignored where the VO actually
      // was). Estimate remains the fallback for unaligned scenes.
      const real = scene.voiceWords?.length
        ? voiceChunkWindows(chunks, scene.voiceWords, end)
        : null;
      // C1: on B-ROLL, skip the WHOLE subtitle when the callout owns the slot at
      // the line's OPENING (else the surviving tail strands the opening / inverts
      // meaning). TALKING scenes keep their designed subtitle-after-callout
      // behavior — the speaker's live words matter and the callout there is brief.
      const lineStart = real ? (real[0]?.start ?? capStart) : capStart;
      const openingObstructed = scene.sceneType !== 'talking'
        && overlayClearSec > 0 && lineStart < overlayClearSec;
      if (!openingObstructed) chunks.forEach((c, i) => {
        const { fontsize, lines } = fitText(c, sz.usableW, Math.round(h * preset.caption.baseSizeFrac), adv);
        const startSec = real ? Math.max(real[i].start, capStart) : +(capStart + i * each).toFixed(3);
        const endSec = real ? real[i].end : +(capStart + (i + 1) * each).toFixed(3);
        if (endSec - startSec < 0.1) return; // degenerate window (trim-clamped)
        // Talking scenes: chunks under the callout are sacrificed so the subtitle
        // resumes after it clears (b-roll already dropped the whole line above).
        if (startSec < overlayClearSec) return;
        if (preset.caption.chunkAnim === 'bars') {
          const lineH = Math.round(fontsize * 1.15);
          const lineGap = Math.round(fontsize * 0.12);
          layers.push({
            kind: 'text', text: lines.join('\n'), fontsize, color: preset.caption.fillColor,
            boxAlpha: preset.caption.boxAlpha,
            xExpr: '(w-text_w)/2', yBase: cy,
            anim: 'bars', startSec, endSec,
            words: lines.map((line, lineIdx) => ({
              word: line,
              start: +Math.min(endSec - 0.1, startSec + lineIdx * 0.18).toFixed(3),
              end: endSec,
              xPx: Math.round((w - estWidth(line, fontsize, adv)) / 2),
              yPx: cy + lineIdx * (lineH + lineGap),
            })),
          });
        } else if (wordLevel && lines.length === 1) {
          layers.push({
            kind: 'text', text: c, fontsize, color: preset.caption.fillColor,
            boxAlpha: preset.caption.boxAlpha,
            xExpr: `${Math.round((w - estWidth(c, fontsize, adv)) / 2)}`, yBase: cy,
            anim: preset.caption.chunkAnim as TextLayer['anim'],
            startSec, endSec,
            words: wordTimings(c, startSec, endSec, fontsize, adv, w),
          });
        } else {
          layers.push({
            kind: 'text', text: lines.join('\n'), fontsize, color: preset.caption.fillColor,
            boxAlpha: preset.caption.boxAlpha,
            xExpr: '(w-text_w)/2', yBase: cy,
            anim: preset.caption.chunkAnim === 'none' ? 'none' : 'pop',
            startSec, endSec,
          });
        }
      });
    }
  }
  return layers;
}

// ---- End-card overlay (offer recap) ----
// Burned ONLY into the LAST scene (the CTA close): a gold offer-recap line
// popping in and holding to the end of the ad. (The price-anchor second line
// was removed 2026-06-13 — PH advertisers hide price to drive curiosity DMs.)
// Default band is upper-middle, but when the scene carries a measured
// face-clear band (captionRegion — the same signal captions use) the recap
// drops to the TOP of that band instead: the fixed 0.26h band sat directly on
// the presenter's head in talking-head closes (2026-06-13 final-render review).
// Captions center at the band's mid, so band-top keeps the two clear.
const END_CARD_TOP_FRAC = 0.26;
const END_CARD_RECAP_IN = 0.3;

export function planEndCardLayers(
  endCard: FinalRenderEndCard | undefined,
  trimSec: number | null,
  dims: [number, number],
  preset: RenderPreset = CLASSIC,
  // Texts the scene already burns (EDL overlay, script line) — a recap that
  // duplicates one is dropped, mirroring planScene's overlay-vs-caption dedup.
  existingTexts: (string | undefined)[] = [],
  // The last scene's measured face-clear band; absent → fixed upper-middle band.
  captionRegion?: { yFracTop: number; yFracBottom: number }
): DrawLayer[] {
  const recap = endCard?.recapText ? stripUnrenderable(endCard.recapText) : '';
  if (!recap) return [];
  const existing = existingTexts.filter((t): t is string => !!t).map(normText);
  const dup = (t: string) => existing.includes(normText(t));
  const [, h] = dims;
  const sz = safeZone(dims);
  const end = typeof trimSec === 'number' && trimSec > 0 ? trimSec : 999;
  const adv = preset.caption.advRatio;
  const layers: DrawLayer[] = [];
  // Face-aware: top of the face-clear band when measured (captions own the
  // band's mid), clamped inside the safe zone; else the legacy fixed band.
  const y = captionRegion
    ? Math.min(Math.max(Math.round(h * captionRegion.yFracTop), sz.topY), sz.bottomY - Math.round(h * preset.caption.overlaySizeFrac))
    : Math.round(h * END_CARD_TOP_FRAC);

  if (!dup(recap) && end - END_CARD_RECAP_IN >= 0.4) {
    const { fontsize, lines } = fitText(recap, sz.usableW, Math.round(h * preset.caption.overlaySizeFrac), adv);
    // No emphasisSfx on the recap: at 0.3s it would collide (min-gap 0.4) with
    // the cut whoosh / the EDL overlay's own sound and evict one.
    layers.push({
      kind: 'text', text: lines.join('\n'), fontsize, color: preset.caption.highlightColor,
      boxAlpha: preset.caption.boxAlpha, xExpr: '(w-text_w)/2', yBase: y,
      startSec: END_CARD_RECAP_IN, endSec: end, anim: 'pop',
    });
  }
  return layers;
}

// ---- Cut transitions (preset-driven). Visual burn-ins at scene boundaries that
// keep the per-scene-then-concat architecture intact: the outgoing scene's tail
// and/or the incoming scene's head get a fade/blur, so the concat point reads as
// a flash / dip-to-black / whip-pan instead of a bare hard cut. xfade was
// rejected — it needs overlapping frames across scene files (a mega-filtergraph
// or N-1 extra re-encodes). References (edit_style_research.md §3): whip-pan
// blur is the universal mask; flash/strobe bookend two of three short refs. ----

// ---- Camera effects (preset-driven). The EDL's cameraEffect hint becomes a real
// burn-in: per-frame `scale … eval=frame` + center crop (zoompan rejected — it's
// a stills tool and resamples fps; animated crop w/h rejected — w/h eval once in
// this build, same constraint as drawbox). Inserted BEFORE drawtext so captions
// never zoom and stay inside safe zones. References (edit_style_research.md §3):
// "always be zooming" — 3-6%/s push on every shot, alternating direction. ----

/**
 * The effect actually rendered for a scene: explicit EDL hint wins; otherwise
 * the preset's default, with zoom direction alternating per scene index so
 * back-to-back scenes don't creep the same way (fake-handheld energy). Returns
 * null when the preset ignores camera work (classic, intensity 0).
 */
export function effectiveCameraEffect(
  hint: CameraEffect | undefined,
  sceneIndex: number,
  cam: CameraStyle
): CameraEffect | null {
  if (cam.intensity === 0) return null;
  if (hint && hint !== 'none') return hint;
  if (cam.defaultEffect === 'none') return null;
  if (cam.defaultEffect === 'zoom-in' || cam.defaultEffect === 'zoom-out') {
    const flip = cam.defaultEffect === 'zoom-in' ? 'zoom-out' : 'zoom-in';
    return sceneIndex % 2 === 0 ? cam.defaultEffect : flip;
  }
  return cam.defaultEffect;
}

/**
 * ffmpeg filter for one scene's camera move, or null for none. Zooms ramp
 * linearly over the trimmed scene length; chunk punches add an instant +punchZoom
 * that decays over 0.25s at each caption-chunk start (the beat-cut feel without
 * cutting). Width is trunc'd to even for the encoder; crop x/y re-center per
 * frame. Pan slides a static 6% oversize left→right across the scene.
 */
export function buildCameraFilter(
  effect: CameraEffect | null,
  durSec: number | null,
  dims: [number, number],
  cam: CameraStyle,
  punchTimes: number[] = []
): string | null {
  if (!effect || effect === 'none' || cam.intensity === 0) return null;
  if (typeof durSec !== 'number' || durSec <= 0) return null;
  const [w, h] = dims;
  const D = durSec.toFixed(3);
  const span = +(cam.sceneZoom - 1).toFixed(4);
  const punch = +(cam.chunkPunchZoom - 1).toFixed(4);
  const punches = cam.chunkPunch && punch > 0
    ? punchTimes
        .filter((t) => t < durSec)
        .slice(0, cam.maxPunchesPerScene)
        .map((t) => `+${punch}*gte(t,${t.toFixed(3)})*max(0,1-(t-${t.toFixed(3)})/0.25)`)
        .join('')
    : '';

  let zExpr: string | null = null;
  if (effect === 'zoom-in') zExpr = `1+${span}*min(1,t/${D})${punches}`;
  else if (effect === 'zoom-out') zExpr = `${cam.sceneZoom}-${span}*min(1,t/${D})${punches}`;
  else if (effect === 'shake') {
    // v1: a single decaying punch at the cut (true jitter reads cheap at 30fps).
    zExpr = `1+${(punch > 0 ? punch : 0.05).toFixed(4)}*max(0,1-t/0.25)${punches}`;
  }
  // setsar=1 re-pins the sample ratio after scaling — h=-2 rounding nudges SAR
  // off 1:1 (e.g. 2331:2332 at the end of a zoom-out ramp), and concat refuses
  // mixed-SAR inputs ("Failed to configure output pad").
  if (zExpr) {
    return (
      `scale=w='trunc(${w}*(${zExpr})/2)*2':h=-2:eval=frame,` +
      `crop=${w}:${h}:(iw-${w})/2:(ih-${h})/2,setsar=1`
    );
  }
  // pan: static oversize, x sweeps L→R across the scene (crop x IS per-frame).
  const ow = Math.round((w * 1.06) / 2) * 2;
  return `scale=${ow}:-2,crop=${w}:${h}:x='(iw-${w})*min(1,t/${D})':y=(ih-${h})/2,setsar=1`;
}

export interface TransitionPlan {
  fadeOutTail: boolean;
  fadeInHead: boolean;
  /** Per-side kind overrides (hook cut may burn while other cuts flash/whip). */
  tailKind?: TransitionStyle['kind'];
  headKind?: TransitionStyle['kind'];
}

/**
 * Decide which cuts get a transition. Pure + deterministic (mirrors pickSceneSfx
 * restraint): cut k is the boundary INTO scene k (k≥1) — scene 0 never receives
 * a head transition (nothing transitions into the hook). Every Nth cut starting
 * from the first, capped at maxPerAd. Whip is incoming-only (the blur reads as
 * camera movement); flash/dip burn both sides of the cut.
 *
 * `hookBurn` reserves the hook→scene-2 cut for a light-leak/film-burn (both
 * sides, kind 'burn', NOT counted against maxPerAd) — the reference move for
 * blending the hook into the body (Neil 2026-06-10).
 */
export function planTransitions(
  sceneCount: number,
  t: TransitionStyle,
  hookBurn: boolean = false
): TransitionPlan[] {
  const plans: TransitionPlan[] = Array.from(
    { length: Math.max(0, sceneCount) },
    () => ({ fadeOutTail: false, fadeInHead: false })
  );
  if (sceneCount >= 2 && hookBurn) {
    plans[0].fadeOutTail = true;
    plans[0].tailKind = 'burn';
    plans[1].fadeInHead = true;
    plans[1].headKind = 'burn';
  }
  if (t.kind === 'none' || t.maxPerAd <= 0 || sceneCount < 2) return plans;
  const everyN = Math.max(1, t.everyN);
  let used = 0;
  for (let cut = 1; cut < sceneCount && used < t.maxPerAd; cut++) {
    if ((cut - 1) % everyN !== 0) continue;
    if (cut === 1 && hookBurn) continue; // the burn owns the hook cut
    if (t.kind !== 'whip') plans[cut - 1].fadeOutTail = true;
    plans[cut].fadeInHead = true;
    used++;
  }
  return plans;
}

/**
 * ffmpeg filter snippet for one scene's transition burn-ins (appended AFTER
 * drawtext so a flash covers captions too). Tail fades need the trimmed length;
 * when trimSec is unknown the tail is skipped (head still renders). Whip = a
 * 3-step decaying boxblur over the first 3×halfDur (blur radius can't animate
 * per-frame in this build; time-gated `enable` can — same trick as the wipe box).
 */
/** Film-burn step length (per side, 3 decaying/ramping steps each). */
const BURN_STEP = 0.12;

export function buildTransitionFilters(
  plan: TransitionPlan,
  style: TransitionStyle,
  trimSec: number | null
): string {
  const parts: string[] = [];
  const headKind = plan.fadeInHead ? plan.headKind ?? style.kind : 'none';
  const tailKind = plan.fadeOutTail ? plan.tailKind ?? style.kind : 'none';
  const d = style.halfDurSec;

  // --- incoming head ---
  if ((headKind === 'flash' || headKind === 'dip') && d > 0) {
    parts.push(`fade=t=in:st=0:d=${d}:color=${headKind === 'flash' ? 'white' : 'black'}`);
  } else if (headKind === 'whip' && d > 0) {
    parts.push(
      `boxblur=18:1:enable='lt(t,${d.toFixed(3)})'`,
      `boxblur=8:1:enable='between(t,${d.toFixed(3)},${(2 * d).toFixed(3)})'`,
      `boxblur=3:1:enable='between(t,${(2 * d).toFixed(3)},${(3 * d).toFixed(3)})'`
    );
  } else if (headKind === 'burn') {
    // Light-leak in: warm overexposed wash decaying over 3 steps (eq/gblur have
    // timeline support; their params can't animate per-frame, so step the decay).
    const b = BURN_STEP;
    parts.push(
      `eq=brightness=0.32:saturation=1.4:gamma_r=1.45:gamma_g=1.15:enable='lt(t,${b.toFixed(3)})'`,
      `gblur=sigma=6:enable='lt(t,${b.toFixed(3)})'`,
      `eq=brightness=0.16:saturation=1.2:gamma_r=1.22:gamma_g=1.08:enable='between(t,${b.toFixed(3)},${(2 * b).toFixed(3)})'`,
      `eq=brightness=0.07:gamma_r=1.1:enable='between(t,${(2 * b).toFixed(3)},${(3 * b).toFixed(3)})'`
    );
  }

  // --- outgoing tail (needs the trimmed length to anchor) ---
  if (typeof trimSec === 'number') {
    if ((tailKind === 'flash' || tailKind === 'dip') && d > 0 && trimSec > 2 * d) {
      parts.push(`fade=t=out:st=${(trimSec - d).toFixed(3)}:d=${d}:color=${tailKind === 'flash' ? 'white' : 'black'}`);
    } else if (tailKind === 'burn' && trimSec > 4 * BURN_STEP) {
      // Light-leak out: ramp UP into the cut (mirror of the head).
      const b = BURN_STEP;
      const t3 = (trimSec - b).toFixed(3);
      const t2 = (trimSec - 2 * b).toFixed(3);
      const t1 = (trimSec - 3 * b).toFixed(3);
      parts.push(
        `eq=brightness=0.07:gamma_r=1.1:enable='between(t,${t1},${t2})'`,
        `eq=brightness=0.16:saturation=1.2:gamma_r=1.22:gamma_g=1.08:enable='between(t,${t2},${t3})'`,
        `eq=brightness=0.32:saturation=1.4:gamma_r=1.45:gamma_g=1.15:enable='gte(t,${t3})'`,
        `gblur=sigma=6:enable='gte(t,${t3})'`
      );
    }
  }
  return parts.join(',');
}

// ---- ffmpeg layer builders. Expression option values are SINGLE-QUOTED so the
// filtergraph parser treats inner commas as literal (no backslash escaping). ----

/** drawtext for one TextLayer; fontName/textName are bare (ffmpeg runs cwd=dir). */
export function buildTextFilter(
  l: TextLayer,
  fontName: string,
  textName: string,
  preset: RenderPreset = CLASSIC
): string {
  const s = l.startSec;
  let yExpr = `${l.yBase}`;
  let fontsizeOpt = `fontsize=${l.fontsize}`;
  let alpha = `1`;

  if (l.anim === 'slideup') {
    // Hook entrance, HOOK_REVEAL-keyed. Alpha SNAPS in over HOOK_FADE_SEC so the
    // motion (not a slow opacity ramp) carries the reveal — the old linear slide+
    // fade read as a plain fade (Neil, 2026-06-08). pow() bases are kept ≥0 via
    // (1-p) so ffmpeg's eval never hits pow(negative,...).
    alpha = `min(1,max(0,(t-${s})/${HOOK_FADE_SEC}))`;
    if (HOOK_REVEAL === 'slam') {
      const p = `min(1,max(0,(t-${s})/${HOOK_SLAM_DUR}))`;
      yExpr = `${l.yBase}+${HOOK_SLAM_RISE}*pow(1-${p},4)`;
    } else if (HOOK_REVEAL === 'flip') {
      const p = `min(1,max(0,(t-${s})/${HOOK_FLIP_DUR}))`;
      const ease = `(1-${FLIP_C3}*pow(1-${p},3)+${FLIP_C1}*pow(1-${p},2))`;
      fontsizeOpt = `fontsize='max(10,${l.fontsize}*(${HOOK_FLIP_MINSCALE}+${HOOK_FLIP_SPAN}*${ease}))'`;
      yExpr = `${l.yBase}+${HOOK_FLIP_RISE}*(1-${p})`;
    } else {
      // bounce (default): easeOutBack overshoots the target then settles.
      const p = `min(1,max(0,(t-${s})/${HOOK_BOUNCE_DUR}))`;
      yExpr = `${l.yBase}+${HOOK_BOUNCE_RISE}*(${BOUNCE_C3}*pow(1-${p},3)-${BOUNCE_C1}*pow(1-${p},2))`;
    }
  } else if (l.anim === 'fade') {
    alpha = `max(0,min(1,min((t-${s})/${OVERLAY_FADE},(${l.endSec}-t)/${OVERLAY_FADE})))`;
  } else if (l.anim === 'pop') {
    // Chunk pop (the dominant 2026 caption meta — research §3.1): alpha snaps in
    // near-instantly while the glyphs scale 85%→100% with a slight easeOutBack
    // overshoot over 0.15s. Same pow(1-p,…) shape as the hook flip (base ≥0).
    const p = `min(1,max(0,(t-${s})/0.15))`;
    const ease = `(1-${FLIP_C3}*pow(1-${p},3)+${FLIP_C1}*pow(1-${p},2))`;
    fontsizeOpt = `fontsize='max(8,${l.fontsize}*(0.85+0.15*${ease}))'`;
    alpha = `min(1,max(0,(t-${s})/0.06))`;
  }

  const sh = preset.caption.shadow;
  const outlineW = l.boxAlpha > 0 ? 0 : Math.round(l.fontsize * preset.caption.borderWFrac);
  const opts = [
    `fontfile=${fontName}`,
    `textfile=${textName}`,
    fontsizeOpt,
    `fontcolor=${l.color}`,
    ...(sh ? [`shadowcolor=${sh.color}`, `shadowx=${sh.dx}`, `shadowy=${sh.dy}`] : []),
    `line_spacing=10`,
    ...(l.boxAlpha > 0
      ? [`box=1`, `boxcolor=black@${l.boxAlpha}`, `boxborderw=${Math.round(l.fontsize * 0.22)}`]
      : outlineW > 0
        ? [`borderw=${outlineW}`, `bordercolor=black`]
        : []),
    `x='${l.xExpr}'`,
    `y='${yExpr}'`,
    `alpha='${alpha}'`,
    `enable='between(t,${l.startSec},${l.endSec})'`,
  ];
  return `drawtext=${opts.join(':')}`;
}

/** Number of vertical slices used to animate the L→R box wipe. */
export const WIPE_SLICES = 24;

/**
 * L→R wipe for one BoxLayer. ffmpeg's `drawbox` evaluates w/x/y/h ONCE (no
 * `eval=frame` option in this build), so a `t`-based width can't animate. Instead
 * we emit WIPE_SLICES thin static boxes left→right, each revealed by a time-gated
 * `enable` (which IS per-frame) — cumulatively they fill the box from the left.
 */
export function buildBoxFilter(l: BoxLayer): string {
  const sliceW = l.w / WIPE_SLICES;
  const step = l.wipeDur / WIPE_SLICES;
  const parts: string[] = [];
  for (let i = 0; i < WIPE_SLICES; i++) {
    // Integer-tiled boundaries → adjacent slices with no overlap (no alpha-doubled
    // seam) and no gap, so the cascade reads as one clean bar growing L→R.
    const x = Math.round(l.x + i * sliceW);
    const xNext = Math.round(l.x + (i + 1) * sliceW);
    const tOn = (l.startSec + i * step).toFixed(3);
    parts.push(
      `drawbox=x=${x}:y=${l.y}:w=${xNext - x}:h=${l.h}:color=${l.color}@0.9:t=fill:enable='gte(t,${tOn})'`
    );
  }
  return parts.join(',');
}

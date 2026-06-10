import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, statSync, existsSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';
import type { FinalRenderScene, SfxBankId, OverlayStyle } from '../../types.js';
import { CLASSIC, type RenderPreset, type HookRevealStyle, type TransitionStyle } from './renderPresets.js';

// Final-render executor muscle (Phase 2 of workflows/render_pipeline_voice_10.md).
// Mirrors the Phase-0-validated invocations in scripts/ffmpeg-spike.mjs exactly:
//   per scene: trim-to-speech-end + mux voice MP3 + normalize (fps/scale/sar/48k,
//   H.264/AAC), then concat via the concat FILTER with re-encode (NOT the
//   demuxer) to avoid A/V drift (premortem #5).
//
// Trim length comes from `silencedetect` on the voice MP3 + a 0.3s pad so a soft
// final word survives (premortem #4c). Audio-less scenes use fallbackDurationSec
// (EDL keepSegments) or the full clip, with a silent track so concat stays
// stream-uniform.

const FPS = 30;
const PRESET = 'veryfast';
const CRF = '20';
const PAD_SEC = 0.3;            // keep a soft final word from being clipped
const SILENCE_NOISE_DB = '-35dB';
const SILENCE_MIN_SEC = '0.4';  // min trailing-silence run to treat as dead air
const HOOK_REVEAL_HOLD_SEC = 1.0; // hook: hold the product reveal this long past the VO end (vs a long silent morph tail)

const DIMS: Record<string, [number, number]> = {
  '9:16': [1080, 1920],
  '16:9': [1920, 1080],
  '1:1': [1080, 1080],
};

export class RenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RenderError';
  }
}

export function dimsFor(aspectRatio: string): [number, number] {
  return DIMS[aspectRatio] ?? DIMS['9:16'];
}

// ---------------------------------------------------------------------------
// Burn-in (overlays / captions / SFX / music) — additive on top of trim+concat.
// Assets are Neil-provided and bundled via vercel.json includeFiles; every
// asset lookup is existsSync-guarded so a missing file degrades to today's bare
// stitch rather than failing the render.
// ---------------------------------------------------------------------------

const SFX_VOLUME = CLASSIC.sfx.volume; // SFX sit under the VO, not over it
// VO-FIRST bed (Neil, 2026-06-08): in direct-response the voice-over IS the sale,
// so music is seasoning. 0.34 fought the VO on a full-ad listen; drop to 0.18 with
// a moderate fast duck so the bed only breathes in the gaps. Final loudness is
// pinned by the -14 LUFS master (LOUDNORM) so every ad ships at a consistent level.
const MUSIC_VOLUME = 0.18;       // bed gain before sidechain ducking
const MUSIC_FADE_SEC = 0.4;      // afade in/out on the bed
const MUSIC_DUCK = 'threshold=0.04:ratio=5:attack=5:release=280'; // duck hard+fast under VO
const LOUDNORM = 'loudnorm=I=-14:TP=-1.5:LRA=11'; // social/Reels target, VO-anchored

// Transition-class SFX land on a CUT, not mid-scene. The renderer knows the exact
// cut (a scene boundary), so these snap to it deterministically — the text EDL's
// guessed anchorSec can't (it never sees the rendered frame). See snapSfxAnchor.
const TRANSITION_SFX: ReadonlySet<SfxBankId> = new Set<SfxBankId>(['whoosh', 'swish']);
// Each strategic overlay carries a paired sound that lands on its EXACT on-screen
// frame (planScene tags the layer; renderFinalVideo places it at layer.startSec) —
// the "emphasize what the viewer sees" sync, deterministic unlike the text EDL's
// guessed anchorSec. Chunked spoken-word captions get none (restraint: 1/scene).
// (boom on the hook flip, pop on callouts, ding on the CTA, nothing on subtitles.)
const OVERLAY_SFX: Record<OverlayStyle, SfxBankId | null> = CLASSIC.sfx.overlayMap;
const CALLOUT_LEAD = 0.3; // delay a callout/punchline so its pop reads distinct from the cut whoosh

// Restraint — keep ads from sounding cheap (Neil: multiple stacked sounds read as
// AI slop). No two SFX within MIN_SFX_GAP (kills whoosh+pop stacking); transition
// whooshes capped per ad. Emphasis SFX (hook/callout/CTA) are uncapped — they're
// tied to overlays and self-limit, and they win when a whoosh collides with them.
const MIN_SFX_GAP = 0.4;   // seconds between any two placed SFX
const MAX_WHOOSH = CLASSIC.sfx.maxWhoosh; // transition whooshes per ad

// Resolve `assets/<rel>` from either the compiled module dir (local/dev) or the
// repo-root path Vercel's includeFiles preserves into the lambda. `GRIFON_ASSET_DIR`
// (first when set) lets the synthetic test harness point at temp assets without
// touching the repo; unset in prod so resolution is unchanged.
const ASSET_ROOTS = [
  process.env.GRIFON_ASSET_DIR,
  join(dirname(fileURLToPath(import.meta.url)), 'assets'),
  join(process.cwd(), 'api', '_lib', 'assets'),
].filter((p): p is string => !!p);

export function findAsset(rel: string): string | null {
  for (const root of ASSET_ROOTS) {
    const p = join(root, rel);
    if (existsSync(p)) return p;
  }
  return null;
}

const sfxPath = (id: string) => findAsset(join('sfx', `${id}.mp3`));
const musicPath = (style: string) => findAsset(join('music', `${style}.mp3`));
const fontPath = () => findAsset(join('fonts', 'Inter-Black.ttf'));

/** Escape a filesystem path for use inside an ffmpeg filtergraph option value
 * (forward-slash the separators, escape the Windows drive colon). spawnSync
 * needs no shell quoting; this is purely the filtergraph parser's escaping. */
export function escFilterPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/:/g, '\\:');
}

// ---------------------------------------------------------------------------
// CapCut-grade overlay/caption engine — pure helpers (unit-tested), no ffmpeg.
// All "where/when" is computed here (or upstream in EditVideo); ffmpeg just draws.
// ---------------------------------------------------------------------------

// Styling — derived from the CLASSIC preset (api/_lib/renderPresets.ts) so the
// preset object is the single source of truth and CLASSIC can never drift from
// the live render. Colors are ffmpeg color syntax.
const HOOK_BOX_COLOR = CLASSIC.hook.wipeColor;   // crimson highlight behind the hook power-word
const BOX_ALPHA = CLASSIC.caption.boxAlpha;      // black caption/overlay box opacity
const CLASSIC_SHADOW = CLASSIC.caption.shadow ?? { dx: 0, dy: 0, color: 'black@0' };
const SHADOW_COLOR = CLASSIC_SHADOW.color;       // hard 45° drop shadow (no Gaussian blur in drawtext)
const SHADOW_DX = CLASSIC_SHADOW.dx, SHADOW_DY = CLASSIC_SHADOW.dy;
const INTER_ADV = CLASSIC.caption.advRatio;      // est. Inter-Black glyph advance / fontsize (tune visually)

// Safe zone (fractions). Erring toward Reels' aggressive bottom UI.
const SZ_SIDE = 0.10, SZ_TOP = 0.14, SZ_BOTTOM = 0.22;
const HOOK_TOP_FRAC = 0.32;          // hook text top, upper-center
const CAPTION_FRAC = CLASSIC.caption.yFracTalking; // caption/overlay band (talking); b-roll a touch lower
const BROLL_CAPTION_FRAC = CLASSIC.caption.yFracBroll;

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
const HOOK_FLIP_SPAN = 1 - HOOK_FLIP_MINSCALE, FLIP_C1 = 1.70158, FLIP_C3 = 2.70158;

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

/** Rough rendered width of a line at a font size (Inter-Black caps advance). */
export function estWidth(text: string, fontsize: number): number {
  return text.length * fontsize * INTER_ADV;
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
    .replace(/\s+/g, ' ')
    .trim();
}

/** Fit text into maxWidthPx: shrink the font (to 70%), then wrap to ≤2 lines. */
export function fitText(text: string, maxWidthPx: number, baseSize: number): { fontsize: number; lines: string[] } {
  const minSize = Math.round(baseSize * 0.7);
  let size = baseSize;
  if (estWidth(text, size) <= maxWidthPx) return { fontsize: size, lines: [text] };
  while (size > minSize && estWidth(text, size) > maxWidthPx) size -= 2;
  if (estWidth(text, size) <= maxWidthPx) return { fontsize: size, lines: [text] };
  // Still too wide → wrap to two balanced lines, then re-shrink to the longest.
  const lines = wrapTwoLines(text);
  size = baseSize;
  const longest = () => Math.max(...lines.map((l) => estWidth(l, size)));
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
export function chunkCaption(line: string, availSec: number): string[] {
  const clean = stripUnrenderable(line);
  if (!clean) return [];
  const words = clean.split(/\s+/);
  const maxByTime = Math.max(1, Math.floor(availSec / MIN_CHUNK_SEC));
  const target = Math.min(maxByTime, Math.max(1, Math.ceil(words.length / 3.5)));
  const groups = evenSplit(words, target);
  // Pull a particle that landed at a chunk head back onto the previous chunk.
  for (let g = 1; g < groups.length; g++) {
    while (groups[g].length && PARTICLES.has(groups[g][0].toLowerCase())) {
      groups[g - 1].push(groups[g].shift() as string);
    }
  }
  return groups.filter((g) => g.length).map((g) => g.join(' '));
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
 * lands within `minGap` of an already-placed sound (kills stacking), and
 * transition whooshes are capped at `maxWhoosh` per ad. Pure + order-stable so it
 * unit-tests cleanly; the caller threads `placedSec` / `whooshUsed` across scenes.
 */
export function pickSceneSfx(
  candidates: SfxCandidate[],
  placedSec: number[],
  whooshUsed: number,
  maxWhoosh: number = MAX_WHOOSH,
  minGap: number = MIN_SFX_GAP
): SfxCandidate[] {
  const ordered = [...candidates].sort(
    (a, b) => Number(a.transition) - Number(b.transition) || a.globalSec - b.globalSec
  );
  const placed = [...placedSec];
  const kept: SfxCandidate[] = [];
  let whoosh = whooshUsed;
  for (const c of ordered) {
    if (placed.some((t) => Math.abs(t - c.globalSec) < minGap)) continue;
    if (c.transition) {
      if (whoosh >= maxWhoosh) continue;
      whoosh++;
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
  anim: 'slideup' | 'fade' | 'none';
  emphasisSfx?: SfxBankId; // a sound to fire ON this text's appearance (startSec)
}
export interface BoxLayer {
  kind: 'box';
  x: number; y: number; w: number; h: number;
  color: string; startSec: number; wipeDur: number;
}
export type DrawLayer = TextLayer | BoxLayer;

const normText = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Y (top of text) for a scene's caption/overlay band, region-aware + safe-clamped. */
function captionY([, h]: [number, number], sz: SafeZone, scene: FinalRenderScene): number {
  let frac = scene.sceneType && scene.sceneType !== 'talking' ? BROLL_CAPTION_FRAC : CAPTION_FRAC;
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
export function planScene(scene: FinalRenderScene, trimSec: number | null, dims: [number, number]): DrawLayer[] {
  const [w, h] = dims;
  const sz = safeZone(dims);
  const end = typeof trimSec === 'number' && trimSec > 0 ? trimSec : 999;
  const layers: DrawLayer[] = [];
  const overlay = scene.overlayText?.[0];

  if (scene.isHook) {
    const text = overlay?.text ? stripUnrenderable(overlay.text) : '';
    if (!text) return layers;
    const { fontsize, lines } = fitText(text, sz.usableW, Math.round(h * CLASSIC.hook.sizeFrac));
    const yTop = Math.round(h * HOOK_TOP_FRAC);
    // Crimson wipe-box behind the WHOLE title (Neil: highlight the full line, not
    // just the last word). Spans the widest line; height covers all lines' lower band.
    const maxLineW = Math.max(...lines.map((l) => estWidth(l, fontsize)));
    const pad = Math.round(fontsize * 0.14);
    const lineH = Math.round(fontsize * 1.15);
    layers.push({
      kind: 'box',
      x: Math.max(sz.xMargin, Math.round((w - maxLineW) / 2 - pad)),
      y: Math.round(yTop + fontsize * 0.42),
      w: Math.round(maxLineW) + 2 * pad,
      h: (lines.length - 1) * lineH + Math.round(fontsize * 0.58),
      color: HOOK_BOX_COLOR, startSec: HOOK_BOX_DELAY, wipeDur: HOOK_WIPE_DUR,
    });
    layers.push({
      kind: 'text', text: lines.join('\n'), fontsize, color: CLASSIC.hook.textColor, boxAlpha: 0,
      xExpr: '(w-text_w)/2', yBase: yTop, startSec: HOOK_DELAY, endSec: end, anim: 'slideup',
      emphasisSfx: OVERLAY_SFX.hook ?? undefined, // boom on the flip pop
    });
    return layers;
  }

  // Scenes 2+: EDL overlay (≥hold) → chunked script-line captions.
  const oText = overlay?.text ? stripUnrenderable(overlay.text) : '';
  const cap = scene.scriptLine ? stripUnrenderable(scene.scriptLine) : '';
  const dup = !!(oText && cap && normText(oText) === normText(cap));
  const cy = captionY(dims, sz, scene);
  let capStart = CAPTION_START_PAD;

  if (oText && !dup) {
    const { fontsize, lines } = fitText(oText, sz.usableW, Math.round(h * CLASSIC.caption.overlaySizeFrac));
    const color = overlay!.style === 'callout' || overlay!.style === 'punchline' ? '0xFFCC00' : 'white';
    const emphasisSfx = OVERLAY_SFX[overlay!.style] ?? undefined;
    const oEnd = Math.min(end, OVERLAY_HOLD_SEC);
    // Offset a sound-paired overlay so its pop reads after the cut whoosh — but
    // never so far that the overlay shows < 0.4s.
    const oStart = emphasisSfx ? Math.min(CALLOUT_LEAD, Math.max(0, oEnd - 0.4)) : 0;
    if (oEnd - oStart >= 0.4) {
      layers.push({
        kind: 'text', text: lines.join('\n'), fontsize, color, boxAlpha: BOX_ALPHA,
        xExpr: '(w-text_w)/2', yBase: cy, startSec: oStart, endSec: oEnd, anim: 'fade',
        emphasisSfx,
      });
      capStart = oEnd + 0.1;
    }
  }

  if (cap) {
    const avail = end - capStart;
    if (avail >= MIN_CHUNK_SEC) {
      const chunks = chunkCaption(cap, avail);
      const each = avail / Math.max(1, chunks.length);
      chunks.forEach((c, i) => {
        const { fontsize, lines } = fitText(c, sz.usableW, Math.round(h * CLASSIC.caption.baseSizeFrac));
        layers.push({
          kind: 'text', text: lines.join('\n'), fontsize, color: 'white', boxAlpha: BOX_ALPHA,
          xExpr: '(w-text_w)/2', yBase: cy, anim: 'none',
          startSec: +(capStart + i * each).toFixed(3), endSec: +(capStart + (i + 1) * each).toFixed(3),
        });
      });
    }
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

export interface TransitionPlan { fadeOutTail: boolean; fadeInHead: boolean; }

/**
 * Decide which cuts get a transition. Pure + deterministic (mirrors pickSceneSfx
 * restraint): cut k is the boundary INTO scene k (k≥1) — scene 0 never receives
 * a head transition (nothing transitions into the hook). Every Nth cut starting
 * from the first, capped at maxPerAd. Whip is incoming-only (the blur reads as
 * camera movement); flash/dip burn both sides of the cut.
 */
export function planTransitions(sceneCount: number, t: TransitionStyle): TransitionPlan[] {
  const plans: TransitionPlan[] = Array.from(
    { length: Math.max(0, sceneCount) },
    () => ({ fadeOutTail: false, fadeInHead: false })
  );
  if (t.kind === 'none' || t.maxPerAd <= 0 || sceneCount < 2) return plans;
  const everyN = Math.max(1, t.everyN);
  let used = 0;
  for (let cut = 1; cut < sceneCount && used < t.maxPerAd; cut++) {
    if ((cut - 1) % everyN !== 0) continue;
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
export function buildTransitionFilters(
  plan: TransitionPlan,
  style: TransitionStyle,
  trimSec: number | null
): string {
  const d = style.halfDurSec;
  if (style.kind === 'none' || d <= 0) return '';
  const parts: string[] = [];
  if (style.kind === 'flash' || style.kind === 'dip') {
    const color = style.kind === 'flash' ? 'white' : 'black';
    if (plan.fadeInHead) parts.push(`fade=t=in:st=0:d=${d}:color=${color}`);
    if (plan.fadeOutTail && typeof trimSec === 'number' && trimSec > 2 * d) {
      parts.push(`fade=t=out:st=${(trimSec - d).toFixed(3)}:d=${d}:color=${color}`);
    }
  } else if (style.kind === 'whip' && plan.fadeInHead) {
    parts.push(
      `boxblur=18:1:enable='lt(t,${d.toFixed(3)})'`,
      `boxblur=8:1:enable='between(t,${d.toFixed(3)},${(2 * d).toFixed(3)})'`,
      `boxblur=3:1:enable='between(t,${(2 * d).toFixed(3)},${(3 * d).toFixed(3)})'`
    );
  }
  return parts.join(',');
}

// ---- ffmpeg layer builders. Expression option values are SINGLE-QUOTED so the
// filtergraph parser treats inner commas as literal (no backslash escaping). ----

/** drawtext for one TextLayer; fontName/textName are bare (ffmpeg runs cwd=dir). */
export function buildTextFilter(l: TextLayer, fontName: string, textName: string): string {
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
  }

  const opts = [
    `fontfile=${fontName}`,
    `textfile=${textName}`,
    fontsizeOpt,
    `fontcolor=${l.color}`,
    `shadowcolor=${SHADOW_COLOR}`,
    `shadowx=${SHADOW_DX}`,
    `shadowy=${SHADOW_DY}`,
    `line_spacing=10`,
    ...(l.boxAlpha > 0
      ? [`box=1`, `boxcolor=black@${l.boxAlpha}`, `boxborderw=${Math.round(l.fontsize * 0.22)}`]
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

// ---------------------------------------------------------------------------
// Pure parsers (unit-tested in tests/unit/renderFfmpeg.test.ts) — no ffmpeg.
// ---------------------------------------------------------------------------

/** Parse `Duration: HH:MM:SS.cs` from ffmpeg stderr → seconds, or null. */
export function parseDurationSec(stderr: string): number | null {
  const m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/** A trailing silence region's end counts as "at EOF" within this slack (s). */
const EOF_EPS = 0.25;

/**
 * From a `silencedetect` stderr dump + the clip duration, compute the trim
 * length: speech-end + pad, clamped to duration.
 *
 * Speech-end = the start of the TRAILING silence run. A run is "trailing" when it
 * is the last silence region AND it reaches the end of the file — i.e. either the
 * region is dangling (a silence_start with no silence_end after it) OR real ffmpeg
 * closed it with a silence_end at/near EOF (`>= duration - EOF_EPS`). Both forms
 * occur in practice; the EOF-closed form is what ffmpeg actually emits and was
 * previously misread as "speech runs to the end" (the dead-air bug).
 *
 * If the last silence region ends well before EOF (speech resumes after it), or
 * there are no silence regions, speech runs to the end → trim to the full
 * duration. Returns null only when duration is unknown and no trailing silence
 * was detected (caller falls back to -shortest / full clip).
 */
export function parseTrimSec(
  stderr: string,
  durationSec: number | null,
  padSec: number = PAD_SEC
): number | null {
  const regions: Array<{ start: number; end: number | null }> = [];
  let openStart: number | null = null;
  for (const line of stderr.split(/\r?\n/)) {
    let m: RegExpExecArray | null;
    if ((m = /silence_start:\s*(-?[\d.]+)/.exec(line))) {
      openStart = parseFloat(m[1]);
    } else if ((m = /silence_end:\s*([\d.]+)/.exec(line))) {
      if (openStart !== null) {
        regions.push({ start: openStart, end: parseFloat(m[1]) });
        openStart = null;
      }
    }
  }
  if (openStart !== null) regions.push({ start: openStart, end: null });

  const last = regions[regions.length - 1];
  if (!last) return durationSec; // no silence detected → speech reaches the end

  const reachesEof =
    last.end === null ||
    (durationSec !== null && last.end >= durationSec - EOF_EPS);

  if (reachesEof) {
    const padded = Math.max(0, last.start) + padSec;
    return durationSec !== null ? Math.min(padded, durationSec) : padded;
  }
  // Last silence ends before EOF → speech resumes after it → keep the full clip.
  return durationSec;
}

// ---------------------------------------------------------------------------
// ffmpeg invocations (spawnSync on the ffmpeg-static binary, like the spike).
// ---------------------------------------------------------------------------

function ffmpeg(args: string[], cwd?: string): { status: number; stderr: string } {
  if (!ffmpegPath) throw new RenderError('FFMPEG_NOT_AVAILABLE: ffmpeg-static path is null');
  const r = spawnSync(ffmpegPath, ['-hide_banner', ...args], { maxBuffer: 1 << 27, cwd });
  return { status: r.status ?? -1, stderr: r.stderr ? r.stderr.toString('utf8') : (r.error?.message ?? '') };
}

/** Probe a media file's duration (seconds) by reading ffmpeg's Duration line. */
export function probeDurationSec(path: string): number | null {
  // `ffmpeg -i <file>` with no output exits non-zero but prints Duration to stderr.
  const { stderr } = ffmpeg(['-i', path]);
  return parseDurationSec(stderr);
}

/** Run silencedetect on the voice MP3 and return the trim length in seconds. */
export function detectTrimSec(mp3Path: string): number | null {
  const { stderr } = ffmpeg([
    '-i', mp3Path,
    '-af', `silencedetect=noise=${SILENCE_NOISE_DB}:d=${SILENCE_MIN_SEC}`,
    '-f', 'null', '-',
  ]);
  const duration = parseDurationSec(stderr);
  return parseTrimSec(stderr, duration);
}

export interface TrimPlan {
  trimSec: number | null;
  /** Pad the audio to the video length (hook): keeps the full visual reveal. */
  padAudio: boolean;
}

/**
 * Per-scene trim decision. Ground-truth, script/product-agnostic:
 *
 *  PRIMARY — voiced scene → trim to the ACTUAL voice-over end measured from the
 *    VO MP3 (`detectedSec` = silencedetect speech-end + pad, capped to the clip).
 *    This never cuts the VO and removes BOTH the silent video tail AND any
 *    trailing silence baked into the MP3. The hook (`keepFullClip`) holds the
 *    product reveal a beat past the VO instead of a long silent morph tail.
 *    Replaces the old word-count `targetDurationSec` estimate, which under-trimmed
 *    some scenes (dead air) and over-trimmed others (cut the VO mid-word).
 *
 *  FALLBACKS (no audio, or silencedetect produced nothing):
 *    keepFullClip → full clip · targetDurationSec → estimate cap ·
 *    fallbackDurationSec → explicit duration · else → full clip.
 */
export function chooseTrim(
  scene: Pick<FinalRenderScene, 'keepFullClip' | 'targetDurationSec' | 'audioUrl' | 'fallbackDurationSec'>,
  probeSec: number | null,
  detectedSec: number | null
): TrimPlan {
  const cap = (t: number) => (typeof probeSec === 'number' ? Math.min(t, probeSec) : t);

  if (scene.audioUrl && typeof detectedSec === 'number' && detectedSec > 0) {
    if (scene.keepFullClip) {
      return { trimSec: cap(detectedSec + HOOK_REVEAL_HOLD_SEC), padAudio: true };
    }
    return { trimSec: cap(detectedSec), padAudio: false };
  }

  if (scene.keepFullClip) return { trimSec: probeSec, padAudio: !!scene.audioUrl };
  if (typeof scene.targetDurationSec === 'number' && scene.targetDurationSec > 0) {
    return { trimSec: cap(scene.targetDurationSec), padAudio: false };
  }
  if (typeof scene.fallbackDurationSec === 'number' && scene.fallbackDurationSec > 0) {
    return { trimSec: scene.fallbackDurationSec, padAudio: false };
  }
  return { trimSec: probeSec, padAudio: false };
}

/** Resolved-and-clamped SFX cue ready for the audio graph. */
export interface PreparedSfx {
  path: string;
  anchorSec: number;
}

/**
 * Trim + mux + normalize one scene to `outPath`, burning in overlays (drawtext)
 * and SFX (adelay+amix) on top of the verified trim. With a voice MP3 the video
 * is trimmed to the voice's speech-end; audio-less scenes get a silent track so
 * the downstream concat stays stream-uniform.
 *
 * Burn-in is strictly additive — when `burn` is empty (no overlays/sfx, or assets
 * missing) the produced graph is equivalent to the pre-burn-in trim+mux+normalize.
 */
function buildScene(
  videoPath: string,
  audioPath: string | null,
  trimSec: number | null,
  dims: [number, number],
  outPath: string,
  padAudioToVideo: boolean,
  dir: string,
  sceneIdx: number,
  layers: DrawLayer[],
  sfx: PreparedSfx[],
  fontName: string | null, // BARE filename inside `dir` (ffmpeg runs with cwd=dir)
  transitionFilters: string = '' // boundary fades/blur, appended after drawtext
): void {
  const [w, h] = dims;

  // --- Video chain: normalize, then apply the scene's draw plan (boxes + text).
  // drawtext/drawbox font/text files are referenced as BARE filenames and ffmpeg
  // runs with cwd=dir, so Windows drive-colon paths never enter the filtergraph
  // (an escaped `C:\` still breaks the parser — caught by the synthetic harness).
  let vChain =
    `[0:v]fps=${FPS},scale=${w}:${h}:force_original_aspect_ratio=decrease,` +
    `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1`;
  let k = 0;
  for (const layer of layers) {
    if (layer.kind === 'box') {
      vChain += `,${buildBoxFilter(layer)}`;
    } else if (fontName) {
      const textName = `ov_${sceneIdx}_${k++}.txt`;
      writeFileSync(join(dir, textName), layer.text, 'utf8');
      vChain += `,${buildTextFilter(layer, fontName, textName)}`;
    }
  }
  if (transitionFilters) vChain += `,${transitionFilters}`;
  vChain += '[v]';

  // --- Inputs: [0]=video, [1]=audio (voice or silence), [2..]=sfx. ---
  const inputs: string[] = ['-y', '-i', videoPath];
  if (audioPath) inputs.push('-i', audioPath);
  else inputs.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000');
  for (const s of sfx) inputs.push('-i', s.path);

  // --- Audio chain: base (voice padded/passthrough or silence) + SFX amix. ---
  const base = padAudioToVideo && audioPath ? `[1:a]apad[abase]` : `[1:a]anull[abase]`;
  let aChain = base;
  let aOut = '[abase]';
  if (sfx.length) {
    const sfxLabels: string[] = [];
    sfx.forEach((s, k) => {
      const ms = Math.round(s.anchorSec * 1000);
      aChain += `;[${2 + k}:a]adelay=${ms}|${ms},volume=${SFX_VOLUME}[sfx${k}]`;
      sfxLabels.push(`[sfx${k}]`);
    });
    aChain += `;[abase]${sfxLabels.join('')}amix=inputs=${1 + sfx.length}:normalize=0:dropout_transition=0[a]`;
    aOut = '[a]';
  }

  const tArgs = trimSec !== null ? ['-t', trimSec.toFixed(3)] : [];
  const args = [
    ...inputs,
    ...tArgs,
    '-filter_complex', `${vChain};${aChain}`,
    '-map', '[v]', '-map', aOut,
    '-c:v', 'libx264', '-preset', PRESET, '-crf', CRF,
    '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-shortest', outPath,
  ];

  const { status, stderr } = ffmpeg(args, dir);
  if (status !== 0) throw new RenderError(`scene_build_failed: ${stderr.slice(-400)}`);
}

/** Concat all per-scene MP4s via the concat filter with re-encode (each input
 * is already normalized to a common size/fps/sample-rate by buildScene). */
function concatScenes(muxedPaths: string[], outPath: string): void {
  const inputs = muxedPaths.flatMap((m) => ['-i', m]);
  const streams = muxedPaths.map((_, i) => `[${i}:v][${i}:a]`).join('');
  const args = [
    '-y', ...inputs,
    '-filter_complex', `${streams}concat=n=${muxedPaths.length}:v=1:a=1[v][a]`,
    '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', PRESET, '-crf', CRF,
    '-c:a', 'aac', '-ar', '48000', outPath,
  ];
  const { status, stderr } = ffmpeg(args);
  if (status !== 0) throw new RenderError(`concat_failed: ${stderr.slice(-400)}`);
}

/**
 * Final pass: lay a looped, faded music bed UNDER the program audio, ducking it
 * beneath the VO via sidechaincompress (program audio is the sidechain key).
 * Non-critical: returns false (and leaves the concat result untouched) on any
 * failure rather than throwing, so music never blocks the render.
 */
function mixMusic(
  concatPath: string,
  musicFile: string,
  totalSec: number | null,
  outPath: string
): boolean {
  const fadeOut =
    typeof totalSec === 'number' && totalSec > 2 * MUSIC_FADE_SEC
      ? `,afade=t=out:st=${(totalSec - MUSIC_FADE_SEC).toFixed(3)}:d=${MUSIC_FADE_SEC}`
      : '';
  const filter =
    `[1:a]volume=${MUSIC_VOLUME},afade=t=in:st=0:d=${MUSIC_FADE_SEC}${fadeOut}[mus];` +
    `[mus][0:a]sidechaincompress=${MUSIC_DUCK}[ducked];` +
    `[0:a][ducked]amix=inputs=2:normalize=0:duration=first[a]`;
  const args = [
    '-y',
    '-i', concatPath,
    '-stream_loop', '-1', '-i', musicFile,
    '-filter_complex', filter,
    '-map', '0:v', '-map', '[a]',
    '-c:v', 'copy', '-c:a', 'aac', '-ar', '48000', '-ac', '2', outPath,
  ];
  const { status, stderr } = ffmpeg(args);
  if (status !== 0) {
    console.warn(`[renderFfmpeg] music mix failed (kept bare stitch): ${stderr.slice(-200)}`);
    return false;
  }
  return true;
}

/**
 * Final master: normalize the whole program to the social/broadcast loudness
 * target (-14 LUFS) so every ad ships at a consistent perceived level regardless
 * of the client's VO recording. VO dominates the mix, so this anchors the VO
 * while keeping the (already low + ducked) bed underneath. Non-critical: on any
 * failure the un-normalized render is kept rather than failing the whole job.
 */
function masterAudio(inPath: string, outPath: string): boolean {
  const args = [
    '-y', '-i', inPath,
    '-c:v', 'copy', '-af', LOUDNORM,
    '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', outPath,
  ];
  const { status, stderr } = ffmpeg(args);
  if (status !== 0) {
    console.warn(`[renderFfmpeg] loudnorm master failed (kept un-normalized): ${stderr.slice(-200)}`);
    return false;
  }
  return true;
}

async function downloadToFile(url: string, path: string): Promise<void> {
  const r = await fetch(url);
  if (!r.ok) throw new RenderError(`download_failed_${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  writeFileSync(path, buf);
}

/**
 * Full pipeline: download each scene's assets, trim/mux/normalize per scene in
 * sceneIdx order, concat, and return the final MP4 buffer. Cleans up its temp
 * dir. Scenes are assumed already sorted/keyed by the caller.
 */
export async function renderFinalVideo(
  scenes: FinalRenderScene[],
  aspectRatio: string,
  music?: { style: 'mrbeast' | 'temu' | 'testimonial'; enabled: boolean },
  preset: RenderPreset = CLASSIC
): Promise<{ buffer: Buffer; sizeBytes: number }> {
  if (!scenes.length) throw new RenderError('no_scenes');
  const tTotal = Date.now();
  const dims = dimsFor(aspectRatio);
  const dir = mkdtempSync(join(tmpdir(), 'grifon-render-'));
  // Copy the caption font into the temp dir under a bare name so drawtext can
  // reference it without an absolute (colon-bearing) path. See buildScene.
  const fontSrc = fontPath();
  let fontName: string | null = null;
  if (fontSrc) {
    fontName = 'caption.ttf';
    copyFileSync(fontSrc, join(dir, fontName));
  } else {
    console.warn('[renderFfmpeg] caption font missing; overlays/captions skipped');
  }
  try {
    const ordered = [...scenes].sort((a, b) => a.sceneIdx - b.sceneIdx);
    const muxed: string[] = [];
    // Preset-driven cut transitions, planned once for the whole ad.
    const transitions = planTransitions(ordered.length, preset.transition);
    // SFX restraint state, threaded across scenes (whole-ad timeline).
    const placedSec: number[] = [];
    let whooshUsed = 0;
    let elapsed = 0; // cumulative timeline position = current scene's start

    for (let i = 0; i < ordered.length; i++) {
      const scene = ordered[i];
      const tScene = Date.now();
      const videoPath = join(dir, `scene_${i}.mp4`);
      await downloadToFile(scene.videoUrl, videoPath);

      let audioPath: string | null = null;
      if (scene.audioUrl) {
        audioPath = join(dir, `voice_${i}.mp3`);
        await downloadToFile(scene.audioUrl, audioPath);
      }
      const dlMs = Date.now() - tScene;

      const probeSec = probeDurationSec(videoPath);
      // Measure the actual VO speech-end for every voiced scene — this is now the
      // PRIMARY trim signal (chooseTrim), ground-truth across any script/product.
      const detectedSec = audioPath ? detectTrimSec(audioPath) : null;

      const { trimSec, padAudio } = chooseTrim(scene, probeSec, detectedSec);

      // Compile the draw plan first — emphasis SFX are derived from its layers.
      const layers = planScene(scene, trimSec, dims);

      // Gather this scene's SFX candidates on the GLOBAL timeline:
      //  - transition cues (whoosh/swish) snapped to the cut,
      //  - emphasis sounds frame-locked to each strategic overlay's appearance.
      const cands: SfxCandidate[] = [];
      for (const cue of scene.sfxCues ?? []) {
        const snapped = snapSfxAnchor(cue.sfxId, i, !!scene.isHook);
        if (snapped !== null) cands.push({ sfxId: cue.sfxId, globalSec: elapsed + snapped, transition: true });
      }
      // A visual transition INTO this scene carries its own whoosh at the cut —
      // sight + sound land together. Restraint still applies below (min gap +
      // whoosh cap), so an EDL cue at the same cut just dedupes.
      if (transitions[i].fadeInHead && i > 0) {
        cands.push({ sfxId: 'whoosh', globalSec: elapsed, transition: true });
      }
      for (const l of layers) {
        if (l.kind === 'text' && l.emphasisSfx) {
          cands.push({ sfxId: l.emphasisSfx, globalSec: elapsed + l.startSec, transition: false });
        }
      }

      // Restraint: keep it tasteful (no stacking, capped whooshes, emphasis wins).
      const sfx: PreparedSfx[] = [];
      for (const c of pickSceneSfx(cands, placedSec, whooshUsed, preset.sfx.maxWhoosh)) {
        const p = sfxPath(c.sfxId);
        const anchor = clampAnchor(c.globalSec - elapsed, trimSec);
        if (!p) { console.warn(`[renderFfmpeg] sfx missing: ${c.sfxId}`); continue; }
        if (anchor === null) continue;
        sfx.push({ path: p, anchorSec: anchor });
        placedSec.push(c.globalSec);
        if (c.transition) whooshUsed++;
      }

      const outPath = join(dir, `muxed_${i}.mp4`);
      const tBuild = Date.now();
      buildScene(
        videoPath, audioPath, trimSec, dims, outPath, padAudio,
        dir, scene.sceneIdx, layers, sfx, fontName,
        buildTransitionFilters(transitions[i], preset.transition, trimSec)
      );
      console.log(
        `[renderFfmpeg] scene=${i} dl=${dlMs}ms build=${Date.now() - tBuild}ms ` +
        `trim=${trimSec?.toFixed(2) ?? 'full'} layers=${layers.length} sfx=${sfx.length}`
      );
      muxed.push(outPath);
      elapsed += trimSec ?? probeSec ?? 0; // advance the timeline by this scene's length
    }

    const finalPath = join(dir, 'final.mp4');
    const tConcat = Date.now();
    concatScenes(muxed, finalPath);
    const concatMs = Date.now() - tConcat;

    // Optional final pass: ducked background-music bed across the whole program.
    let resultPath = finalPath;
    if (music?.enabled) {
      const bed = musicPath(music.style);
      if (bed) {
        const musicedPath = join(dir, 'final_music.mp4');
        if (mixMusic(finalPath, bed, probeDurationSec(finalPath), musicedPath)) {
          resultPath = musicedPath;
        }
      } else {
        console.warn(`[renderFfmpeg] music bed missing for style=${music.style}; skipping`);
      }
    }

    // Final master: pin loudness to -14 LUFS (+ faststart for instant streaming).
    const masteredPath = join(dir, 'final_master.mp4');
    if (masterAudio(resultPath, masteredPath)) resultPath = masteredPath;

    const buffer = readFileSync(resultPath);
    console.log(
      `[renderFfmpeg] total=${Date.now() - tTotal}ms scenes=${ordered.length} ` +
      `preset=${preset.id} concat=${concatMs}ms size=${statSync(resultPath).size}B`
    );
    return { buffer, sizeBytes: statSync(resultPath).size };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

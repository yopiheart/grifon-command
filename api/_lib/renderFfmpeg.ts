import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, statSync, existsSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';
import type { FinalRenderScene, FinalRenderEndCard, SfxBankId } from '../../types.js';
import { assertSafeMediaUrl } from './ssrfGuard.js';
import {
  CLASSIC,
  pickSfxVariant,
  sfxVariantsEnabled,
  type RenderPreset,
  type PresetId,
} from './renderPresets.js';
import { planDiegeticCues, admitDiegeticCue, DIEGETIC_MIN_GAP } from './sfxTriggers.js';
// Pure draw-planning + filtergraph-string engine, extracted into drawPlan.ts so
// the final-render path here and a future preview endpoint share one source of
// truth. Imported for the I/O layer's own use; re-exported below so existing
// importers of './renderFfmpeg.js' (other files + tests) keep working unchanged.
import {
  planScene, planEndCardLayers,
  buildTextFilter, buildBoxFilter, buildTransitionFilters, buildCameraFilter,
  effectiveCameraEffect, planTransitions, pickSceneSfx, snapSfxAnchor,
  clampAnchor, speechWindow,
  FLIP_C1, FLIP_C3, MIN_SFX_GAP,
  type DrawLayer, type TextLayer, type WordTiming, type SfxCandidate,
} from './drawPlan.js';
export * from './drawPlan.js';

// Final-render executor muscle (Phase 2 of workflows/render_pipeline_voice_10.md).
// Mirrors the Phase-0-validated invocations in scripts/ffmpeg-spike.mjs exactly:
//   per scene: trim-to-speech-end + mux voice MP3 + normalize (fps/scale/sar/48k,
//   H.264/AAC), then concat via the concat FILTER with re-encode (NOT the
//   demuxer) to avoid A/V drift (premortem #5).
//
// Trim length comes from the scene's MEASURED speech-end (forced-alignment
// words) + a pad so a soft final word survives (premortem #4c), falling back to
// `silencedetect` on the voice MP3 when the scene carries no alignment
// (resolveSpeechEndSec). Audio-less scenes use fallbackDurationSec
// (EDL keepSegments) or the full clip, with a silent track so concat stays
// stream-uniform.

const FPS = 30;
const PRESET = 'veryfast';
const CRF = '20';
const PAD_SEC = 0.18;           // keep a soft final word from being clipped
// Last scene trims razor-tight: its tail is the ad's closing frame, and Kling
// clips often bake a ghost/dissolve into their final beats (2026-06-10 review:
// 27.5-28s double-exposure + black frame). 0.06s still clears the final word.
const LAST_SCENE_PAD_SEC = 0.06;
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
const MUSIC_VOLUME_LEAD = 0.85;  // no VO to duck under — music IS the audio; LOUDNORM still pins the master
const MUSIC_FADE_SEC = 0.4;      // afade in/out on the bed
const MUSIC_DUCK = 'threshold=0.04:ratio=5:attack=5:release=280'; // duck hard+fast under VO
const LOUDNORM = 'loudnorm=I=-14:TP=-1.5:LRA=11'; // social/Reels target, VO-anchored

// The SFX-restraint consts (TRANSITION_SFX, CALLOUT_LEAD, MAX_WHOOSH, MAX_PER_SOUND)
// and the pure SFX-planning helpers moved to drawPlan.ts; MIN_SFX_GAP is imported
// back above for the pickSceneSfx call site in renderFinalVideo.

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

// Static-bed aliases: a style with no own `<style>.mp3` borrows a sibling bed so its render
// never ships silent. A real `<style>.mp3` dropped into assets/music/ later automatically
// wins (the direct hit is tried first) with no code change. Data-driven — extend the map,
// not a special-case if-chain. Today: `ugcpro` has no bed, so it borrows `testimonial.mp3`.
const MUSIC_BED_ALIAS: Record<string, string> = { ugcpro: 'testimonial' };

/** Resolve the static music bed for a style, honoring a fallback alias when the style has no
 * own `<style>.mp3`. `resolve` is injected so this is pure/testable without touching the FS. */
export function resolveMusicBed(style: string, resolve: (rel: string) => string | null): string | null {
  const direct = resolve(join('music', `${style}.mp3`));
  if (direct) return direct;
  const alias = MUSIC_BED_ALIAS[style];
  if (alias) {
    const fallback = resolve(join('music', `${alias}.mp3`));
    if (fallback) {
      console.log(`[renderFfmpeg] music bed style=${style} → alias '${alias}.mp3' (no ${style}.mp3 present)`);
      return fallback;
    }
  }
  return null;
}

const musicPath = (style: string) => resolveMusicBed(style, findAsset);
const fontPath = () => findAsset(join('fonts', 'Inter-Black.ttf'));

/** SFX_V2 (Slice 1): class → seeded variant file, degrading to the legacy
 * static sample when the flag is off, the preset is CLASSIC, the class has no
 * pool (snap), or the variant file is missing on disk. Exported for the seam
 * tests — this function's return value IS the only byte that can differ
 * between flag states upstream of ffmpeg. */
export function resolveSfxFile(
  sfxId: SfxBankId,
  presetId: PresetId,
  variantSeed: number
): string | null {
  if (sfxVariantsEnabled(presetId)) {
    const variant = pickSfxVariant(sfxId, variantSeed);
    if (variant) {
      const p = sfxPath(variant);
      if (p) return p;
      console.warn(`[renderFfmpeg] sfx variant missing, static fallback: ${variant}`);
    }
  }
  return sfxPath(sfxId);
}

/** Escape a filesystem path for use inside an ffmpeg filtergraph option value
 * (forward-slash the separators, escape the Windows drive colon). spawnSync
 * needs no shell quoting; this is purely the filtergraph parser's escaping. */
export function escFilterPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/:/g, '\\:');
}


/**
 * Per-word/per-line drawtext filters. Standard word captions use OUTLINE, never
 * all-word boxes (fragmented tiles); bars entries are whole lines, and spotlight
 * intentionally boxes only the active word. `wordTextNames[j]` is entry j's bare
 * textfile name; `baseTextName` is the whole-chunk file (karaoke modes only).
 *
 *  - word-pop: words accumulate — each pops on at its start (alpha snap + 14px
 *    settle) and stays until the chunk ends.
 *  - karaoke: the whole chunk renders in fillColor (numeric x so the highlight
 *    offsets share its origin) and a highlightColor copy of each word sits on
 *    top only during that word's window — an L→R sweep.
 *  - bars: each entry is a whole caption line on an alternating solid bar.
 *  - karaoke-invert: the whole chunk stays visible while the spoken word pulses
 *    as black text on a white box.
 */
export function buildWordFilters(
  l: TextLayer,
  fontName: string,
  wordTextNames: string[],
  preset: RenderPreset,
  baseTextName: string | null = null,
  mode: 'normal' | 'bed' | 'mask' = 'normal'
  // 'bed'  = all-black glyphs WITH outline+shadow (the contrast bed a gradient
  //          fill sits on); 'mask' = pure white glyphs, no decoration (the
  //          clipping mask that cuts the gradient into letter shapes).
): string {
  const words = l.words ?? [];
  if (!words.length) return buildTextFilter({ ...l, anim: 'pop' }, fontName, baseTextName ?? wordTextNames[0], preset);
  const sh = preset.caption.shadow;
  const outlineW = Math.max(2, Math.round(l.fontsize * Math.max(preset.caption.borderWFrac, 0.06)));
  const deco = mode === 'mask'
    ? ''
    : [
        ...(sh ? [`shadowcolor=${sh.color}`, `shadowx=${sh.dx}`, `shadowy=${sh.dy}`] : []),
        `borderw=${outlineW}`,
        `bordercolor=black`,
      ].join(':');
  const parts: string[] = [];

  if (l.anim === 'karaoke' && baseTextName) {
    // Same two-source defect class as karaoke-invert (spec finding #27): the base
    // used to be ONE kerned drawtext while highlights sit at ESTIMATED wd.xPx, so
    // the highlight drifted off its word. Base is now per-word at the same xPx.
    for (let j = 0; j < words.length; j++) {
      const wd = words[j];
      parts.push(
        `drawtext=fontfile=${fontName}:textfile=${wordTextNames[j]}:fontsize=${l.fontsize}:` +
        `fontcolor=${l.color}${deco ? `:${deco}` : ''}:` +
        `x=${wd.xPx}:y=${wd.yPx ?? l.yBase}:enable='between(t,${l.startSec},${l.endSec})'`
      );
    }
    for (let j = 0; j < words.length; j++) {
      const wd = words[j];
      parts.push(
        `drawtext=fontfile=${fontName}:textfile=${wordTextNames[j]}:fontsize=${l.fontsize}:` +
        `fontcolor=${preset.caption.highlightColor}:${deco}:` +
        `x=${wd.xPx}:y=${wd.yPx ?? l.yBase}:enable='between(t,${wd.start},${wd.end})'`
      );
    }
    return parts.join(',');
  }

  if (l.anim === 'bars') {
    for (let j = 0; j < words.length; j++) {
      const wd = words[j];
      const p = `min(1,max(0,(t-${wd.start})/0.28))`;
      const ease = `(1-${FLIP_C3}*pow(1-${p},3)+${FLIP_C1}*pow(1-${p},2))`;
      const light = j % 2 === 1;
      parts.push(
        `drawtext=fontfile=${fontName}:textfile=${wordTextNames[j]}:fontsize=${l.fontsize}:` +
        `fontcolor=${light ? 'black' : 'white'}:box=1:boxcolor=${light ? 'white' : 'black'}@1:` +
        `boxborderw=${Math.round(l.fontsize * 0.18)}:` +
        `x='(w-text_w)/2-140*(1-${ease})':y=${wd.yPx ?? l.yBase}:` +
        `alpha='min(min(1,max(0,(t-${wd.start})/0.05)),max(0,(${l.endSec}-t)/0.18))':` +
        `enable='between(t,${wd.start},${l.endSec})'`
      );
    }
    return parts.join(',');
  }

  if (l.anim === 'karaoke-invert' && baseTextName) {
    // Base phrase rendered PER-WORD at the SAME estimated x positions the invert
    // box uses (single x-source). The base used to be ONE drawtext (real
    // kerning) while the box was positioned from per-word width ESTIMATES, so the
    // box drifted off the word and overlapped the phrase (spec finding #27).
    // Per-word base and box now share wd.xPx and cannot disagree by construction.
    for (let j = 0; j < words.length; j++) {
      const wd = words[j];
      parts.push(
        `drawtext=fontfile=${fontName}:textfile=${wordTextNames[j]}:fontsize=${l.fontsize}:` +
        `fontcolor=${l.color}${deco ? `:${deco}` : ''}:` +
        `x=${wd.xPx}:y=${wd.yPx ?? l.yBase}:enable='between(t,${l.startSec},${l.endSec})'`
      );
    }
    for (let j = 0; j < words.length; j++) {
      const wd = words[j];
      const wordDur = Math.max(0.001, +(wd.end - wd.start).toFixed(3));
      const pulse = `1+0.06*sin(PI*min(1,max(0,(t-${wd.start})/${wordDur})))`;
      parts.push(
        `drawtext=fontfile=${fontName}:textfile=${wordTextNames[j]}:` +
        `fontsize='max(8,${l.fontsize}*(${pulse}))':fontcolor=black:` +
        `box=1:boxcolor=white@1:boxborderw=${Math.round(l.fontsize * 0.16)}:` +
        `x=${wd.xPx}:y=${wd.yPx ?? l.yBase}:enable='between(t,${wd.start},${wd.end})'`
      );
    }
    return parts.join(',');
  }

  // word-pop (default): each word lands with an elastic overshoot pop (scale
  // 20%→~108%→100%, easeOutBack — the reference "scale bounce") and persists.
  // Hook title power words use the HOOK highlight (caption highlight can be
  // inverted, e.g. hype's gold-fill/white-highlight captions).
  const hlColor = l.font === 'hook' ? preset.hook.highlightColor : preset.caption.highlightColor;
  for (let j = 0; j < words.length; j++) {
    const wd = words[j];
    const p = `min(1,max(0,(t-${wd.start})/0.22))`;
    const ease = `(1-${FLIP_C3}*pow(1-${p},3)+${FLIP_C1}*pow(1-${p},2))`;
    const color =
      mode === 'bed' ? 'black' :
      mode === 'mask' ? 'white' :
      wd.highlight ? hlColor : l.color;
    parts.push(
      `drawtext=fontfile=${fontName}:textfile=${wordTextNames[j]}:` +
      `fontsize='max(8,${l.fontsize}*(0.2+0.8*${ease}))':` +
      `fontcolor=${color}${deco ? `:${deco}` : ''}:` +
      `x=${wd.xPx}:y=${wd.yPx ?? l.yBase}:` +
      `alpha='min(1,max(0,(t-${wd.start})/0.05))':enable='between(t,${wd.start},${l.endSec})'`
    );
  }
  return parts.join(',');
}

/**
 * Premium hook fill (Neil 2026-06-10 polish round): the title words become a
 * CLIPPING MASK that cuts a vertical metallic gradient (+ an animated diagonal
 * light sweep) into the glyphs — the CC-Light-Sweep / gradient-overlay look,
 * built from ffmpeg primitives:
 *
 *   bed   = black glyphs + outline + shadow, drawn in the main chain (contrast)
 *   mask  = white glyphs on black, same word animations (this fn)
 *   fill  = gradients source (hi palette for power words, base for the rest),
 *           sweep.png overlaid sliding diagonally across once (hi class only)
 *   out   = fill alphamerge'd with the mask, overlaid on the bed
 *
 * Pure: emits the semicolon-separated filtergraph statements that take
 * `inLabel` (video after the bed) to `outLabel`. `sweepInputIdx` is the ffmpeg
 * input index of sweep.png, or null to skip the sweep.
 */
export function buildPremiumHookStmts(
  l: TextLayer,
  dims: [number, number],
  hookFontName: string,
  wordTextNames: string[],
  preset: RenderPreset,
  inLabel: string,
  outLabel: string,
  sweepInputIdx: number | null,
  durSec: number
): string[] {
  const [w, h] = dims;
  const pal = l.gradient!;
  const words = l.words ?? [];
  const lineH = Math.round(l.fontsize * 1.18);
  const yTopPx = l.yBase;
  const yBotPx = yTopPx + (Math.max(0, ...words.map((wd) => (wd.yPx ?? yTopPx) - yTopPx)) + lineH);
  const D = durSec.toFixed(3);
  const stmts: string[] = [];
  const classes: Array<{ tag: string; colors: [string, string]; pick: (wd: WordTiming) => boolean; sweep: boolean }> = [
    { tag: 'hi', colors: pal.hi, pick: (wd) => !!wd.highlight, sweep: true },
    { tag: 'bs', colors: pal.base, pick: (wd) => !wd.highlight, sweep: false },
  ];

  const present = classes.filter((cls) => words.some(cls.pick));
  let cur = inLabel;
  present.forEach((cls, ci) => {
    const clsWords = words.filter(cls.pick);
    const clsLayer: TextLayer = { ...l, words: clsWords };
    const clsNames = words
      .map((wd, j) => ({ wd, name: wordTextNames[j] }))
      .filter(({ wd }) => cls.pick(wd))
      .map(({ name }) => name);

    // Mask: white animated glyphs of this class on black.
    stmts.push(
      `color=c=black:s=${w}x${h}:r=${FPS}:d=${D},` +
      buildWordFilters(clsLayer, hookFontName, clsNames, preset, null, 'mask') +
      `,format=gray[m_${cls.tag}]`
    );

    // Fill: vertical metallic gradient spanning the title block (+ light sweep).
    const grad =
      `gradients=s=${w}x${h}:c0=${cls.colors[0]}:c1=${cls.colors[1]}:` +
      `x0=${Math.round(w / 2)}:y0=${yTopPx}:x1=${Math.round(w / 2)}:y1=${yBotPx}:d=${D}`;
    if (cls.sweep && sweepInputIdx !== null) {
      const t0 = (words[words.length - 1]?.start ?? 0) + 0.45; // sweep after the last word lands
      stmts.push(`${grad}[gf_${cls.tag}]`);
      stmts.push(
        `[gf_${cls.tag}][${sweepInputIdx}:v]overlay=` +
        `x='-480+(t-${t0.toFixed(3)})*${Math.round(w * 1.6)}':y=${yTopPx - 400}:` +
        `enable='between(t,${t0.toFixed(3)},${(t0 + 1.0).toFixed(3)})',format=rgba[f_${cls.tag}]`
      );
    } else {
      stmts.push(`${grad},format=rgba[f_${cls.tag}]`);
    }

    // Clip the fill into the glyphs, drop it on the bed.
    stmts.push(`[f_${cls.tag}][m_${cls.tag}]alphamerge[c_${cls.tag}]`);
    const next = ci === present.length - 1 ? outLabel : `[pv_${cls.tag}]`;
    stmts.push(`${cur}[c_${cls.tag}]overlay=0:0${next}`);
    cur = next;
  });
  if (!present.length) stmts.push(`${cur}null${outLabel}`);
  return stmts;
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
 * was detected (caller falls back to the full clip; -shortest bounds only that
 * rare probe-failure path — see the buildScene note on why it silences voice).
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

// One-time (per process) ffmpeg capability probe. A deployed ffmpeg missing the
// `drawtext` filter renders RAW clips fine but silently drops every caption /
// overlay preset — surface it loudly at the first render instead of shipping
// text-less ads (spec finding #24). Never throws: RAW renders must still work.
let _ffmpegCapChecked = false;
function checkFfmpegCapabilities(): void {
  if (_ffmpegCapChecked) return;
  _ffmpegCapChecked = true;
  if (!ffmpegPath) return;
  try {
    const r = spawnSync(ffmpegPath, ['-hide_banner', '-filters'], { maxBuffer: 1 << 24 });
    const out = `${r.stdout?.toString('utf8') ?? ''}${r.stderr?.toString('utf8') ?? ''}`;
    if (!/\bdrawtext\b/.test(out)) {
      console.error('[renderFfmpeg] FATAL-CLASS: deployed ffmpeg lacks drawtext — caption presets will fail (see spec finding #24)');
    }
  } catch {
    /* probe failure is non-fatal — never block a RAW render */
  }
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

/** How a scene's speech-end gets measured; lazy so the anchored path never pays
 * for the (full-decode) silencedetect pass it doesn't use. */
export interface SpeechMeasure {
  /** silencedetect on the VO MP3 — the pre-alignment fallback signal. */
  silenceSec: () => number | null;
  /** VO MP3 duration — caps the anchored trim so it can't outrun the audio. */
  audioDurationSec: () => number | null;
}

/**
 * The scene's trim anchor (`detectedSec`) — where the VOICE stops, plus the pad.
 *
 * PRIMARY (#91): forced-alignment words measure speech directly, so the last
 * word's end IS the speech-end. silencedetect can only answer "where does AUDIO
 * stop", and an ElevenLabs MP3 carries breath/room tone above the -35dB floor —
 * that honest answer left a ~2.5s breathy tail on the closing scene.
 *
 * FALLBACK: no alignment → silencedetect, byte-identical to the pre-anchor path.
 *
 * Either way the last scene swaps the standard pad for the razor pad: its tail
 * is the ad's closing frame and Kling clips bake ghost/dissolve frames into
 * final beats.
 */
export function resolveSpeechEndSec(
  scene: Pick<FinalRenderScene, 'voiceWords'>,
  isLastScene: boolean,
  measure: SpeechMeasure
): number | null {
  const speech = speechWindow(scene);
  let detectedSec: number | null;
  if (speech) {
    const audioSec = measure.audioDurationSec();
    const padded = speech.end + PAD_SEC;
    detectedSec = typeof audioSec === 'number' && audioSec > 0 ? Math.min(padded, audioSec) : padded;
  } else {
    detectedSec = measure.silenceSec();
  }
  if (isLastScene && typeof detectedSec === 'number') {
    detectedSec = Math.max(0.5, detectedSec - PAD_SEC + LAST_SCENE_PAD_SEC);
  }
  return detectedSec;
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
 *    VO (`detectedSec` = resolveSpeechEndSec's speech-end + pad, capped to the clip).
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
  /** Per-cue mix gain; every pre-Slice-2 path passes exactly SFX_VOLUME (CLASSIC
   * byte-identity + zero drift for non-diegetic cues under the flag). */
  gain: number;
}

/**
 * Pure scale→pad→setsar→sharpen prefix for a scene's video chain. Lanczos scaling
 * + a light unsharp pass lift the 720p source toward a crisp 1080-canvas render.
 * The unsharp runs BEFORE any camera filter / drawtext so burned-in text is never
 * sharpened. Kept side-effect-free (no `[0:v]`/fps prefix) so it's unit-testable.
 */
export function sceneNormalizeFilter(w: number, h: number): string {
  return (
    `scale=${w}:${h}:force_original_aspect_ratio=decrease:flags=lanczos,` +
    `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1,unsharp=5:5:0.4:5:5:0.2`
  );
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
  transitionFilters: string = '', // boundary fades/blur, appended after drawtext
  cameraFilter: string | null = null, // zoom/pan/punch, applied before drawtext
  preset: RenderPreset = CLASSIC,
  hookFontName: string | null = null, // BARE hook-title font (falls back to fontName)
  sweepName: string | null = null // BARE sweep.png in `dir` (premium hook glint)
): void {
  const [w, h] = dims;

  // --- Video chain: normalize, then apply the scene's draw plan (boxes + text).
  // drawtext/drawbox font/text files are referenced as BARE filenames and ffmpeg
  // runs with cwd=dir, so Windows drive-colon paths never enter the filtergraph
  // (an escaped `C:\` still breaks the parser — caught by the synthetic harness).
  // Premium hook layers need extra graph statements (mask/fill/overlay) that
  // can't live in one linear chain — collect statements and split labels.
  const needsSweep = sweepName !== null &&
    layers.some((l) => l.kind === 'text' && l.gradient && l.words?.length);
  const sweepInputIdx = needsSweep ? 2 + sfx.length : null;
  const premiumDur = trimSec ?? 12;
  const stmts: string[] = [];
  let split = 0;

  let vChain = `[0:v]fps=${FPS},${sceneNormalizeFilter(w, h)}`;
  if (cameraFilter) vChain += `,${cameraFilter}`;
  let k = 0;
  for (const layer of layers) {
    if (layer.kind === 'box') {
      vChain += `,${buildBoxFilter(layer)}`;
    } else if (fontName) {
      const layerFont = layer.font === 'hook' && hookFontName ? hookFontName : fontName;
      if (layer.words?.length && (
        layer.anim === 'word-pop' || layer.anim === 'karaoke'
        || layer.anim === 'bars' || layer.anim === 'karaoke-invert'
      )) {
        const wordNames = layer.words.map((wd, j) => {
          const n = `ov_${sceneIdx}_${k}_w${j}.txt`;
          writeFileSync(join(dir, n), wd.word, 'utf8');
          return n;
        });
        let baseName: string | null = null;
        if (layer.anim === 'karaoke' || layer.anim === 'karaoke-invert') {
          baseName = `ov_${sceneIdx}_${k}_base.txt`;
          writeFileSync(join(dir, baseName), layer.text, 'utf8');
        }
        k++;
        if (layer.gradient && layer.anim === 'word-pop') {
          // Bed (black glyphs + outline/shadow) in the main chain, then split:
          // gradient fills clipped by word masks overlay on top.
          vChain += `,${buildWordFilters(layer, layerFont, wordNames, preset, null, 'bed')}`;
          const inLabel = `[vb${split}]`;
          const outLabel = `[vp${split}]`;
          split++;
          stmts.push(`${vChain}${inLabel}`);
          stmts.push(...buildPremiumHookStmts(
            layer, dims, layerFont, wordNames, preset,
            inLabel, outLabel, sweepInputIdx, premiumDur
          ));
          // `null` pass-through so later appends stay comma-legal after a label.
          vChain = `${outLabel}null`;
        } else {
          vChain += `,${buildWordFilters(layer, layerFont, wordNames, preset, baseName)}`;
        }
      } else {
        const textName = `ov_${sceneIdx}_${k++}.txt`;
        writeFileSync(join(dir, textName), layer.text, 'utf8');
        vChain += `,${buildTextFilter(layer, layerFont, textName, preset)}`;
      }
    }
  }
  if (transitionFilters) vChain += `,${transitionFilters}`;
  vChain += '[v]';
  stmts.push(vChain);
  const vGraph = stmts.join(';');

  // --- Inputs: [0]=video, [1]=audio (voice or silence), [2..]=sfx, [last]=sweep. ---
  const inputs: string[] = ['-y', '-i', videoPath];
  if (audioPath) inputs.push('-i', audioPath);
  else inputs.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000');
  for (const s of sfx) inputs.push('-i', s.path);
  if (sweepInputIdx !== null) inputs.push('-loop', '1', '-t', premiumDur.toFixed(3), '-i', join(dir, sweepName as string));

  // --- Audio chain: base (voice padded/passthrough or silence) + SFX amix. ---
  const base = padAudioToVideo && audioPath ? `[1:a]apad[abase]` : `[1:a]anull[abase]`;
  let aChain = base;
  let aOut = '[abase]';
  if (sfx.length) {
    const sfxLabels: string[] = [];
    sfx.forEach((s, k) => {
      const ms = Math.round(s.anchorSec * 1000);
      aChain += `;[${2 + k}:a]adelay=${ms}|${ms},volume=${s.gain}[sfx${k}]`;
      sfxLabels.push(`[sfx${k}]`);
    });
    aChain += `;[abase]${sfxLabels.join('')}amix=inputs=${1 + sfx.length}:normalize=0:dropout_transition=0[a]`;
    aOut = '[a]';
  }

  const tArgs = trimSec !== null ? ['-t', trimSec.toFixed(3)] : [];
  // `-shortest` SILENCES the mixed voice (2026-07-24 LUNARIA First Cut, reproduced
  // locally): x264's encoder delay makes video packets reach the muxer late, so the
  // shortest-logic closes the audio stream after its first packets — the output gets
  // a ~4kb/s empty AAC track (silence + boundary clicks) even though the voice MP3
  // is loud and the [1:a] chain is correct. `-t trimSec` already bounds the output on
  // every real path (chooseTrim only returns null trimSec when the video probe itself
  // failed), so -shortest is redundant there and harmful. It is kept ONLY on that
  // rare probe-failure path, where it remains the sole duration bound for apad.
  const args = [
    ...inputs,
    ...tArgs,
    '-filter_complex', `${vGraph};${aChain}`,
    '-map', '[v]', '-map', aOut,
    '-c:v', 'libx264', '-preset', PRESET, '-crf', CRF,
    '-c:a', 'aac', '-ar', '48000', '-ac', '2',
    ...(trimSec !== null ? [] : ['-shortest']),
    outPath,
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
 * Music mix plan for a given role. 'bed' (default) = quiet gain, ducked under the VO;
 * 'lead' (no-VO Pure Hype) = music IS the audio → high gain, NO sidechain ducking. Pure +
 * exported so the role→mix decision is unit-testable without invoking ffmpeg.
 */
export function musicMixPlan(role?: 'bed' | 'lead'): { volume: number; duck: boolean } {
  return role === 'lead'
    ? { volume: MUSIC_VOLUME_LEAD, duck: false }
    : { volume: MUSIC_VOLUME, duck: true };
}

/**
 * Final pass: lay a looped, faded music bed against the program audio. For a bed (duck:true)
 * it ducks beneath the VO via sidechaincompress (program audio is the sidechain key); for a
 * lead track (duck:false, no VO to duck under) the faded music is amixed directly with the
 * program's SFX. Non-critical: returns false (and leaves the concat result untouched) on any
 * failure rather than throwing, so music never blocks the render.
 */
function mixMusic(
  concatPath: string,
  musicFile: string,
  totalSec: number | null,
  outPath: string,
  plan: { volume: number; duck: boolean } = { volume: MUSIC_VOLUME, duck: true }
): boolean {
  const fadeOut =
    typeof totalSec === 'number' && totalSec > 2 * MUSIC_FADE_SEC
      ? `,afade=t=out:st=${(totalSec - MUSIC_FADE_SEC).toFixed(3)}:d=${MUSIC_FADE_SEC}`
      : '';
  const filter = plan.duck
    ? `[1:a]volume=${plan.volume},afade=t=in:st=0:d=${MUSIC_FADE_SEC}${fadeOut}[mus];` +
      `[mus][0:a]sidechaincompress=${MUSIC_DUCK}[ducked];` +
      `[0:a][ducked]amix=inputs=2:normalize=0:duration=first[a]`
    : `[1:a]volume=${plan.volume},afade=t=in:st=0:d=${MUSIC_FADE_SEC}${fadeOut}[mus];` +
      `[0:a][mus]amix=inputs=2:normalize=0:duration=first[a]`;
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
  assertSafeMediaUrl(url);
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
  music?: { style: 'mrbeast' | 'temu' | 'testimonial' | 'ugcpro'; enabled: boolean; bedUrl?: string; role?: 'bed' | 'lead' },
  preset: RenderPreset = CLASSIC,
  variantSeed: number = 0, // rotates the premium hook palette per render
  endCard?: FinalRenderEndCard, // offer recap + price anchor, burned into the last scene
  onStep?: (label: string) => void // P1 heartbeat: called at pipeline boundaries so the caller can bump the render sidecar's updatedAt (watchdog liveness)
): Promise<{ buffer: Buffer; sizeBytes: number }> {
  if (!scenes.length) throw new RenderError('no_scenes');
  checkFfmpegCapabilities(); // once per process: warn loudly if drawtext is missing
  const tTotal = Date.now();
  const dims = dimsFor(aspectRatio);
  const dir = mkdtempSync(join(tmpdir(), 'grifon-render-'));
  // Copy the preset's caption font into the temp dir under a bare name so
  // drawtext can reference it without an absolute (colon-bearing) path. Falls
  // back to Inter-Black if the preset font is missing from the bundle.
  const fontSrc = findAsset(preset.caption.fontFile) ?? fontPath();
  let fontName: string | null = null;
  if (fontSrc) {
    fontName = 'caption.ttf';
    copyFileSync(fontSrc, join(dir, fontName));
  } else {
    console.warn('[renderFfmpeg] caption font missing; overlays/captions skipped');
  }
  // Hook title font (title-stack presets); falls back to the caption font.
  let hookFontName: string | null = null;
  const hookFontSrc = findAsset(preset.hook.fontFile);
  if (hookFontSrc) {
    hookFontName = 'hook.ttf';
    copyFileSync(hookFontSrc, join(dir, hookFontName));
  }
  // Light-sweep band for the premium hook fill (skip silently if missing).
  let sweepName: string | null = null;
  const sweepSrc = findAsset(join('fx', 'sweep.png'));
  if (sweepSrc) {
    sweepName = 'sweep.png';
    copyFileSync(sweepSrc, join(dir, sweepName));
  }
  try {
    const ordered = [...scenes].sort((a, b) => a.sceneIdx - b.sceneIdx);
    const muxed: string[] = [];
    // Preset-driven cut transitions, planned once for the whole ad. The hook
    // cut gets the film-burn when the preset asks for it AND scene 0 is a hook.
    const transitions = planTransitions(
      ordered.length, preset.transition,
      !preset.stitchedOnly && preset.hook.burnTransition && !!ordered[0]?.isHook
    );
    // SFX restraint state, threaded across scenes (whole-ad timeline).
    const placedSec: number[] = [];
    let whooshUsed = 0;
    const soundUse: Partial<Record<SfxBankId, number>> = {};
    let diegeticPlaced = 0;
    const diegeticUse: Partial<Record<SfxBankId, number>> = {};
    // Diegetic cue times live in their OWN list: pickSceneSfx must never see
    // them, or a diegetic cue near a scene boundary would suppress the next
    // scene's P13 whoosh/entrance hit — the reverse of the plan's precedence.
    const diegeticSec: number[] = [];
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
      onStep?.(`download ${i + 1}/${ordered.length}`);

      const probeSec = probeDurationSec(videoPath);
      // Measure the actual VO speech-end for every voiced scene — this is now the
      // PRIMARY trim signal (chooseTrim), ground-truth across any script/product.
      // Measured alignment beats silencedetect whenever the scene carries it (#91).
      const isLastScene = i === scenes.length - 1;
      let detectedSec: number | null = null;
      if (audioPath) {
        const ap = audioPath;
        detectedSec = resolveSpeechEndSec(scene, isLastScene, {
          silenceSec: () => detectTrimSec(ap),
          audioDurationSec: () => probeDurationSec(ap),
        });
      }

      const { trimSec, padAudio } = chooseTrim(scene, probeSec, detectedSec);
      console.log('[renderFfmpeg:trim]', {
        sceneIdx: scene.sceneIdx, probeSec, detectedSec, trimSec,
        keepFullClip: !!scene.keepFullClip, isLastScene,
        anchor: speechWindow(scene) ? 'speech' : 'silence',
      });

      // Compile the draw plan first — emphasis SFX are derived from its layers.
      const layers = preset.stitchedOnly ? [] : planScene(scene, trimSec, dims, preset, variantSeed);
      // End card rides the last scene — kept in a separate list so it joins the
      // SFX/draw pipeline but never the caption-chunk camera punches. Skipped when
      // the last scene IS the hook (1-scene ad): the hook title owns that band.
      let endCardLayers: DrawLayer[] = [];
      if (!preset.stitchedOnly && isLastScene && endCard && !scene.isHook) {
        endCardLayers = planEndCardLayers(endCard, trimSec, dims, preset, [
          scene.overlayText?.[0]?.text,
          scene.scriptLine,
        ], scene.captionRegion);
        layers.push(...endCardLayers);
      } else if (isLastScene && endCard && scene.isHook) {
        console.log('[renderFfmpeg] endCard skipped: last scene is the hook (band collision)');
      }

      // Gather this scene's SFX candidates on the GLOBAL timeline:
      //  - transition cues (whoosh/swish) snapped to the cut,
      //  - emphasis sounds frame-locked to each strategic overlay's appearance.
      const cands: SfxCandidate[] = [];
      for (const cue of preset.stitchedOnly ? [] : (scene.sfxCues ?? [])) {
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
      for (const c of pickSceneSfx(cands, placedSec, whooshUsed, preset.sfx.maxWhoosh, MIN_SFX_GAP, soundUse)) {
        const p = resolveSfxFile(c.sfxId, preset.id, variantSeed);
        const anchor = clampAnchor(c.globalSec - elapsed, trimSec);
        if (!p) { console.warn(`[renderFfmpeg] sfx missing: ${c.sfxId}`); continue; }
        if (anchor === null) continue;
        sfx.push({ path: p, anchorSec: anchor, gain: SFX_VOLUME });
        placedSec.push(c.globalSec);
        if (c.transition) whooshUsed++;
        else soundUse[c.sfxId] = (soundUse[c.sfxId] ?? 0) + 1;
      }

      // Diegetic keyword layer (Slice 2, workflows/sfx_upgrade_plan.md): flag-gated
      // (whole layer dead when SFX_V2_ENABLED is off / preset classic), measured-
      // alignment-only, and placed AFTER the entrance/transition pass so it defers
      // to the proven P13 hits on any collision — never the reverse. ≤1 cue/scene
      // by construction in planDiegeticCues; whole-ad caps live in admitDiegeticCue.
      if (sfxVariantsEnabled(preset.id)) {
        for (const cue of planDiegeticCues(scene, preset.id)) {
          // Scene-end headroom: a cue this close to the cut would collide with
          // the NEXT scene's transition whoosh (which diegetic must defer to).
          // trimSec is null on keepFullClip — fall back to the probed duration;
          // if both are unknown the clampAnchor path is the only bound we have.
          const sceneEndSec = trimSec ?? probeSec;
          if (sceneEndSec !== null && cue.anchorSec > sceneEndSec - DIEGETIC_MIN_GAP) continue;
          const cueGlobal = elapsed + cue.anchorSec;
          if (!admitDiegeticCue(cueGlobal, cue.sfxId, [...placedSec, ...diegeticSec], diegeticPlaced, diegeticUse)) continue;
          const p = resolveSfxFile(cue.sfxId, preset.id, variantSeed);
          const anchor = clampAnchor(cue.anchorSec, trimSec);
          if (!p) { console.warn(`[renderFfmpeg] diegetic sfx missing: ${cue.sfxId}`); continue; }
          if (anchor === null) continue;
          sfx.push({ path: p, anchorSec: anchor, gain: cue.gain });
          diegeticSec.push(cueGlobal);
          diegeticPlaced++;
          diegeticUse[cue.sfxId] = (diegeticUse[cue.sfxId] ?? 0) + 1;
          console.log('[renderFfmpeg:diegetic]', { sceneIdx: scene.sceneIdx, sfxId: cue.sfxId, anchor, trigger: cue.trigger });
          break; // max 1 diegetic cue per scene
        }
      }

      // Camera move: EDL hint (or preset default), punches at caption-chunk
      // starts (chunks = any text layer that isn't the hook, an EDL overlay, or
      // an end-card line — end-card pops must not jolt the camera).
      const punchTimes = layers
        .filter((l): l is TextLayer => l.kind === 'text' && !endCardLayers.includes(l) && l.anim !== 'slideup' && l.anim !== 'fade')
        .map((l) => l.startSec);
      const camFilter = preset.stitchedOnly ? '' : buildCameraFilter(
        effectiveCameraEffect(scene.cameraEffect, i, preset.camera),
        trimSec ?? probeSec, dims, preset.camera, punchTimes
      );

      const outPath = join(dir, `muxed_${i}.mp4`);
      const tBuild = Date.now();
      buildScene(
        videoPath, audioPath, trimSec, dims, outPath, padAudio,
        dir, scene.sceneIdx, layers, sfx, fontName,
        preset.stitchedOnly ? '' : buildTransitionFilters(transitions[i], preset.transition, trimSec),
        camFilter, preset, hookFontName, sweepName
      );
      console.log(
        `[renderFfmpeg] scene=${i} dl=${dlMs}ms build=${Date.now() - tBuild}ms ` +
        `trim=${trimSec?.toFixed(2) ?? 'full'} layers=${layers.length} sfx=${sfx.length}`
      );
      onStep?.(`scene ${i + 1}/${ordered.length}`);
      muxed.push(outPath);
      elapsed += trimSec ?? probeSec ?? 0; // advance the timeline by this scene's length
    }

    const finalPath = join(dir, 'final.mp4');
    const tConcat = Date.now();
    concatScenes(muxed, finalPath);
    const concatMs = Date.now() - tConcat;
    onStep?.('concat');

    // Optional final pass: ducked background-music bed across the whole program.
    // Bed source priority (each step degrades gracefully to the next):
    //   1. generated bed (music.bedUrl, from api/music/compose) — downloaded here,
    //   2. tuned static bed (musicPath(style)),
    //   3. bare stitch (no music).
    let resultPath = finalPath;
    if (music?.enabled && !preset.stitchedOnly) {
      let bed: string | null = null;
      if (music.bedUrl) {
        try {
          const genBed = join(dir, 'music_bed.mp3');
          await downloadToFile(music.bedUrl, genBed);
          bed = genBed;
        } catch (err: any) {
          console.warn(`[renderFfmpeg] generated bed download failed (falling back to static): ${err?.message ?? err}`);
        }
      }
      if (!bed) bed = musicPath(music.style);
      if (bed) {
        const musicedPath = join(dir, 'final_music.mp4');
        // Beat BEFORE the bed mix: concat→here covers only the bed download, and the mix
        // itself is a full-program pass. Without this, download + mix + master could share
        // one gap and stall a healthy render past the 120s watchdog (renderJob.ts).
        onStep?.('music bed');
        if (mixMusic(finalPath, bed, probeDurationSec(finalPath), musicedPath, musicMixPlan(music.role))) {
          resultPath = musicedPath;
        }
      } else {
        console.warn(`[renderFfmpeg] music bed missing for style=${music.style}; skipping`);
      }
    }

    // Final master: pin loudness to -14 LUFS (+ faststart for instant streaming).
    const masteredPath = join(dir, 'final_master.mp4');
    // Beat BEFORE the master pass closes the bed mix's gap, so no single heartbeat gap
    // spans two full-program ffmpeg passes.
    onStep?.('master');
    if (masterAudio(resultPath, masteredPath)) resultPath = masteredPath;
    onStep?.('audio master');

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

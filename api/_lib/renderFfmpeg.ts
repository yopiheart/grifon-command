import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, statSync, existsSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';
import type { FinalRenderScene, OverlayText, OverlayStyle, OverlayPosition } from '../../types.js';

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

const SFX_VOLUME = 0.6;          // SFX sit under the VO, not over it
const MUSIC_VOLUME = 0.22;       // bed gain before sidechain ducking
const MUSIC_FADE_SEC = 0.4;      // afade in/out on the bed
const MUSIC_DUCK = 'threshold=0.05:ratio=8:attack=20:release=350'; // duck under VO

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
const fontPath = () => findAsset(join('fonts', 'Anton-Regular.ttf'));

/** Escape a filesystem path for use inside an ffmpeg filtergraph option value
 * (forward-slash the separators, escape the Windows drive colon). spawnSync
 * needs no shell quoting; this is purely the filtergraph parser's escaping. */
export function escFilterPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/:/g, '\\:');
}

export interface DrawtextPreset {
  fontsize: number;
  fontcolor: string;
  boxalpha: number;   // boxcolor=black@<alpha>
  boxborderw: number;
  /** y expression for drawtext given the chosen position. */
  yExpr: string;
}

/** Style + position → drawtext visual preset, sized proportionally to height. */
export function drawtextPreset(
  style: OverlayStyle,
  position: OverlayPosition,
  [, h]: [number, number]
): DrawtextPreset {
  const sizeFrac =
    style === 'hook' || style === 'punchline' ? 0.060
    : style === 'callout' ? 0.040
    : 0.038; // subtitle
  const fontcolor =
    style === 'callout' || style === 'punchline' ? '0xFFCC00' : 'white';
  const boxalpha = style === 'subtitle' ? 0.65 : style === 'hook' ? 0.40 : 0.50;
  const boxborderw = style === 'hook' || style === 'punchline' ? 26 : 16;
  const yExpr =
    position === 'top' ? `h*0.08`
    : position === 'bottom' ? `h*0.80`
    : `(h-text_h)/2`;
  return { fontsize: Math.round(h * sizeFrac), fontcolor, boxalpha, boxborderw, yExpr };
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

/** One drawtext filter for a single overlay, given its already-written textfile.
 * Pure (no I/O) so it can be unit-tested. */
export function buildDrawtext(
  style: OverlayStyle,
  position: OverlayPosition,
  dims: [number, number],
  win: { start: number; end: number },
  fontFile: string,
  textFile: string
): string {
  const p = drawtextPreset(style, position, dims);
  const opts = [
    `fontfile=${escFilterPath(fontFile)}`,
    `textfile=${escFilterPath(textFile)}`,
    `fontsize=${p.fontsize}`,
    `fontcolor=${p.fontcolor}`,
    `box=1`,
    `boxcolor=black@${p.boxalpha}`,
    `boxborderw=${p.boxborderw}`,
    `line_spacing=8`,
    `x=(w-text_w)/2`,
    `y=${p.yExpr}`,
    `enable='between(t,${win.start.toFixed(3)},${win.end.toFixed(3)})'`,
  ];
  return `drawtext=${opts.join(':')}`;
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
  overlays: OverlayText[],
  sfx: PreparedSfx[],
  fontName: string | null  // BARE filename inside `dir` (ffmpeg runs with cwd=dir)
): void {
  const [w, h] = dims;

  // --- Video chain: normalize, then chain a drawtext per clamped overlay. ---
  // drawtext's fontfile/textfile are referenced as BARE filenames and ffmpeg is
  // run with cwd=dir, so Windows drive-colon paths never enter the filtergraph
  // (an escaped `C:\` still breaks the parser — caught by the synthetic harness).
  let vChain =
    `[0:v]fps=${FPS},scale=${w}:${h}:force_original_aspect_ratio=decrease,` +
    `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1`;
  if (fontName) {
    let k = 0;
    for (const ov of overlays) {
      const win = clampWindow(ov.startSec, ov.endSec, trimSec);
      if (!win) continue;
      const textName = `ov_${sceneIdx}_${k}.txt`;
      writeFileSync(join(dir, textName), ov.text, 'utf8');
      vChain += `,${buildDrawtext(ov.style, ov.position, dims, win, fontName, textName)}`;
      k++;
    }
  }
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
  music?: { style: 'mrbeast' | 'temu' | 'testimonial'; enabled: boolean }
): Promise<{ buffer: Buffer; sizeBytes: number }> {
  if (!scenes.length) throw new RenderError('no_scenes');
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

    for (let i = 0; i < ordered.length; i++) {
      const scene = ordered[i];
      const videoPath = join(dir, `scene_${i}.mp4`);
      await downloadToFile(scene.videoUrl, videoPath);

      let audioPath: string | null = null;
      if (scene.audioUrl) {
        audioPath = join(dir, `voice_${i}.mp3`);
        await downloadToFile(scene.audioUrl, audioPath);
      }

      const probeSec = probeDurationSec(videoPath);
      // Measure the actual VO speech-end for every voiced scene — this is now the
      // PRIMARY trim signal (chooseTrim), ground-truth across any script/product.
      const detectedSec = audioPath ? detectTrimSec(audioPath) : null;

      const { trimSec, padAudio } = chooseTrim(scene, probeSec, detectedSec);

      // Resolve + clamp SFX cues for this scene (missing asset → skip that cue).
      const sfx: PreparedSfx[] = [];
      for (const cue of scene.sfxCues ?? []) {
        const p = sfxPath(cue.sfxId);
        if (!p) { console.warn(`[renderFfmpeg] sfx missing: ${cue.sfxId}`); continue; }
        const anchor = clampAnchor(cue.anchorSec, trimSec);
        if (anchor === null) continue;
        sfx.push({ path: p, anchorSec: anchor });
      }

      const outPath = join(dir, `muxed_${i}.mp4`);
      buildScene(
        videoPath, audioPath, trimSec, dims, outPath, padAudio,
        dir, scene.sceneIdx, scene.overlayText ?? [], sfx, fontName
      );
      muxed.push(outPath);
    }

    const finalPath = join(dir, 'final.mp4');
    concatScenes(muxed, finalPath);

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

    const buffer = readFileSync(resultPath);
    return { buffer, sizeBytes: statSync(resultPath).size };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

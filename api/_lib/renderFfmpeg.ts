import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import type { FinalRenderScene } from '../../types.js';

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
// Pure parsers (unit-tested in tests/unit/renderFfmpeg.test.ts) — no ffmpeg.
// ---------------------------------------------------------------------------

/** Parse `Duration: HH:MM:SS.cs` from ffmpeg stderr → seconds, or null. */
export function parseDurationSec(stderr: string): number | null {
  const m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(stderr);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/**
 * From a `silencedetect` stderr dump + the clip duration, compute the trim
 * length: speech-end + pad, clamped to duration.
 *
 * Speech-end = the start of the TRAILING silence run (the last silence_start with
 * no silence_end after it). If the clip does not end in silence (last event is a
 * silence_end, or there are no silence events), speech runs to the end → trim to
 * the full duration. Returns null only when duration is unknown and no trailing
 * silence was detected (caller falls back to -shortest / full clip).
 */
export function parseTrimSec(
  stderr: string,
  durationSec: number | null,
  padSec: number = PAD_SEC
): number | null {
  const events: Array<{ kind: 'start' | 'end'; t: number }> = [];
  for (const line of stderr.split(/\r?\n/)) {
    let m: RegExpExecArray | null;
    if ((m = /silence_start:\s*(-?[\d.]+)/.exec(line))) {
      events.push({ kind: 'start', t: parseFloat(m[1]) });
    } else if ((m = /silence_end:\s*([\d.]+)/.exec(line))) {
      events.push({ kind: 'end', t: parseFloat(m[1]) });
    }
  }

  const last = events[events.length - 1];
  const trailingSilenceStart = last && last.kind === 'start' ? last.t : null;

  if (trailingSilenceStart !== null) {
    const padded = Math.max(0, trailingSilenceStart) + padSec;
    return durationSec !== null ? Math.min(padded, durationSec) : padded;
  }
  // No trailing silence → speech reaches the end.
  return durationSec;
}

// ---------------------------------------------------------------------------
// ffmpeg invocations (spawnSync on the ffmpeg-static binary, like the spike).
// ---------------------------------------------------------------------------

function ffmpeg(args: string[]): { status: number; stderr: string } {
  if (!ffmpegPath) throw new RenderError('FFMPEG_NOT_AVAILABLE: ffmpeg-static path is null');
  const r = spawnSync(ffmpegPath, ['-hide_banner', ...args], { maxBuffer: 1 << 27 });
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

/**
 * Trim + mux + normalize one scene to `outPath`. With a voice MP3 the video is
 * trimmed to the voice's speech-end; audio-less scenes get a silent track so the
 * downstream concat stays stream-uniform.
 */
function buildScene(
  videoPath: string,
  audioPath: string | null,
  trimSec: number | null,
  [w, h]: [number, number],
  outPath: string,
  padAudioToVideo = false
): void {
  const vFilter =
    `[0:v]fps=${FPS},scale=${w}:${h}:force_original_aspect_ratio=decrease,` +
    `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1[v]`;
  const tArgs = trimSec !== null ? ['-t', trimSec.toFixed(3)] : [];

  // keepFullClip scenes (the hook): pad the short VO with trailing silence so
  // `-shortest` resolves to the full video, preserving the visual reveal. The
  // `-t` (full clip duration) caps the otherwise-infinite apad stream.
  const filterComplex = padAudioToVideo && audioPath ? `${vFilter};[1:a]apad[a]` : vFilter;
  const audioMap = padAudioToVideo && audioPath ? '[a]' : '1:a';

  const args = audioPath
    ? [
        '-y', '-i', videoPath, '-i', audioPath,
        ...tArgs,
        '-filter_complex', filterComplex,
        '-map', '[v]', '-map', audioMap,
        '-c:v', 'libx264', '-preset', PRESET, '-crf', CRF,
        '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-shortest', outPath,
      ]
    : [
        '-y', '-i', videoPath,
        '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
        ...tArgs,
        '-filter_complex', vFilter,
        '-map', '[v]', '-map', '1:a',
        '-c:v', 'libx264', '-preset', PRESET, '-crf', CRF,
        '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-shortest', outPath,
      ];

  const { status, stderr } = ffmpeg(args);
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
  aspectRatio: string
): Promise<{ buffer: Buffer; sizeBytes: number }> {
  if (!scenes.length) throw new RenderError('no_scenes');
  const dims = dimsFor(aspectRatio);
  const dir = mkdtempSync(join(tmpdir(), 'grifon-render-'));
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

      const outPath = join(dir, `muxed_${i}.mp4`);
      buildScene(videoPath, audioPath, trimSec, dims, outPath, padAudio);
      muxed.push(outPath);
    }

    const finalPath = join(dir, 'final.mp4');
    concatScenes(muxed, finalPath);

    const buffer = readFileSync(finalPath);
    return { buffer, sizeBytes: statSync(finalPath).size };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

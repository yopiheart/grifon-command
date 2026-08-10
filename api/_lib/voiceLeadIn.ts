import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';

// Cut the dead air BEFORE the first spoken word out of a scene's voice MP3.
//
// WHY THIS LIVES HERE, AND NOT IN THE RENDERER
// Every downstream timing — caption windows, SFX anchors, the trim-to-speech-end
// decision — is measured from the VO MP3 the renderer receives. Shifting the media
// inside renderFfmpeg with `-ss` would leave all of those anchors pointing at the
// OLD timeline (SFX would fire early, captions would fire early), so the fix would
// have to ripple through drawPlan as well. Cutting the silence out of the MP3 at
// birth means nothing downstream changes: the onset simply becomes ~0 and every
// existing measurement stays correct by construction.
//
// WHY ALIGNMENT AND NOT `silencedetect`
// The earlier attempt at this used amplitude, and amplitude cannot tell a breath
// from a word. AI-generated audio carries artefacts above any sane noise floor, so
// a real pause reads as "sound" and survives; drop the floor to catch it and you
// start cutting soft speech. Forced alignment answers a different question — WHERE
// ARE THE WORDS — and everything outside a word span is not speech no matter how
// loud it is. That is why this takes `words` and never probes the audio itself.
//
// SAFETY: no alignment → no cut. A scene whose alignment failed (see issue #96)
// renders exactly as it does today.

/** Silence left in front of the first word. A hard 0 sounds clipped. */
export const LEAD_IN_FLOOR_SEC = 0.15;
/** Below this, the lead-in is a natural breath — leave it alone. */
export const LEAD_IN_MIN_GAP_SEC = 0.25;

export interface AlignedWord {
  text: string;
  start: number;
  end: number;
}

export class VoiceLeadInError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VoiceLeadInError';
  }
}

/**
 * How many seconds to cut off the head of the MP3. Pure — no ffmpeg, no I/O.
 * Returns 0 when there is nothing worth cutting, which callers treat as "skip".
 */
export function planLeadInCut(
  words: AlignedWord[] | undefined,
  floorSec = LEAD_IN_FLOOR_SEC,
  minGapSec = LEAD_IN_MIN_GAP_SEC
): number {
  if (!Array.isArray(words) || words.length === 0) return 0;
  const onset = words[0]?.start;
  if (typeof onset !== 'number' || !Number.isFinite(onset) || onset <= 0) return 0;
  if (onset < minGapSec) return 0;
  const cut = onset - floorSec;
  return cut > 0 ? cut : 0;
}

/** Slide every word back by the cut so the timings match the trimmed MP3. */
export function shiftWords(words: AlignedWord[], cutSec: number): AlignedWord[] {
  if (cutSec <= 0) return words;
  return words.map((w) => ({
    text: w.text,
    start: Math.max(0, w.start - cutSec),
    end: Math.max(0, w.end - cutSec),
  }));
}

/**
 * Drop the first `cutSec` seconds of an MP3. Re-encodes rather than stream-copies:
 * a copy would snap the cut to the nearest frame boundary, and the whole point of
 * this is that the cut lands where the alignment said it should.
 *
 * Mirrors the invocation style of audioExtract.ts — spawnSync on the ffmpeg-static
 * binary, os.tmpdir() (writable on Vercel), cleans up after itself.
 */
export async function trimLeadIn(mp3: Buffer, cutSec: number): Promise<Buffer> {
  if (cutSec <= 0) return mp3;
  if (!ffmpegPath) throw new VoiceLeadInError('FFMPEG_NOT_AVAILABLE: ffmpeg-static binary path is null');
  if (!mp3 || mp3.byteLength === 0) throw new VoiceLeadInError('EMPTY_INPUT: mp3 buffer is empty');

  const dir = mkdtempSync(join(tmpdir(), 'grifon-leadin-'));
  const inPath = join(dir, 'in.mp3');
  const outPath = join(dir, 'out.mp3');
  try {
    writeFileSync(inPath, mp3);
    const r = spawnSync(
      ffmpegPath,
      [
        '-hide_banner', '-loglevel', 'error', '-y',
        '-ss', cutSec.toFixed(3),
        '-i', inPath,
        '-acodec', 'libmp3lame', '-q:a', '4',
        outPath,
      ],
      { maxBuffer: 1 << 26 }
    );
    if (r.status !== 0) {
      const stderr = r.stderr ? r.stderr.toString('utf8') : (r.error?.message ?? 'unknown ffmpeg error');
      throw new VoiceLeadInError(`FFMPEG_TRIM_FAILED: ${stderr.slice(0, 500)}`);
    }
    const out = readFileSync(outPath);
    if (out.byteLength === 0) throw new VoiceLeadInError('EMPTY_OUTPUT: trimmed audio is empty');
    return out;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';

// Extract a small JPEG poster (first frame) from an MP4 buffer so the video
// library/gallery can show a static thumbnail WITHOUT the browser downloading
// the full clip. This is the egress fix's serving half: posters are a few KB,
// the MP4s they stand in for are 10-30 MB.
//
// Mirrors the ffmpeg-static invocation style in audioExtract.ts (spawnSync,
// os.tmpdir() which is writable on Vercel, self-cleaning). Best-effort by
// design: returns null on ANY failure (missing binary, black/empty frame,
// unreadable buffer) so callers never gate video upload on poster success.
// A null poster simply falls back to the gallery's static placeholder card.

export async function extractPosterFromMp4(mp4: Buffer): Promise<Buffer | null> {
  if (!ffmpegPath) {
    console.warn('[videoPoster] ffmpeg-static path is null — skipping poster');
    return null;
  }
  if (!mp4 || mp4.byteLength === 0) return null;

  let dir: string | null = null;
  try {
    dir = mkdtempSync(join(tmpdir(), 'grifon-poster-'));
    const inPath = join(dir, 'in.mp4');
    const outPath = join(dir, 'poster.jpg');
    writeFileSync(inPath, mp4);

    // -ss 0.1 (fast seek before -i) skips a black opening frame on most clips.
    // scale to 480px wide keeps the JPEG ~10-30 KB; -frames:v 1 = single frame.
    const r = spawnSync(
      ffmpegPath,
      [
        '-hide_banner', '-loglevel', 'error', '-y',
        '-ss', '0.1',
        '-i', inPath,
        '-frames:v', '1',
        '-vf', 'scale=480:-2',
        '-q:v', '6',
        outPath,
      ],
      { maxBuffer: 1 << 26 }
    );
    if (r.status !== 0) {
      const stderr = r.stderr ? r.stderr.toString('utf8') : (r.error?.message ?? 'unknown');
      console.warn('[videoPoster] ffmpeg poster extract failed (non-fatal):', stderr.slice(0, 300));
      return null;
    }
    const out = readFileSync(outPath);
    return out.byteLength > 0 ? out : null;
  } catch (err: any) {
    console.warn('[videoPoster] poster extract exception (non-fatal):', err?.message);
    return null;
  } finally {
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
}

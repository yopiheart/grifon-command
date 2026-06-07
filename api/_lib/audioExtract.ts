import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';

// Strip the audio track from an MP4 buffer to an MP3 buffer.
//
// Used to feed a talking scene's Veo-generated audio into ElevenLabs
// speech-to-speech (voice-changer): STS preserves the original timing, so
// lip-sync survives the voice swap (TTS-over-Veo would desync the lips).
//
// Mirrors the ffmpeg invocation style in scripts/ffmpeg-spike.mjs — spawnSync on
// the `ffmpeg-static` binary. Writes to os.tmpdir() (Vercel /tmp is writable)
// and cleans up after itself. Throws AudioExtractError on failure (notably when
// the MP4 carries no audio stream).

export class AudioExtractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AudioExtractError';
  }
}

export async function extractAudioFromMp4(mp4: Buffer): Promise<Buffer> {
  if (!ffmpegPath) {
    throw new AudioExtractError('FFMPEG_NOT_AVAILABLE: ffmpeg-static binary path is null');
  }
  if (!mp4 || mp4.byteLength === 0) {
    throw new AudioExtractError('EMPTY_INPUT: mp4 buffer is empty');
  }

  const dir = mkdtempSync(join(tmpdir(), 'grifon-extract-'));
  const inPath = join(dir, 'in.mp4');
  const outPath = join(dir, 'out.mp3');
  try {
    writeFileSync(inPath, mp4);
    const r = spawnSync(
      ffmpegPath,
      [
        '-hide_banner', '-loglevel', 'error', '-y',
        '-i', inPath,
        '-vn', '-acodec', 'libmp3lame', '-q:a', '4',
        outPath,
      ],
      { maxBuffer: 1 << 26 }
    );
    if (r.status !== 0) {
      const stderr = r.stderr ? r.stderr.toString('utf8') : (r.error?.message ?? 'unknown ffmpeg error');
      throw new AudioExtractError(`FFMPEG_EXTRACT_FAILED: ${stderr.slice(0, 500)}`);
    }
    const out = readFileSync(outPath);
    if (out.byteLength === 0) {
      throw new AudioExtractError('NO_AUDIO_STREAM: extracted audio is empty');
    }
    return out;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

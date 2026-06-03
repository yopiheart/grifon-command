// THROWAWAY — Phase 0 confirmation deploy for workflows/render_pipeline_voice_10.md
//
// Measures the REAL Vercel wall-time for the #10 final-render pipeline
// (per-scene trim + mux + concat-filter re-encode) and confirms ffmpeg-static
// actually packages into a Vercel function (premortem #2). This is the one
// open caveat from the PC/local spike: true Vercel-vCPU speed.
//
// Self-contained: NO auth / Supabase / Gemini. Renders synthetic silent
// 1080x1920 scene MP4s + separate MP3s in /tmp (mirrors silent Veo/Kling video
// + separate ElevenLabs voice), then runs the exact ffmpeg invocations a Phase 2
// function would. Token-gated because it is compute-heavy and lives on a public
// preview URL. **DELETE this file (+ its vercel.json entry) once the number is
// recorded** — it must never reach prod.
//
// Usage (preview URL):
//   GET /api/render/_spike?key=grifon-phase0-spike-7e3f1a            -> 7 scenes, all cores
//   GET /api/render/_spike?key=grifon-phase0-spike-7e3f1a&threads=1  -> 7 scenes, ~1 vCPU proxy
//   GET /api/render/_spike?key=grifon-phase0-spike-7e3f1a&n=5        -> 5 scenes
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, statSync, existsSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import ffmpegPath from 'ffmpeg-static';

const TOKEN = 'grifon-phase0-spike-7e3f1a'; // throwaway abuse-gate, not a real secret
const W = 1080;
const H = 1920;
const FPS = 30;
const SRC_DUR = 6; // rendered scene length
const TRIM = 4; // speech-end trim target (dead-air tail removed)
const PRESET = 'veryfast';
const CRF = '20';

type FfResult = { ms: number; ok: boolean; err: string };

function ff(args: string[]): FfResult {
  const t0 = performance.now();
  const r = spawnSync(ffmpegPath as string, ['-hide_banner', '-loglevel', 'error', ...args], {
    encoding: 'utf8',
    maxBuffer: 1 << 26,
  });
  return { ms: performance.now() - t0, ok: r.status === 0, err: r.stderr || String(r.error ?? '') };
}

function genAssets(dir: string, n: number): FfResult | null {
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const v = ff([
      '-y', '-f', 'lavfi', '-i', `testsrc2=size=${W}x${H}:rate=${FPS}:duration=${SRC_DUR}`,
      '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
      join(dir, `scene_${i}.mp4`),
    ]);
    if (!v.ok) return v;
    const a = ff([
      '-y', '-f', 'lavfi', '-i', `sine=frequency=${260 + i * 20}:duration=${TRIM}`,
      '-c:a', 'libmp3lame', '-q:a', '4', join(dir, `voice_${i}.mp3`),
    ]);
    if (!a.ok) return a;
    acc += v.ms + a.ms;
  }
  return { ms: acc, ok: true, err: '' };
}

// The actual render pipeline (THIS is what we time): per-scene trim-to-speech-end
// + mux MP3 + normalize, then a concat-FILTER re-encode (not the demuxer).
function render(dir: string, n: number, threads: number): { ms: number; bytes: number } | FfResult {
  const tArgs = threads ? ['-threads', String(threads)] : [];
  let total = 0;
  const muxed: string[] = [];
  for (let i = 0; i < n; i++) {
    const out = join(dir, `muxed_${i}.mp4`);
    muxed.push(out);
    const r = ff([
      ...tArgs, '-y', '-i', join(dir, `scene_${i}.mp4`), '-i', join(dir, `voice_${i}.mp3`),
      '-t', String(TRIM),
      '-filter_complex',
      `[0:v]fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=decrease,` +
        `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1[v]`,
      '-map', '[v]', '-map', '1:a',
      '-c:v', 'libx264', '-preset', PRESET, '-crf', CRF,
      '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-shortest', out,
    ]);
    if (!r.ok) return r;
    total += r.ms;
  }
  const inputs = muxed.flatMap((m) => ['-i', m]);
  const streams = muxed.map((_, i) => `[${i}:v][${i}:a]`).join('');
  const finalOut = join(dir, `final_n${n}.mp4`);
  const c = ff([
    ...tArgs, '-y', ...inputs,
    '-filter_complex', `${streams}concat=n=${n}:v=1:a=1[v][a]`,
    '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', PRESET, '-crf', CRF,
    '-c:a', 'aac', '-ar', '48000', finalOut,
  ]);
  if (!c.ok) return c;
  total += c.ms;
  return { ms: total, bytes: statSync(finalOut).size };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if ((req.query.key as string | undefined) !== TOKEN) {
    return res.status(401).json({ error: 'bad_key' });
  }
  if (!ffmpegPath) {
    return res.status(500).json({ error: 'ffmpeg_static_path_null', note: 'ffmpeg-static did not resolve a binary for this platform' });
  }

  const n = Math.min(Math.max(parseInt(String(req.query.n ?? '7'), 10) || 7, 1), 8);
  const threads = parseInt(String(req.query.threads ?? '0'), 10) || 0;

  // Confirm the binary is actually present in the bundle (the packaging test).
  let ffmpegBytes = 0;
  let ffmpegExists = false;
  try {
    ffmpegBytes = statSync(ffmpegPath).size;
    ffmpegExists = true;
  } catch {
    return res.status(500).json({
      error: 'ffmpeg_binary_missing',
      ffmpegPath,
      note: 'ffmpeg-static resolved a path but the binary is not in the function bundle — add includeFiles',
    });
  }

  const dir = join(os.tmpdir(), 'grifon-spike');
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  const gen = genAssets(dir, n);
  if (gen && !gen.ok) {
    return res.status(500).json({ error: 'gen_failed', detail: gen.err.slice(0, 800) });
  }

  const rendered = render(dir, n, threads);
  if ('ok' in rendered) {
    return res.status(500).json({ error: 'render_failed', detail: rendered.err.slice(0, 800) });
  }

  const cpus = os.cpus();
  return res.status(200).json({
    verdict_axis: 'real-vercel-walltime',
    config: { scenes: n, threads: threads || 'all', format: `${W}x${H}@${FPS}`, trim: `${SRC_DUR}s->${TRIM}s`, encode: `libx264 -preset ${PRESET} -crf ${CRF}, AAC 48k` },
    render_sec: +(rendered.ms / 1000).toFixed(2),
    gen_sec: gen ? +(gen.ms / 1000).toFixed(2) : 0,
    output_mb: +(rendered.bytes / (1024 * 1024)).toFixed(2),
    ffmpeg: { path: ffmpegPath, exists: ffmpegExists, binary_mb: +(ffmpegBytes / (1024 * 1024)).toFixed(2) },
    machine: { platform: process.platform, arch: process.arch, node: process.version, cpu_model: cpus[0]?.model ?? 'unknown', cpu_cores: cpus.length, total_mem_mb: Math.round(os.totalmem() / (1024 * 1024)) },
  });
}

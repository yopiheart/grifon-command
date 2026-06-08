import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createServer, type Server } from 'node:http';
import ffmpegPath from 'ffmpeg-static';
import type { FinalRenderScene } from '../../types.js';

// Real-footage re-stitch ($0 — reuses already-rendered clips, no Gemini/Veo/TTS).
// Reads a spec from .tmp/restitch.json (gitignored, vite-watch-ignored). Video URLs
// are remote (Supabase); audio may be a bare filename in .tmp, which is served over
// a local HTTP server so renderFinalVideo can fetch it. Runs the REAL renderFinalVideo
// with caption overlays, writes .tmp/restitch-out.mp4, and extracts a frame at each
// caption window so the burned text can be eyeballed (Read the PNGs).
//
// Run (after writing the spec):
//   PowerShell: npx vitest run tests/integration/restitch-real.test.ts

const TMP = join(process.cwd(), '.tmp');
const SPEC_PATH = join(TMP, 'restitch.json');
// Env-gated (NOT file-gated) so the default `npm run test` / build-gate never
// downloads clips or hits expiring URLs. Opt in: $env:RUN_RESTITCH='1'.
const RUN = process.env.RUN_RESTITCH === '1' && existsSync(SPEC_PATH);
const d = RUN ? describe : describe.skip;

const ff = (args: string[]) =>
  spawnSync(ffmpegPath as string, ['-hide_banner', '-y', ...args], { maxBuffer: 1 << 27 });

interface SpecScene {
  sceneIdx: number;
  videoUrl: string;
  audioUrl?: string | null;
  isHook?: boolean;
  targetDurationSec?: number | null;
  scriptLine?: string;
  sceneType?: 'talking' | 'b-roll' | 'cinematic';
  captionRegion?: { yFracTop: number; yFracBottom: number };
  overlayText?: FinalRenderScene['overlayText'];
  sfxCues?: FinalRenderScene['sfxCues'];
}

d('re-stitch real footage with captions', () => {
  let renderFinalVideo: typeof import('../../api/_lib/renderFfmpeg.js')['renderFinalVideo'];
  let spec: { aspectRatio: '9:16' | '16:9' | '1:1'; scenes: SpecScene[]; music?: { style: 'mrbeast' | 'temu' | 'testimonial'; enabled: boolean } };
  let server: Server;
  let base: string;

  beforeAll(async () => {
    mkdirSync(TMP, { recursive: true });
    spec = JSON.parse(readFileSync(SPEC_PATH, 'utf8'));

    // Serve .tmp so bare-filename audio (e.g. "SCENE 1.mp3") is fetchable.
    server = createServer((req, res) => {
      const p = join(TMP, decodeURIComponent((req.url ?? '/').slice(1)));
      if (existsSync(p)) res.end(readFileSync(p));
      else { res.statusCode = 404; res.end(); }
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const addr = server.address();
    base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;

    ({ renderFinalVideo } = await import('../../api/_lib/renderFfmpeg.js'));
  });

  afterAll(async () => {
    await new Promise<void>((r) => server?.close(() => r()));
  });

  const resolveAudio = (a?: string | null): string | null => {
    if (!a) return null;
    return /^https?:\/\//.test(a) ? a : `${base}/${encodeURIComponent(a)}`;
  };

  it('burns captions onto the real clips → .tmp/restitch-out.mp4 + per-caption frames', async () => {
    const scenes: FinalRenderScene[] = spec.scenes.map((s) => ({
      sceneIdx: s.sceneIdx,
      videoUrl: s.videoUrl,
      audioUrl: resolveAudio(s.audioUrl),
      keepFullClip: !!s.isHook,
      isHook: !!s.isHook,
      targetDurationSec: s.isHook ? null : s.targetDurationSec ?? null,
      scriptLine: s.scriptLine,
      sceneType: s.sceneType,
      captionRegion: s.captionRegion,
      overlayText: s.overlayText,
      sfxCues: s.sfxCues,
    }));

    const out = await renderFinalVideo(scenes, spec.aspectRatio, spec.music);
    const outPath = join(TMP, 'restitch-out.mp4');
    writeFileSync(outPath, out.buffer);
    expect(out.sizeBytes).toBeGreaterThan(10_000);

    // Probe total + extract a frame at each scene's caption (sampled at start+0.8s
    // into the scene, summed across measured prior-scene durations from the output).
    const totalErr = (ff(['-i', outPath]).stderr ?? Buffer.alloc(0)).toString('utf8');
    const totalM = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(totalErr);
    const total = totalM ? Number(totalM[1]) * 3600 + Number(totalM[2]) * 60 + Number(totalM[3]) : 0;

    // Even spread across the timeline (one grab per scene) — good enough to eyeball
    // each caption since each scene carries exactly one overlay here.
    const n = spec.scenes.length;
    let f = 0;
    for (let i = 0; i < n; i++) {
      const t = total > 0 ? (total * (i + 0.45)) / n : 1;
      const s = spec.scenes[i];
      const style = s.overlayText?.[0]?.style ?? 'na';
      ff(['-ss', t.toFixed(2), '-i', outPath, '-frames:v', '1', join(TMP, `restitch-frame-${i + 1}-${style}.png`)]);
      f++;
    }
    // eslint-disable-next-line no-console
    console.log(`[restitch] wrote ${outPath} (${(out.sizeBytes / 1e6).toFixed(2)} MB, ${total.toFixed(1)}s) + ${f} frames`);
    expect(total).toBeGreaterThan(5);
  }, 240_000);
});

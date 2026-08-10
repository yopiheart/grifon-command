import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, type Server } from 'node:http';
import ffmpegPath from 'ffmpeg-static';
import type { FinalRenderScene } from '../../types.js';

// Synthetic mid-gap harness: drives the REAL renderFinalVideo against a voice MP3
// that carries a REAL 1.0s hole in the middle, so the split-at-concat filtergraph
// is proven by ffmpeg rather than by string comparison. The unit tests cover the
// planner and the graph text; this covers "does ffmpeg accept and honour it".
//
// FREE — zero Gemini/Veo/ElevenLabs spend. Opt in:
//   PowerShell: $env:RUN_MIDGAP='1'; npx vitest run tests/integration/midgap-render.test.ts
//
// The SSRF guard is stubbed because the harness serves its media from 127.0.0.1.
// (tests/integration/burnin-render.test.ts predates the guard and is currently
// red for exactly that reason — not touched here.)
vi.mock('../../api/_lib/ssrfGuard.js', () => ({ assertSafeMediaUrl: () => {} }));

const RUN = process.env.RUN_MIDGAP === '1';
const d = RUN ? describe : describe.skip;

const ff = (args: string[]) =>
  spawnSync(ffmpegPath as string, ['-hide_banner', '-y', ...args], { maxBuffer: 1 << 27 });

const durationOf = (path: string): number | null => {
  const err = (ff(['-i', path]).stderr ?? Buffer.alloc(0)).toString('utf8');
  const m = /Duration:\s*(\d+):(\d+):(\d+\.\d+)/.exec(err);
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null;
};

/** Starts of every silence run ≥0.4s — the same question detectTrimSec asks. */
const silenceStarts = (path: string): number[] => {
  const err = (ff(['-i', path, '-af', 'silencedetect=noise=-35dB:d=0.4', '-f', 'null', '-'])
    .stderr ?? Buffer.alloc(0)).toString('utf8');
  return [...err.matchAll(/silence_start:\s*(-?[\d.]+)/g)].map((m) => Number(m[1]));
};

d('mid-gap dead-air trim (synthetic, free)', () => {
  let work: string;
  let server: Server;
  let base: string;
  let renderFinalVideo: typeof import('../../api/_lib/renderFfmpeg.js')['renderFinalVideo'];

  // Voice: tone 0-1s, SILENCE 1-2s, tone 2-3s. The words below describe it
  // honestly, so the 1.00s hole is the only thing the planner can find.
  const WORDS = [
    { text: 'una', start: 0.10, end: 1.00 },
    { text: 'pangalawa', start: 2.00, end: 2.95 },
  ];

  const scene = (sceneType: FinalRenderScene['sceneType']): FinalRenderScene[] => [{
    sceneIdx: 0,
    videoUrl: `${base}/scene0.mp4`,
    audioUrl: `${base}/voice0.mp3`,
    sceneType,
    voiceWords: WORDS,
  }];

  beforeAll(async () => {
    work = mkdtempSync(join(tmpdir(), 'midgap-in-'));
    ff(['-f', 'lavfi', '-i', 'color=c=0x102030:s=540x960:r=30:d=6',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-t', '6', join(work, 'scene0.mp4')]);
    ff(['-f', 'lavfi', '-i', 'sine=frequency=300:duration=3',
      '-af', "volume=enable='between(t,1,2)':volume=0", '-q:a', '6', join(work, 'voice0.mp3')]);

    server = createServer((req, res) => {
      res.setHeader('Connection', 'close');
      const p = join(work, decodeURIComponent((req.url ?? '/').slice(1)));
      if (existsSync(p)) res.end(readFileSync(p));
      else { res.statusCode = 404; res.end(); }
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const addr = server.address();
    base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
    ({ renderFinalVideo } = await import('../../api/_lib/renderFfmpeg.js'));
  }, 60_000);

  afterAll(async () => {
    await new Promise<void>((r) => server?.close(() => r()));
    if (work && existsSync(work)) rmSync(work, { recursive: true, force: true });
    delete process.env.MID_GAP_TRIM_ENABLED;
  });

  const render = async (sceneType: FinalRenderScene['sceneType'], flag: boolean, tag: string) => {
    if (flag) process.env.MID_GAP_TRIM_ENABLED = 'true';
    else delete process.env.MID_GAP_TRIM_ENABLED;
    const out = await renderFinalVideo(scene(sceneType), '9:16');
    const p = join(work, `out_${tag}.mp4`);
    writeFileSync(p, out.buffer);
    return p;
  };

  it('shortens a talking scene by the planned cut, and leaves it alone with the flag off', async () => {
    const off = await render('talking', false, 'talking_off');
    const on = await render('talking', true, 'talking_on');

    const dOff = durationOf(off)!;
    const dOn = durationOf(on)!;
    expect(dOff).toBeGreaterThan(0);
    // Planned cut = 1.00s gap - 0.15s floor = 0.85s. Allow a frame either way:
    // the paired concat re-syncs audio to video at the splice.
    expect(dOff - dOn).toBeGreaterThan(0.75);
    expect(dOff - dOn).toBeLessThan(0.95);

    // Both streams survive the splice.
    const info = (ff(['-i', on]).stderr ?? Buffer.alloc(0)).toString('utf8');
    expect(info).toMatch(/Video:/);
    expect(info).toMatch(/Audio:/);

    // THE ACTUAL CLAIM: the hole is gone, not merely the tail. Un-trimmed, the
    // 1.0s hole is a detectable silence run; trimmed, what is left (0.15s) is
    // below silencedetect's 0.4s floor, so there is nothing to find.
    expect(silenceStarts(off).some((s) => s > 0.5 && s < 1.5)).toBe(true);
    expect(silenceStarts(on)).toEqual([]);
  }, 180_000);

  it('compresses the audio of a b-roll scene without cutting its video', async () => {
    const on = await render('b-roll', true, 'broll_on');
    const off = await render('b-roll', false, 'broll_off');
    // Same saving: the scene ends at the (now earlier) VO end either way.
    expect(durationOf(off)! - durationOf(on)!).toBeGreaterThan(0.75);
  }, 180_000);
});

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, type Server } from 'node:http';
import ffmpegPath from 'ffmpeg-static';
import type { FinalRenderScene } from '../../types.js';

// Synthetic scene-grade harness: drives the REAL renderFinalVideo over four flat
// colour clips, so the two-pass measure→median→grade wiring is proven by ffmpeg
// rather than by string comparison. The unit tests cover the planner's maths;
// this covers "does the filter reach the graph, and does the picture move".
//
// FREE — zero Gemini/Veo/ElevenLabs spend, ffmpeg only. Opt in:
//   PowerShell: $env:RUN_SCENEGRADE='1'; npx vitest run tests/integration/scenegrade-render.test.ts
//
// The SSRF guard is stubbed because the harness serves its media from 127.0.0.1
// (same reason as tests/integration/midgap-render.test.ts).
vi.mock('../../api/_lib/ssrfGuard.js', () => ({ assertSafeMediaUrl: () => {} }));

const RUN = process.env.RUN_SCENEGRADE === '1';
const d = RUN ? describe : describe.skip;

const SCENE_SEC = 2; // fallbackDurationSec — every scene is exactly this long
/** Flat grey: UAVG/VAVG both land on 128 once encoded. */
const NEUTRAL = '0x606060';
/** Same grey nudged warm: measures ~3 units red and ~3 units blue-deficient —
 * over the 0.8-unit deadband, and small enough that the 0.14 shift ceiling can
 * close most of it (a wildly-coloured clip would only ever be capped). */
const WARM = '0x66605C';

const ff = (args: string[]) =>
  spawnSync(ffmpegPath as string, ['-hide_banner', '-y', ...args], { maxBuffer: 1 << 27 });

const sha256 = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');

/** Mean UAVG/VAVG over one window of a rendered file, via signalstats. */
const measureWindow = (path: string, startSec: number, durSec: number) => {
  const err = (ff([
    '-nostats', '-ss', String(startSec), '-t', String(durSec), '-i', path,
    '-vf', 'fps=2,signalstats,metadata=print', '-an', '-f', 'null', '-',
  ]).stderr ?? Buffer.alloc(0)).toString('utf8');
  const pick = (key: string) =>
    [...err.matchAll(new RegExp(`lavfi\\.signalstats\\.${key}=([0-9.]+)`, 'g'))].map((mm) => Number(mm[1]));
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const us = pick('UAVG');
  const vs = pick('VAVG');
  expect(us.length).toBeGreaterThan(0); // an empty window means the seek missed
  return { uavg: mean(us), vavg: mean(vs), frames: us.length };
};

d('per-scene colour grade (synthetic, free)', () => {
  let work: string;
  let server: Server;
  let base: string;
  let renderFinalVideo: typeof import('../../api/_lib/renderFfmpeg.js')['renderFinalVideo'];
  const restoreFlag = process.env.SCENE_GRADE_ENABLED;

  /** Four silent scenes of `SCENE_SEC` each, in the given colours. */
  const scenesFor = (colours: string[]): FinalRenderScene[] =>
    colours.map((c, i) => ({
      sceneIdx: i,
      videoUrl: `${base}/${c}.mp4`,
      sceneType: 'b-roll',
      fallbackDurationSec: SCENE_SEC,
    }));

  beforeAll(async () => {
    work = mkdtempSync(join(tmpdir(), 'scenegrade-in-'));
    for (const c of [NEUTRAL, WARM]) {
      ff(['-f', 'lavfi', '-i', `color=c=${c}:s=540x960:r=30:d=4`,
        '-c:v', 'libx264', '-preset', 'ultrafast', '-t', '4', join(work, `${c}.mp4`)]);
    }

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
  }, 120_000);

  afterAll(async () => {
    await new Promise<void>((r) => server?.close(() => r()));
    if (work && existsSync(work)) rmSync(work, { recursive: true, force: true });
    if (restoreFlag === undefined) delete process.env.SCENE_GRADE_ENABLED;
    else process.env.SCENE_GRADE_ENABLED = restoreFlag;
  });

  const render = async (colours: string[], flag: boolean, tag: string) => {
    if (flag) process.env.SCENE_GRADE_ENABLED = 'true';
    else delete process.env.SCENE_GRADE_ENABLED;
    const out = await renderFinalVideo(scenesFor(colours), '9:16');
    const p = join(work, `out_${tag}.mp4`);
    writeFileSync(p, out.buffer);
    return p;
  };

  it('renders an ad whose beats already agree BYTE-IDENTICALLY, flag on or off', async () => {
    // The deadband guarantee, and the reason no preset (CLASSIC included) needs
    // to be excluded from grading: four identical beats sit 0 units from their
    // own median, so planSceneGrade returns null and the filtergraph is the one
    // that shipped before this feature existed.
    const same = [NEUTRAL, NEUTRAL, NEUTRAL, NEUTRAL];
    const off = await render(same, false, 'same_off');
    const on = await render(same, true, 'same_on');

    expect(sha256(on)).toBe(sha256(off));
  }, 300_000);

  it('pulls a warm outlier back toward its siblings without overshooting', async () => {
    const set = [NEUTRAL, NEUTRAL, NEUTRAL, WARM];
    const off = await render(set, false, 'warm_off');
    const on = await render(set, true, 'warm_on');

    // Scene 3 owns [6s, 8s); sample its middle second, away from either cut.
    const warmOff = measureWindow(off, SCENE_SEC * 3 + 0.5, 1);
    const warmOn = measureWindow(on, SCENE_SEC * 3 + 0.5, 1);
    // The siblings define the target, and must themselves be untouched (they
    // ARE the median, so their drift is 0 and they plan null).
    const sibOff = measureWindow(off, 0.5, 1);
    const sibOn = measureWindow(on, 0.5, 1);

    expect(sibOn.vavg).toBeCloseTo(sibOff.vavg, 0);
    expect(sibOn.uavg).toBeCloseTo(sibOff.uavg, 0);

    const target = sibOff.vavg;
    const gapOff = warmOff.vavg - target;
    const gapOn = warmOn.vavg - target;

    // The defect is really there to begin with (over the 0.8-unit deadband).
    expect(gapOff).toBeGreaterThan(1);
    // Corrective direction, and a meaningful bite out of the gap — not a token
    // nudge. The planner closes ~70%+ of a drift this size.
    expect(gapOn).toBeLessThan(gapOff * 0.75);
    // ...and never past the target: an over-correction would read as a NEW cast
    // in the opposite direction, which is worse than the drift it replaced.
    expect(gapOn).toBeGreaterThan(-0.5);

    // Same story on the blue-difference channel, which drifts the other way.
    const uGapOff = Math.abs(warmOff.uavg - sibOff.uavg);
    const uGapOn = Math.abs(warmOn.uavg - sibOn.uavg);
    expect(uGapOn).toBeLessThan(uGapOff);
  }, 300_000);
});

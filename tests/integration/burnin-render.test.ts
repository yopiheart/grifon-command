import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, type Server } from 'node:http';
import ffmpegPath from 'ffmpeg-static';
import type { FinalRenderScene } from '../../types.js';
import { framesIdentical } from '../support/renderAssertions.js';

const fixture = vi.hoisted(() => ({ origin: undefined as string | undefined }));
vi.mock('../../api/_lib/ssrfGuard.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/_lib/ssrfGuard.js')>();
  const { createFixtureMediaUrlGuard } = await import('../support/fixtureMediaUrlGuard.js');
  return {
    ...actual,
    assertSafeMediaUrl: createFixtureMediaUrlGuard(() => fixture.origin, actual.assertSafeMediaUrl),
  };
});

// Synthetic burn-in harness ("scripts/burnin-spike" as a gated vitest test so it
// drives the REAL renderFinalVideo, not a re-implementation). Generates color
// clips + tone "voice"/"sfx"/"music" with ffmpeg, serves them over a local HTTP
// server (renderFinalVideo downloads via fetch), points GRIFON_ASSET_DIR at temp
// SFX/music, then proves burn-in objectively: a frame inside the hook-overlay
// window DIFFERS between burn-in ON and OFF (drawtext rendered), and the ON audio
// carries the ducked music+SFX (mean volume differs from the bare stitch).
//
// FREE — zero Gemini/Veo/ElevenLabs spend. Opt in:
//   PowerShell: $env:RUN_BURNIN='1'; npx vitest run tests/integration/burnin-render.test.ts

const RUN = process.env.RUN_BURNIN === '1';
const d = RUN ? describe : describe.skip;

const ff = (args: string[]) =>
  spawnSync(ffmpegPath as string, ['-hide_banner', '-y', ...args], { maxBuffer: 1 << 27 });

/** ffmpeg -i probe → stderr (Duration/stream lines live there). */
const probe = (path: string): string =>
  (ff(['-i', path]).stderr ?? Buffer.alloc(0)).toString('utf8');

const meanVolumeDb = (path: string): number | null => {
  const err = (ff(['-i', path, '-af', 'volumedetect', '-f', 'null', '-']).stderr ?? Buffer.alloc(0)).toString('utf8');
  const m = /mean_volume:\s*(-?[\d.]+) dB/.exec(err);
  return m ? Number(m[1]) : null;
};

d('burn-in render (synthetic, free)', () => {
  let work: string;        // inputs served over http
  let assets: string;      // GRIFON_ASSET_DIR (sfx/music)
  let server: Server;
  let base: string;
  let renderFinalVideo: typeof import('../../api/_lib/renderFfmpeg.js')['renderFinalVideo'];

  const scenes = (withBurnIn: boolean): FinalRenderScene[] => [
    {
      sceneIdx: 0,
      videoUrl: `${base}/scene0.mp4`,
      audioUrl: `${base}/voice0.mp3`,
      keepFullClip: true,
      isHook: withBurnIn,
      // Hook: slide-up reveal + crimson wipe-box on the last word; apostrophe in the line.
      overlayText: withBurnIn
        ? [{ text: "TIGNAN MO 'TO", startSec: 0, endSec: 5, style: 'hook', position: 'center' }]
        : undefined,
      sfxCues: withBurnIn ? [{ sfxId: 'whoosh', anchorSec: 0, reason: 't' }] : undefined,
    },
    {
      sceneIdx: 1,
      videoUrl: `${base}/scene1.mp4`,
      audioUrl: `${base}/voice1.mp3`,
      targetDurationSec: 2.2,
      sceneType: 'talking',
      // Caption path: Taglish line with an apostrophe AND a comma AND an emoji
      // (must render without a filtergraph error; emoji stripped). + EDL overlay.
      scriptLine: withBurnIn ? "Iba 'to, grabe 🔥 ang resulta promise" : undefined,
      overlayText: withBurnIn
        ? [{ text: 'DERMA-TESTED', startSec: 0, endSec: 2, style: 'callout', position: 'top' }]
        : undefined,
      sfxCues: withBurnIn ? [{ sfxId: 'ding', anchorSec: 0.3, reason: 't' }] : undefined,
    },
  ];

  beforeAll(async () => {
    work = mkdtempSync(join(tmpdir(), 'burnin-in-'));
    assets = mkdtempSync(join(tmpdir(), 'burnin-assets-'));
    mkdirSync(join(assets, 'sfx'), { recursive: true });
    mkdirSync(join(assets, 'music'), { recursive: true });

    // Color clips (video only) + tone "voice" + short "sfx" + long "music" bed.
    ff(['-f', 'lavfi', '-i', 'color=c=0x102030:s=540x960:r=30:d=4', '-c:v', 'libx264', '-preset', 'ultrafast', '-t', '4', join(work, 'scene0.mp4')]);
    ff(['-f', 'lavfi', '-i', 'color=c=0x301020:s=540x960:r=30:d=4', '-c:v', 'libx264', '-preset', 'ultrafast', '-t', '4', join(work, 'scene1.mp4')]);
    ff(['-f', 'lavfi', '-i', 'sine=frequency=300:duration=2.5', '-q:a', '6', join(work, 'voice0.mp3')]);
    ff(['-f', 'lavfi', '-i', 'sine=frequency=200:duration=2.0', '-q:a', '6', join(work, 'voice1.mp3')]);
    ff(['-f', 'lavfi', '-i', 'sine=frequency=900:duration=0.4', '-q:a', '6', join(assets, 'sfx', 'whoosh.mp3')]);
    ff(['-f', 'lavfi', '-i', 'sine=frequency=1400:duration=0.4', '-q:a', '6', join(assets, 'sfx', 'ding.mp3')]);
    ff(['-f', 'lavfi', '-i', 'sine=frequency=120:duration=30', '-q:a', '6', join(assets, 'music', 'mrbeast.mp3')]);

    server = createServer((req, res) => {
      // No keep-alive: renders idle >5s between downloads, and a pooled undici
      // socket against a timed-out server connection dies with ECONNRESET.
      res.setHeader('Connection', 'close');
      const p = join(work, decodeURIComponent((req.url ?? '/').slice(1)));
      if (existsSync(p)) res.end(readFileSync(p));
      else { res.statusCode = 404; res.end(); }
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    base = `http://127.0.0.1:${port}`;
    fixture.origin = base;

    // Set GRIFON_ASSET_DIR BEFORE importing the module (ASSET_ROOTS is load-time).
    // Font resolves from the repo asset dir via the fallback root.
    process.env.GRIFON_ASSET_DIR = assets;
    ({ renderFinalVideo } = await import('../../api/_lib/renderFfmpeg.js'));
  }, 60_000);

  afterAll(async () => {
    await new Promise<void>((r) => server?.close(() => r()));
    fixture.origin = undefined;
    for (const p of [work, assets]) if (p && existsSync(p)) rmSync(p, { recursive: true, force: true });
    delete process.env.GRIFON_ASSET_DIR;
  });

  it('produces a playable MP4 with both burn-in on and off', async () => {
    const on = await renderFinalVideo(scenes(true), '9:16', { style: 'mrbeast', enabled: true });
    const off = await renderFinalVideo(scenes(false), '9:16');
    expect(on.sizeBytes).toBeGreaterThan(2000);
    expect(off.sizeBytes).toBeGreaterThan(2000);

    const onPath = join(work, 'out_on.mp4');
    const offPath = join(work, 'out_off.mp4');
    writeFileSync(onPath, on.buffer);
    writeFileSync(offPath, off.buffer);

    const onInfo = probe(onPath);
    expect(onInfo).toMatch(/Video:/);
    expect(onInfo).toMatch(/Audio:/);

    // (1) OVERLAY BURNED: a frame inside the hook window differs from the bare stitch.
    ff(['-ss', '1.0', '-i', onPath, '-frames:v', '1', join(work, 'f_on.png')]);
    ff(['-ss', '1.0', '-i', offPath, '-frames:v', '1', join(work, 'f_off.png')]);
    expect(framesIdentical(join(work, 'f_on.png'), join(work, 'f_off.png'), ff)).toBe(false);

    // (2) MUSIC/SFX PRESENT: the ON audio carries energy the voice-only stitch lacks.
    const onDb = meanVolumeDb(onPath);
    const offDb = meanVolumeDb(offPath);
    expect(onDb).not.toBeNull();
    expect(offDb).not.toBeNull();
    // Loudnorm pulls both mixes toward -14 LUFS, so the residual delta is small;
    // 0.15 keeps the "music+SFX present" signal without a knife-edge at 0.2.
    expect(Math.abs((onDb as number) - (offDb as number))).toBeGreaterThan(0.15);
  }, 120_000);

  it('renders a non-classic preset with visible differences inside the CPU budget', async () => {
    const { HYPE, CLASSIC } = await import('../../api/_lib/renderPresets.js');

    const t0 = Date.now();
    const classic = await renderFinalVideo(scenes(true), '9:16', { style: 'mrbeast', enabled: true }, CLASSIC);
    const classicMs = Date.now() - t0;

    const t1 = Date.now();
    const hype = await renderFinalVideo(scenes(true), '9:16', { style: 'mrbeast', enabled: true }, HYPE);
    const hypeMs = Date.now() - t1;

    console.log(`[burnin-harness] classic=${classicMs}ms hype=${hypeMs}ms ratio=${(hypeMs / classicMs).toFixed(2)}`);

    expect(hype.sizeBytes).toBeGreaterThan(2000);
    const hypePath = join(work, 'out_hype.mp4');
    const classicPath = join(work, 'out_classic.mp4');
    writeFileSync(hypePath, hype.buffer);
    writeFileSync(classicPath, classic.buffer);
    expect(probe(hypePath)).toMatch(/Video:/);

    // Different preset → visibly different burn (font/colors/wipe + whip + zoom).
    ff(['-ss', '1.0', '-i', hypePath, '-frames:v', '1', join(work, 'f_hype.png')]);
    ff(['-ss', '1.0', '-i', classicPath, '-frames:v', '1', join(work, 'f_classic.png')]);
    expect(framesIdentical(join(work, 'f_hype.png'), join(work, 'f_classic.png'), ff)).toBe(false);

    // CPU budget: effects (zoom eval=frame + whip + word-pop) ≤ 1.5× classic.
    expect(hypeMs).toBeLessThanOrEqual(classicMs * 1.5);
  }, 240_000);
});

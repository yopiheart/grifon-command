import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { createServer, type Server } from 'node:http';
import ffmpegPath from 'ffmpeg-static';
import type { FinalRenderScene } from '../../types.js';

const fixture = vi.hoisted(() => ({ origin: undefined as string | undefined }));
vi.mock('../../api/_lib/ssrfGuard.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/_lib/ssrfGuard.js')>();
  const { createFixtureMediaUrlGuard } = await import('../support/fixtureMediaUrlGuard.js');
  return {
    ...actual,
    assertSafeMediaUrl: createFixtureMediaUrlGuard(() => fixture.origin, actual.assertSafeMediaUrl),
  };
});

// DEMO harness (Viral Editor 2.0): split the baseline ad (CURRENT EDIT.mp4,
// pre-staged at .tmp/edit-analysis/current/src.mp4) at its 8 detected cut points
// and push the SAME footage back through the REAL renderFinalVideo under the new
// presets — word-pop captions, whip/flash transitions, zoom punches, SFX. Output
// lands in the repo root as "VIRAL EDITOR 2 DEMO (<preset>).mp4" for Neil to
// watch next to the original. scriptLines are demo Taglish placeholders (we
// don't have the original VO transcript) — this demos the EDIT, not the copy.
//
// FREE — zero AI spend. Opt in:
//   PowerShell: $env:RUN_DEMO='1'; npx vitest run tests/integration/demo-rerender.test.ts

const SRC = join(process.cwd(), '.tmp', 'edit-analysis', 'current', 'src.mp4');
const RUN = process.env.RUN_DEMO === '1' && existsSync(SRC);
const d = RUN ? describe : describe.skip;

const CUTS = [0, 4.23, 9.93, 14.07, 17.93, 21.83, 27.03, 30.93, 35.83];

const ff = (args: string[]) =>
  spawnSync(ffmpegPath as string, ['-hide_banner', '-y', ...args], { maxBuffer: 1 << 27 });

d('Viral Editor 2.0 demo re-render (real footage, free)', () => {
  const work = join(process.cwd(), '.tmp', 'demo');
  let server: Server;
  let base: string;
  let renderFinalVideo: typeof import('../../api/_lib/renderFfmpeg.js')['renderFinalVideo'];

  const SCENE_META: Array<Partial<FinalRenderScene>> = [
    {
      isHook: true, keepFullClip: true,
      overlayText: [{ text: 'TIGNAN MO TO', startSec: 0, endSec: 5, style: 'hook', position: 'center' }],
    },
    {
      sceneType: 'talking', scriptLine: 'Derma tested talaga to kaya safe sa sensitive skin',
      overlayText: [{ text: 'DERMA-TESTED', startSec: 0, endSec: 2, style: 'callout', position: 'top' }],
    },
    { sceneType: 'talking', scriptLine: 'Dati super dry ng skin ko stressed na stressed ako' },
    {
      sceneType: 'b-roll', scriptLine: 'Mabilis ma-absorb at hindi sticky sa face',
      overlayText: [{ text: '5,000 SOLD', startSec: 0, endSec: 2, style: 'callout', position: 'top' }],
    },
    { sceneType: 'b-roll', scriptLine: 'Ilang patak lang gabi gabi yun na yun' },
    { sceneType: 'talking', scriptLine: 'After two weeks grabe ang glow sobrang hydrated' },
    { sceneType: 'b-roll', scriptLine: 'Sulit na sulit mura pa compared sa iba' },
    {
      sceneType: 'b-roll', scriptLine: 'Order na bago maubos click the link below',
      overlayText: [{ text: 'ORDER NA', startSec: 0, endSec: 5, style: 'punchline', position: 'bottom' }],
    },
  ];

  const scenes = (): FinalRenderScene[] =>
    SCENE_META.map((meta, i) => ({
      sceneIdx: i,
      videoUrl: `${base}/scene_${i}.mp4`,
      audioUrl: `${base}/voice_${i}.mp3`,
      ...meta,
    }));

  beforeAll(async () => {
    rmSync(work, { recursive: true, force: true });
    mkdirSync(work, { recursive: true });

    // Split at the detected cut points: silent video + the scene's own audio.
    for (let i = 0; i < CUTS.length - 1; i++) {
      const start = CUTS[i].toFixed(3);
      const dur = (CUTS[i + 1] - CUTS[i]).toFixed(3);
      ff(['-ss', start, '-i', SRC, '-t', dur, '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', join(work, `scene_${i}.mp4`)]);
      ff(['-ss', start, '-i', SRC, '-t', dur, '-vn', '-q:a', '4', join(work, `voice_${i}.mp3`)]);
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
    fixture.origin = base;

    ({ renderFinalVideo } = await import('../../api/_lib/renderFfmpeg.js'));
  }, 180_000);

  afterAll(async () => {
    await new Promise<void>((r) => server?.close(() => r()));
    fixture.origin = undefined;
  });

  it('re-renders the baseline ad under HYPE and IMPACT', async () => {
    const { HYPE, IMPACT } = await import('../../api/_lib/renderPresets.js');
    // Original audio already carries its music bed — no second bed.
    for (const preset of [HYPE, IMPACT]) {
      const t0 = Date.now();
      const out = await renderFinalVideo(scenes(), '9:16', undefined, preset);
      const dest = join(process.cwd(), `VIRAL EDITOR 2 DEMO (${preset.id.toUpperCase()}).mp4`);
      writeFileSync(dest, out.buffer);
      console.log(`[demo] ${preset.id}: ${Date.now() - t0}ms → ${dest} (${out.sizeBytes} bytes)`);
      expect(out.sizeBytes).toBeGreaterThan(500_000);
    }
  }, 600_000);
});

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, type Server } from 'node:http';
import ffmpegPath from 'ffmpeg-static';
import { NONE, CLASSIC } from '../../api/_lib/renderPresets.js';
import type { FinalRenderScene } from '../../types.js';

// Free, deterministic export proof. Only the localhost fixture server is fetched;
// the SSRF exception is isolated to this test file, never the renderer.
vi.mock('../../api/_lib/ssrfGuard.js', () => ({ assertSafeMediaUrl: () => {} }));
vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    spawnSync: (command: string, args: string[], options: import('node:child_process').SpawnSyncOptions = {}) =>
      actual.spawnSync(command, args, { ...options, timeout: 30_000, killSignal: 'SIGKILL' }),
  };
});

const ff = (args: string[]) => {
  const result = spawnSync(ffmpegPath as string, ['-hide_banner', '-y', ...args], { maxBuffer: 1 << 27 });
  expect(result.error, 'FFmpeg must start').toBeUndefined();
  expect(result.status, result.stderr?.toString('utf8')).toBe(0);
  return result;
};

const durationOf = (path: string): number => {
  const result = spawnSync(ffmpegPath as string, ['-hide_banner', '-i', path]);
  const match = /Duration:\s*(\d+):(\d+):(\d+\.\d+)/.exec(result.stderr?.toString('utf8') ?? '');
  expect(match, 'Rendered file must expose a duration').not.toBeNull();
  return Number(match![1]) * 3600 + Number(match![2]) * 60 + Number(match![3]);
};

const samplesAt = (path: string, startSec: number, durationSec = 0.25): number[] => {
  const result = ff(['-i', path, '-ss', String(startSec), '-t', String(durationSec),
    '-map', '0:a:0', '-vn', '-ar', '16000', '-ac', '1', '-f', 'f32le', 'pipe:1']);
  const samples = Array.from({ length: result.stdout.length / 4 }, (_, i) => result.stdout.readFloatLE(i * 4));
  expect(samples.length, 'Decode must reach the requested audio window').toBeGreaterThan(3000);
  return samples;
};

const rms = (samples: number[]) => Math.sqrt(samples.reduce((sum, x) => sum + x * x, 0) / samples.length);
const toneLevel = (samples: number[], hz: number) => {
  let sin = 0;
  let cos = 0;
  samples.forEach((x, i) => {
    const angle = 2 * Math.PI * hz * i / 16000;
    sin += x * Math.sin(angle);
    cos += x * Math.cos(angle);
  });
  return 2 * Math.hypot(sin, cos) / samples.length;
};

describe('native audio export (synthetic, free)', () => {
  let work: string;
  let server: Server;
  let base: string;
  let renderFinalVideo: typeof import('../../api/_lib/renderFfmpeg.js')['renderFinalVideo'];
  const requests: string[] = [];

  beforeAll(async () => {
    work = mkdtempSync(join(tmpdir(), 'native-audio-in-'));
    ff(['-f', 'lavfi', '-i', 'color=c=0x102030:s=128x128:r=30:d=2',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
      '-f', 'lavfi', '-i', 'sine=frequency=660:duration=2',
      '-map', '0:v', '-map', '1:a', '-map', '2:a', '-c:v', 'libx264', '-preset', 'ultrafast',
      '-c:a', 'aac', join(work, 'native.mp4')]);
    ff(['-f', 'lavfi', '-i', 'sine=frequency=880:duration=1', '-q:a', '6', join(work, 'voice.mp3')]);
    ff(['-f', 'lavfi', '-i', 'color=c=0x102030:s=128x128:r=30:d=2',
      '-c:v', 'libx264', '-preset', 'ultrafast', join(work, 'silent.mp4')]);
    ff(['-f', 'lavfi', '-i', 'color=c=0x102030:s=128x128:r=30:d=2',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.6',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', join(work, 'short.mp4')]);
    ff(['-f', 'lavfi', '-i', 'color=c=0x102030:s=128x128:r=30:d=2',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', join(work, 'long_audio.mp4')]);
    ff(['-f', 'lavfi', '-i', 'color=c=0x102030:s=128x128:r=30:d=6',
      '-c:v', 'libx264', '-preset', 'ultrafast', join(work, 'long_video.mp4')]);
    mkdirSync(join(work, 'sfx'));
    ff(['-f', 'lavfi', '-i', 'sine=frequency=1100:duration=0.35', '-q:a', '6', join(work, 'sfx', 'ding.mp3')]);
    ff(['-f', 'lavfi', '-i', 'sine=frequency=1300:duration=0.5', '-q:a', '6', join(work, 'music.mp3')]);
    vi.stubEnv('GRIFON_ASSET_DIR', work);
    ({ renderFinalVideo } = await import('../../api/_lib/renderFfmpeg.js'));
    server = createServer((req, res) => {
      const name = req.url ?? '/';
      requests.push(name);
      res.setHeader('Connection', 'close');
      const path = join(work, name.slice(1));
      if (existsSync(path)) res.end(readFileSync(path));
      else { res.statusCode = 404; res.end(); }
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    expect(typeof address).toBe('object');
    base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
  }, 60_000);

  afterEach(() => { vi.unstubAllEnvs(); requests.length = 0; });
  afterAll(async () => {
    await new Promise<void>((resolve) => server?.close(() => resolve()));
    if (work && existsSync(work)) rmSync(work, { recursive: true, force: true });
  });

  const render = async (scene: FinalRenderScene, tag: string) => {
    const out = await renderFinalVideo([scene], '1:1', undefined, NONE);
    const path = join(work, `out_${tag}.mp4`);
    writeFileSync(path, out.buffer);
    return path;
  };

  const nativeScene = (extra: Partial<FinalRenderScene> = {}): FinalRenderScene => ({
    sceneIdx: 0, videoUrl: `${base}/native.mp4`, ...extra,
  });

  it('preserves first native audio through the visual duration, ignoring separate VO and its cuts', async () => {
    vi.stubEnv('MID_GAP_TRIM_ENABLED', 'true');
    const scene = {
      sceneIdx: 0, videoUrl: `${base}/native.mp4`, audioUrl: `${base}/voice.mp3`,
      audioPolicy: 'preserve' as const, sceneType: 'talking' as const,
      voiceWords: [{ text: 'one', start: 0.65, end: 0.75 }, { text: 'two', start: 1.65, end: 1.75 }],
    };
    const out = await render(scene, 'preserve');
    expect(durationOf(out)).toBeCloseTo(2, 1);
    for (const start of [0.1, 1.6]) {
      const samples = samplesAt(out, start);
      const native = toneLevel(samples, 440);
      expect(rms(samples)).toBeGreaterThan(0.01);
      expect(native).toBeGreaterThan(0.02);
      expect(toneLevel(samples, 660)).toBeLessThan(native * 0.05);
      expect(toneLevel(samples, 880)).toBeLessThan(native * 0.05);
    }
    expect(requests).toEqual(['/native.mp4']);
  }, 60_000);

  it('keeps absent-policy native clips silent, matching legacy exports', async () => {
    const out = await render(nativeScene(), 'legacy_silent');
    expect(durationOf(out)).toBeCloseTo(2, 1);
    expect(rms(samplesAt(out, 0.1))).toBeLessThan(0.0001);
    expect(rms(samplesAt(out, 1.6))).toBeLessThan(0.0001);
  }, 60_000);

  it('replacement exports exactly the existing VO path with native audio excluded', async () => {
    const scene = nativeScene({ audioUrl: `${base}/voice.mp3`, keepFullClip: true });
    const legacy = await render(scene, 'legacy_voice');
    const replaced = await render({ ...scene, audioPolicy: 'replace' }, 'replace');
    expect(readFileSync(replaced)).toEqual(readFileSync(legacy));
    expect(durationOf(replaced)).toBeGreaterThan(1.3);
    expect(durationOf(replaced)).toBeLessThan(1.6);
    const samples = samplesAt(replaced, 0.1);
    const voice = toneLevel(samples, 880);
    expect(voice).toBeGreaterThan(0.02);
    expect(toneLevel(samples, 440)).toBeLessThan(voice * 0.05);
    expect(requests).toEqual(['/native.mp4', '/voice.mp3', '/native.mp4', '/voice.mp3']);
  }, 60_000);

  it('mute ignores native audio, stale VO URLs and VO timing', async () => {
    vi.stubEnv('MID_GAP_TRIM_ENABLED', 'true');
    const out = await render(nativeScene({
      audioPolicy: 'mute', audioUrl: `${base}/missing-voice.mp3`,
      voiceWords: [{ text: 'one', start: 0.65, end: 0.75 }, { text: 'two', start: 1.65, end: 1.75 }],
    }), 'mute');
    expect(durationOf(out)).toBeCloseTo(2, 1);
    expect(rms(samplesAt(out, 0.1))).toBeLessThan(0.0001);
    expect(rms(samplesAt(out, 1.6))).toBeLessThan(0.0001);
    expect(requests).toEqual(['/native.mp4']);
  }, 60_000);

  it('preserve falls back to silence when the video has no native audio stream', async () => {
    const out = await render(nativeScene({ audioPolicy: 'preserve', videoUrl: `${base}/silent.mp4`,
      audioUrl: `${base}/missing-voice.mp3` }), 'no_native');
    expect(durationOf(out)).toBeCloseTo(2, 1);
    expect(rms(samplesAt(out, 0.1))).toBeLessThan(0.0001);
    expect(rms(samplesAt(out, 1.6))).toBeLessThan(0.0001);
    expect(requests).toEqual(['/silent.mp4']);
  }, 60_000);

  it('pads short native audio through the visual duration without extending the tone', async () => {
    const out = await render(nativeScene({ audioPolicy: 'preserve', videoUrl: `${base}/short.mp4` }), 'short_native');
    expect(durationOf(out)).toBeCloseTo(2, 1);
    expect(toneLevel(samplesAt(out, 0.1), 440)).toBeGreaterThan(0.02);
    expect(rms(samplesAt(out, 1.6))).toBeLessThan(0.0001);
  }, 60_000);

  it.each(['preserve', 'mute'] as const)('%s ends at the video duration when native audio runs longer', async (audioPolicy) => {
    const out = await render(nativeScene({ audioPolicy, videoUrl: `${base}/long_audio.mp4`, keepFullClip: true }), `long_${audioPolicy}`);
    expect(durationOf(out)).toBeCloseTo(2, 1);
  }, 60_000);

  it('caps native exports by the visual target and clamps fallback to the known video', async () => {
    const target = await render(nativeScene({ audioPolicy: 'preserve', targetDurationSec: 0.8 }), 'target');
    expect(durationOf(target)).toBeCloseTo(0.8, 1);
    expect(toneLevel(samplesAt(target, 0.4), 440)).toBeGreaterThan(0.02);
    const fallback = await render(nativeScene({ audioPolicy: 'preserve', fallbackDurationSec: 8 }), 'fallback');
    expect(durationOf(fallback)).toBeCloseTo(2, 1);
    expect(toneLevel(samplesAt(fallback, 1.6), 440)).toBeGreaterThan(0.02);
  }, 60_000);

  it('mute leaves SFX and music audible while excluding native sound', async () => {
    const scene = nativeScene({ audioPolicy: 'mute', audioUrl: `${base}/missing-voice.mp3`,
      overlayText: [{ text: 'Fixture cue', style: 'punchline', position: 'center', startSec: 0.4, endSec: 1.5 }],
    });
    const out = await renderFinalVideo([scene], '1:1',
      { style: 'testimonial', enabled: true, bedUrl: `${base}/music.mp3` }, CLASSIC);
    const path = join(work, 'out_mute_mix.mp4');
    writeFileSync(path, out.buffer);
    expect(durationOf(path)).toBeCloseTo(2, 1);
    expect(toneLevel(samplesAt(path, 0.4), 1100)).toBeGreaterThan(0.005);
    const tail = samplesAt(path, 1.25);
    const music = toneLevel(tail, 1300);
    expect(music).toBeGreaterThan(0.01);
    expect(toneLevel(tail, 440)).toBeLessThan(music * 0.05);
    expect(requests).toEqual(['/native.mp4', '/music.mp3']);
  }, 60_000);

  it.each(['bed', 'lead'] as const)('repeats short MP3 %s music through the visual tail despite container padding', async (role) => {
    const out = await renderFinalVideo([nativeScene({ audioPolicy: 'mute', videoUrl: `${base}/long_video.mp4` })], '1:1',
      { style: 'testimonial', enabled: true, bedUrl: `${base}/music.mp3`, role }, CLASSIC);
    const path = join(work, `out_long_music_${role}.mp4`);
    writeFileSync(path, out.buffer);
    expect(Math.abs(durationOf(path) - 6)).toBeLessThan(0.15);
    expect(toneLevel(samplesAt(path, 5.6), 1300)).toBeGreaterThan(0.005);
  }, 60_000);
});

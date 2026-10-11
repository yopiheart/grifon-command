import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  validateAudioPlan, frameToSample, composePcm, quietTail, pcmStats,
  readVerifiedCache, assertCopiedPackets, makeAudioKey, mixAudio, checkedAudioWindow, readPreparedPcm, audioCacheDirectory, muxCopyArguments,
} from '../../tools/motion-launch/audio.mjs';

const sha = (data: Buffer | string) => crypto.createHash('sha256').update(data).digest('hex');
const timeline = (numerator = 30, denominator = 1) => ({
  fpsNumerator: numerator, fpsDenominator: denominator, frames: 60,
  sampleFrames: Math.round(60 * denominator / numerator * 48000),
});
function plan(numerator = 30, denominator = 1) {
  const t = timeline(numerator, denominator);
  return {
    schemaVersion: 1, sampleRate: 48000, channels: 2, sampleFrames: t.sampleFrames,
    videoFrames: t.frames, fpsNumerator: numerator, fpsDenominator: denominator,
    rights: { usage: 'mixed-video', rawRedistribution: false },
    music: null, trim: {}, sfxPreparation: { highpassHz: 90, lowpassHz: 10500, endTaperMilliseconds: 4 },
    musicShape: [[0, 0]], fades: { openingSeconds: .01, endStartFrame: 45, endCurve: 'quadratic', endSample: t.sampleFrames },
    ducking: { attackSeconds: .1, holdSeconds: .03, releaseSeconds: .2, depthDb: 3, frames: [15], gaps: [] },
    subImpact: { durationSeconds: .28, frequencyStartHz: 92, frequencyEndHz: 46, attackSeconds: .006, decaySeconds: .075, endTaperSeconds: .018, phaseRadians: 0 },
    mastering: { targetIntegratedLufs: -15.2, maximumMasterTruePeakDbtp: -2.2, minimumEncodedLufs: -16.5, maximumEncodedLufs: -14, maximumEncodedTruePeakDbtp: -1.5, aacBitrate: '224k' },
    cues: [{ id: 'landing', frame: 15, layers: [{ source: 'sub', rate: 1, gainDb: -18, pan: [0, 0] }] }],
  };
}

describe('reusable motion audio timeline', () => {
  it.each([[24, 1], [30, 1], [30000, 1001]])('aligns authored contacts at %i/%i fps', (n, d) => {
    const recipe = plan(n, d);
    validateAudioPlan(recipe, timeline(n, d));
    const mixed = composePcm(recipe, {});
    expect(mixed.master.length).toBe(recipe.sampleFrames * 2);
    expect(mixed.cues[0].contactSample).toBe(Math.round(15 * d / n * 48000));
    expect(mixed.cues[0].layers[0].contactSample).toBe(frameToSample(15, recipe));
    expect(mixed.cues[0].layers[0].contactErrorSamples).toBe(0);
    expect(mixed.stats.nonfinite).toBe(0);
  });

  it('moves actual sound with an action contact instead of inheriting the accepted film frame', () => {
    const first = plan();
    const moved = structuredClone(first); moved.cues[0].frame = 30; moved.ducking.frames = [30];
    const a = composePcm(first, {}), b = composePcm(moved, {});
    expect(a.cues[0].layers[0].startSample).not.toBe(b.cues[0].layers[0].startSample);
    expect(sha(Buffer.from(a.master.buffer))).not.toBe(sha(Buffer.from(b.master.buffer)));
    expect(pcmStats(a.effects, 23000, 25000).peakDbfs).not.toBeNull();
    expect(pcmStats(b.effects, 23000, 25000).peakDbfs).toBeNull();
  });

  it('keeps layered rate, reverse and pan edits aligned while changing their actual waveform', () => {
    const recipe = plan(); recipe.trim = { effect: [0, .1] } as typeof recipe.trim;
    recipe.cues[0].frame = 30; recipe.ducking.frames = [30];
    recipe.cues[0].layers[0] = { source: 'effect', rate: .8, gainDb: -18, pan: [-.5, .5] };
    const source = new Float64Array(4000);
    for (let index = 0; index < source.length; index++) source[index] = Math.sin(index / 21) * Math.exp(-(((index - 2700) / 600) ** 2));
    const first = composePcm(recipe, { effect: source });
    const changed = structuredClone(recipe);
    changed.cues[0].layers[0] = { source: 'effect', rate: 1.4, gainDb: -18, pan: [.5, -.5], reverse: true } as typeof changed.cues[0]['layers'][0];
    const second = composePcm(changed, { effect: source });
    expect(first.cues[0].layers[0].contactSample).toBe(48000);
    expect(second.cues[0].layers[0].contactSample).toBe(48000);
    expect(first.cues[0].layers[0].startSample).not.toBe(second.cues[0].layers[0].startSample);
    expect(sha(Buffer.from(first.effects.buffer))).not.toBe(sha(Buffer.from(second.effects.buffer)));
    expect(pcmStats(first.effects, 0, recipe.sampleFrames).monoFoldEnergyRatio).toBeGreaterThan(.8);
    expect(pcmStats(second.effects, 0, recipe.sampleFrames).monoFoldEnergyRatio).toBeGreaterThan(.8);
  });

  it('actually ducks music around an authored contact and releases outside the gesture', () => {
    const recipe = plan(); recipe.cues[0].frame = 30; recipe.ducking.frames = [30];
    recipe.music = { gainDb: 0 } as typeof recipe.music;
    const source = new Float32Array(recipe.sampleFrames * 2).fill(.05);
    const mixed = composePcm(recipe, {}, source);
    expect(mixed.duckEnvelope.find(row => row.sample === 48000)?.duckDb).toBe(3);
    expect(mixed.music[48000 * 2] / source[48000 * 2]).toBeCloseTo(10 ** (-3 / 20), 6);
    expect(mixed.music[30000 * 2] / source[30000 * 2]).toBeCloseTo(1, 6);
  });

  it('rejects missing cues, nonfinite settings, wrong timeline and impossible contact support', () => {
    const missing = plan(); missing.cues = [];
    expect(() => validateAudioPlan(missing, timeline())).toThrow(/cue/i);
    const bad = plan(); bad.cues[0].layers[0].gainDb = Number.NaN;
    expect(() => validateAudioPlan(bad, timeline())).toThrow(/layer/i);
    expect(() => validateAudioPlan(plan(), timeline(24))).toThrow(/timeline/i);
    const tooEarly = plan(); tooEarly.cues[0].frame = 0;
    expect(() => composePcm(tooEarly, {})).toThrow(/outside/i);
  });

  it('accepts exact silence at the ending and rejects an energetic ending', () => {
    expect(quietTail(pcmStats(new Float32Array(960 * 2), 0, 960), -70)).toBe(true);
    expect(quietTail(pcmStats(new Float32Array(960 * 2).fill(.01), 0, 960), -70)).toBe(false);
  });

  it('rebases only a receipt-bound native window and rejects an unbound or altered clip', () => {
    const recipe = plan(30000, 1001), bound = { bytes: 400, sha256: 'bound-video' };
    const stream = { width: 640, height: 360, nb_read_frames: '12', avg_frame_rate: '30000/1001' };
    const receipt = { schemaVersion: 1, timeline: timeline(30000, 1001), window: { from: 10, frames: 12, width: 640, height: 360 }, media: { ...bound, width: 640, height: 360, frames: 12, fps: '30000/1001', strictDecode: 'PASS' } };
    expect(checkedAudioWindow(receipt, recipe, bound, stream)).toEqual({ fromFrame: 10, frameCount: 12, startSample: 16016, endSample: 35235 });
    expect(() => checkedAudioWindow(null, recipe, bound, stream)).toThrow(/window/i);
    expect(() => checkedAudioWindow(receipt, recipe, { ...bound, sha256: 'different' }, stream)).toThrow(/clip/i);
    expect(() => checkedAudioWindow({ ...receipt, window: { ...receipt.window, from: 55 } }, recipe, bound, stream)).toThrow(/window/i);
  });
});

describe('retained bytes and cache boundaries', () => {
  it('rejects a redirected cache directory before writing outside the project', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'motion-audio-junction-'));
    try {
      const project = path.join(root, 'project'), outside = path.join(root, 'outside');
      fs.mkdirSync(project); fs.mkdirSync(outside);
      fs.symlinkSync(outside, path.join(project, '.cache'), process.platform === 'win32' ? 'junction' : 'dir');
      expect(() => audioCacheDirectory(project, '.cache/audio/key', true)).toThrow(/link|alias|escape/i);
      expect(fs.readdirSync(outside)).toEqual([]);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  it('loads only a small retained source range and demonstrates the flawed pooled-buffer view', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'motion-audio-small-source-'));
    try {
      const samples = new Float64Array(128);
      for (let index = 0; index < samples.length; index++) samples[index] = Math.sin(index / 10);
      const file = path.join(root, 'prepared.f64le'); fs.writeFileSync(file, Buffer.from(samples.buffer));
      const actual = fs.readFileSync(file);
      expect(actual.length).toBe(1024);
      const flawed = new Float64Array(actual.buffer.slice(0));
      expect(flawed.length).toBeGreaterThan(samples.length);
      const retained = readPreparedPcm(file, 'effect');
      expect(retained.length).toBe(samples.length);
      expect(Array.from(retained)).toEqual(Array.from(samples));
      expect(sha(Buffer.from(retained.buffer))).toBe(sha(Buffer.from(samples.buffer)));
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  it('rejects a stale registered source and missing rights before any mixing', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'motion-audio-source-'));
    try {
      const sources = path.join(root, 'sources'); fs.mkdirSync(sources);
      const recipe = plan(); recipe.trim = { effect: [.01, .1] } as typeof recipe.trim;
      recipe.cues[0].layers[0].source = 'effect';
      const input = Buffer.from('original local audio fixture');
      fs.writeFileSync(path.join(sources, 'effect.wav'), input);
      fs.writeFileSync(path.join(root, 'audio-plan.json'), JSON.stringify(recipe));
      fs.writeFileSync(path.join(root, 'job.json'), JSON.stringify({ schemaVersion: 1, timeline: timeline(), audioPlan: 'audio-plan.json' }));
      const register = path.join(root, 'register.json');
      const row = { file: 'effect.wav', bytes: input.length, sha256: sha(input), license: 'local fixture rights' };
      fs.writeFileSync(register, JSON.stringify({ files: [row] }));
      const fakeRuntime = path.join(root, 'runtime.fixture'); fs.writeFileSync(fakeRuntime, 'no execution allowed');
      const options = { project: root, sourceRoot: sources, register, ffmpeg: fakeRuntime, ffprobe: fakeRuntime };
      fs.writeFileSync(path.join(sources, 'effect.wav'), 'changed source');
      expect(() => mixAudio(options)).toThrow(/source bytes/i);
      fs.writeFileSync(path.join(sources, 'effect.wav'), input);
      fs.writeFileSync(register, JSON.stringify({ files: [{ ...row, license: '' }] }));
      expect(() => mixAudio(options)).toThrow(/rights/i);
      fs.writeFileSync(register, JSON.stringify({ files: [{ ...row, provider: 'ElevenLabs' }] }));
      expect(() => mixAudio(options)).toThrow(/private-review/i);
      expect(fs.existsSync(path.join(root, '.cache'))).toBe(false);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  it('rejects a corrupted retained AAC or PCM and a stale receipt key', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'motion-audio-cache-'));
    try {
      const key = 'a'.repeat(64);
      fs.writeFileSync(path.join(root, 'master.m4a'), 'encoded fixture');
      fs.writeFileSync(path.join(root, 'master.wav'), 'pcm fixture');
      const outputs = ['master.m4a', 'master.wav'].map(file => ({ file, bytes: fs.statSync(path.join(root, file)).size, sha256: sha(fs.readFileSync(path.join(root, file))) }));
      fs.writeFileSync(path.join(root, 'receipt.json'), JSON.stringify({ schemaVersion: 1, key, status: 'TECHNICAL_AUDIO_PASS_LISTENING_PENDING', outputs }));
      expect(readVerifiedCache(root, key)?.outputs).toHaveLength(2);
      expect(() => readVerifiedCache(root, 'b'.repeat(64))).toThrow(/key/i);
      fs.writeFileSync(path.join(root, 'master.m4a'), 'corrupted');
      expect(() => readVerifiedCache(root, key)).toThrow(/retained/i);
      fs.writeFileSync(path.join(root, 'master.m4a'), 'encoded fixture');
      fs.writeFileSync(path.join(root, 'master.wav'), 'bad pcm');
      expect(() => readVerifiedCache(root, key)).toThrow(/retained/i);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });

  it('keys audio on plan, source bytes, producer and runtime, excluding visual inputs', () => {
    const base = { planSha256: 'plan', timeline: timeline(), sources: [{ sha256: 'source' }], registerSha256: 'rights', producerSha256: 'producer', runtime: { ffmpeg: 'runtime', node: process.version } };
    expect(makeAudioKey(base)).toBe(makeAudioKey({ ...base, visualSha256: 'changed-copy' }));
    for (const patch of [{ planSha256: 'changed' }, { sources: [{ sha256: 'stale' }] }, { producerSha256: 'changed' }, { runtime: { ffmpeg: 'different', node: process.version } }]) {
      expect(makeAudioKey({ ...base, ...patch })).not.toBe(makeAudioKey(base));
    }
  });

  it('rejects a payload or timestamp change after stream copying', () => {
    const packet = { pts: 0, dts: 0, duration: 1001, size: '4', flags: 'K_', data_hash: 'SHA256:abc' };
    expect(() => assertCopiedPackets([packet], [{ ...packet }], 'video')).not.toThrow();
    expect(() => assertCopiedPackets([packet], [{ ...packet, pts: 1 }], 'video')).toThrow(/video/i);
    expect(() => assertCopiedPackets([packet], [{ ...packet, data_hash: 'changed' }], 'video')).toThrow(/video/i);
  });

  it.each([24, 30000])('copies native %i Hz video ticks without accepting a muxer-rescaled clock', ticksPerSecond => {
    const args = muxCopyArguments('native.mp4', 'master.m4a', 'film.mp4', `1/${ticksPerSecond}`);
    expect(args[args.indexOf('-video_track_timescale') + 1]).toBe(String(ticksPerSecond));
    const duration = ticksPerSecond === 24 ? 1 : 1001;
    const before = [{ pts: 2 * duration, dts: 0, duration, size: '4', flags: 'K_', data_hash: 'SHA256:native' }];
    const rescaled = before.map(packet => ({ ...packet, pts: packet.pts * 512, duration: packet.duration * 512 }));
    expect(() => assertCopiedPackets(before, rescaled, 'Video')).toThrow(/timestamps/i);
    expect(() => assertCopiedPackets(before, before.map(packet => ({ ...packet })), 'Video')).not.toThrow();
  });

  it('rejects a video clock that cannot be represented exactly by the copied MP4 track', () => {
    expect(() => muxCopyArguments('native.mp4', 'master.m4a', 'film.mp4', '2/47')).toThrow(/timescale/i);
    expect(() => muxCopyArguments('native.mp4', 'master.m4a', 'film.mp4', '1/9999999999')).toThrow(/timescale/i);
  });
});

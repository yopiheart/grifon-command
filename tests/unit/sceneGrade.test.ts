import { describe, it, expect } from 'vitest';
import {
  parseSignalstats, chromaTarget, planSceneGrade, isSceneGradeEnabled,
  type ChromaMeasure,
} from '../../api/_lib/sceneGrade.js';

// Pure-function coverage for the per-scene grade planner. No ffmpeg, no I/O —
// measureSceneChroma is deliberately NOT exercised here (it shells out); the
// synthetic render harness in tests/integration/scenegrade-render.test.ts is
// what proves the ffmpeg half.
//
// The module's constants are private on purpose, so every expectation below is
// derived from the numbers DOCUMENTED in sceneGrade.ts's own comments rather
// than re-read from the implementation:
//   PULL 0.8 · UV_TO_BALANCE 0.107 · DEADBAND 0.8 · MAX_SHIFT 0.14
//   LUMA_PULL 0.25 · MAX_BRIGHTNESS 0.06
const PULL = 0.8;
const UV_TO_BALANCE = 0.107;
const DEADBAND = 0.8;
const MAX_SHIFT = 0.14;
const LUMA_PULL = 0.25;
const MAX_BRIGHTNESS = 0.06;

const m = (yavg: number, uavg: number, vavg: number, frames = 6): ChromaMeasure =>
  ({ yavg, uavg, vavg, frames });

/** Read one `key=value` term back out of the planned filter string. */
const term = (filter: string, key: string): number | null => {
  const hit = new RegExp(`${key}=(-?[0-9.]+)`).exec(filter);
  return hit ? Number(hit[1]) : null;
};

/** One frame's worth of what `signalstats,metadata=print` actually emits. */
const frame = (n: number, y: number, u: number, v: number) => [
  `[Parsed_metadata_2 @ 000001d4] frame:${n}    pts:${n * 512}      pts_time:${n * 2}`,
  `[Parsed_metadata_2 @ 000001d4] lavfi.signalstats.YAVG=${y.toFixed(3)}`,
  `[Parsed_metadata_2 @ 000001d4] lavfi.signalstats.UAVG=${u.toFixed(3)}`,
  `[Parsed_metadata_2 @ 000001d4] lavfi.signalstats.VAVG=${v.toFixed(3)}`,
].join('\n');

describe('parseSignalstats', () => {
  it('reads YAVG/UAVG/VAVG out of real metadata=print output', () => {
    // The untouched fixture frame quoted in the module header: uavg 122.0,
    // vavg 134.8 — correct-looking, and 8.5 units off "neutral".
    const out = [
      'ffmpeg version n7.0 Copyright (c) 2000-2024 the FFmpeg developers',
      '  Stream #0:0: Video: h264, yuv420p, 540x960, 30 fps',
      frame(0, 118.2, 122.0, 134.8),
    ].join('\n');

    expect(parseSignalstats(out)).toEqual({
      yavg: 118.2, uavg: 122.0, vavg: 134.8, frames: 1,
    });
  });

  it('averages across every sampled frame', () => {
    const out = [frame(0, 100, 120, 130), frame(1, 110, 124, 136)].join('\n');
    const got = parseSignalstats(out)!;

    expect(got.frames).toBe(2);
    expect(got.yavg).toBeCloseTo(105, 6);
    expect(got.uavg).toBeCloseTo(122, 6);
    expect(got.vavg).toBeCloseTo(133, 6);
  });

  it('returns null on empty or unparseable input', () => {
    expect(parseSignalstats('')).toBeNull();
    expect(parseSignalstats('Output file is empty, nothing was encoded')).toBeNull();
    // Right shape, wrong keys — signalstats was never in the graph.
    expect(parseSignalstats('lavfi.entropy.normal.entropy_y=7.21')).toBeNull();
  });

  it('uses the MIN frame count across the three keys when a line is truncated', () => {
    // A clipped log: 3 YAVG lines, but the last frame's UAVG/VAVG never made it.
    const out = [
      frame(0, 100, 120, 130),
      frame(1, 110, 124, 136),
      'lavfi.signalstats.YAVG=200.000',
    ].join('\n');
    const got = parseSignalstats(out)!;

    // frames=2, and the orphan YAVG=200 must not drag the luma mean.
    expect(got.frames).toBe(2);
    expect(got.yavg).toBeCloseTo(105, 6);
  });
});

describe('chromaTarget', () => {
  it('is null below 3 valid measures — 2 opinions are not a majority', () => {
    expect(chromaTarget([])).toBeNull();
    expect(chromaTarget([m(100, 120, 130)])).toBeNull();
    expect(chromaTarget([m(100, 120, 130), m(100, 121, 131)])).toBeNull();
    expect(chromaTarget([m(100, 120, 130), m(100, 121, 131), m(100, 122, 132)])).not.toBeNull();
  });

  it('takes the MEDIAN, not the mean', () => {
    // uavg {120, 121, 160}: median 121, mean 133.67. Same trap on vavg.
    const t = chromaTarget([m(100, 120, 130), m(100, 121, 131), m(180, 160, 170)])!;

    expect(t.uavg).toBe(121);
    expect(t.vavg).toBe(131);
    expect(t.yavg).toBe(100);
    expect(t.frames).toBe(3);
  });

  it('will not let one wildly drifted scene drag the target', () => {
    const agreeing = [m(100, 120, 130), m(101, 121, 131), m(102, 122, 132)];
    const before = chromaTarget(agreeing)!;
    // Scene 4 comes back badly warm (the live 2026-08-17 defect, exaggerated).
    const after = chromaTarget([...agreeing, m(180, 100, 190)])!;

    expect(before.uavg).toBe(121);
    expect(before.vavg).toBe(131);
    // Four entries -> mean of the two middles; the outlier is at an end, so it
    // only ever shifts the target by half a sibling step.
    expect(Math.abs(after.uavg - before.uavg)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(after.vavg - before.vavg)).toBeLessThanOrEqual(0.5);
    // A mean would have been dragged ~10 units by the same outlier.
    expect(Math.abs(after.vavg - before.vavg)).toBeLessThan(5);
  });

  it('ignores entries with frames === 0', () => {
    // The zero-frame entry sits where it would move the median if it counted.
    const t = chromaTarget([
      m(100, 120, 130), m(100, 121, 131), m(100, 122, 132), m(100, 121.5, 131.5, 0),
    ])!;

    expect(t.uavg).toBe(121); // median of 3, not of 4
    expect(t.frames).toBe(3);
  });

  it('is null when too few entries survive the frames filter', () => {
    expect(chromaTarget([m(100, 120, 130), m(100, 121, 131), m(100, 122, 132, 0)])).toBeNull();
  });
});

describe('planSceneGrade', () => {
  const target = m(120, 122, 134);

  it('is null when either side is missing', () => {
    expect(planSceneGrade(null, target)).toBeNull();
    expect(planSceneGrade(m(120, 122, 134), null)).toBeNull();
    expect(planSceneGrade(null, null)).toBeNull();
  });

  it('is null inside the deadband — an agreeing beat gets NO filter at all', () => {
    // Under the documented 0.8-unit deadband on BOTH channels. This is the
    // byte-identical-render guarantee the CLASSIC regression lock rides on.
    expect(planSceneGrade(m(120, 122.4, 134.6), target)).toBeNull();
    expect(planSceneGrade(m(120, 121.3, 133.3), target)).toBeNull();
    // A same-look sibling pair was observed under 0.5 units apart.
    expect(planSceneGrade(m(120, 122.5, 133.5), target)).toBeNull();
    // Right at the edge: |drift| = 0.79 is still inside.
    expect(planSceneGrade(m(120, 122, 134.79), target)).toBeNull();
  });

  it('grades once the drift clears the deadband', () => {
    // The observed scene-4-class drift was ~1.7 units.
    expect(planSceneGrade(m(120, 122, 135.7), target)).not.toBeNull();
    expect(planSceneGrade(m(120, 122, 134 + DEADBAND), target)).not.toBeNull();
  });

  it('corrects a WARM scene by REMOVING red (negative rm)', () => {
    const dv = 1.0; // redder than its siblings
    const f = planSceneGrade(m(120, 122, 134 + dv), target)!;
    const rm = term(f, 'rm')!;

    // Corrective, not additive: the sign opposes the cast.
    expect(rm).toBeLessThan(0);
    expect(rm).toBeCloseTo(-dv * UV_TO_BALANCE * PULL, 4);
    expect(term(f, 'bm')).toBe(0); // no blue drift to answer
  });

  it('is already at the cap for the live ~1.7-unit drift', () => {
    // Worth pinning: 1.7 * 0.107 * 0.8 = 0.1455, over the 0.14 ceiling, so the
    // real scene-4 defect is corrected by MAX_SHIFT and not by PULL. That works
    // out to 0.14/0.107 = ~1.31 of the 1.7 units, i.e. the ~73% the module
    // header reports — the cap is what sets that figure, not the 0.8 pull.
    const rm = term(planSceneGrade(m(120, 122, 134 + 1.7), target)!, 'rm')!;
    expect(rm).toBe(-MAX_SHIFT);
    expect(Math.abs(rm) / UV_TO_BALANCE / 1.7).toBeGreaterThan(0.7);
  });

  it('corrects a COOL scene by REMOVING blue (negative bm)', () => {
    const du = 1.5; // bluer than its siblings
    const f = planSceneGrade(m(120, 122 + du, 134), target)!;
    const bm = term(f, 'bm')!;

    expect(bm).toBeLessThan(0);
    expect(bm).toBeCloseTo(-du * UV_TO_BALANCE * PULL, 4);
  });

  it('pushes the other way for a scene BELOW the target', () => {
    // The correction is a pull toward the median from either side, not a
    // one-directional "cool everything down".
    const f = planSceneGrade(m(120, 122 - 1.5, 134 - 1.7), target)!;

    expect(term(f, 'rm')!).toBeGreaterThan(0);
    expect(term(f, 'bm')!).toBeGreaterThan(0);
  });

  it('clamps a wild measurement to MAX_SHIFT on both channels', () => {
    // A scene that is legitimately one colour (a sunset, a red wall). Worst
    // case must be an under-correction, never a blown-out picture.
    const hot = planSceneGrade(m(120, 122 + 40, 134 + 40), target)!;
    expect(term(hot, 'rm')).toBe(-MAX_SHIFT);
    expect(term(hot, 'bm')).toBe(-MAX_SHIFT);

    const cold = planSceneGrade(m(120, 122 - 40, 134 - 40), target)!;
    expect(term(cold, 'rm')).toBe(MAX_SHIFT);
    expect(term(cold, 'bm')).toBe(MAX_SHIFT);
  });

  it('omits the eq=brightness term when the luma delta is tiny', () => {
    // brightness = (-dy/255)*0.25, dropped below 0.005 => |dy| under ~5.1.
    const f = planSceneGrade(m(120 + 3, 122, 134 + 1.7), target)!;

    expect(f).not.toContain('eq=brightness');
    expect(f.startsWith('colorbalance=')).toBe(true);
  });

  it('adds eq=brightness when the luma delta is real, and clamps it', () => {
    const dy = 10;
    const lit = planSceneGrade(m(120 + dy, 122, 134 + 1.7), target)!;
    expect(lit).toContain('eq=brightness=');
    // Brighter than its siblings -> pulled DOWN.
    expect(term(lit, 'brightness')).toBeCloseTo((-dy / 255) * LUMA_PULL, 4);

    // A scene 100 units hotter would ask for -0.098; the cap is 0.06.
    const blown = planSceneGrade(m(120 + 100, 122, 134 + 1.7), target)!;
    expect(term(blown, 'brightness')).toBe(-MAX_BRIGHTNESS);

    const dark = planSceneGrade(m(120 - 100, 122, 134 + 1.7), target)!;
    expect(term(dark, 'brightness')).toBe(MAX_BRIGHTNESS);
  });

  it('emits a stable, 4dp, ffmpeg-legal string', () => {
    // Deliberately messy inputs so an unrounded float would show.
    const scene = m(126.31111, 123.77777, 136.13333);
    const f = planSceneGrade(scene, target)!;

    expect(f).toBe(planSceneGrade(scene, target)); // pure: same in, same out
    expect(f).toMatch(/^colorbalance=rm=-?\d+(\.\d{1,4})?:bm=-?\d+(\.\d{1,4})?(,eq=brightness=-?\d+(\.\d{1,4})?)?$/);
  });
});

describe('isSceneGradeEnabled', () => {
  const restore = process.env.SCENE_GRADE_ENABLED;
  const set = (v: string | undefined) => {
    if (v === undefined) delete process.env.SCENE_GRADE_ENABLED;
    else process.env.SCENE_GRADE_ENABLED = v;
  };

  it("is true for 'true' and nothing else, and is read at CALL time", () => {
    try {
      set(undefined);
      expect(isSceneGradeEnabled()).toBe(false);
      set('');
      expect(isSceneGradeEnabled()).toBe(false);
      set('1');
      expect(isSceneGradeEnabled()).toBe(false);
      set('TRUE');
      expect(isSceneGradeEnabled()).toBe(false);
      // Flipped after the module was imported — no rebuild, same contract as
      // MID_GAP_TRIM_ENABLED / SFX_V2_ENABLED.
      set('true');
      expect(isSceneGradeEnabled()).toBe(true);
    } finally {
      set(restore);
    }
  });
});

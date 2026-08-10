import { describe, it, expect, afterEach } from 'vitest';
import {
  planMidGapCuts,
  planSceneMidGap,
  midGapCutsVideo,
  rebaseSec,
  rebaseSceneAfterCuts,
  buildMidGapFilters,
  totalCutSec,
  MID_GAP_FLOOR_SEC,
  MID_GAP_MIN_SEC,
  type MidGapCut,
} from '../../api/_lib/voiceMidGap.js';
import type { AlignedWord } from '../../api/_lib/voiceLeadIn.js';
import type { FinalRenderScene } from '../../types.js';

// Everything here is the pure half of the feature, so none of it costs a render.
// Expected numbers are worked by hand from the rule Neil set — leave 0.15s behind,
// ignore anything under 0.6s, at most 2 cuts per scene — never recomputed from the
// implementation.

const word = (text: string, start: number, end: number): AlignedWord => ({ text, start, end });

// THE WORKED SCENE. Two real dead-air gaps (1.00s and 1.20s), two breaths (0.05s).
//   w0 0.15-0.55 | w1 0.60-1.00 |<-- 1.00s -->| w2 2.00-2.40 | w3 2.45-2.80 |<-- 1.20s -->| w4 4.00-4.50
// Expected plan: cut [1.15, 2.00) = 0.85s and [2.95, 4.00) = 1.05s.
const SCENE_WORDS: AlignedWord[] = [
  word('ako', 0.15, 0.55),
  word('si', 0.60, 1.00),
  word('sarah', 2.00, 2.40),
  word('at', 2.45, 2.80),
  word('grabe', 4.00, 4.50),
];
const SCENE_CUTS: MidGapCut[] = [
  { atSec: 1.15, cutSec: 0.85 },
  { atSec: 2.95, cutSec: 1.05 },
];

const withFlag = (value: string | undefined, fn: () => void) => {
  const prev = process.env.MID_GAP_TRIM_ENABLED;
  try {
    if (value === undefined) delete process.env.MID_GAP_TRIM_ENABLED;
    else process.env.MID_GAP_TRIM_ENABLED = value;
    fn();
  } finally {
    if (prev === undefined) delete process.env.MID_GAP_TRIM_ENABLED;
    else process.env.MID_GAP_TRIM_ENABLED = prev;
  }
};

afterEach(() => { delete process.env.MID_GAP_TRIM_ENABLED; });

describe('planMidGapCuts — thresholds', () => {
  it('leaves a breath between words alone', () => {
    // 0.2s between words is how a person breathes mid-sentence. Cutting it is
    // what makes an edit sound twitchy, and it buys almost nothing anyway.
    expect(planMidGapCuts([word('a', 0, 0.4), word('b', 0.6, 1.0)])).toEqual([]);
  });

  it('treats the min-gap as the threshold, not the floor', () => {
    const under = [word('a', 0, 0.4), word('b', 0.4 + MID_GAP_MIN_SEC - 0.001, 1.5)];
    const at = [word('a', 0, 0.4), word('b', 0.4 + MID_GAP_MIN_SEC, 1.5)];
    expect(planMidGapCuts(under)).toEqual([]);
    expect(planMidGapCuts(at)).toEqual([
      { atSec: 0.4 + MID_GAP_FLOOR_SEC, cutSec: MID_GAP_MIN_SEC - MID_GAP_FLOOR_SEC },
    ]);
  });

  it('compresses a real gap to the floor instead of erasing it', () => {
    // 1.0s of dead air becomes 0.15s of pause — a beat, not a hole.
    const [cut] = planMidGapCuts([word('a', 0, 1.0), word('b', 2.0, 2.4)]);
    expect(cut.atSec).toBeCloseTo(1.15, 5);
    expect(cut.cutSec).toBeCloseTo(0.85, 5);
    // What survives between the two words is exactly the floor.
    expect(2.0 - cut.cutSec - 1.0).toBeCloseTo(MID_GAP_FLOOR_SEC, 5);
  });

  it('finds every qualifying gap in the worked scene, in time order', () => {
    const cuts = planMidGapCuts(SCENE_WORDS);
    expect(cuts).toHaveLength(2);
    expect(cuts[0].atSec).toBeCloseTo(1.15, 5);
    expect(cuts[0].cutSec).toBeCloseTo(0.85, 5);
    expect(cuts[1].atSec).toBeCloseTo(2.95, 5);
    expect(cuts[1].cutSec).toBeCloseTo(1.05, 5);
    expect(totalCutSec(cuts)).toBeCloseTo(1.9, 5);
  });

  it('never cuts without alignment — an unaligned scene renders as it does today', () => {
    expect(planMidGapCuts(undefined)).toEqual([]);
    expect(planMidGapCuts([])).toEqual([]);
    expect(planMidGapCuts([word('solo', 0.1, 0.9)])).toEqual([]);
  });

  it('skips a nonsense timing instead of planning a backwards cut', () => {
    const words = [word('a', 0, NaN), word('b', 3, 3.4), word('c', 9, 9.5)];
    const cuts = planMidGapCuts(words);
    expect(cuts).toHaveLength(1); // only the b→c gap is measurable
    expect(cuts[0].atSec).toBeCloseTo(3.55, 5);
  });
});

describe('planMidGapCuts — per-scene cap', () => {
  const FOUR_GAPS = [
    word('a', 0, 0.5),
    word('b', 2.5, 3.0),   // gap 2.0 — worst
    word('c', 4.0, 4.5),   // gap 1.0
    word('d', 6.0, 6.5),   // gap 1.5
    word('e', 7.4, 7.9),   // gap 0.9 — mildest
  ];

  it('spends the two allowed cuts on the worst dead air', () => {
    const cuts = planMidGapCuts(FOUR_GAPS);
    expect(cuts).toHaveLength(2);
    // The 2.0s gap (after 'a') and the 1.5s gap (after 'c'), still in time order.
    expect(cuts.map((c) => +c.atSec.toFixed(2))).toEqual([0.65, 4.65]);
    expect(cuts[0].cutSec).toBeCloseTo(1.85, 5);
    expect(cuts[1].cutSec).toBeCloseTo(1.35, 5);
  });

  it('honours an explicit cap', () => {
    expect(planMidGapCuts(FOUR_GAPS, { maxCuts: 1 })).toHaveLength(1);
    expect(planMidGapCuts(FOUR_GAPS, { maxCuts: 4 })).toHaveLength(4);
  });
});

describe('rebaseSec — the cumulative shift', () => {
  it('leaves anything before the first cut where it was', () => {
    expect(rebaseSec(0.9, SCENE_CUTS)).toBeCloseTo(0.9, 5);
    expect(rebaseSec(0, SCENE_CUTS)).toBe(0);
  });

  it('shifts by ONE cut between the cuts, and by BOTH after them', () => {
    // This is the whole correctness risk: a flat shift would move 2.40 by 1.90.
    expect(rebaseSec(2.4, SCENE_CUTS)).toBeCloseTo(1.55, 5);
    expect(rebaseSec(4.5, SCENE_CUTS)).toBeCloseTo(2.6, 5);
  });

  it('collapses a time inside a removed span onto the splice', () => {
    // 3.50 sat in dead air that no longer exists; the splice is at 2.95-0.85=2.10.
    expect(rebaseSec(3.5, SCENE_CUTS)).toBeCloseTo(2.1, 5);
    expect(rebaseSec(1.6, SCENE_CUTS)).toBeCloseTo(1.15, 5);
  });

  it('is the identity with no cuts', () => {
    expect(rebaseSec(7.77, [])).toBe(7.77);
  });
});

describe('rebaseSceneAfterCuts', () => {
  const scene: FinalRenderScene = {
    sceneIdx: 1,
    videoUrl: 'v',
    audioUrl: 'a',
    sceneType: 'talking',
    voiceWords: SCENE_WORDS,
    sfxCues: [
      { sfxId: 'pop', anchorSec: 0.5, reason: 'before both cuts' },
      { sfxId: 'boom', anchorSec: 2.4, reason: 'between the cuts' },
      { sfxId: 'whoosh', anchorSec: 4.2, reason: 'after both cuts' },
    ],
    overlayText: [
      { text: 'GRABE', startSec: 0.2, endSec: 4.2, style: 'callout', position: 'center' },
    ],
  };

  it('lands every word on the compacted timeline, floors intact', () => {
    const out = rebaseSceneAfterCuts(scene, SCENE_CUTS);
    const w = out.voiceWords!;
    expect(w.map((x) => +x.start.toFixed(2))).toEqual([0.15, 0.6, 1.15, 1.6, 2.1]);
    expect(w.map((x) => +x.end.toFixed(2))).toEqual([0.55, 1.0, 1.55, 1.95, 2.6]);
    // The two compressed pauses are now exactly the floor — not zero.
    expect(w[2].start - w[1].end).toBeCloseTo(MID_GAP_FLOOR_SEC, 5);
    expect(w[4].start - w[3].end).toBeCloseTo(MID_GAP_FLOOR_SEC, 5);
    // The breaths are untouched.
    expect(w[1].start - w[0].end).toBeCloseTo(0.05, 5);
  });

  it('rebases SFX anchors by the cut in front of each one, not by the total', () => {
    const out = rebaseSceneAfterCuts(scene, SCENE_CUTS);
    expect(out.sfxCues!.map((c) => +c.anchorSec.toFixed(2))).toEqual([0.5, 1.55, 2.3]);
  });

  it('rebases overlay windows', () => {
    const out = rebaseSceneAfterCuts(scene, SCENE_CUTS);
    expect(out.overlayText![0].startSec).toBeCloseTo(0.2, 5);
    expect(out.overlayText![0].endSec).toBeCloseTo(2.3, 5);
  });

  it('returns the SAME object with no cuts, so the dark path cannot drift', () => {
    expect(rebaseSceneAfterCuts(scene, [])).toBe(scene);
  });
});

describe('midGapCutsVideo — who needs a jump cut', () => {
  it('spares b-roll and cinematic: no mouth on screen, so the clip runs on', () => {
    expect(midGapCutsVideo('b-roll')).toBe(false);
    expect(midGapCutsVideo('cinematic')).toBe(false);
  });

  it('cuts the video on a talking scene, and on an unknown type', () => {
    // Unknown defaults to talking: a missed cut there is broken lip-sync, while a
    // needless one on b-roll is only a jump the viewer reads as an edit.
    expect(midGapCutsVideo('talking')).toBe(true);
    expect(midGapCutsVideo(undefined)).toBe(true);
  });
});

describe('planSceneMidGap — the kill switch', () => {
  const talking: Pick<FinalRenderScene, 'voiceWords' | 'sceneType' | 'audioUrl'> = {
    voiceWords: SCENE_WORDS, sceneType: 'talking', audioUrl: 'voice.mp3',
  };

  it('plans nothing at all while MID_GAP_TRIM_ENABLED is unset', () => {
    withFlag(undefined, () => {
      const plan = planSceneMidGap(talking);
      expect(plan.cuts).toEqual([]);
      expect(plan.cutVideo).toBe(false);
    });
  });

  it('plans nothing for any value other than the exact string true', () => {
    for (const v of ['1', 'TRUE', 'yes', '']) {
      withFlag(v, () => expect(planSceneMidGap(talking).cuts).toEqual([]));
    }
  });

  it('plans the cuts once the flag is on', () => {
    withFlag('true', () => {
      const plan = planSceneMidGap(talking);
      expect(plan.cuts).toHaveLength(2);
      expect(plan.cutVideo).toBe(true);
    });
  });

  it('compresses audio only on a b-roll scene', () => {
    withFlag('true', () => {
      const plan = planSceneMidGap({ ...talking, sceneType: 'b-roll' });
      expect(plan.cuts).toHaveLength(2);
      expect(plan.cutVideo).toBe(false);
    });
  });

  it('skips a scene with no voice — there is no gap to close', () => {
    withFlag('true', () => {
      expect(planSceneMidGap({ ...talking, audioUrl: null }).cuts).toEqual([]);
    });
  });
});

describe('buildMidGapFilters — split-at-concat graph', () => {
  it('builds nothing when there is nothing to cut', () => {
    expect(buildMidGapFilters({ cuts: [], cutVideo: true })).toBeNull();
  });

  it('keeps exactly the spans the plan did not remove, video and audio paired', () => {
    const f = buildMidGapFilters({ cuts: SCENE_CUTS, cutVideo: true })!;
    expect(f.videoOut).toBe('[mgv]');
    expect(f.audioOut).toBe('[mga]');
    expect(f.stmts).toEqual([
      '[0:v]setpts=PTS-STARTPTS,split=3[mgvs0][mgvs1][mgvs2]',
      '[1:a]asetpts=PTS-STARTPTS,asplit=3[mgas0][mgas1][mgas2]',
      '[mgvs0]trim=end=1.150,setpts=PTS-STARTPTS[mgv0]',
      '[mgas0]atrim=end=1.150,asetpts=PTS-STARTPTS[mga0]',
      '[mgvs1]trim=start=2.000:end=2.950,setpts=PTS-STARTPTS[mgv1]',
      '[mgas1]atrim=start=2.000:end=2.950,asetpts=PTS-STARTPTS[mga1]',
      '[mgvs2]trim=start=4.000,setpts=PTS-STARTPTS[mgv2]',
      '[mgas2]atrim=start=4.000,asetpts=PTS-STARTPTS[mga2]',
      '[mgv0][mga0][mgv1][mga1][mgv2][mga2]concat=n=3:v=1:a=1[mgv][mga]',
    ]);
  });

  it('leaves the video untouched for an audio-only cut', () => {
    const f = buildMidGapFilters({ cuts: SCENE_CUTS, cutVideo: false })!;
    expect(f.videoOut).toBeNull();
    const graph = f.stmts.join(';');
    expect(graph).not.toContain('[0:v]');
    expect(graph).not.toContain('mgv'); // no video split / trim / concat pad at all
    expect(graph).toContain('concat=n=3:v=0:a=1[mga]');
    expect(f.stmts.filter((s) => s.includes('atrim='))).toHaveLength(3);
  });

  it('splits into one more segment than there are cuts', () => {
    const f = buildMidGapFilters({ cuts: [{ atSec: 1, cutSec: 0.5 }], cutVideo: true })!;
    expect(f.stmts).toContain('[0:v]setpts=PTS-STARTPTS,split=2[mgvs0][mgvs1]');
    expect(f.stmts).toContain('[mgvs0]trim=end=1.000,setpts=PTS-STARTPTS[mgv0]');
    expect(f.stmts).toContain('[mgvs1]trim=start=1.500,setpts=PTS-STARTPTS[mgv1]');
  });
});

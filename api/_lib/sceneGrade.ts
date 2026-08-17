// Per-scene colour-cast correction, applied at the render stage.
//
// WHY THIS EXISTS
// The avatar reference locks the FACE. It never locks the light or the room, and
// the tuned scene prompt goes further than that: `Lighting/mood for that spot` is
// in the REQUIRED list for every avatar-scene prompt (prompts.ts ~1742), and its
// own worked example ends "warm afternoon sunlight from the window". So each beat
// is INSTRUCTED to author its own light. One beat coming back warm while the rest
// are cool daylight is the instruction working exactly as written.
//
// That defect has 4 corroborations in workflows/sample_run_before_after_2026-08-16.md,
// and on 2026-08-17 Neil hit it live: scene 4 warm against a consistent 1-3, and
// THREE regenerate rolls failed to shake it. Correctly so — nothing in the prompt
// constrains the light, so a re-roll is a fresh dice throw, not a repair.
//
// Two routes existed. Editing the tuned prompt is the root fix and is NOT taken
// here: agent_lessons.md bans exactly this shape of blanket prompt change (the
// deleted phoneticNormalizer made things systematically WORSE), and a tuned edit
// needs Neil's explicit approval. This module is the other route — deterministic,
// post-generation, invisible to every model, so it carries zero slop risk. Same
// reasoning as tools/grade.mjs, which is where the filter grammar comes from.
//
// ⛔ GREY-WORLD (a fixed 128,128 target) WAS TRIED FIRST AND IS WRONG. MEASURED,
// not reasoned: the UNTOUCHED fixture frame measures uavg=122.0 vavg=134.8, i.e.
// 8.5 units off "neutral" while looking completely correct. A frame filled with a
// face and a warm-tiled bathroom is not supposed to average to grey. Against a
// fixed target the planner therefore hit its cap correcting a scene that had
// nothing wrong with it, and closed only 15% of a cast that was really there.
//
// So the target is the AD'S OWN MIDDLE, per channel — see `chromaTarget`. What is
// meaningful here is never a scene's absolute cast, only its distance from its
// siblings, and these scenes share a subject, a wardrobe and a location. A median
// is used rather than a mean so one badly-drifted beat cannot drag the target it
// is about to be measured against, and rather than anchoring on scene 0 so that a
// drifted FIRST scene cannot impose its cast on the whole ad.
//
// The pull is PARTIAL and CAPPED on purpose. A full correction would flatten every
// deliberate mood in the ad; the job is to close the gap between beats, not to
// sterilise them.
//
// SHIPS DARK behind SCENE_GRADE_ENABLED. Off (incl. unset) → planSceneGrade is
// never consulted and the filtergraph is byte-identical to today's.

import { spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

/** Mean luma + chroma over the sampled frames, in signalstats' 0-255 units. */
export interface ChromaMeasure {
  yavg: number;
  /** Blue-difference. 128 = neutral, >128 leans blue/cool. */
  uavg: number;
  /** Red-difference. 128 = neutral, >128 leans red/warm. */
  vavg: number;
  /** How many frames the averages are drawn from. */
  frames: number;
}

/** Fraction of the distance to the target that gets corrected. 1.0 would sterilise
 * the scene; this closes most of the gap between beats while leaving the mood. */
const PULL = 0.8;

/** signalstats UV units → colorbalance's -1..1 scale. MEASURED, not assumed: a
 * `colorbalance=rm=0.18` cast applied to a real frame moved VAVG by 1.68 units
 * (136.49 from 134.81), so one UV unit costs ~0.107 of balance. The first guess
 * here was 0.055, which under-corrected by half — see the calibration in
 * tests/unit/sceneGrade.test.ts, which re-derives this from a round trip rather
 * than trusting the constant. */
const UV_TO_BALANCE = 0.107;

/** Below this much drift FROM THE AD'S OWN TARGET the scene already agrees with its
 * siblings and gets NO filter at all — so an ad whose beats match renders
 * byte-identically to today, flag on or off. This is what keeps the CLASSIC
 * regression lock honest. In UV units, where the observed scene-4-class drift was
 * ~1.7 and a same-look sibling pair sat under 0.5. */
const DEADBAND = 0.8;

/** Hard ceiling on any single channel shift. A wild measurement (a scene that is
 * legitimately one colour — a sunset, a red wall) can never blow out the picture;
 * the worst case is an under-correction, which is the failure we can live with. */
const MAX_SHIFT = 0.14;

/** Luma is corrected far more gently than chroma: brightness reads as exposure,
 * and viewers forgive an exposure difference between beats much more readily than
 * a colour-temperature one. */
const LUMA_PULL = 0.25;
const MAX_BRIGHTNESS = 0.06;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Round to 4dp so the filter string is stable and diffable across runs. */
const q = (v: number) => Number(v.toFixed(4));

/**
 * Parse `signalstats` + `metadata=print` output into one averaged measurement.
 * Returns null when nothing parseable is present, which the caller treats as
 * "do not grade this scene" rather than as an error.
 */
export function parseSignalstats(output: string): ChromaMeasure | null {
  const pick = (key: string): number[] =>
    [...output.matchAll(new RegExp(`lavfi\\.signalstats\\.${key}=([0-9.]+)`, 'g'))]
      .map((m) => Number(m[1]))
      .filter((n) => Number.isFinite(n));

  const ys = pick('YAVG');
  const us = pick('UAVG');
  const vs = pick('VAVG');
  const frames = Math.min(ys.length, us.length, vs.length);
  if (frames === 0) return null;

  const mean = (xs: number[]) => xs.slice(0, frames).reduce((a, b) => a + b, 0) / frames;
  return { yavg: mean(ys), uavg: mean(us), vavg: mean(vs), frames };
}

/**
 * The look the whole ad is corrected toward: the per-channel MEDIAN of its scenes.
 * Needs every scene measured before any scene is graded, so the render has to walk
 * the timeline twice — measure all, then build all.
 *
 * Returns null for fewer than 3 scenes. With 2 there is no majority to appeal to,
 * only two opinions, and picking either one is a coin flip that can pull the good
 * beat toward the bad one. Pure.
 */
export function chromaTarget(ms: readonly ChromaMeasure[]): ChromaMeasure | null {
  const valid = ms.filter((m): m is ChromaMeasure => !!m && m.frames > 0);
  if (valid.length < 3) return null;
  const median = (pick: (m: ChromaMeasure) => number) => {
    const xs = valid.map(pick).sort((a, b) => a - b);
    const mid = xs.length >> 1;
    return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
  };
  return {
    yavg: median((m) => m.yavg),
    uavg: median((m) => m.uavg),
    vavg: median((m) => m.vavg),
    frames: valid.length,
  };
}

/**
 * Turn a measurement into the ffmpeg filter that pulls the scene toward the ad's
 * target, or null when it already agrees with its siblings.
 *
 * Pure — no I/O, no clock, no randomness. The same measurement always yields the
 * same string, so a re-render of the same ad is reproducible.
 */
export function planSceneGrade(m: ChromaMeasure | null, target: ChromaMeasure | null): string | null {
  if (!m || !target) return null;

  const du = m.uavg - target.uavg; // >0 = bluer than its siblings
  const dv = m.vavg - target.vavg; // >0 = redder than its siblings

  const cast = Math.max(Math.abs(du), Math.abs(dv));
  if (cast < DEADBAND) return null;

  // Correct AGAINST the cast: a red-leaning scene loses red, a blue-leaning one
  // loses blue. Midtones only — shadows and highlights carry the contrast, and
  // shifting them is what makes a corrected clip read as "graded" rather than fixed.
  const rm = clamp(-dv * UV_TO_BALANCE * PULL, -MAX_SHIFT, MAX_SHIFT);
  const bm = clamp(-du * UV_TO_BALANCE * PULL, -MAX_SHIFT, MAX_SHIFT);

  const parts = [`colorbalance=rm=${q(rm)}:bm=${q(bm)}`];

  // Luma is corrected against the same sibling target, for the same reason as
  // chroma: an ad that is legitimately dark throughout should stay dark.
  const dy = m.yavg - target.yavg;
  const brightness = clamp((-dy / 255) * LUMA_PULL, -MAX_BRIGHTNESS, MAX_BRIGHTNESS);
  if (Math.abs(brightness) >= 0.005) parts.push(`eq=brightness=${q(brightness)}`);

  return parts.join(',');
}

/** `'true'` (and nothing else, unset included) turns per-scene grading on. Read at
 * call time, not module load, so a Vercel env flip needs no rebuild — same contract
 * as MID_GAP_TRIM_ENABLED and SFX_V2_ENABLED. */
export const isSceneGradeEnabled = (): boolean =>
  process.env.SCENE_GRADE_ENABLED === 'true';

/**
 * Sample a clip and measure its average cast. Runs INSIDE the render path, so it
 * never throws: a missing binary, an unreadable clip or unparseable output all
 * return null and the scene renders ungraded. A grading problem must cost the
 * correction, never the render.
 *
 * `fps=1/2` samples one frame every two seconds — enough of the clip to survive a
 * single odd frame, cheap enough that a 4-scene ad pays well under a second total.
 */
export function measureSceneChroma(videoPath: string, sampleFps = '1/2'): ChromaMeasure | null {
  if (!ffmpegPath) return null;
  try {
    const r = spawnSync(ffmpegPath, [
      '-hide_banner', '-nostats',
      '-i', videoPath,
      '-vf', `fps=${sampleFps},signalstats,metadata=print`,
      '-an', '-f', 'null', '-',
    ], { maxBuffer: 1 << 26, encoding: 'utf8' });
    // metadata=print writes to stderr; some builds mirror it to stdout.
    return parseSignalstats(`${r.stderr ?? ''}${r.stdout ?? ''}`);
  } catch {
    return null;
  }
}

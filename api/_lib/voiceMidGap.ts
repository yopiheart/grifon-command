import type { FinalRenderScene } from '../../types.js';
import { LEAD_IN_FLOOR_SEC, type AlignedWord } from './voiceLeadIn.js';

// Compress the dead air BETWEEN spoken words inside one scene.
//
// Same defect as voiceLeadIn.ts, different position: a rendered scene can carry
// ~1.0s of silence in the MIDDLE of the read. It costs retention exactly like the
// lead-in did, and it is invisible to `chooseTrim` (which only ever shortens the
// TAIL). Forced alignment is again the signal — everything outside a word span is
// not speech, no matter how loud the room tone is — so this module never probes
// the audio and never cuts a scene whose alignment failed.
//
// WHY THIS IS NOT voiceLeadIn WITH A LOOP
// The lead-in cut is FLAT: one constant, subtract it from everything. Mid-scene
// cuts are not. Each cut only moves what comes AFTER it, so every downstream
// anchor has to move by the CUMULATIVE cut that precedes it (rebaseSec below).
// Four things key off these timings — voiceWords (caption chunk windows), SFX
// anchors, overlay windows, and the trim-to-speech-end decision — and all four
// desync silently if the shift is treated as flat.
//
// WHY A JUMP CUT IS ACCEPTABLE
// On a `talking` scene the mouth is on screen, so the video must lose the same
// spans as the audio or lip-sync breaks — which means the viewer sees a jump cut.
// That is the native grammar of UGC/Reels and reads as an honest self-edit; dead
// air is the worse defect (Neil, 2026-08-10). On `b-roll` / `cinematic` there is
// no mouth, so only the audio is compressed and the clip plays straight through:
// no jump, and free, because chooseTrim already ends the scene at the VO.
//
// SHIPS DARK: `MID_GAP_TRIM_ENABLED='true'` or nothing happens at all.

/** Silence LEFT BEHIND at a cut. A hard 0 sounds clipped — same reason as the
 * lead-in, so it is deliberately the same number. */
export const MID_GAP_FLOOR_SEC = LEAD_IN_FLOOR_SEC;
/** Below this a pause is a breath or a beat, not dead air. Deliberately higher
 * than the lead-in's 0.25s: a cut in the middle of a sentence is far more visible
 * than a head trim, so it has to be worth the jump. */
export const MID_GAP_MIN_SEC = 0.6;
/** Per scene. Cutting every small pause makes the read feel twitchy. */
export const MID_GAP_MAX_CUTS = 2;

/** One span removed from the scene's media, on the scene's OWN timeline. */
export interface MidGapCut {
  /** Where the removed span begins (i.e. where the media is spliced). */
  atSec: number;
  /** How much is removed. Always > 0. */
  cutSec: number;
}

export interface MidGapPlan {
  cuts: MidGapCut[];
  /** The video must be spliced at the same instants (a mouth is on screen). */
  cutVideo: boolean;
}

/** The nothing-to-do plan. Shared so the disabled path allocates nothing. */
export const NO_MID_GAP: MidGapPlan = Object.freeze({ cuts: [], cutVideo: false });

/** Kill switch, read at runtime like SFX_V2_ENABLED. Unset = today's behavior. */
export function midGapTrimEnabled(): boolean {
  return process.env.MID_GAP_TRIM_ENABLED === 'true';
}

export interface MidGapOptions {
  minGapSec?: number;
  floorSec?: number;
  maxCuts?: number;
}

/**
 * Which inter-word gaps to compress, and by how much. Pure — no ffmpeg, no I/O.
 *
 * Returns cuts in TIME ORDER, which rebaseSec depends on. Empty means "leave the
 * scene alone", which is the answer for a scene without alignment (issue #96) and
 * for a scene that simply reads well.
 */
export function planMidGapCuts(
  words: AlignedWord[] | undefined,
  { minGapSec = MID_GAP_MIN_SEC, floorSec = MID_GAP_FLOOR_SEC, maxCuts = MID_GAP_MAX_CUTS }: MidGapOptions = {}
): MidGapCut[] {
  if (!Array.isArray(words) || words.length < 2) return [];
  const found: MidGapCut[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    const end = words[i]?.end;
    const next = words[i + 1]?.start;
    if (typeof end !== 'number' || typeof next !== 'number') continue;
    if (!Number.isFinite(end) || !Number.isFinite(next)) continue;
    const gap = next - end;
    if (gap < minGapSec) continue;
    // Compress, never eliminate: the floor stays with the word that just ended,
    // and the cut runs from there to the exact onset of the next word.
    const cutSec = gap - floorSec;
    if (cutSec <= 0) continue;
    found.push({ atSec: end + floorSec, cutSec });
  }
  if (found.length <= maxCuts) return found;
  // Over the cap: spend the cuts on the worst dead air, then put them back in
  // time order (earlier gap breaks a tie, so the choice is deterministic).
  return found
    .slice()
    .sort((a, b) => b.cutSec - a.cutSec || a.atSec - b.atSec)
    .slice(0, maxCuts)
    .sort((a, b) => a.atSec - b.atSec);
}

/**
 * A `b-roll` / `cinematic` scene has no mouth on screen, so its video is not tied
 * to the words — compress the audio only and let the clip run. Anything else
 * (including a scene whose type never made it through the EDL) is treated as
 * talking, because a missed video cut on a talking scene is broken lip-sync while
 * an unnecessary one on b-roll is only a jump the viewer reads as an edit.
 */
export function midGapCutsVideo(sceneType: FinalRenderScene['sceneType']): boolean {
  return sceneType !== 'b-roll' && sceneType !== 'cinematic';
}

/** The whole per-scene decision: flag, then alignment, then scene type. */
export function planSceneMidGap(
  scene: Pick<FinalRenderScene, 'voiceWords' | 'sceneType' | 'audioUrl'>,
  opts?: MidGapOptions
): MidGapPlan {
  if (!midGapTrimEnabled()) return NO_MID_GAP;
  if (!scene.audioUrl) return NO_MID_GAP; // no VO in this scene → no gaps to close
  const cuts = planMidGapCuts(scene.voiceWords, opts);
  if (!cuts.length) return NO_MID_GAP;
  return { cuts, cutVideo: midGapCutsVideo(scene.sceneType) };
}

/** Total seconds removed — the scene's media gets exactly this much shorter. */
export function totalCutSec(cuts: MidGapCut[]): number {
  return cuts.reduce((s, c) => s + c.cutSec, 0);
}

/**
 * Where `sec` lands after the cuts. THE cumulative-shift primitive: a time moves
 * back by every cut that ENDED before it, and a time that fell inside a removed
 * span collapses onto that span's start (that instant no longer exists).
 *
 * `cuts` must be in time order and non-overlapping — planMidGapCuts guarantees
 * both, since it walks the words forward and each cut lives inside one gap.
 */
export function rebaseSec(sec: number, cuts: MidGapCut[]): number {
  if (!cuts.length || !Number.isFinite(sec)) return sec;
  let shift = 0;
  for (const c of cuts) {
    if (sec <= c.atSec) break;
    shift += Math.min(c.cutSec, sec - c.atSec);
  }
  return Math.max(0, sec - shift);
}

/**
 * Slide every one of the scene's own-timeline anchors onto the compacted media.
 * The cumulative sibling of shiftSceneForLeadIn (renderFfmpeg.ts).
 *
 * `overlayText` is rebased for completeness even though planScene currently
 * derives its own overlay window from the speech onset rather than reading these
 * fields — the moment it stops doing that, a stale window here would be a silent
 * desync, and rebasing costs nothing.
 *
 * Returns the SAME object when there is nothing to cut, so the disabled path is
 * byte-identical to today.
 */
export function rebaseSceneAfterCuts(scene: FinalRenderScene, cuts: MidGapCut[]): FinalRenderScene {
  if (!cuts.length) return scene;
  return {
    ...scene,
    voiceWords: scene.voiceWords?.map((w) => ({
      text: w.text,
      start: rebaseSec(w.start, cuts),
      end: rebaseSec(w.end, cuts),
    })),
    sfxCues: scene.sfxCues?.map((c) => ({ ...c, anchorSec: rebaseSec(c.anchorSec, cuts) })),
    overlayText: scene.overlayText?.map((o) => ({
      ...o,
      startSec: rebaseSec(o.startSec, cuts),
      endSec: rebaseSec(o.endSec, cuts),
    })),
  };
}

/** Filtergraph statements + the labels the rest of the scene graph reads from. */
export interface MidGapFilters {
  stmts: string[];
  /** null when the video was left alone (b-roll) — the caller keeps `[0:v]`. */
  videoOut: string | null;
  audioOut: string;
}

/**
 * Split-at-concat: the media minus the planned spans. Pure string building, so
 * the graph is unit-testable without a render; the caller splices it into the
 * scene's existing filter_complex, which means NO extra ffmpeg pass and no second
 * encode of the clip.
 *
 * WHY VIDEO AND AUDIO CONCAT TOGETHER (v=1:a=1) WHEN BOTH ARE CUT
 * `atrim` is sample-exact but `trim` can only land on a frame boundary, so the two
 * streams never lose *precisely* the same number of milliseconds. Concatenating
 * them as PAIRED segments makes the concat filter re-sync them at every splice
 * (it pads the shorter stream), which bounds the error at under one frame per cut
 * instead of letting it accumulate into visible lip-sync drift.
 *
 * The leading `setpts=PTS-STARTPTS` is not cosmetic: `-ss` (the lead-in cut) is
 * applied to both inputs, and trim times are absolute against the incoming
 * timestamps. Zeroing them first is what makes the plan's scene-relative seconds
 * mean the same thing here as they do in the rebase.
 */
export function buildMidGapFilters(
  plan: MidGapPlan,
  videoIn: string = '[0:v]',
  audioIn: string = '[1:a]'
): MidGapFilters | null {
  const { cuts, cutVideo } = plan;
  if (!cuts.length) return null;
  const n = cuts.length + 1; // segments kept = cuts + 1
  const t = (s: number) => s.toFixed(3);
  const labels = (p: string) => Array.from({ length: n }, (_, k) => `[${p}${k}]`).join('');

  const stmts: string[] = [];
  if (cutVideo) stmts.push(`${videoIn}setpts=PTS-STARTPTS,split=${n}${labels('mgvs')}`);
  stmts.push(`${audioIn}asetpts=PTS-STARTPTS,asplit=${n}${labels('mgas')}`);

  const segments: string[] = [];
  for (let k = 0; k < n; k++) {
    const prev = cuts[k - 1];
    const nextCut = cuts[k];
    const args = [
      prev ? `start=${t(prev.atSec + prev.cutSec)}` : null,
      nextCut ? `end=${t(nextCut.atSec)}` : null,
    ].filter(Boolean).join(':');
    if (cutVideo) stmts.push(`[mgvs${k}]trim=${args},setpts=PTS-STARTPTS[mgv${k}]`);
    stmts.push(`[mgas${k}]atrim=${args},asetpts=PTS-STARTPTS[mga${k}]`);
    segments.push(cutVideo ? `[mgv${k}][mga${k}]` : `[mga${k}]`);
  }
  stmts.push(
    cutVideo
      ? `${segments.join('')}concat=n=${n}:v=1:a=1[mgv][mga]`
      : `${segments.join('')}concat=n=${n}:v=0:a=1[mga]`
  );

  return { stmts, videoOut: cutVideo ? '[mgv]' : null, audioOut: '[mga]' };
}

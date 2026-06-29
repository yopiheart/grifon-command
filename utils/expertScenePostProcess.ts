// Expert Mode (Director's Cut) — deterministic, NON-TUNED post-processing.
//
// The expert's per-scene choices are applied AFTER the existing (untouched) generateStoryboard /
// generateVideoPrompts run. Nothing here edits a tuned prompt — it only rewrites structural fields
// on the Scene/VideoPrompt objects the tuned flows already produced.
//
// Two jobs:
//   1. shotIntent → forces Scene.referenceImage + the VideoPrompt.type   (mapShotIntent / applyShotIntents / overrideVideoPromptTypes)
//   2. 1:1 adapter → guarantees N expert script lines land as exactly N scenes, in order
//      (reconcileSceneCount) — the storyboard prompt gives no written 1:1 guarantee.

import type { Scene, VideoPrompt } from '../types';

export type ShotIntent = NonNullable<Scene['shotIntent']>;
export type ReferenceImage = NonNullable<Scene['referenceImage']>;
export type VideoType = VideoPrompt['type'];

/** Which assets are actually available — used to honor the "never drop a needed reference" invariant. */
export interface AssetAvailability {
  hasAvatar: boolean;
  hasProduct: boolean;
}

export interface ShotMapping {
  /** referenceImage to force, or null to keep the AI's choice. */
  referenceImage: ReferenceImage | null;
  /** video-prompt type to force, or null to keep the AI's classification. */
  type: VideoType | null;
}

// Mouth-obstruction signals — mirror of the generateVideoPrompts override (kept client-side, the
// tuned prompt is NOT edited). If an avatar-product scene's description shows the mouth occupied,
// lip-sync would morph the face, so it must render as b-roll (voice-over carries the line).
const MOUTH_OBSTRUCTION = /\b(drink|drinking|sip|sipping|mid-?sip|eat|eating|bit(e|ing)|lips?|mouth|bottle (at|to)|cup (at|to)|hand (at|to|near) (the )?(mouth|face))\b/i;

const hasMouthObstruction = (text: string | undefined): boolean =>
  !!text && MOUTH_OBSTRUCTION.test(text);

/**
 * Map a shot intent to the structural fields it forces. Availability-aware: when a forced reference
 * isn't available, degrades gracefully rather than dropping the subject to an empty reference.
 * 'auto' (and undefined) returns nulls — current AI behaviour, untouched.
 */
export const mapShotIntent = (
  intent: Scene['shotIntent'],
  avail: AssetAvailability,
  sceneDescription?: string,
): ShotMapping => {
  switch (intent) {
    case 'talking-avatar':
      return avail.hasAvatar
        ? { referenceImage: 'avatar', type: 'talking' }
        : { referenceImage: null, type: null }; // no avatar to anchor → leave AI's choice
    case 'product-highlight':
      return avail.hasProduct
        ? { referenceImage: 'product', type: 'b-roll' }
        : { referenceImage: null, type: 'b-roll' };
    case 'avatar-product': {
      const both = avail.hasAvatar && avail.hasProduct;
      const ref: ReferenceImage | null = both
        ? 'both'
        : avail.hasAvatar
          ? 'avatar'
          : avail.hasProduct
            ? 'product'
            : null;
      // talking unless the mouth is obstructed; product-only fallback is never "talking".
      const type: VideoType = ref === 'product' || hasMouthObstruction(sceneDescription) ? 'b-roll' : 'talking';
      return { referenceImage: ref, type };
    }
    case 'b-roll':
      // b-roll keeps the AI's referenceImage (avatar may still appear, voice-over carries the line);
      // only the type is forced.
      return { referenceImage: null, type: 'b-roll' };
    case 'auto':
    case undefined:
    default:
      return { referenceImage: null, type: null };
  }
};

/**
 * Apply every scene's shotIntent to its referenceImage BEFORE rendering / generateVideoPrompts.
 * Returns new Scene objects (does not mutate). Scenes with auto/undefined intent pass through.
 */
export const applyShotIntents = (scenes: Scene[], avail: AssetAvailability): Scene[] =>
  scenes.map((s) => {
    const { referenceImage } = mapShotIntent(s.shotIntent, avail, s.sceneDescription);
    return referenceImage ? { ...s, referenceImage } : s;
  });

/**
 * Hard-guarantee the VideoPrompt types after generateVideoPrompts runs: where the expert set a
 * non-auto shotIntent, force the matching type. Prompts align to scenes by index. The prompt TEXT
 * is left as the tuned flow wrote it (an accepted edge risk flagged for QA — see plan F2/F4).
 */
export const overrideVideoPromptTypes = (
  prompts: VideoPrompt[],
  scenes: Scene[],
  avail: AssetAvailability,
): VideoPrompt[] => {
  // generateVideoPrompts returns raw model JSON with no length/order guarantee. Align by index only
  // when the counts match; otherwise fall back to matching each prompt to its scene by scriptLine so
  // a dropped/reordered prompt can't force a shot type onto the wrong clip.
  const aligned = prompts.length === scenes.length;
  return prompts.map((p, i) => {
    const scene = aligned ? scenes[i] : scenes.find((s) => s.scriptLine === p.scriptLine);
    if (!scene) return p;
    const { type } = mapShotIntent(scene.shotIntent, avail, scene.sceneDescription);
    return type ? { ...p, type } : p;
  });
};

/**
 * A filler scene for a missing expert line (1:1 adapter pad). Carries an imagePrompt derived from the
 * line so it actually RENDERS — otherwise renderSceneImages would skip it (no prompt) yet the caller
 * would still count it as rendered, leaving a silently-blank scene.
 */
const fillerScene = (scriptLine: string, neighbor?: Scene): Scene => ({
  scriptLine,
  sceneDescription: scriptLine,
  imagePrompt: scriptLine,
  referenceImage: neighbor?.referenceImage ?? 'none',
  shotIntent: 'auto',
});

/**
 * 1:1 adapter (premortem F4). The tuned storyboard prompt gives no written guarantee that N input
 * lines come back as N scenes in order, so we realign deterministically:
 *   - exactly N: keep each scene, force scriptLine to the expert's exact line.
 *   - more than N: keep the first N, force scriptLines (extra AI scenes dropped).
 *   - fewer than N: pad with filler scenes for the missing lines.
 * The expert's lines + order are always preserved.
 */
export const reconcileSceneCount = (scenes: Scene[], expectedLines: string[]): Scene[] =>
  expectedLines.map((line, i) =>
    scenes[i] ? { ...scenes[i], scriptLine: line } : fillerScene(line, scenes[scenes.length - 1]),
  );

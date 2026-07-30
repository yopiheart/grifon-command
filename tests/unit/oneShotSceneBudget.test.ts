import { describe, it, expect } from 'vitest';
import { sceneImageCost, capScenesToBudget, castEthnicityFor } from '../../hooks/useOneShotGeneration.js';
import type { Scene } from '../../types.js';

/**
 * The free-tier image-budget invariant.
 *
 * Every /api/gemini/image call meters one 'images' unit and the free plan gets 5
 * a month. One one-shot run spends: the auto-cast avatar (1, or 0 when the user
 * uploaded a presenter) + the thumbnail (1) + one image per scene — two for a
 * hook-morph scene, which renders a start AND an end frame. Untrimmed, a 4-scene
 * format needs 6 and the run dies mid-storyboard.
 *
 * Expected counts below are worked by hand from that ladder, not from the code.
 */

const scene = (over: Partial<Scene> = {}): Scene => ({
  scriptLine: 'line',
  sceneDescription: 'desc',
  imagePrompt: 'a plain scene',
  ...over,
});

/** A hook morph — start + end frame, so two metered images. */
const morphScene = (): Scene => scene({ startFramePrompt: 'before', endFramePrompt: 'after' });

const FREE_IMAGES = 5;
const THUMBNAIL = 1;
const AUTO_AVATAR = 1;

describe('sceneImageCost', () => {
  it('charges one image for an ordinary scene', () => {
    expect(sceneImageCost(scene())).toBe(1);
  });

  it('charges two for a hook morph (start + end frame)', () => {
    expect(sceneImageCost(morphScene())).toBe(2);
  });

  it('charges one for a directed scene that only has an override prompt', () => {
    expect(sceneImageCost(scene({ imagePrompt: undefined, userImagePromptOverride: 'directed' }))).toBe(1);
  });

  it('charges nothing for a scene with no prompt at all', () => {
    expect(sceneImageCost(scene({ imagePrompt: undefined }))).toBe(0);
  });
});

describe('capScenesToBudget — fresh free account (5 images)', () => {
  it('keeps 3 of a 4-scene UGC format (5 − avatar − thumbnail = 3)', () => {
    const scenes = [scene(), scene(), scene(), scene()];
    const kept = capScenesToBudget(scenes, FREE_IMAGES, AUTO_AVATAR + THUMBNAIL);
    expect(kept).toHaveLength(3);
  });

  it('keeps 2 of an unbounded MrBeast format whose first scene is a hook morph', () => {
    // costs: 2,1,1,1,1,1 against a 3-image scene budget → morph (2) + one plain (1).
    const scenes = [morphScene(), scene(), scene(), scene(), scene(), scene()];
    const kept = capScenesToBudget(scenes, FREE_IMAGES, AUTO_AVATAR + THUMBNAIL);
    expect(kept).toHaveLength(2);
  });

  it('spends the avatar reservation on scenes when the user uploaded a presenter', () => {
    // No avatar generation → 4-image scene budget → morph (2) + two plain (1+1).
    const scenes = [morphScene(), scene(), scene(), scene(), scene()];
    const kept = capScenesToBudget(scenes, FREE_IMAGES, THUMBNAIL);
    expect(kept).toHaveLength(3);
  });

  it('stops at the first scene that does not fit — it never skips ahead out of order', () => {
    // budget 3: plain (1) + plain (1) then a morph (2) that does not fit → stop,
    // even though the plain scene after it would have.
    const scenes = [scene(), scene(), morphScene(), scene()];
    const kept = capScenesToBudget(scenes, FREE_IMAGES, AUTO_AVATAR + THUMBNAIL);
    expect(kept).toHaveLength(2);
  });
});

describe('capScenesToBudget — the invariant', () => {
  it('never plans a spend above the budget, at any remaining balance', () => {
    const scenes = [morphScene(), scene(), scene(), morphScene(), scene(), scene()];
    for (let remaining = 0; remaining <= FREE_IMAGES; remaining++) {
      for (const avatarCost of [0, AUTO_AVATAR]) {
        const reserved = avatarCost + THUMBNAIL;
        const sceneSpend = capScenesToBudget(scenes, remaining, reserved)
          .reduce((n, s) => n + sceneImageCost(s), 0);
        // avatar + thumbnail + every scene frame together fit the allowance.
        expect(reserved + sceneSpend).toBeLessThanOrEqual(Math.max(remaining, reserved));
      }
    }
  });

  it('renders nothing rather than overspend when the allowance is already gone', () => {
    expect(capScenesToBudget([scene(), scene()], 0, AUTO_AVATAR + THUMBNAIL)).toHaveLength(0);
  });
});

describe('castEthnicityFor — the "Auto" talent chip', () => {
  it('casts a Taglish ad Filipino instead of leaving it Global/Neutral', () => {
    expect(castEthnicityFor('', 'Taglish')).toBe('Filipino');
    expect(castEthnicityFor(undefined, 'Taglish')).toBe('Filipino');
    expect(castEthnicityFor('   ', 'Taglish')).toBe('Filipino');
  });

  it('leaves a pure-English ad to the tuned prompt’s own neutral handling', () => {
    expect(castEthnicityFor('', 'English')).toBe('');
    expect(castEthnicityFor(undefined, 'English')).toBe('');
  });

  it('always lets an explicit pick win over the language default', () => {
    expect(castEthnicityFor('Caucasian', 'Taglish')).toBe('Caucasian');
    expect(castEthnicityFor('Pan-Asian', 'Taglish')).toBe('Pan-Asian');
    expect(castEthnicityFor('Korean', 'English')).toBe('Korean');
  });
});

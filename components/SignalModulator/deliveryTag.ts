import type { SceneBatchEntry } from '../../types';
import { TTS_TAGS } from './utils';

// Pure mapping: a scene's narrative position → an eleven_v3 inline delivery tag,
// factored out of ScenePipelineTile so the creative intent is unit-testable
// without React, ElevenLabs, or audio. Tags come ONLY from the shared TTS_TAGS
// vocabulary (single source of truth with the manual tag picker). Empty string
// means "no tag — let the engine read it straight" (per the 2026-06-13 lesson
// that the engine reads raw Taglish better than hand-tuned hints).
//
// Why position/role and not a Gemini-generated beat: chainRole only exists on
// cinematic-relay scenes, so talking-head ads (the bulk) need a heuristic that
// still shapes the dramatic arc. Energy lives at the bookends — the hook grabs,
// the CTA drives — while the middle breathes naturally.

export type DeliveryTag = (typeof TTS_TAGS)[number] | '';

export interface DeliveryContext {
  type: SceneBatchEntry['type'];
  chainRole?: SceneBatchEntry['chainRole'];
  /** 0-based position of the scene within the batch (not the absolute sceneIdx). */
  sceneIdx: number;
  /** Total scenes in the batch — used to locate the CTA (last) scene. */
  sceneCount: number;
}

export function pickDeliveryTag(ctx: DeliveryContext): DeliveryTag {
  const { type, chainRole, sceneIdx, sceneCount } = ctx;

  // Cinematic-relay scenes carry an explicit dramatic role — honor it directly.
  if (chainRole) {
    switch (chainRole) {
      case 'Metaphor_A':
        return '[whispers]'; // cold-open intrigue
      case 'Action_C':
        return '[excited]'; // momentum build
      case 'Hero_D':
        return '[excited]'; // hero payoff
      case 'Anchor_B':
        return ''; // grounded authority — read straight
    }
  }

  // A cinematic scene with no role signal stays restrained (visual-led).
  if (type === 'cinematic') return '';

  // Talking-head / b-roll: shape by position. A single scene is its own
  // hook+CTA, so it gets the energy too.
  const isHook = sceneIdx === 0;
  const isCta = sceneIdx === sceneCount - 1;
  if (isHook || isCta) return '[excited]';
  return '';
}

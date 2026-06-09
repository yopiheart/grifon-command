import type { ConsolidationScene } from '../../types.js';

// Pure routing logic for the voice consolidator, factored out of the
// `api/voice/consolidate.ts` handler so the intent is unit-testable without
// touching ElevenLabs, ffmpeg, or Supabase.
//
// Routing by VideoPrompt.type (see workflows/render_pipeline_voice_10.md Phase 1):
//   talking   → speech-to-speech on the scene MP4's audio track (preserves
//               lip-sync). Falls back to TTS on scriptLine when no videoUrl.
//   b-roll    → text-to-speech on scriptLine.
//   cinematic → TTS if scriptLine non-empty, else skip (visual-only scene).

export type VoiceUnit = 'tts' | 'sts';

export type SceneRoute =
  | { action: 'sts'; unit: 'sts'; videoUrl: string }
  | { action: 'tts'; unit: 'tts'; text: string }
  | { action: 'tts-fallback'; unit: 'tts'; text: string }
  | { action: 'skip'; reason: string };

export function routeScene(scene: ConsolidationScene): SceneRoute {
  const text = (scene.scriptLine ?? '').trim();
  switch (scene.type) {
    case 'talking':
      if (scene.videoUrl) return { action: 'sts', unit: 'sts', videoUrl: scene.videoUrl };
      if (text) return { action: 'tts-fallback', unit: 'tts', text };
      return { action: 'skip', reason: 'talking_scene_missing_video_and_script' };
    case 'b-roll':
      if (text) return { action: 'tts', unit: 'tts', text };
      return { action: 'skip', reason: 'broll_scene_empty_script' };
    case 'cinematic':
      if (text) return { action: 'tts', unit: 'tts', text };
      return { action: 'skip', reason: 'cinematic_visual_only' };
    default:
      return { action: 'skip', reason: 'unknown_scene_type' };
  }
}

/**
 * Guards the audio↔video keying contract (premortem #4a): every scene must
 * carry a distinct, non-negative sceneIdx so results map 1:1 back to scenes and
 * the downstream render can key audio to video by sceneIdx without ambiguity.
 */
export function assertUniqueSceneIdx(scenes: ConsolidationScene[]): { ok: boolean; error?: string } {
  const seen = new Set<number>();
  for (const s of scenes) {
    if (!Number.isInteger(s.sceneIdx) || s.sceneIdx < 0) {
      return { ok: false, error: `invalid_scene_idx:${s.sceneIdx}` };
    }
    if (seen.has(s.sceneIdx)) {
      return { ok: false, error: `duplicate_scene_idx:${s.sceneIdx}` };
    }
    seen.add(s.sceneIdx);
  }
  return { ok: true };
}

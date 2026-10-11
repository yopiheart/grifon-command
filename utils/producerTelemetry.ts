// Producer monitoring contains categories and counters, never prompt/provider text.
export const PRODUCER_EVENTS = new Set([
  'node_start', 'node_done', 'node_fail', 'check_fail', 'check_skip', 'gate_park', 'gate_approve',
]);

const VALUES: Record<string, readonly string[]> = {
  node: ['market_research', 'script', 'storyboard', 'scene_images', 'video_prompts', 'thumbnail', 'video', 'voices', 'edl', 'final_render', 'avatar_persist', 'regen', 'reshoot'],
  gate: ['storyboard', 'first_cut'],
  kind: ['deterministic', 'gate'],
  reason: ['decode_failed', 'aspect_mismatch', 'too_small', 'no_identity_reference', 'gate_unavailable', 'rate_limited', 'aborted', 'unauthenticated', 'other'],
  error: ['identity_reference_lost', 'avatar_too_large', 'record_avatar_failed', 'failed'],
};

export function sanitizeProducerMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, allowed] of Object.entries(VALUES)) {
    if (typeof meta[key] === 'string' && allowed.includes(meta[key])) safe[key] = meta[key];
  }
  for (const key of ['attempt', 'sceneIdx', 'chars', 'cap', 'status']) {
    const value = meta[key];
    if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) safe[key] = value;
  }
  for (const key of ['degraded', 'reroll']) {
    if (typeof meta[key] === 'boolean') safe[key] = meta[key];
  }
  return safe;
}

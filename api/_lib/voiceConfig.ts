import type { ServerPlanId } from './userPlan.js';

// Per-user voice slot quota (how many cloned voices a user keeps stored at once).
// ElevenLabs voice slots are shared globally across the workspace (Starter = 10
// total; ~5 currently held by admin-curated Filipino library voices, leaving ~5
// for user clones). Tier these so paid plans get headroom — but stay conservative
// because Starter capacity is finite. Upgrading ElevenLabs tier (Creator/Pro)
// raises the global cap and lets these numbers scale.
export const VOICE_SLOTS: Record<ServerPlanId, number> = {
  free: 0,
  creator: 1,
  pro: 3,
  business: 5,
};

export const getVoiceSlotMax = (plan: ServerPlanId): number => VOICE_SLOTS[plan];

export const isCloningEnabled = (): boolean =>
  process.env.GRIFON_VOICE_CLONING_ENABLED === 'true';

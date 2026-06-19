import type { ServerPlanId } from './userPlan.js';

// Per-user voice slot quota (how many cloned voices a user keeps stored at once).
// ElevenLabs voice slots are shared globally across the workspace (Starter = 10
// total; ~5 currently held by admin-curated Filipino library voices, leaving ~5
// for user clones). Tier these so paid plans get headroom — but stay conservative
// because Starter capacity is finite. Upgrading ElevenLabs tier (Creator/Pro)
// raises the global cap and lets these numbers scale.
// Our pricing tiers (free/starter/pro/business). Starter is a bare trial tier —
// 0 voice slots (cloning is Pro+). NOTE: the "Starter/Creator/Pro" names in the
// comment above are ElevenLabs' OWN plan tiers, unrelated to these keys.
export const VOICE_SLOTS: Record<ServerPlanId, number> = {
  free: 0,
  starter: 0,
  pro: 3,
  business: 5,
};

export const getVoiceSlotMax = (plan: ServerPlanId): number => VOICE_SLOTS[plan];

export const isCloningEnabled = (): boolean =>
  process.env.GRIFON_VOICE_CLONING_ENABLED === 'true';

// Generative music beds (ElevenLabs Music) ship dark behind this flag. Plumbing
// is live in code but no music is generated until this is 'true' — the kill
// switch for the whole feature AND the gate we flip only after the A/B listen
// test proves a generated bed >= the tuned static beds. Anything other than
// 'true' (incl. unset) → api/music/compose returns 503 and the render falls back
// to the static bed. Mirrors GRIFON_VOICE_CLONING_ENABLED.
export const isMusicGenEnabled = (): boolean =>
  process.env.GRIFON_MUSIC_GEN_ENABLED === 'true';

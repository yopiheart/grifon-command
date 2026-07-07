// Pricing ladder (2026-06-19 restructure): Free → Starter → Pro → Business.
// 'creator' was retired and replaced by 'starter' (1 finished video ad, bare —
// a deliberate trial door + price anchor toward Pro). Autopilot is invite-only
// and is NOT a self-serve PlanId. The metering unit for video_ads is a FINISHED
// AD (one completed one-shot render), not a per-scene clip.
export type PlanId = 'free' | 'starter' | 'pro' | 'business';

export type PlanLimits = {
  workflows: number;
  reports: number;
  captions: number;
  images: number;
  video_ads: number;
  watermark: boolean;
};

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free:     { workflows: 1,   reports: 1,  captions: 10,  images: 5,   video_ads: 0,  watermark: true  },
  starter:  { workflows: 3,   reports: 2,  captions: 30,  images: 25,  video_ads: 1,  watermark: false },
  pro:      { workflows: 40,  reports: 15, captions: 300, images: 150, video_ads: 8,  watermark: false },
  business: { workflows: 100, reports: 40, captions: 500, images: 300, video_ads: 15, watermark: false },
};

// Per-plan scene cap — the COGS dial that bounds finished-ad length (and so the
// video gen cost that is ~80% of every ad's COGS). Pro/Starter sit at 4 scenes
// (~16–32s, the FB/reels sweet spot); Business gets 6 (8 for Commercial/Spec).
// Enforced where Render All builds its job list (components/GenerateVideo). Free
// is 0 — Free renders no video at all (video_ads: 0). See workflows/
// pricing_unit_economics.md §2 for the cost-per-scene math behind these.
export const SCENE_CAP: Record<PlanId, number> = {
  free: 0,
  starter: 4,
  pro: 4,
  business: 6,
};

export const PLAN_RANK: Record<PlanId, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  business: 3,
};

export const planAtLeast = (current: PlanId, required: PlanId): boolean =>
  PLAN_RANK[current] >= PLAN_RANK[required];

// Generative music beds (ElevenLabs Music) are a Pro+ perk. Mirrors the
// server-authoritative MUSIC_DAILY gate in api/_lib/quota.ts (free/starter = 0):
// this only governs whether the AI Editor shows + defaults-on the toggle.
export const musicGenEligible = (current: PlanId): boolean =>
  planAtLeast(current, 'pro');

// Omni Edit Styles (the AI "Applying style" pass) are a Business-tier perk.
// Client gate only — the fire-path proxy (api/gemini/omni-video.ts) is the real
// wall. Mirrors musicGenEligible.
export const omniStylesEligible = (current: PlanId): boolean =>
  planAtLeast(current, 'business');

// Ordered, lowest → highest, for next-tier lookups.
const PLAN_ORDER: PlanId[] = ['free', 'starter', 'pro', 'business'];

/**
 * The next tier up from `current`, or null if already on the top plan.
 * Returns Exclude<PlanId,'free'> because the only thing below starter is free,
 * and you never "upgrade" to free — every real target is a checkout plan.
 */
export const nextTier = (current: PlanId): Exclude<PlanId, 'free'> | null => {
  const next = PLAN_ORDER[PLAN_RANK[current] + 1];
  return (next as Exclude<PlanId, 'free'> | undefined) ?? null;
};

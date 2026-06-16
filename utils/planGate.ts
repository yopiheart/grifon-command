export type PlanId = 'free' | 'creator' | 'pro' | 'business';

export type PlanLimits = {
  workflows: number;
  reports: number;
  captions: number;
  images: number;
  video_ads: number;
  watermark: boolean;
};

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free:     { workflows: 3,   reports: 1,  captions: 10,  images: 5,   video_ads: 0,  watermark: true  },
  creator:  { workflows: 15,  reports: 5,  captions: 100, images: 50,  video_ads: 0,  watermark: false },
  pro:      { workflows: 40,  reports: 15, captions: 300, images: 150, video_ads: 15, watermark: false },
  business: { workflows: 100, reports: 40, captions: 500, images: 300, video_ads: 40, watermark: false },
};

export const PLAN_RANK: Record<PlanId, number> = {
  free: 0,
  creator: 1,
  pro: 2,
  business: 3,
};

export const planAtLeast = (current: PlanId, required: PlanId): boolean =>
  PLAN_RANK[current] >= PLAN_RANK[required];

// Generative music beds (ElevenLabs Music) are a Pro+ perk. Mirrors the
// server-authoritative MUSIC_DAILY gate in api/_lib/quota.ts (free/creator = 0):
// this only governs whether the AI Editor shows + defaults-on the toggle.
export const musicGenEligible = (current: PlanId): boolean =>
  planAtLeast(current, 'pro');

// Ordered, lowest → highest, for next-tier lookups.
const PLAN_ORDER: PlanId[] = ['free', 'creator', 'pro', 'business'];

/**
 * The next tier up from `current`, or null if already on the top plan.
 * Returns Exclude<PlanId,'free'> because the only thing below creator is free,
 * and you never "upgrade" to free — every real target is a checkout plan.
 */
export const nextTier = (current: PlanId): Exclude<PlanId, 'free'> | null => {
  const next = PLAN_ORDER[PLAN_RANK[current] + 1];
  return (next as Exclude<PlanId, 'free'> | undefined) ?? null;
};

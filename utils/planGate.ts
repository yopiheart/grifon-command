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

const PLAN_RANK: Record<PlanId, number> = {
  free: 0,
  creator: 1,
  pro: 2,
  business: 3,
};

export const planAtLeast = (current: PlanId, required: PlanId): boolean =>
  PLAN_RANK[current] >= PLAN_RANK[required];

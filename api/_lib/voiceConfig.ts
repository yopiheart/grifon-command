// Per-user voice slot quota. ElevenLabs voice slots are shared globally on
// the account (Starter = 10), so per-user caps prevent one user from starving
// the pool. Bump to 3-5 once on Creator/Pro tier.
export const MAX_VOICES_PER_USER = 2;

export const isCloningEnabled = (): boolean =>
  process.env.GRIFON_VOICE_CLONING_ENABLED === 'true';

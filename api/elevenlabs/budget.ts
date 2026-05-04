import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromAccessToken } from '../_lib/supabaseAdmin.js';
import { getUserPlan } from '../_lib/userPlan.js';
import {
  TTS_DAILY,
  STS_DAILY,
  CLONE_DAILY,
  DAILY_WINDOW_SECONDS,
  ttsDailyKey,
  stsDailyKey,
  cloneDailyKey,
  peekQuota,
} from '../_lib/quota.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const authz = req.headers.authorization;
  const token = authz?.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_bearer_token' });

  const user = await getUserFromAccessToken(token);
  if (!user) return res.status(401).json({ error: 'invalid_token' });

  const plan = await getUserPlan(user.id);

  const [tts, sts, clone] = await Promise.all([
    peekQuota(ttsDailyKey(user.id), TTS_DAILY[plan], DAILY_WINDOW_SECONDS),
    peekQuota(stsDailyKey(user.id), STS_DAILY[plan], DAILY_WINDOW_SECONDS),
    peekQuota(cloneDailyKey(user.id), CLONE_DAILY[plan], DAILY_WINDOW_SECONDS),
  ]);

  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).json({ plan, tts, sts, clone });
}

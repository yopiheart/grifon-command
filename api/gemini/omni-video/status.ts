import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromAccessToken } from '../../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../../_lib/rateLimit.js';
import { isOmniBetaAllowed } from '../../_lib/omniBeta.js';

// api/gemini/omni-video/status.ts — cheap visibility probe for the Omni Edit
// Styles picker. The client calls this on mount to decide whether to SHOW the
// STYLE row (avoids layout pop-in and doomed passes). It is NOT the wall: the
// fire path (api/gemini/omni-video.ts) still enforces plan/quota/beta for real.
// Mirrors consume.ts for auth/method/error shape. No plan or quota check here.

const STATUS_LIMIT = 30;
const STATUS_WINDOW_SECONDS = 60;

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

  const allowed = await rateLimitCheck(`omni:status:${user.id}`, STATUS_LIMIT, STATUS_WINDOW_SECONDS);
  if (!allowed) {
    res.setHeader('Retry-After', String(STATUS_WINDOW_SECONDS));
    return res.status(429).json({
      error: 'rate_limited',
      scope: 'omni-status',
      retry_after_seconds: STATUS_WINDOW_SECONDS,
    });
  }

  const enabled = process.env.OMNI_STYLES_ENABLED === 'true';
  const betaAllowed = isOmniBetaAllowed(process.env.OMNI_STYLES_BETA_ALLOWLIST, user);
  const available = enabled && betaAllowed;

  return res.status(200).json({
    available,
    ...(available
      ? {}
      : { reason: enabled ? 'beta_allowlist' : 'omni_styles_disabled' }),
  });
}

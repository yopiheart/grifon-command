import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getUserFromAccessToken } from '../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../_lib/rateLimit.js';
import { loadFixtureVideoBytes } from '../_lib/companionFixtureVideo.js';
import { validateCloudFixtureResultReceipt } from '../../services/companionFixtureResults.js';
import { FIXTURE_VIDEO_MANIFEST } from '../../services/companionFixtureVideo.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const requestId = req.query.requestId;
  if (typeof requestId !== 'string' || !/^[a-f0-9]{64}$/.test(requestId)) return res.status(400).json({ error: 'invalid_fixture_request' });
  const authz = req.headers.authorization;
  const token = typeof authz === 'string' && authz.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_bearer_token' });
  try {
    const user = await getUserFromAccessToken(token);
    if (!user) return res.status(401).json({ error: 'invalid_token' });
    if (!await rateLimitCheck(`companion:fixture-video:${user.id}`, 30, 60)) {
      res.setHeader('Retry-After', '60');
      return res.status(429).json({ error: 'rate_limited', retry_after_seconds: 60 });
    }
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const publicKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !publicKey) return res.status(503).json({ error: 'fixture_result_unavailable' });
    // A request-local user JWT preserves auth.uid() and the pilot authorization
    // inside the read-only RPC; a service-role RPC would lose that user context.
    const client = createClient(url, publicKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await client.rpc('grifon_fixture_result_get', { p_request_id: requestId });
    if (error) return res.status(503).json({ error: 'fixture_result_unavailable' });
    if (data === null) return res.status(404).json({ error: 'fixture_result_not_found' });
    const receipt = await validateCloudFixtureResultReceipt(data, user.id);
    if (receipt.requestId !== requestId) return res.status(502).json({ error: 'invalid_fixture_result' });
    if (receipt.status !== 'READY') return res.status(409).json({ error: 'fixture_result_not_ready' });
    const bytes = await loadFixtureVideoBytes();
    res.setHeader('Content-Type', FIXTURE_VIDEO_MANIFEST.mimeType);
    res.setHeader('Content-Length', String(bytes.length));
    res.setHeader('Content-Disposition', `inline; filename="grifon-fixture-${requestId.slice(0, 12)}.mp4"`);
    return res.status(200).send(bytes);
  } catch {
    return res.status(503).json({ error: 'fixture_media_unavailable' });
  }
}

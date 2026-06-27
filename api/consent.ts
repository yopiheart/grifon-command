import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getSupabaseAdmin, getUserFromAccessToken } from './_lib/supabaseAdmin.js';
import { rateLimitCheck } from './_lib/rateLimit.js';
import { POLICY_VERSION, isKnownPolicyVersion } from '../services/consentConstants.js';

// Marketing / retargeting consent endpoint. Records the server-stamped
// record-of-consent for sharing a hashed email (PII) with advertising partners
// (Meta Custom Audiences) — a DIFFERENT legal act from the device-level pixel
// cookie banner. Writes go through the service role here; the client may only
// READ its own row (RLS). See workflows/consent_capture_plan.md.
//
// The client NEVER asserts its own consent state — it sends only the action;
// the timestamp, IP, and policy_version are stamped here, server-side.

const Body = z.object({
  action: z.enum(['grant', 'withdraw']),
  // Optional ACCURACY hint for the signup-reconcile grant: the policy version the
  // user saw at signup. Never trusted blindly — validated against the published
  // allowlist below; anything unknown falls back to the current POLICY_VERSION.
  policy_version: z.string().max(40).optional(),
});

type AuthedUser = { id: string; email: string | null };

async function enforceRateLimit(
  res: VercelResponse,
  bucket: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const allowed = await rateLimitCheck(bucket, limit, windowSeconds);
  if (!allowed) {
    res.setHeader('Retry-After', String(windowSeconds));
    res.status(429).json({ error: 'rate_limited' });
    return false;
  }
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const authz = req.headers.authorization;
  const token = authz?.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_bearer_token' });
  const user = (await getUserFromAccessToken(token)) as AuthedUser | null;
  if (!user) return res.status(401).json({ error: 'invalid_token' });

  const parsed = Body.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
  }
  const { action } = parsed.data;
  // Stamp the user-asserted signup-time version only if it's one we actually
  // published; otherwise the current policy. This keeps a forged/garbage version
  // out of the legal record while preserving the accurate historical version.
  const grantVersion = isKnownPolicyVersion(parsed.data.policy_version)
    ? parsed.data.policy_version
    : POLICY_VERSION;

  if (!(await enforceRateLimit(res, `consent:${user.id}`, 20, 60))) return;

  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();
  // Supporting metadata only — the proof-of-consent is the server-stamped
  // timestamp + policy_version + recorded action, not the (spoofable) IP.
  const consentIp =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ?? null;

  try {
    if (action === 'grant') {
      const { error } = await admin.from('marketing_consent').upsert(
        {
          user_id: user.id,
          consent_at: now,
          consent_ip: consentIp,
          withdrawn_at: null,
          policy_version: grantVersion,
          updated_at: now,
        },
        { onConflict: 'user_id' }
      );
      if (error) {
        console.error('[api/consent grant] db error:', error.message);
        return res.status(500).json({ error: 'db_write_failed' });
      }
      return res.status(200).json({
        granted: true,
        consentAt: now,
        withdrawnAt: null,
        policyVersion: grantVersion,
      });
    }

    // action === 'withdraw' — stamp withdrawn_at but PRESERVE the historical
    // consent_at on any existing row (legal trail). Update first; only insert a
    // fresh withdrawn row if the user never had one (an explicit opt-out signal).
    const stampWithdrawal = () =>
      admin
        .from('marketing_consent')
        .update({ withdrawn_at: now, updated_at: now })
        .eq('user_id', user.id)
        .select('consent_at, policy_version');

    const { data: updated, error: updateError } = await stampWithdrawal();
    if (updateError) {
      console.error('[api/consent withdraw] db update error:', updateError.message);
      return res.status(500).json({ error: 'db_write_failed' });
    }

    let row = updated?.[0] ?? null;
    if (!updated || updated.length === 0) {
      const { error: insertError } = await admin.from('marketing_consent').insert({
        user_id: user.id,
        consent_at: null,
        withdrawn_at: now,
        policy_version: POLICY_VERSION,
        updated_at: now,
      });
      if (insertError) {
        // 23505 = unique_violation: a concurrent grant/withdraw won the race and
        // created the row between our update and insert. Re-stamp the withdrawal
        // on the now-existing row instead of 500-ing. Any other error is real.
        if ((insertError as { code?: string }).code === '23505') {
          const { data: retried, error: retryError } = await stampWithdrawal();
          if (retryError) {
            console.error('[api/consent withdraw] db retry error:', retryError.message);
            return res.status(500).json({ error: 'db_write_failed' });
          }
          row = retried?.[0] ?? null;
        } else {
          console.error('[api/consent withdraw] db insert error:', insertError.message);
          return res.status(500).json({ error: 'db_write_failed' });
        }
      }
    }

    return res.status(200).json({
      granted: false,
      consentAt: row?.consent_at ?? null,
      withdrawnAt: now,
      policyVersion: row?.policy_version ?? POLICY_VERSION,
    });
  } catch (err: any) {
    console.error('[api/consent] error:', err?.message ?? 'unknown');
    return res.status(500).json({ error: 'consent_write_failed' });
  }
}

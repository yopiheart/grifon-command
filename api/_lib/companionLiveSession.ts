import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, getUserFromAccessToken } from './supabaseAdmin.js';

interface IssuanceCap {
  limit: number;
  windowSeconds: number;
}

export interface CompanionLiveSessionPolicy {
  model: string;
  tokenLifetimeMs: number;
  newSessionLifetimeMs: number;
  issuanceLeaseSeconds: number;
  mintTimeoutMs: number;
  requestTimeoutMs: number;
  burst: IssuanceCap;
  userDaily: IssuanceCap;
  globalDaily: IssuanceCap;
}

export interface CompanionLiveMintRequest {
  model: string;
  expireTime: string;
  newSessionExpireTime: string;
  signal: AbortSignal;
}

interface CompanionLiveSessionDependencies {
  policy: CompanionLiveSessionPolicy;
  mintToken: (request: CompanionLiveMintRequest) => Promise<unknown>;
  verifyAccessToken?: typeof getUserFromAccessToken;
  claimRateLimit?: (key: string, limit: number, windowSeconds: number) => PromiseLike<unknown>;
  now?: () => number;
}

class IssuanceDeadline extends Error {}

function validPolicy(policy: CompanionLiveSessionPolicy): boolean {
  const positiveInteger = (value: number) => Number.isSafeInteger(value) && value > 0;
  const validCap = (cap: IssuanceCap) => positiveInteger(cap.limit) && positiveInteger(cap.windowSeconds);
  return typeof policy.model === 'string' && policy.model.trim().length > 0 &&
    positiveInteger(policy.tokenLifetimeMs) && positiveInteger(policy.newSessionLifetimeMs) &&
    policy.newSessionLifetimeMs <= policy.tokenLifetimeMs &&
    positiveInteger(policy.issuanceLeaseSeconds) && policy.issuanceLeaseSeconds * 1_000 > policy.tokenLifetimeMs &&
    positiveInteger(policy.mintTimeoutMs) && positiveInteger(policy.requestTimeoutMs) &&
    policy.mintTimeoutMs <= policy.requestTimeoutMs && policy.requestTimeoutMs < 55_000 &&
    validCap(policy.burst) && validCap(policy.userDaily) && validCap(policy.globalDaily);
}

function emptyBody(body: unknown): boolean {
  return body !== null && typeof body === 'object' && !Array.isArray(body) &&
    Object.getPrototypeOf(body) === Object.prototype && Reflect.ownKeys(body).length === 0;
}

function credentialName(value: unknown): string | null {
  if (!value || typeof value !== 'object' || !('name' in value)) return null;
  const name = value.name;
  return typeof name === 'string' && name.length > 'auth_tokens/'.length && name.length <= 16_384 &&
    name.startsWith('auth_tokens/') && !/[\s\u0000-\u001f\u007f]/.test(name) ? name : null;
}

export function createCompanionLiveSessionHandler(dependencies: CompanionLiveSessionDependencies) {
  const { policy, mintToken, verifyAccessToken = getUserFromAccessToken, now = Date.now } = dependencies;
  const claimRateLimit = dependencies.claimRateLimit ?? ((key, limit, windowSeconds) =>
    getSupabaseAdmin().rpc('rate_limit_check', { p_key: key, p_limit: limit, p_window_seconds: windowSeconds }));

  return async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'method_not_allowed' });
    }
    if (!emptyBody(req.body)) return res.status(400).json({ error: 'invalid_request' });
    const authorization = req.headers.authorization;
    const bearer = typeof authorization === 'string' ? /^Bearer ([^\s]+)$/i.exec(authorization) : null;
    if (!bearer) return res.status(401).json({ error: 'unauthorized' });
    if (!validPolicy(policy)) return res.status(503).json({ error: 'live_voice_unavailable' });

    const controller = new AbortController();
    const requestDeadline = now() + policy.requestTimeoutMs;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new IssuanceDeadline()); }, policy.requestTimeoutMs);
    });
    const run = async <T>(operation: () => PromiseLike<T>): Promise<T> => {
      if (controller.signal.aborted || now() >= requestDeadline) throw new IssuanceDeadline();
      const result = await Promise.race([Promise.resolve().then(operation), deadline]);
      if (controller.signal.aborted || now() >= requestDeadline) throw new IssuanceDeadline();
      return result;
    };

    try {
      let user: Awaited<ReturnType<typeof getUserFromAccessToken>>;
      try { user = await run(() => verifyAccessToken(bearer[1])); }
      catch (error) {
        if (error instanceof IssuanceDeadline) throw error;
        return res.status(503).json({ error: 'live_voice_unavailable' });
      }
      if (!user || typeof user.id !== 'string' || !user.id) return res.status(401).json({ error: 'unauthorized' });

      // Anchor both provider deadlines before any durable claim; a slow mint never extends the lease.
      const issuedAt = now();
      const expiresAt = issuedAt + policy.tokenLifetimeMs;
      const newSessionExpiresAt = issuedAt + policy.newSessionLifetimeMs;
      const claims = [
        { key: `companion:live:burst:${user.id}`, ...policy.burst, error: 'live_voice_rate_limited' },
        { key: `companion:live:lease:${user.id}`, limit: 1, windowSeconds: policy.issuanceLeaseSeconds, error: 'live_voice_session_active' },
        { key: `companion:live:daily:${user.id}`, ...policy.userDaily, error: 'live_voice_daily_limit' },
        { key: 'companion:live:daily:global', ...policy.globalDaily, error: 'live_voice_daily_limit' },
      ];
      for (const claim of claims) {
        let result: unknown;
        try { result = await run(() => claimRateLimit(claim.key, claim.limit, claim.windowSeconds)); }
        catch (error) {
          if (error instanceof IssuanceDeadline) throw error;
          return res.status(503).json({ error: 'live_voice_unavailable' });
        }
        if (!result || typeof result !== 'object' || !('data' in result) || !('error' in result) ||
          result.error !== null || typeof result.data !== 'boolean') {
          return res.status(503).json({ error: 'live_voice_unavailable' });
        }
        if (!result.data) {
          res.setHeader('Retry-After', String(claim.windowSeconds));
          return res.status(429).json({ error: claim.error, retry_after_seconds: claim.windowSeconds });
        }
      }
      if (now() >= newSessionExpiresAt) throw new IssuanceDeadline();

      let mintTimer: ReturnType<typeof setTimeout> | undefined;
      try {
        const mintDeadline = new Promise<never>((_, reject) => {
          mintTimer = setTimeout(() => { controller.abort(); reject(new IssuanceDeadline()); }, policy.mintTimeoutMs);
        });
        const token = await run(() => Promise.race([
          mintToken({ model: policy.model, expireTime: new Date(expiresAt).toISOString(), newSessionExpireTime: new Date(newSessionExpiresAt).toISOString(), signal: controller.signal }),
          mintDeadline,
        ]));
        if (now() >= newSessionExpiresAt) throw new IssuanceDeadline();
        const credential = credentialName(token);
        if (!credential) return res.status(502).json({ error: 'live_voice_provider_error' });
        return res.status(200).json({ credential, model: policy.model, expiresAt });
      } catch (error) {
        if (error instanceof IssuanceDeadline) throw error;
        return res.status(502).json({ error: 'live_voice_provider_error' });
      } finally {
        if (mintTimer !== undefined) clearTimeout(mintTimer);
      }
    } catch {
      return res.status(503).json({ error: 'live_voice_timeout' });
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      controller.abort();
    }
  };
}

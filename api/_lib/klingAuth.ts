import crypto from 'node:crypto';

// Kling API uses HS256 JWT (Access Key as iss, Secret Key as HMAC secret).
// Token TTL is 30min sliding; we cache + reuse and re-sign ~2min before expiry.
// Phase 1 smoke verified payload shape: { iss, exp, nbf }.

const TOKEN_TTL_SECONDS = 1800;
const REFRESH_BUFFER_SECONDS = 120;

let _cached: { jwt: string; expiresAt: number } | null = null;

const b64url = (data: string | Buffer): string =>
  Buffer.from(data).toString('base64url');

function sign(ak: string, sk: string): { jwt: string; expiresAt: number } {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: ak, exp: now + TOKEN_TTL_SECONDS, nbf: now - 5 };
  const headerB64 = b64url(JSON.stringify(header));
  const payloadB64 = b64url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const sig = crypto.createHmac('sha256', sk).update(signingInput).digest('base64url');
  return { jwt: `${signingInput}.${sig}`, expiresAt: now + TOKEN_TTL_SECONDS };
}

export function getKlingAccessToken(): string {
  const ak = process.env.KLING_ACCESS_KEY;
  const sk = process.env.KLING_SECRET_KEY;
  if (!ak || !sk) {
    throw new Error(
      'KLING_NOT_CONFIGURED: set KLING_ACCESS_KEY and KLING_SECRET_KEY (server-side, no VITE_ prefix).'
    );
  }

  const now = Math.floor(Date.now() / 1000);
  if (_cached && _cached.expiresAt - REFRESH_BUFFER_SECONDS > now) {
    return _cached.jwt;
  }
  _cached = sign(ak, sk);
  return _cached.jwt;
}

/**
 * Clears the module-scope JWT cache. Called by the proxy when Kling returns
 * 401 "Authorization is expired" (code 1004) so the next getKlingAccessToken()
 * call signs fresh. Defensive — covers clock-skew, sliding-TTL surprises, and
 * any future Kling-side TTL changes that diverge from our `expiresAt` math.
 */
export function invalidateKlingAccessToken(): void {
  _cached = null;
}

export const KLING_API_BASE = 'https://api.klingai.com';

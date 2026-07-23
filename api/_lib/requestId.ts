import type { VercelRequest } from '@vercel/node';
import { randomUUID } from 'node:crypto';

// Request-id helper (P1 observability). Prefer a caller-supplied `x-request-id`
// so a client-initiated trace survives the proxy hop; otherwise mint a fresh id.
// A helper module, NOT a route — imported by the handlers that echo `x-request-id`
// and thread `rid` into their log objects.

const RID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Resolve the request id for this call. Returns the first `x-request-id` header
 * value when it matches the safe charset (/^[A-Za-z0-9_-]{1,64}$/), else a fresh
 * randomUUID(). Never throws; garbage/oversized headers are replaced, not echoed.
 */
export function getRequestId(req: VercelRequest): string {
  const raw = req.headers['x-request-id'];
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  if (typeof candidate === 'string' && RID_RE.test(candidate)) return candidate;
  return randomUUID();
}

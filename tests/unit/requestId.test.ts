import { describe, it, expect } from 'vitest';
import type { VercelRequest } from '@vercel/node';

// P1 request-id propagation helper. A valid caller-supplied x-request-id survives
// the proxy hop; anything unsafe (bad charset, too long, array, absent) is replaced
// by a fresh UUID so the trace id is always present and always safe to echo.

import { getRequestId } from '../../api/_lib/requestId.js';

const req = (headers: Record<string, unknown>) => ({ headers } as unknown as VercelRequest);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('getRequestId', () => {
  it('echoes a valid x-request-id header', () => {
    expect(getRequestId(req({ 'x-request-id': 'abc_DEF-123' }))).toBe('abc_DEF-123');
  });

  it('takes the first value when the header is an array', () => {
    expect(getRequestId(req({ 'x-request-id': ['first-id', 'second-id'] }))).toBe('first-id');
  });

  it('replaces a garbage header (illegal chars) with a fresh UUID', () => {
    expect(getRequestId(req({ 'x-request-id': 'has spaces & symbols!' }))).toMatch(UUID_RE);
  });

  it('replaces an over-length header (>64 chars) with a fresh UUID', () => {
    expect(getRequestId(req({ 'x-request-id': 'a'.repeat(65) }))).toMatch(UUID_RE);
  });

  it('mints a fresh UUID when the header is absent', () => {
    expect(getRequestId(req({}))).toMatch(UUID_RE);
  });
});

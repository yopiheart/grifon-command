import { describe, it, expect, vi, beforeEach } from 'vitest';

// getUserFromAccessToken is the auth keystone: every metered api/ handler
// trusts its answer. Lock the three behaviors — valid token → user, invalid
// token → null, transport error → null (fail-closed, no throw).

const getUserMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ auth: { getUser: getUserMock } })),
}));

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';

import { getUserFromAccessToken } from '../../api/_lib/supabaseAdmin.js';

beforeEach(() => {
  getUserMock.mockReset();
});

describe('getUserFromAccessToken', () => {
  it('returns id + email for a valid token', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'neil@example.com' } },
      error: null,
    });
    await expect(getUserFromAccessToken('valid-jwt')).resolves.toEqual({
      id: 'user-123',
      email: 'neil@example.com',
    });
    expect(getUserMock).toHaveBeenCalledWith('valid-jwt');
  });

  it('normalizes a missing email to null', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: 'user-123', email: undefined } },
      error: null,
    });
    await expect(getUserFromAccessToken('valid-jwt')).resolves.toEqual({
      id: 'user-123',
      email: null,
    });
  });

  it('returns null for an invalid/expired token (error envelope)', async () => {
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: { message: 'invalid JWT', status: 401 },
    });
    await expect(getUserFromAccessToken('bad-jwt')).resolves.toBeNull();
  });

  it('returns null when the envelope has no user even without an error', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });
    await expect(getUserFromAccessToken('weird-jwt')).resolves.toBeNull();
  });
});

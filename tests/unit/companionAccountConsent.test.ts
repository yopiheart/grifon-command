import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getMarketingConsent } from '../../services/consentService.js';

const {
  getSupabaseMock,
  getSessionMock,
  fromMock,
  selectMock,
  eqMock,
  maybeSingleMock,
} = vi.hoisted(() => ({
  getSupabaseMock: vi.fn(),
  getSessionMock: vi.fn(),
  fromMock: vi.fn(),
  selectMock: vi.fn(),
  eqMock: vi.fn(),
  maybeSingleMock: vi.fn(),
}));

vi.mock('../../services/supabaseClient.js', () => ({
  getSupabase: getSupabaseMock,
}));

beforeEach(() => {
  vi.resetAllMocks();
  getSupabaseMock.mockReturnValue({
    auth: { getSession: getSessionMock },
    from: fromMock,
  });
  getSessionMock.mockResolvedValue({
    data: { session: { user: { id: 'consent-user' } } },
    error: null,
  });
  fromMock.mockReturnValue({ select: selectMock });
  selectMock.mockReturnValue({ eq: eqMock });
  eqMock.mockReturnValue({ maybeSingle: maybeSingleMock });
  maybeSingleMock.mockResolvedValue({ data: null, error: null });
});

describe('account consent reads', () => {
  it('returns the granted consent record in strict mode', async () => {
    maybeSingleMock.mockResolvedValue({
      data: {
        consent_at: '2026-10-07T01:00:00.000Z',
        withdrawn_at: null,
        policy_version: '2026-09-01',
      },
      error: null,
    });

    await expect(getMarketingConsent({ strict: true })).resolves.toEqual({
      granted: true,
      consentAt: '2026-10-07T01:00:00.000Z',
      withdrawnAt: null,
      policyVersion: '2026-09-01',
    });
    expect(fromMock).toHaveBeenCalledWith('marketing_consent');
    expect(eqMock).toHaveBeenCalledWith('user_id', 'consent-user');
  });

  it('treats a missing consent row as not granted in strict mode', async () => {
    await expect(getMarketingConsent({ strict: true })).resolves.toEqual({
      granted: false,
      consentAt: null,
      withdrawnAt: null,
      policyVersion: null,
    });
  });

  it('rejects a signed-out strict read before querying consent', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });

    await expect(getMarketingConsent({ strict: true })).rejects.toThrow('NOT_AUTHENTICATED');
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('surfaces a session error in strict mode before querying consent', async () => {
    const sessionError = new Error('Session lookup unavailable');
    getSessionMock.mockResolvedValue({ data: { session: null }, error: sessionError });

    await expect(getMarketingConsent({ strict: true })).rejects.toBe(sessionError);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('surfaces a consent query error in strict mode', async () => {
    const queryError = new Error('Consent lookup unavailable');
    maybeSingleMock.mockResolvedValue({ data: null, error: queryError });

    await expect(getMarketingConsent({ strict: true })).rejects.toBe(queryError);
  });

  it('surfaces a thrown SDK error in strict mode', async () => {
    const sdkError = new Error('Supabase SDK unavailable');
    getSupabaseMock.mockImplementation(() => { throw sdkError; });

    await expect(getMarketingConsent({ strict: true })).rejects.toBe(sdkError);
  });

  it.each(['session', 'query', 'SDK'] as const)(
    'preserves the legacy not-granted fallback for a %s error',
    async (failure) => {
      const serviceError = new Error('Consent service unavailable');
      if (failure === 'session') {
        getSessionMock.mockResolvedValue({ data: { session: null }, error: serviceError });
      } else if (failure === 'query') {
        maybeSingleMock.mockResolvedValue({ data: null, error: serviceError });
      } else {
        getSupabaseMock.mockImplementation(() => { throw serviceError; });
      }

      await expect(getMarketingConsent()).resolves.toEqual({
        granted: false,
        consentAt: null,
        withdrawnAt: null,
        policyVersion: null,
      });
    },
  );
});

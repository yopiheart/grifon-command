import { describe, it, expect } from 'vitest';
import { isOmniBetaAllowed } from '../../api/_lib/omniBeta.js';

// Beta allowlist gate for the Omni Edit Styles feature (api/_lib/omniBeta.ts).
// PURE — encodes the deploy contract: an unset/empty var means NO beta wall
// (public), a set var scopes the feature to a comma-separated cohort matched by
// email OR user id, case-insensitively.

const user = { id: 'uid-123', email: 'Neil@Example.com' };

describe('isOmniBetaAllowed — no wall when the var is blank', () => {
  it('allows everyone when the allowlist is undefined', () => {
    expect(isOmniBetaAllowed(undefined, user)).toBe(true);
  });

  it('allows everyone when the allowlist is empty', () => {
    expect(isOmniBetaAllowed('', user)).toBe(true);
  });

  it('allows everyone when the allowlist is whitespace-only', () => {
    expect(isOmniBetaAllowed('   ', user)).toBe(true);
  });

  it('allows everyone when the allowlist is only commas/whitespace', () => {
    expect(isOmniBetaAllowed(' , , ', user)).toBe(true);
  });
});

describe('isOmniBetaAllowed — cohort matching', () => {
  it('matches an email case-insensitively', () => {
    expect(isOmniBetaAllowed('neil@example.com', user)).toBe(true);
    expect(isOmniBetaAllowed('NEIL@EXAMPLE.COM', user)).toBe(true);
  });

  it('matches a user id', () => {
    expect(isOmniBetaAllowed('uid-123', user)).toBe(true);
    expect(isOmniBetaAllowed('UID-123', user)).toBe(true);
  });

  it('trims entries and matches inside a multi-entry list', () => {
    expect(isOmniBetaAllowed(' someone@else.com , neil@example.com ', user)).toBe(true);
    expect(isOmniBetaAllowed('a@b.com,uid-123,c@d.com', user)).toBe(true);
  });

  it('rejects a non-member', () => {
    expect(isOmniBetaAllowed('someone@else.com,uid-999', user)).toBe(false);
  });

  it('rejects on id-only match when the user has no email', () => {
    expect(isOmniBetaAllowed('other@x.com', { id: 'uid-999', email: null })).toBe(false);
    expect(isOmniBetaAllowed('uid-999', { id: 'uid-999', email: null })).toBe(true);
  });
});

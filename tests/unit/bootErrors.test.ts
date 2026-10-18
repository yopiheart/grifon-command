import { describe, expect, it } from 'vitest';
import { isExpectedBootConsoleError } from '../support/bootErrors.js';

describe('public-route boot error classification', () => {
  it.each([
    ['Failed to fetch dynamically imported module: http://localhost:5173/components/PrivacyPolicy.tsx', 'http://localhost:5173/'],
    ['Failed to load resource: net::ERR_CONNECTION_REFUSED', 'http://localhost:5173/assets/app.js'],
    ['supabase initialization broke the application', 'http://localhost:5173/App.tsx'],
    ['TypeError: Failed to fetch', ''],
    ['Failed to load resource: net::ERR_CONNECTION_REFUSED', 'http://localhost:54321.evil.invalid/auth'],
    ['Failed to load resource: net::ERR_CONNECTION_REFUSED', 'http://localhost:54321@evil.invalid/auth'],
  ])('retains application or unattributed error: %s (%s)', (message, location) => {
    expect(isExpectedBootConsoleError(message, location)).toBe(false);
  });

  it('ignores a network failure attributed to the configured dummy auth server', () => {
    expect(isExpectedBootConsoleError(
      'Failed to load resource: net::ERR_CONNECTION_REFUSED',
      'http://localhost:54321/auth/v1/token',
    )).toBe(true);
  });

  it('retains a non-network error even at the dummy auth origin', () => {
    expect(isExpectedBootConsoleError('Unhandled application error', 'http://localhost:54321/')).toBe(false);
  });
});

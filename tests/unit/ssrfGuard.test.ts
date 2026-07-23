import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { assertSafeMediaUrl } from '../../api/_lib/ssrfGuard.js';

const originalAllowlist = process.env.MEDIA_HOST_ALLOWLIST;

beforeEach(() => {
  delete process.env.MEDIA_HOST_ALLOWLIST;
});

afterEach(() => {
  if (originalAllowlist === undefined) {
    delete process.env.MEDIA_HOST_ALLOWLIST;
  } else {
    process.env.MEDIA_HOST_ALLOWLIST = originalAllowlist;
  }
});

describe('assertSafeMediaUrl', () => {
  it('allows a normal public https URL', () => {
    expect(() => assertSafeMediaUrl('https://cdn.example.com/a.mp4')).not.toThrow();
  });

  it('rejects a non-https URL', () => {
    expect(() => assertSafeMediaUrl('http://cdn.example.com/a.mp4'))
      .toThrow('ssrf_blocked: non-https scheme');
  });

  it.each([
    'https://169.254.169.254/x',
    'https://127.0.0.1/x',
    'https://10.0.0.5/x',
    'https://172.16.0.5/x',
    'https://192.168.1.10/x',
    'https://0.0.0.0/x',
    'https://[::1]/x',
    'https://[fe80::1]/x',
    'https://[fc00::1]/x',
    'https://localhost/x',
    'https://foo.internal/x',
    'https://metadata.google.internal/x',
  ])('rejects private or internal host %s', (url) => {
    expect(() => assertSafeMediaUrl(url))
      .toThrow('ssrf_blocked: private/internal host');
  });

  it('enforces MEDIA_HOST_ALLOWLIST host suffixes', () => {
    process.env.MEDIA_HOST_ALLOWLIST = 'supabase.co,r2.cloudflarestorage.com';

    expect(() => assertSafeMediaUrl('https://evil.example.com/x'))
      .toThrow('ssrf_blocked: host not in MEDIA_HOST_ALLOWLIST');
    expect(() => assertSafeMediaUrl('https://proj.supabase.co/x')).not.toThrow();
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { assertSafeMediaUrl } from '../../api/_lib/ssrfGuard.js';
import { createFixtureMediaUrlGuard } from '../support/fixtureMediaUrlGuard.js';

afterEach(() => vi.unstubAllEnvs());

describe('fixture media URL guard', () => {
  const origin = 'http://127.0.0.1:43210';

  it('permits only the active fixture origin without delegating it', () => {
    const realGuard = vi.fn(assertSafeMediaUrl);
    const guard = createFixtureMediaUrlGuard(() => origin, realGuard);
    expect(() => guard(`${origin}/scene0.mp4`)).not.toThrow();
    expect(() => guard(`${origin}/voice0.mp3?fixture=1`)).not.toThrow();
    expect(realGuard).not.toHaveBeenCalled();
  });

  it('delegates public URLs and retains the production allowlist', () => {
    vi.stubEnv('MEDIA_HOST_ALLOWLIST', 'cdn.example.com');
    const realGuard = vi.fn(assertSafeMediaUrl);
    const guard = createFixtureMediaUrlGuard(() => origin, realGuard);
    expect(() => guard('https://cdn.example.com/scene.mp4')).not.toThrow();
    expect(() => guard('https://other.example.com/scene.mp4')).toThrow('ssrf_blocked: host not in MEDIA_HOST_ALLOWLIST');
    expect(realGuard.mock.calls).toEqual([
      ['https://cdn.example.com/scene.mp4'], ['https://other.example.com/scene.mp4'],
    ]);
  });

  it.each([
    'http://127.0.0.1:43211/scene.mp4',
    'https://127.0.0.1:43210/scene.mp4',
    'http://localhost:43210/scene.mp4',
    'http://127.0.0.2:43210/scene.mp4',
    'http://127.0.0.1:43210.evil.example/scene.mp4',
    'http://127.0.0.1:43210@evil.example/scene.mp4',
    'http://user@127.0.0.1:43210/scene.mp4',
    'https://169.254.169.254/metadata',
    'file:///tmp/scene.mp4',
    'invalid URL',
  ])('delegates and rejects non-fixture URL %s', (url) => {
    const realGuard = vi.fn(assertSafeMediaUrl);
    const guard = createFixtureMediaUrlGuard(() => origin, realGuard);
    expect(() => guard(url)).toThrow('ssrf_blocked:');
    expect(realGuard).toHaveBeenCalledExactlyOnceWith(url);
  });

  it('does not allow localhost before setup or after fixture teardown', () => {
    let activeOrigin: string | undefined;
    const realGuard = vi.fn(assertSafeMediaUrl);
    const guard = createFixtureMediaUrlGuard(() => activeOrigin, realGuard);
    expect(() => guard(`${origin}/scene.mp4`)).toThrow('ssrf_blocked:');
    activeOrigin = origin;
    expect(() => guard(`${origin}/scene.mp4`)).not.toThrow();
    activeOrigin = undefined;
    expect(() => guard(`${origin}/scene.mp4`)).toThrow('ssrf_blocked:');
    expect(realGuard).toHaveBeenCalledTimes(2);
  });
});

/** Permit this harness's HTTP fixture server; preserve the real guard elsewhere. */
export function createFixtureMediaUrlGuard(
  fixtureOrigin: () => string | undefined,
  assertSafeMediaUrl: (url: string) => void,
): (url: string) => void {
  return (url) => {
    const origin = fixtureOrigin();
    if (origin) {
      try {
        const parsed = new URL(url);
        if (parsed.origin === origin && !parsed.username && !parsed.password) return;
      } catch {
        // Let the real guard reject malformed URLs with its own diagnostic.
      }
    }
    assertSafeMediaUrl(url);
  };
}

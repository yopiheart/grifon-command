import { describe, it, expect, beforeAll } from 'vitest';

// detectInitialRoute is ordered string matching (/billing/3ds-return must win
// over /billing/success-style prefixes, /checkout before /pricing fallthrough,
// unknown → landing). A reordered condition or a typo'd prefix silently
// strands users on the wrong page, so every path + edge case is locked here.
//
// detectInitialRoute reads window.location at call time and is guarded by
// `typeof window !== 'undefined'`, so we stub a minimal window and mutate
// location.pathname between assertions. The function lives in the
// dependency-free utils/routing.ts precisely so this import stays light.

const location = { pathname: '/', search: '', hash: '' };

let detectInitialRoute: typeof import('../../utils/routing.js').detectInitialRoute;
let ROUTE_PATHS: typeof import('../../utils/routing.js').ROUTE_PATHS;

beforeAll(async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window = { location };
  const mod = await import('../../utils/routing.js');
  detectInitialRoute = mod.detectInitialRoute;
  ROUTE_PATHS = mod.ROUTE_PATHS;
});

const at = (pathname: string) => {
  location.pathname = pathname;
  return detectInitialRoute();
};

describe('detectInitialRoute', () => {
  it('maps every canonical ROUTE_PATHS entry back to its route', () => {
    for (const [route, path] of Object.entries(ROUTE_PATHS)) {
      expect(at(path)).toBe(route);
    }
  });

  it('billing sub-routes win over their prefixes', () => {
    expect(at('/billing/3ds-return')).toBe('billing_3ds_return');
    expect(at('/billing/success')).toBe('billing_success');
    expect(at('/billing/cancel')).toBe('pricing'); // cancel returns to pricing
  });

  it('handles trailing slashes and sub-paths via prefix match', () => {
    expect(at('/app/')).toBe('app');
    expect(at('/pricing/annual')).toBe('pricing');
    expect(at('/billing/3ds-return/anything')).toBe('billing_3ds_return');
  });

  it('unknown and root paths fall back to landing', () => {
    expect(at('/')).toBe('landing');
    expect(at('/nonexistent')).toBe('landing');
    expect(at('/applications')).toBe('app'); // documents prefix-match looseness
  });
});

describe('ROUTE_PATHS parity', () => {
  it('covers all 10 routes with unique paths', () => {
    const paths = Object.values(ROUTE_PATHS);
    expect(paths.length).toBe(10);
    expect(new Set(paths).size).toBe(10);
  });
});

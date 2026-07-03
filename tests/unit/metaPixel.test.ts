// metaPixel is consent-gated and reads VITE_META_PIXEL_ID from import.meta.env
// at MODULE scope. vitest bakes import.meta.env per-module at transform time, so
// the deterministic test pixel id is injected via `define` in vitest.config.ts
// (vi.stubEnv only reaches process.env, and CI has no .env). Each test re-imports
// the module fresh (vi.resetModules + dynamic import) to reset the internal
// `initialized` flag. The suite runs in the `node` environment (no jsdom), so we
// install a minimal global `window` carrying a spy `fbq`. A pre-set window.fbq
// makes injectBaseSnippet short-circuit (it only wires the real loader — and
// touches document — when window.fbq is absent), letting us assert exact fbq
// call shapes without a DOM or the remote script.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let fbq: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  fbq = vi.fn();
  vi.stubGlobal('window', { fbq });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('metaPixel', () => {
  it('trackPixel is a no-op before initPixel', async () => {
    const { trackPixel } = await import('../../services/metaPixel.js');
    trackPixel('ViewContent', { content_name: 'pricing_plans' });
    expect(fbq).not.toHaveBeenCalled();
  });

  it('fires a plain 2-arg track call after init', async () => {
    const { initPixel, trackPixel } = await import('../../services/metaPixel.js');
    initPixel();
    fbq.mockClear(); // drop initPixel's own init + PageView
    trackPixel('InitiateCheckout', { value: 499, currency: 'PHP' });
    expect(fbq).toHaveBeenCalledTimes(1);
    expect(fbq).toHaveBeenCalledWith('track', 'InitiateCheckout', { value: 499, currency: 'PHP' });
  });

  it('passes eventId through as the fbq eventID option', async () => {
    const { initPixel, trackPixel } = await import('../../services/metaPixel.js');
    initPixel();
    fbq.mockClear();
    trackPixel('Purchase', { value: 999, currency: 'PHP' }, 'purchase:pi_123');
    expect(fbq).toHaveBeenCalledTimes(1);
    expect(fbq).toHaveBeenCalledWith(
      'track',
      'Purchase',
      { value: 999, currency: 'PHP' },
      { eventID: 'purchase:pi_123' },
    );
  });

  it('initPixel is idempotent — init + first PageView fire only once', async () => {
    const { initPixel } = await import('../../services/metaPixel.js');
    initPixel();
    initPixel();
    const initCalls = fbq.mock.calls.filter((c) => c[0] === 'init');
    const pageViewCalls = fbq.mock.calls.filter((c) => c[0] === 'track' && c[1] === 'PageView');
    expect(initCalls).toHaveLength(1);
    expect(pageViewCalls).toHaveLength(1);
  });
});

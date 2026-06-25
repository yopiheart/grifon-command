// Meta Pixel (fbq) loader for the Data-Driven Growth Loop (Phase 0).
//
// CONSENT-GATED: the fbq snippet is injected ONLY after the user accepts via the
// ConsentBanner. Nothing here runs at import time, so the pixel never touches
// first paint and never fires without consent. Uses VITE_META_PIXEL_ID (a public
// client-side id — safe to bundle; the CAPI access token is server-only and lives
// nowhere near this file).
//
// The browser fires PageView + Lead here; the authoritative Purchase is sent
// server-side via api/_lib/metaCapi.ts from the PayMongo webhook.

// Match the repo convention (services/supabaseClient.ts) — `import.meta.env` is
// not globally typed, so cast through `any`.
const PIXEL_ID = ((import.meta as any).env?.VITE_META_PIXEL_ID as string | undefined) ?? undefined;

let initialized = false;

type Fbq = ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string };

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

// Standard Meta base snippet, transcribed to TS. Injects the loader and queues
// calls until the async script resolves.
const injectBaseSnippet = (): void => {
  if (window.fbq) return;
  const n: Fbq = function (...args: unknown[]) {
    // @ts-expect-error - callMethod is attached by the async script once loaded.
    n.callMethod ? n.callMethod.apply(n, args) : n.queue!.push(args);
  } as Fbq;
  n.queue = [];
  n.loaded = true;
  n.version = '2.0';
  window.fbq = window.fbq || n;
  window._fbq = window._fbq || n;

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);
};

/**
 * Initialize the pixel and fire the first PageView. Idempotent and safe to call
 * repeatedly — only the first call injects + inits. No-op if the pixel id is not
 * configured (e.g. local dev without the env var).
 */
export const initPixel = (): void => {
  if (initialized || typeof window === 'undefined') return;
  if (!PIXEL_ID) {
    // Not configured — silently skip so dev without the env var still works.
    return;
  }
  injectBaseSnippet();
  window.fbq?.('init', PIXEL_ID);
  window.fbq?.('track', 'PageView');
  initialized = true;
};

/** Track a standard Meta event. No-op until initPixel() has run (post-consent). */
export const trackPixel = (event: string, params?: Record<string, unknown>): void => {
  if (!initialized || typeof window === 'undefined' || !window.fbq) return;
  window.fbq('track', event, params ?? {});
};

export const isPixelReady = (): boolean => initialized;

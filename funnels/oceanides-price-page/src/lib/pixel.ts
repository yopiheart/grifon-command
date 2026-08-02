// Meta Pixel — OFF unless `tracking.metaPixelId` is set in the config.
//
// The snippet is injected from here rather than hardcoded in the HTML entries so
// that an unconfigured funnel makes ZERO external requests: no CDN, no fbevents,
// nothing to consent to. Everything below is a no-op without an id.

type FbqFn = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  loaded?: boolean;
  version?: string;
};

declare global {
  interface Window {
    fbq?: FbqFn;
    _fbq?: FbqFn;
  }
}

const SCRIPT_SRC = 'https://connect.facebook.net/en_US/fbevents.js';

/** Injects + initialises the pixel. Safe to call on every page; no-op without an id. */
export const initPixel = (pixelId?: string): void => {
  if (!pixelId || window.fbq) return;

  const fbq: FbqFn = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue?.push(args);
  } as FbqFn;
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = '2.0';
  window.fbq = fbq;
  window._fbq = fbq;

  const script = document.createElement('script');
  script.async = true;
  script.src = SCRIPT_SRC;
  document.head.appendChild(script);

  fbq('init', pixelId);
  fbq('track', 'PageView');
};

// A conversion fires ONCE per submission, not once per page load. The thank-you
// page is a plain URL, so a refresh, a back-forward, or a bookmarked visit would
// otherwise send Meta a `Lead` that never happened — and `Lead` is the single
// event the campaign optimises on, so a padded count teaches the algorithm to
// chase the wrong people. submitLead drops a one-shot token before it navigates;
// the thank-you page spends it.
//
// FAILS OPEN on purpose: if sessionStorage is unavailable (private mode, blocked
// storage), we fire anyway. Losing the dedupe costs one duplicate. Losing the
// event costs the conversion, and the conversion is the whole point.
const LEAD_TOKEN = 'oceanides_lead_pending';

/** Call immediately before navigating to the thank-you page. */
export const markLeadPending = (): void => {
  try {
    window.sessionStorage.setItem(LEAD_TOKEN, '1');
  } catch {
    // No storage — trackLead fails open and fires regardless.
  }
};

/** Standard `Lead` event — fires once per real submission, never on a reload. */
export const trackLead = (pixelId?: string): void => {
  if (!pixelId || !window.fbq) return;

  let pending = true;
  try {
    pending = window.sessionStorage.getItem(LEAD_TOKEN) !== null;
    window.sessionStorage.removeItem(LEAD_TOKEN);
  } catch {
    pending = true;
  }
  if (!pending) return;

  window.fbq('track', 'Lead');
};

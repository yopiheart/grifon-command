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

/** Standard `Lead` event — fired on the thank-you page, i.e. only on real conversions. */
export const trackLead = (pixelId?: string): void => {
  if (!pixelId || !window.fbq) return;
  window.fbq('track', 'Lead');
};

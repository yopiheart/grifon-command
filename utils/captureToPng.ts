// Capture a styled DOM node to a PNG data URL via html2canvas.
//
// Reuses the proven pattern from components/BillingSuccess.tsx (the only other
// html2canvas caller): dynamic-import the lib (keeps it out of the main bundle),
// wait for fonts so text metrics are exact, then render. This is how the
// text-composited Image Ads Gen templates (Niche Callout / SaaS-Upsell / Product
// Lifestyle — see workflows/static_ad_swipe_file.md) turn branded React cards
// into downloadable creatives, because the Gemini image model is hard-blocked
// from rendering legible text (NO_TEXT_CONSTRAINT in services/geminiService.ts).
//
// Failure-safe like utils/watermark.ts: returns null on any error so the caller
// can fall back gracefully rather than crash the render.

export interface CaptureOptions {
  // Pixel multiplier for crispness. The node should already be sized to its
  // target export dimensions (e.g. 1080×1350 for 4:5); scale 2 yields a
  // retina-grade PNG that platforms downscale cleanly.
  scale?: number;
  // Canvas backdrop behind any transparent areas. Defaults to Grifon canvas.
  backgroundColor?: string;
}

export async function captureToPng(
  node: HTMLElement,
  { scale = 2, backgroundColor = '#09090B' }: CaptureOptions = {},
): Promise<string | null> {
  try {
    const { default: html2canvas } = await import('html2canvas');
    // Exact font metrics before measuring/rasterizing text (Inter/Geist/mono).
    if (document.fonts?.ready) await document.fonts.ready;

    const canvas = await html2canvas(node, {
      backgroundColor,
      scale,
      useCORS: true, // generated/background images are cross-origin data/remote URLs
      logging: false,
      // html2canvas paints text inside overflow-hidden boxes a touch low, which
      // half-clips `truncate` lines. Un-clip in the capture clone only (the
      // on-screen card is untouched). Same correction as BillingSuccess.
      onclone: (doc: Document) => {
        doc.querySelectorAll('.truncate').forEach((el) => {
          el.classList.remove('truncate');
          (el as HTMLElement).style.overflow = 'visible';
          (el as HTMLElement).style.whiteSpace = 'nowrap';
        });
      },
    });

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('[captureToPng] failed to rasterize node:', err);
    return null;
  }
}

// Pixel dimensions per ad aspect ratio (1080-wide baseline = IG/FB native).
// Templates render at these sizes so a single React card exports correctly for
// every placement (feed 4:5/1:1, stories/reels 9:16). See the Placement strategy
// in workflows/static_ad_swipe_file.md.
export const AD_RATIO_DIMENSIONS: Record<string, { w: number; h: number }> = {
  '4:5': { w: 1080, h: 1350 },
  '1:1': { w: 1080, h: 1080 },
  '9:16': { w: 1080, h: 1920 },
  '16:9': { w: 1920, h: 1080 },
};

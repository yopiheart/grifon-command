// Fixed Grifon brand theme for Grifon's OWN self-promo ad creatives.
//
// Unlike utils/adTheme on the image-ads branch (which RESOLVES a customer's
// variable brand colors with luminance math), Grifon's own ads always use the
// house palette — so this is a constant, lifted straight from DESIGN.md. These
// cards render as real DOM and are screenshotted to PNG (pixel-perfect text the
// image model can't bake), the same React→PNG pattern as the v2 image-ads cards.

export const GRIFON_AD = {
  bg: '#09090B', // surface / zinc-950 — never pure black
  surface: '#18181B', // surface-elevated / zinc-900
  gold: '#FFCC00', // primary accent, sole hue
  text: '#FFFFFF', // on-surface
  muted: '#D4D4D8', // on-surface-muted (body)
  dim: '#A1A1AA', // on-surface-dim (passive)
  sublabel: '#71717A', // on-surface-sublabel (meta)
  border: 'rgba(255,255,255,0.10)', // border-white/10
  sans: 'Inter, Geist, "SF Pro", system-ui, sans-serif',
  serif: '"Instrument Serif", Georgia, serif', // serif-accent (marketing flourish)
  mono: '"JetBrains Mono", monospace',
} as const;

// Export pixel dimensions per social format (1080-wide baseline = IG/FB native).
export const AD_DIMENSIONS = {
  '1:1': { w: 1080, h: 1080 },
  '4:5': { w: 1080, h: 1350 },
  '1.91:1': { w: 1200, h: 628 }, // FB/landscape feed (matches the reference section)
  '9:16': { w: 1080, h: 1920 },
} as const;

export type AdFormat = keyof typeof AD_DIMENSIONS;

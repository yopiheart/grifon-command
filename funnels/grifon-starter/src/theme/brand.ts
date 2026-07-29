import type { FunnelConfig } from '../config.types';

// ===========================================================================
// BRAND APPLICATION — FunnelConfig.brand → CSS custom properties on :root.
//
// This is the ONLY place brand values touch the DOM. Every component reads the
// vars through Tailwind tokens (bg-brand-surface, text-brand-primary, …), so a
// re-skin is a config edit and never a class edit.
//
// index.css carries the same names with the template's defaults, so the first
// paint is already on-brand for a Grifon-skinned funnel and any config that
// omits an optional value (proofBand, accent font) degrades gracefully.
// ===========================================================================

const RADIUS: Record<FunnelConfig['brand']['rounded'], string> = {
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  full: '9999px',
};

/**
 * The var map for a brand block. Exported separately from the DOM write so it
 * can be asserted on directly, and so a future SSR/prerender path can inline it.
 */
export const brandVars = (brand: FunnelConfig['brand']): Record<string, string> => {
  const { colors, fonts } = brand;
  const vars: Record<string, string> = {
    '--brand-primary': colors.primary,
    '--brand-surface': colors.surface,
    '--brand-surface-elevated': colors.surfaceElevated,
    '--brand-on-surface': colors.onSurface,
    '--brand-on-surface-muted': colors.onSurfaceMuted,
    '--brand-on-surface-dim': colors.onSurfaceDim,
    '--brand-proof-band': colors.proofBand ?? colors.surfaceElevated,
    '--brand-font-display': fonts.display,
    '--brand-font-body': fonts.body,
    '--brand-font-accent': fonts.accent ?? fonts.display,
    '--brand-radius': RADIUS[brand.rounded],
  };
  return vars;
};

/** Writes the brand vars onto <html>. Call once, before render. */
export const applyBrand = (brand: FunnelConfig['brand']): void => {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(brandVars(brand))) {
    root.style.setProperty(name, value);
  }
};

import React from 'react';
import { MATERIAL, type MaterialTier } from './materialTokens';

// ===========================================================================
// GlassPanel — the CONTENT layer. Forms, tool settings, data displays.
//
// Despite the name it is no longer glass by default, and that is deliberate.
// Apple's Liquid Glass docs scope the material to the functional layer (nav +
// controls floating above content) and warn against it in the content layer;
// Grifon had it inverted — this component alone accounted for a large share of
// the app's ~105 backdrop-filters, blurring a near-black field behind forms for
// no optical gain and a real GPU cost on mid-range mobile.
//
// Default is now PLATE: tonal fill, inset top hairline, no backdrop-filter.
// The API is unchanged — existing call sites keep working, and a caller's own
// `bg-*` / `backdrop-blur-*` utility still wins over the tier (the tiers are
// declared in @layer components on purpose).
//
// Need a surface that genuinely FLOATS above content (nav, rail, command bar,
// sticky footer)? That's LiquidGlass, not this. See materialTokens.ts for how
// to pick, and workflows/liquid_glass_decision.md for why.
// ===========================================================================

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /**
   * Escape hatch for the handful of panels that really do float over live
   * content — the auth gateway over its reel, for instance. Defaults to
   * `plate`; reach for `chrome` only when there's something worth refracting.
   */
  tier?: MaterialTier;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  tier = 'plate',
  className = '',
  ...props
}) => {
  return (
    <div
      className={`${MATERIAL[tier]} border border-white/10 rounded-2xl p-8 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

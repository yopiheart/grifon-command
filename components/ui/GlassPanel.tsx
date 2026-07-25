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

/**
 * Does this className already state a full-padding intent (`p-0`, `p-4`, `p-6`…)?
 *
 * Anchored on a word boundary so `gap-8` / `snap-8` can't false-positive, and it
 * deliberately IGNORES responsive/state variants (`md:p-4`, `hover:p-2`): those live in
 * media queries or higher-specificity contexts that already beat a bare default, so the
 * default must stay for the base breakpoint.
 */
export const declaresPadding = (className: string): boolean => /(?:^|\s)p-\d+(?:\s|$)/.test(className);

/**
 * The panel's own padding, or '' when the caller has taken ownership.
 *
 * WHY THIS EXISTS — a real regression, not defensive coding. Tailwind utilities all carry
 * the SAME specificity, so the winner is whichever rule lands LATER IN THE GENERATED
 * STYLESHEET, not later in the className string. `.p-8` sorts after every other `p-<n>`;
 * measured in the built CSS on 2026-07-25:
 *
 *     p-0 @46376   p-10 @46459   p-12 @46480   p-4 @46586   p-5 @46604   p-6 @46625
 *     p-8 @46666   <- last, therefore ALWAYS wins
 *
 * So `<GlassPanel className="p-0">` silently rendered with 32px of padding, as did all 43
 * override sites in components/ — including `p-10` and `p-12`, which lost to a SMALLER value.
 *
 * It used to work because the Tailwind Play CDN emitted utilities in DISCOVERY order, where
 * a caller's override happened to land last. PR #74 replaced the CDN with a real PostCSS
 * build, whose output is sorted — and that flipped every one of these silently, with a green
 * build and no console warning. First symptom found in the wild: the Gate-1 Regenerate button
 * became unclickable because the panel's restored 32px bottom padding pushed the button up
 * into the absolutely-positioned scriptLine caption (Neil, 2026-07-25).
 *
 * Deliberately NOT solved with tailwind-merge: that is a new runtime dependency on every
 * primitive to fix what is really one hardcoded default. If more primitives turn out to have
 * the same bug, revisit — that is a decision about the whole ui/ family, not this file.
 */
export const resolvePanelPadding = (className: string): string => (declaresPadding(className) ? '' : 'p-8');

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
      className={`${MATERIAL[tier]} border border-white/10 rounded-2xl ${resolvePanelPadding(className)} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

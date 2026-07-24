import React from 'react';
import { MATERIAL, SCROLL_EDGE, type MaterialTier } from './materialTokens';

// ===========================================================================
// LiquidGlass — the CHROME-tier primitive: a surface that FLOATS above content.
//
// This is the counterpart to GlassPanel, and the split is the whole point.
// GlassPanel is the content layer (PLATE, tonal, no filter); LiquidGlass is
// the functional layer (nav, rails, command surfaces, sticky footers). Apple's
// Liquid Glass docs draw exactly that line and warn against the material in the
// content layer — see workflows/liquid_glass_decision.md.
//
// Reach for it when ALL of these hold:
//   1. the surface floats above content the user is reading, AND
//   2. the user can operate it (it holds controls, not prose), AND
//   3. there is something behind it worth refracting.
//
// (3) is the one people skip. Over a flat zinc-950 field this renders a faint
// grey wash for the price of a GPU compositing pass — use GlassPanel instead.
//
// Radii are NOT baked in: pass the caller's own (`rounded-full` on a pill nav,
// `rounded-3xl` on the gateway card). The rim lens inherits whatever it gets.
// ===========================================================================

interface LiquidGlassProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Material tier. Defaults to `chrome` — the reason this component exists. */
  tier?: MaterialTier;
  /**
   * Grade content out as it scrolls beneath this surface, instead of letting it
   * collide with the labels. Apple's scroll edge effect. For sticky bars.
   */
  scrollEdge?: boolean;
  /** Render as a different element — `header`, `nav`, `aside`, `footer`. */
  as?: 'div' | 'header' | 'nav' | 'aside' | 'footer' | 'section';
}

export const LiquidGlass: React.FC<LiquidGlassProps> = ({
  children,
  tier = 'chrome',
  scrollEdge = false,
  as: Tag = 'div',
  className = '',
  ...props
}) => (
  <Tag
    className={`${MATERIAL[tier]} ${scrollEdge ? SCROLL_EDGE : ''} ${className}`.replace(/\s+/g, ' ').trim()}
    {...props}
  >
    {children}
  </Tag>
);

export default LiquidGlass;

// ===========================================================================
// MOTION TOKEN SYSTEM — one source of truth for the app's `motion@12` animation.
//
// Sibling to wizardTokens.ts (visual tokens). Where that file fixes heights /
// radii / type, this one fixes EASING, DURATION, and SPRING physics so motion
// never drifts component-to-component. Values are DISTILLED from the inline
// transitions that were previously scattered across ~33 motion files (Dashboard,
// BillingSuccess, the landing sections, the modals…); off-tier values were
// snapped to the nearest token rather than minting new ones — the point is to
// STOP the drift, not to preserve every ad-hoc number.
//
// Pairs with the `prefers-reduced-motion` gating that already lives in
// index.css and the `useReducedMotion()` guards in call sites — tokens replace
// the VALUES, not the accessibility gating. Use `reducedMotion()` below to keep
// that ternary uniform.
//
// Documented in DESIGN.md (Motion section) so `brand-check` lints against the
// same source. The "Figma Motion" motion-variables idea applied to our own UI.
// ===========================================================================

import type { Transition } from 'motion/react';

type Bezier = [number, number, number, number];

/**
 * Easing curves. String presets for routine in/out motion; the named beziers
 * for signature moments where the curve is part of the feel.
 */
export const EASE = {
  /** Default for entrances / one-shot reveals. */
  out: 'easeOut',
  /** Symmetric — ambient loops, breathing glows. */
  inOut: 'easeInOut',
  /** Expressive ease-out (quint-ish) — hero & card entrances that should feel premium. */
  expressive: [0.22, 1, 0.36, 1] as Bezier,
  /** Symmetric cubic — full-screen route veils / wipes. */
  veil: [0.65, 0, 0.35, 1] as Bezier,
} as const;

/**
 * Duration tiers, in seconds. Snap to the nearest tier; don't inline raw numbers.
 * `ambient.*` is a separate family for infinite decorative loops (auroras, pulses).
 */
export const DUR = {
  /** Micro-feedback — toggles, tooltips, quick fades. */
  instant: 0.15,
  /** Fast UI transitions — popovers, small slides. */
  fast: 0.2,
  /** The default reveal duration. */
  base: 0.3,
  /** Slower content reveals, progress bars, list items. */
  slow: 0.45,
  /** Section / card entrances. */
  entrance: 0.6,
  /** Expressive hero moments, drawn signatures. */
  expressive: 0.8,
  /** Infinite ambient loops — pick by feel, not precision. */
  ambient: {
    pulse: 2.5,
    breathe: 4,
    drift: 8,
    slowDrift: 12,
  },
} as const;

/**
 * Spring profiles for `type: 'spring'` transitions (layout indicators, modals,
 * sliding chrome). Spread directly into `transition`.
 */
export const SPRING = {
  /** Soft modal / panel pop-in. */
  pop: { type: 'spring', stiffness: 260, damping: 22 },
  /** The default sliding-chrome spring (sidebars, layout indicators). */
  standard: { type: 'spring', stiffness: 380, damping: 34 },
  /** Tighter, more responsive — segmented toggles. */
  snappy: { type: 'spring', stiffness: 420, damping: 34 },
  /** Playful overshoot — reserve for signature beats (e.g. the clapper snap). */
  overshoot: { type: 'spring', stiffness: 480, damping: 12 },
} as const;

/**
 * Standardizes the `reduce ? {duration:0} : transition` ternary that pairs with
 * `useReducedMotion()`. Pass the hook's value (boolean | null) and the intended
 * transition; returns an instant transition when motion is reduced.
 */
export const reducedMotion = (
  reduce: boolean | null,
  transition: Transition,
): Transition => (reduce ? { duration: 0 } : transition);

// ===========================================================================
// DASHBOARD TOKEN SYSTEM — one source of truth for the Dashboard pilot's look.
//
// Sibling to wizardTokens.ts (wizard visuals) and motionTokens.ts (motion).
// The Dashboard runs the sanctioned borderless-tonal pilot (DESIGN.md
// "Dashboard pilot"): surfaces are tonal fills, NOT `border border-white/10`
// glass — so its values deliberately differ from wizardTokens and live here
// rather than polluting the app-wide file. Values are DISTILLED from the
// ad-hoc bracket alphas previously scattered across Dashboard.tsx and
// DashboardSidebar.tsx; off-tier strays were snapped to the nearest token.
//
// All class strings are static literals (Play-CDN JIT safe). Hex for inline
// styles routes through GRIFON_GOLD / hueAlpha — never re-typed literals.
// ===========================================================================

import type { Transition } from 'motion/react';
import { DUR, EASE, reducedMotion } from './motionTokens';

// --- Surfaces (borderless-tonal pilot grammar) ---

/** Structural hairline dividers ONLY — rail edge, drawer edge, footer rules. */
export const HAIRLINE = 'border-white/[0.06]';

/** Resting tonal card fill (hero input shell, explore tiles). */
export const CARD_TONAL = 'bg-zinc-900/70';

/** Chip / small-control resting fill. */
export const FILL_REST = 'bg-white/[0.04]';

/** Chip hover fill. */
export const FILL_HOVER = 'hover:bg-white/[0.08]';

/** Nav-row / icon-button hover fill (rail rows, top-bar buttons, recents). */
export const ROW_HOVER = 'hover:bg-white/[0.06]';

/** Hero-input field ring (the pilot's ring-not-border field treatment). */
export const RING_FIELD = 'ring-1 ring-white/[0.08]';

/** Active nav / recent row fill. */
export const ACTIVE_ROW = 'bg-zinc-800/70';

// --- Gold (single-sourced action color) ---

/** The New Ad / primary-CTA gold gradient face. */
export const GOLD_CTA_GRADIENT = 'bg-gradient-to-b from-[#FFD83D] via-[#FFCC00] to-[#E6B800]';

/** The one sanctioned hover shadow: the gold glow (DESIGN.md primary-action alpha). */
export const GOLD_GLOW_HOVER = 'hover:shadow-[0_0_20px_rgba(255,204,0,0.4)]';

// --- Motion: "first slate" entrance choreography ---

/**
 * One entrance beat of the dashboard's mount choreography. Compose with
 * motion props: `<motion.div {...entrance(reduce, 0.16)} />`. Fade-up on the
 * expressive curve; `reduce` (from useReducedMotion) collapses it to instant.
 */
export const entrance = (reduce: boolean | null, delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: reducedMotion(reduce, {
    duration: DUR.entrance,
    ease: EASE.expressive,
    delay,
  }) as Transition,
});

/** Beat sheet for the mount sequence — one place to retune the rhythm. */
export const SLATE_BEATS = {
  greeting: 0,
  callSheet: 0.08,
  headline: 0.16,
  heroInput: 0.28,
  chips: 0.36,
  chipStep: 0.05,
  /** The scribble signs the frame last (SignatureScribble delay). */
  signature: 0.9,
} as const;

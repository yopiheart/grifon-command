import React from 'react';

// ===========================================================================
// CtaButton — OCEANIDES build. De-glossed from the template.
//
// The template's button is a port of the app's GoldButton: a white sheen over
// the top half, a darkening foot, and an inset highlight, so it reads as a lit
// glossy surface. That is the Grifon world. It is wrong here on two counts from
// clients/oceanides/DESIGN.md:
//
//   law #2 "Walang glass"      — elevation is tonal fill + print devices, never
//                                gloss. A gradient-lit pill is the same optical
//                                trick as a frosted panel.
//   law #1 "Hindi Mukhang Ad"  — "ang makintab na ad-plate ay itinataas ang
//                                bantay na ibinababa ng creative." A shiny CTA
//                                on a trust page raises the scam guard.
//
// Also fixed: the template sets `text-black` on the amber fill. DESIGN.md bans
// pure black outright ("ang itim ay Grifon; ang navy ang nagpapa-Oceanides"),
// and names the correct pairing explicitly — "always surface-deep text on amber
// chips." So amber carries --brand-surface-elevated (#0A1F45), not #000.
// (White on amber is 1.9:1 and is a hard ban; that one the template avoided.)
//
// What is left is a flat amber slab with a defined edge — the eyebrowChip
// grammar of the brand, scaled up to a button.
// ===========================================================================

type Variant = 'primary' | 'ghost';

interface CtaButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: Variant;
  /** Full-width on mobile is the funnel default; opt out for inline rows. */
  block?: boolean;
}

// rounded-brand (0.25rem) not rounded-full: print world, tight corners.
const BASE =
  'relative inline-flex items-center justify-center gap-2 rounded-brand font-bold uppercase tracking-wide ' +
  'px-6 py-4 md:px-9 text-sm md:text-base leading-tight text-center ' +
  'transition-colors duration-200 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed';

// Flat amber. The only motion is a tonal shift on hover — no lift, no bloom.
const PRIMARY = 'bg-brand-primary text-brand-elevated hover:brightness-95';

const GHOST =
  'bg-transparent text-brand-on-surface border-2 border-white/25 ' +
  'hover:border-brand-primary hover:text-brand-primary';

export const CtaButton: React.FC<CtaButtonProps> = ({
  children,
  variant = 'primary',
  block = false,
  className = '',
  ...props
}) => (
  <button
    className={`${BASE} ${variant === 'primary' ? PRIMARY : GHOST} ${block ? 'w-full' : ''} ${className}`}
    {...props}
  >
    {children}
  </button>
);

import React from 'react';

// ===========================================================================
// CtaButton — derived from the app's GoldButton (glossy variant), but every
// colour comes from the brand CSS vars instead of hardcoded #FFCC00/zinc.
//
// The glossy look survives the port because it is built from LAYERED GRADIENTS
// over the brand colour (a white sheen on the top half + an inset top hairline
// + a soft halo), not from a second hue. Re-skinning the funnel re-skins the
// button with no code change.
// ===========================================================================

type Variant = 'primary' | 'ghost';

interface CtaButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: Variant;
  /** Full-width on mobile is the funnel default; opt out for inline rows. */
  block?: boolean;
}

const BASE =
  'relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-full font-bold uppercase tracking-wide ' +
  'px-6 py-4 md:px-9 text-sm md:text-base leading-tight text-center ' +
  'transition-all duration-300 active:translate-y-0 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0';

const PRIMARY =
  'bg-brand-primary text-black ' +
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_0_18px_rgba(0,0,0,0.25)] ' +
  'hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_24px_-8px_rgba(0,0,0,0.55)]';

const GHOST =
  'bg-transparent text-brand-on-surface border border-white/15 ' +
  'hover:-translate-y-0.5 hover:border-brand-primary hover:text-brand-primary';

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
    {variant === 'primary' && (
      <>
        {/* Top-half gloss + a darkening foot: reads as a lit surface on any brand hue. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/10 to-transparent"
        />
      </>
    )}
    <span className="relative z-10">{children}</span>
  </button>
);

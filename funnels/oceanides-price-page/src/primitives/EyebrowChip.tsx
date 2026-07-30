import React from 'react';

// ===========================================================================
// EyebrowChip — clients/oceanides/DESIGN.md calls this "ang signature element
// ng brand". Spec, verbatim: amber background, surface-deep text, weight 900,
// ~10px, uppercase, letter-spacing 1px, radius 4px.
//
// Never white-on-amber: that pairing is 1.9:1 and is one of the three hard
// contrast bans. surface-deep (#0A1F45) on amber is the sanctioned pair, which
// is why this reads --brand-surface-elevated rather than a neutral dark.
// ===========================================================================

interface EyebrowChipProps {
  children: React.ReactNode;
  className?: string;
}

export const EyebrowChip: React.FC<EyebrowChipProps> = ({ children, className = '' }) => (
  <span
    className={`inline-block rounded-[4px] bg-brand-primary px-2.5 py-1 text-[10px] font-black uppercase leading-none tracking-[1px] text-brand-elevated ${className}`}
  >
    {children}
  </span>
);

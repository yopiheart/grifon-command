import React from 'react';

interface CreamBandProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * The single marketing light band (DESIGN.md "Marketing light band exception").
 * Fully opaque proof-band surface so the fixed flashlight div and body grid
 * behind it never bleed through. Max ONE per marketing page — never in-app.
 * Inside: text-zinc-900 headings / text-zinc-600 body, solid white cards
 * (border-zinc-900/10), gold stays the sole accent, no glass/backdrop-blur.
 */
export const CreamBand: React.FC<CreamBandProps> = ({ children, className = '' }) => (
  <section className={`relative z-10 bg-[#F2F1EA] text-zinc-900 ${className}`}>
    {children}
  </section>
);

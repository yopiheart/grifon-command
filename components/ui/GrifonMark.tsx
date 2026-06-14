import React from 'react';

/**
 * Grifon brand mark: the white griffin head inside a glowing gold ring (coin/seal badge),
 * recreated in CSS — NOT a baked raster. The ring is a crisp vector (`ring` + glow `shadow`)
 * and the interior is transparent, so only the ring + griffin sit on the header (no dark box,
 * sharp at any zoom). The griffin reuses `/logo.png` (transparent white griffin head).
 *
 * `className` controls the badge size (default h-10 w-10).
 */
export const GrifonMark: React.FC<{ className?: string }> = ({ className = 'h-10 w-10' }) => (
  <span
    aria-hidden="true"
    className={`inline-flex shrink-0 items-center justify-center rounded-full bg-transparent ring-1 ring-[#FFCC00] shadow-[0_0_12px_rgba(255,204,0,0.5)] ${className}`}
  >
    <img src="/logo.png" alt="" className="h-3/5 w-auto object-contain" />
  </span>
);

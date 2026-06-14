import React from 'react';

/**
 * Grifon brand mark: the white griffin head framed by a clean 1px gold hairline ring
 * (coin/seal), recreated in CSS — NOT a baked raster. Rules: 1px `ring-[#FFCC00]` hairline,
 * NO glow / NO drop shadow, transparent interior, and a small even gap so the ring frames the
 * griffin without competing (never looks like a button/badge). Griffin reuses `/logo.png`.
 *
 * `className` controls the badge size (default h-10 w-10).
 */
export const GrifonMark: React.FC<{ className?: string }> = ({ className = 'h-10 w-10' }) => (
  <span
    aria-hidden="true"
    className={`inline-flex shrink-0 items-center justify-center rounded-full bg-transparent ring-1 ring-[#FFCC00] ${className}`}
  >
    <img src="/logo.png" alt="" className="h-3/4 w-auto object-contain" />
  </span>
);

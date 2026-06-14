import React from 'react';

/**
 * Grifon brand mark: the white griffin head inside a glowing gold ring (coin/seal badge).
 * The source PNG (`/logo-badge.png`, 1254×1254) bakes in the ring, griffin, and dark bg, so
 * we render it inside a `rounded-full` mask — this clips the PNG's dark square corners to a
 * clean circle on the dark header (no square edge against bg-zinc-950).
 *
 * `className` controls the badge size (default h-10 w-10).
 */
export const GrifonMark: React.FC<{ className?: string }> = ({ className = 'h-10 w-10' }) => (
  <span
    aria-hidden="true"
    className={`inline-flex shrink-0 overflow-hidden rounded-full ${className}`}
  >
    <img src="/logo-badge.png" alt="" className="h-full w-full object-cover" />
  </span>
);

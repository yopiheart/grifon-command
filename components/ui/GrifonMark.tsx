import React from 'react';

/**
 * Higgsfield-style app-icon mark: the griffin head knocked to solid black inside a
 * gold squircle tile. The tile reuses the glossy-CTA gold gradient + inset sheen so the
 * brand mark and the buttons speak the same language.
 *
 * The griffin source (`/logo.png`) is white line-art on transparent; `brightness(0)`
 * forces it black (alpha preserved) for a high-contrast black-on-gold seal — white-on-gold
 * would be near-invisible (~1.4:1). To flip back to white, drop the `filter` style.
 *
 * `className` controls the tile size (default h-9 w-9). The griffin scales to 2/3 of it.
 */
export const GrifonMark: React.FC<{ className?: string }> = ({ className = 'h-9 w-9' }) => (
  <span
    aria-hidden="true"
    className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#FFD83D] to-[#E6B800] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] ${className}`}
  >
    <img
      src="/logo.png"
      alt=""
      className="h-2/3 w-auto object-contain"
      style={{ filter: 'brightness(0)' }}
    />
  </span>
);

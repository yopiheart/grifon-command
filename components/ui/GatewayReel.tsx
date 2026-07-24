import React from 'react';

// ===========================================================================
// GatewayReel — the thing the auth glass refracts.
//
// Move 02 of the Liquid Glass adoption (workflows/liquid_glass_decision.md):
// glass over a flat zinc-950 field is optically a no-op. Refraction needs
// something behind it worth bending, and Apple's own glass sits over photos
// and scrolling content. Grifon has exactly that content — its own generated
// ad frames — so the sign-in gateway now floats over a slow reel of them.
//
// Deliberately abstract: gradient plates in the brand's own gold/zinc range,
// not real renders. Nothing here asserts a claim, nothing needs loading, and
// it can't leak a customer's creative onto a public screen.
//
// Cost is one transform loop on one element (the grid never re-lays out), and
// it stops entirely under prefers-reduced-motion. Purely decorative: hidden
// from assistive tech.
// ===========================================================================

/** Plate faces — gold tints and zinc darks only. No new hues (DESIGN.md). */
const FACES = [
  'linear-gradient(150deg, #FFCC00, #7A3E00 70%)',
  'linear-gradient(150deg, #2B2B33, #0D0D10)',
  'linear-gradient(150deg, #E6B800, #1A1408 78%)',
  'linear-gradient(150deg, #3F3F46, #18181B)',
  'linear-gradient(150deg, #FFE266, #8A5A00 68%)',
  'linear-gradient(150deg, #1F1F24, #0A0A0C)',
];

// Fixed, hand-shuffled order — a random one would re-roll on every render and
// make the reel flicker between mounts.
const SEQUENCE = [0, 1, 2, 3, 4, 5, 2, 5, 0, 4, 1, 3, 5, 0, 3, 1, 2, 4, 3, 4, 1, 0, 5, 2];

export const GatewayReel: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
    aria-hidden="true"
  >
    <div
      className="gateway-reel absolute -inset-x-[12%] -inset-y-[24%] grid grid-cols-6 gap-3 md:gap-4"
      style={{ transform: 'rotate(-8deg)' }}
    >
      {SEQUENCE.map((face, i) => (
        <div
          key={i}
          className="rounded-lg"
          style={{ aspectRatio: '9 / 14', background: FACES[face], opacity: 0.85 }}
        />
      ))}
    </div>
  </div>
);

export default GatewayReel;

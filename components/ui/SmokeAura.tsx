import React from 'react';

/**
 * GRIFON dashboard backdrop — a procedural gold "volumetric haze" (no video).
 * Blends the two refs: gold haze pooled low + slow-drifting blurred layers
 * (smoke), faint light shafts from the top + drifting dust motes (spotlight).
 *
 * Discipline: weighted to the BOTTOM, EDGES and TOP — the reading band (center)
 * is darkened by an explicit scrim so text stays crisp. Pure transform/opacity
 * + blurred gradients (GPU-cheap, comparable to the old Aurora); all motion
 * stops under prefers-reduced-motion (keyframes gated in index.css). Gold is
 * native — no recolor. The sole accent stays #FFCC00.
 */
export const SmokeAura: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`fixed inset-0 overflow-hidden pointer-events-none z-0 ${className}`} aria-hidden="true">
    {/* Light shafts from the top (spotlight ref) — subtle, fades down + sides */}
    <div
      className="absolute inset-x-0 top-0 h-[70vh] aura-rays"
      style={{
        background: 'repeating-linear-gradient(99deg, transparent 0 38px, rgba(255,204,0,0.05) 38px 42px)',
        WebkitMaskImage: 'radial-gradient(ellipse 60% 85% at 50% -10%, #000 0%, transparent 72%)',
        maskImage: 'radial-gradient(ellipse 60% 85% at 50% -10%, #000 0%, transparent 72%)',
      }}
    />

    {/* Gold pool (glow + drifting haze). Softened ~18% on mobile, where the
        narrow viewport concentrates the same vw-sized layers and reads hotter. */}
    <div className="absolute inset-0 opacity-[0.82] md:opacity-100">
      {/* Base gold light source rising from the bottom */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-[-25%] w-[150vw] h-[80vh] blur-[50px] aura-pulse"
        style={{ background: 'radial-gradient(ellipse at center bottom, rgba(255,204,0,0.12) 0%, rgba(255,204,0,0.05) 35%, transparent 68%)' }}
      />
      {/* Drifting haze layers (smoke ref) — bottom corners */}
      <div
        className="absolute -left-[15%] bottom-[-20%] w-[80vw] h-[70vh] rounded-full blur-[70px] md:blur-[100px] aura-drift-a"
        style={{ background: 'radial-gradient(circle at center, rgba(255,204,0,0.08) 0%, rgba(255,176,0,0.03) 45%, transparent 70%)' }}
      />
      <div
        className="absolute -right-[15%] bottom-[-25%] w-[75vw] h-[65vh] rounded-full blur-[70px] md:blur-[110px] aura-drift-b"
        style={{ background: 'radial-gradient(circle at center, rgba(255,204,0,0.07) 0%, rgba(255,200,0,0.03) 45%, transparent 70%)' }}
      />
    </div>

    {/* Floating gold dust motes (spotlight ref) */}
    <div
      className="absolute inset-0 aura-dust"
      style={{
        backgroundImage: 'radial-gradient(rgba(255,204,0,0.45) 1px, transparent 1.6px)',
        backgroundSize: '96px 96px',
        opacity: 0.1,
        WebkitMaskImage: 'linear-gradient(to top, transparent 0%, #000 35%, #000 75%, transparent 100%)',
        maskImage: 'linear-gradient(to top, transparent 0%, #000 35%, #000 75%, transparent 100%)',
      }}
    />

    {/* Reading-zone scrim — keeps the center dark so the hero text stays crisp */}
    <div
      className="absolute inset-0"
      style={{ background: 'radial-gradient(ellipse 72% 52% at 50% 40%, rgba(9,9,11,0.62) 0%, transparent 60%)' }}
    />

    {/* Film grain.
        Two fixes, 2026-07-25 — both were making this read as screen dirt
        rather than film, which is why nobody ever noticed the layer:

        - `feColorMatrix saturate 0`. feTurbulence generates the R, G and B
          channels INDEPENDENTLY, so raw output is coloured speckle. Real
          grain is a luminance variance. Without this it was chroma noise.
        - `stitchTiles='stitch'`. Without it the turbulence doesn't match at
          the tile edges, so a 160px grid of visible repeats sat over the
          whole field instead of continuous grain.

        Blend mode and opacity deliberately unchanged. `overlay` is
        bidirectional so it isn't the screen-blend failure the noir assets
        had, and retuning it would change how the live dashboard looks —
        that's a separate visual call, not part of this correctness fix. */}
    <div
      className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        backgroundSize: '160px 160px',
      }}
    />
  </div>
);

export default SmokeAura;

import React from 'react';

/**
 * Glossy gold primary CTA — shared by the Pay (card) and Continue (e-wallet) buttons so the two
 * stay identical. The gradient is tints/shades of the SAME Grifon Gold (#FFCC00), giving the button
 * dimension without introducing a new accent hue.
 *
 * NOTE: this intentionally FORKS the flat GoldButton primitive (components/ui/GoldButton.tsx) to add
 * the glossy gradient + sheen Neil requested for checkout. Keep the weight/rounding in sync with it.
 *
 * Usage: spread GLOSSY_GOLD_CLASS on the <button>, render <ButtonSheen /> as the first child, and
 * wrap the label/icon in a `relative z-10` span so they sit above the sheen overlay.
 */
export const GLOSSY_GOLD_CLASS =
  'group relative overflow-hidden w-full rounded-xl py-4 text-black font-black uppercase tracking-widest ' +
  'bg-gradient-to-b from-[#FFD83D] via-[#FFCC00] to-[#E6B800] ' +
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_6px_20px_-4px_rgba(255,204,0,0.45)] ' +
  'hover:-translate-y-0.5 hover:from-[#FFE266] hover:to-[#F0C200] ' +
  'hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_12px_30px_-4px_rgba(255,204,0,0.6)] ' +
  'active:translate-y-0 active:scale-[0.99] transition-all duration-200 ' +
  'disabled:opacity-50 disabled:saturate-50 disabled:cursor-not-allowed disabled:translate-y-0 ' +
  'disabled:shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]';

/** Top-half gloss sheen. Render as the FIRST child inside a GLOSSY_GOLD_CLASS button. */
export const ButtonSheen: React.FC = () => (
  <span
    aria-hidden
    className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-xl bg-gradient-to-b from-white/35 to-transparent"
  />
);

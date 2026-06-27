import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { DUR, EASE, reducedMotion } from './motionTokens';
import { FOUNDING_OFFER, seatsRemaining } from '../../config/foundingOffer';
import { useCountdown } from './useCountdown';

const pad = (n: number) => String(n).padStart(2, '0');

/** Countdown digit — black "digital" chip on the gold band, gold readout. */
const Unit: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div className="flex flex-col items-center">
    <span className="bg-zinc-950 rounded-md px-1.5 py-0.5 text-[#FFCC00] font-mono tabular-nums text-[11px] sm:text-xs leading-none">
      {pad(value)}
    </span>
    <span className="text-[7px] sm:text-[8px] font-mono uppercase tracking-widest text-black/55 mt-0.5">
      {label}
    </span>
  </div>
);

/**
 * Honest founding-member urgency bar — GOLD-FORWARD full band (black text) so the
 * single most important conversion driver (scarcity + deadline) actually pops.
 * Deliberately carries NO button: it's a message band, not a CTA, so the hero's
 * glossy GoldButton stays the only gold *button* in the fold (DESIGN.md: one
 * primary gold CTA per fold). Reads config/foundingOffer; flips to the dark
 * standard-price message once the deadline passes (no gold flood after the offer).
 */
export const UrgencyBar: React.FC = () => {
  const reduce = useReducedMotion();
  const { days, hours, minutes, seconds, expired } = useCountdown(FOUNDING_OFFER.deadlineISO);

  if (!FOUNDING_OFFER.enabled) return null;

  const remaining = seatsRemaining();

  if (expired) {
    return (
      <div className="relative w-full bg-zinc-950 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-1.5 flex items-center justify-center gap-2 text-center">
          <span className="text-[10px] sm:text-xs text-zinc-400 font-mono uppercase tracking-wide">
            Founding pricing ended — standard rate{' '}
            <span className="text-white">{FOUNDING_OFFER.standardPriceLabel}</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion(reduce, { duration: DUR.base, ease: EASE.expressive })}
      className="relative w-full bg-gradient-to-b from-[#FFD83D] via-[#FFCC00] to-[#E6B800] border-b border-[#B28F00]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-1.5 flex items-center justify-center gap-3 sm:gap-4">
        {/* LIMITED anchor — inverse black pill, gold text, pulsing dot */}
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-zinc-950/90 px-2.5 py-0.5">
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-[#FFCC00]"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
            transition={reducedMotion(reduce, {
              duration: DUR.ambient.pulse,
              repeat: Infinity,
              ease: EASE.inOut,
            })}
          />
          <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.18em] text-[#FFCC00] whitespace-nowrap">
            Limited slots
          </span>
        </span>

        {/* Offer line — full on sm+, condensed on mobile */}
        <span className="hidden sm:inline text-xs text-black font-semibold">
          Founding price{' '}
          <span className="font-black">{FOUNDING_OFFER.foundingPriceLabel}</span>
          <span className="text-black/70"> · closes {FOUNDING_OFFER.closesLabel}</span>
        </span>
        <span className="sm:hidden shrink-0 text-[10px] text-black/80 font-mono uppercase tracking-wide whitespace-nowrap">
          Ends in
        </span>

        {/* Countdown */}
        <div className="flex shrink-0 items-end gap-1">
          <Unit value={days} label="D" />
          <span className="text-black/50 text-xs pb-2.5">:</span>
          <Unit value={hours} label="H" />
          <span className="text-black/50 text-xs pb-2.5">:</span>
          <Unit value={minutes} label="M" />
          <span className="text-black/50 text-xs pb-2.5">:</span>
          <Unit value={seconds} label="S" />
        </div>

        {/* Seats left — inverse black pill, gold text. Desktop only (too cramped on mobile) */}
        <span className="hidden sm:inline-flex items-center rounded-full bg-zinc-950/90 px-2 py-0.5 text-[10px] sm:text-xs font-mono font-bold text-[#FFCC00] whitespace-nowrap">
          {remaining}/{FOUNDING_OFFER.seatCap} left
        </span>
      </div>
    </motion.div>
  );
};

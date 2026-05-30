import React from 'react';
import { FOUNDING_OFFER, seatsRemaining } from '../../config/foundingOffer';
import { useCountdown } from './useCountdown';

const pad = (n: number) => String(n).padStart(2, '0');

const Unit: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div className="flex flex-col items-center">
    <span className="bg-zinc-900 border border-white/10 rounded-md px-1.5 py-0.5 text-white font-mono tabular-nums text-[11px] sm:text-xs leading-none">
      {pad(value)}
    </span>
    <span className="text-[7px] sm:text-[8px] font-mono uppercase tracking-widest text-zinc-600 mt-0.5">
      {label}
    </span>
  </div>
);

/**
 * Honest founding-member urgency bar. Reads config/foundingOffer.
 * Flips to the standard-price message once the deadline passes.
 */
export const UrgencyBar: React.FC = () => {
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
    <div className="relative w-full bg-zinc-950 border-b border-[#FFCC00]/15">
      {/* gold hairline */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#FFCC00]/60 to-transparent" />
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-1.5 flex items-center justify-center gap-2.5 sm:gap-4">
        {/* LIMITED pill */}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFCC00]/10 border border-[#FFCC00]/25 px-2.5 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FFCC00] animate-pulse" />
          <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-[0.18em] text-[#FFCC00]">
            Limited slots
          </span>
        </span>

        {/* Offer line — full on sm+, condensed on mobile */}
        <span className="hidden sm:inline text-xs text-zinc-300">
          Founding price{' '}
          <span className="text-[#FFCC00] font-bold">{FOUNDING_OFFER.foundingPriceLabel}</span>
          <span className="text-zinc-500"> · closes {FOUNDING_OFFER.closesLabel}</span>
        </span>
        <span className="sm:hidden text-[10px] text-zinc-400 font-mono uppercase tracking-wide">
          Ends in
        </span>

        {/* Countdown */}
        <div className="flex items-end gap-1">
          <Unit value={days} label="D" />
          <span className="text-zinc-600 text-xs pb-2.5">:</span>
          <Unit value={hours} label="H" />
          <span className="text-zinc-600 text-xs pb-2.5">:</span>
          <Unit value={minutes} label="M" />
          <span className="text-zinc-600 text-xs pb-2.5">:</span>
          <Unit value={seconds} label="S" />
        </div>

        {/* Seats left */}
        <span className="inline-flex items-center text-[10px] sm:text-xs font-mono text-[#FFCC00] whitespace-nowrap">
          {remaining}/{FOUNDING_OFFER.seatCap} left
        </span>
      </div>
    </div>
  );
};

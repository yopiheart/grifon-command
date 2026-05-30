import React, { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { useCountdown } from '../ui/useCountdown';
import { CHECKOUT_RESERVATION_MINUTES } from '../../config/checkout';

const pad = (n: number) => String(n).padStart(2, '0');

interface CheckoutReservationProps {
  /** Stable key (e.g. `${planId}_${cycle}`) so the reservation persists per checkout. */
  storageKey: string;
}

/**
 * Honest soft-urgency timer. Counts down from first arrival on checkout; the
 * start time is persisted in sessionStorage so a refresh can't reset it. At
 * zero the copy turns urgent (amber) but checkout remains fully functional.
 */
export const CheckoutReservation: React.FC<CheckoutReservationProps> = ({ storageKey }) => {
  const deadlineISO = useMemo(() => {
    const key = `grifon_checkout_reservation_${storageKey}`;
    let start = 0;
    try {
      const saved = window.sessionStorage.getItem(key);
      if (saved) start = parseInt(saved, 10);
    } catch {
      /* sessionStorage may be unavailable (private mode) */
    }
    if (!start || Number.isNaN(start)) {
      start = Date.now();
      try {
        window.sessionStorage.setItem(key, String(start));
      } catch {
        /* ignore */
      }
    }
    return new Date(start + CHECKOUT_RESERVATION_MINUTES * 60 * 1000).toISOString();
  }, [storageKey]);

  const { minutes, seconds, expired } = useCountdown(deadlineISO);

  if (expired) {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200">
        <Clock className="w-4 h-4 shrink-0" />
        <span>
          <strong className="font-semibold">Reservation expired.</strong> Complete now to keep this price.
        </span>
      </div>
    );
  }

  return (
    <div className="mb-6 flex items-center gap-2 rounded-xl border border-[#FFCC00]/20 bg-[#FFCC00]/5 px-3.5 py-2.5 text-xs text-zinc-300">
      <Clock className="w-4 h-4 shrink-0 text-[#FFCC00]" />
      <span>
        We've reserved your price for{' '}
        <strong className="font-mono tabular-nums text-[#FFCC00]">
          {pad(minutes)}:{pad(seconds)}
        </strong>
      </span>
    </div>
  );
};

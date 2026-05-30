import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { toast } from 'sonner';
import { PartyPopper, Sparkles, TrendingDown } from 'lucide-react';
import { formatPHP, type BillingCycle } from '../../services/checkoutService';

interface CycleToggleProps {
  cycle: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
  /** Annual savings vs paying monthly (whole-year), in centavos. Drives the loss-aversion copy. */
  annualSavingsCentavos?: number;
  /** Annual per-month equivalent, in centavos. Shown as the honest "₱X/mo billed annually" anchor. */
  monthlyEquivalentCentavos?: number;
}

const SEGMENTS: { id: BillingCycle; label: string }[] = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'annual', label: 'Annual' },
];

/**
 * Honest, reversible monthly↔annual switch for checkout. Monthly is never penalized — it's the
 * default and stays selectable. When on monthly we *frame the loss* (you'll pay ₱X more this year)
 * rather than nag. Switching to annual is celebrated once; switching back is silent.
 */
export const CycleToggle: React.FC<CycleToggleProps> = ({
  cycle,
  onChange,
  annualSavingsCentavos,
  monthlyEquivalentCentavos,
}) => {
  const reduce = useReducedMotion();
  const savings = annualSavingsCentavos ?? 0;
  const showLossCallout = cycle === 'monthly' && savings > 0;

  const select = (next: BillingCycle) => {
    if (next === cycle) return;
    onChange(next);
    if (next === 'annual') {
      toast.success('Nice — 2 months free locked in', {
        icon: <PartyPopper className="h-4 w-4 text-[#FFCC00]" />,
        description:
          savings > 0 ? `You just saved ${formatPHP(savings)} vs paying monthly.` : undefined,
      });
    }
  };

  return (
    <div className="mb-6">
      <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-2">Billing cycle</p>

      {/* Segmented control — sliding gold indicator behind the active segment. */}
      <div className="relative grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-zinc-950 p-1">
        {SEGMENTS.map((seg) => {
          const active = seg.id === cycle;
          return (
            <button
              key={seg.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => select(seg.id)}
              className="relative z-10 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors"
            >
              {active && (
                <motion.span
                  layoutId="cycle-toggle-indicator"
                  className="absolute inset-0 rounded-lg bg-[#FFCC00]"
                  transition={
                    reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }
                  }
                />
              )}
              <span className={`relative z-10 ${active ? 'text-black' : 'text-zinc-400'}`}>
                {seg.label}
              </span>
              {seg.id === 'annual' && (
                <span
                  className={`relative z-10 rounded-full px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-widest ${
                    active ? 'bg-black/15 text-black' : 'bg-[#FFCC00]/10 text-[#FFCC00]'
                  }`}
                >
                  2 mos free
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Loss-aversion callout — monthly only, honest figure, reversible (the toggle above). */}
      {showLossCallout && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.25 }}
          className="mt-3 flex items-start gap-2.5 rounded-xl border border-[#FFCC00]/25 bg-[#FFCC00]/5 px-3.5 py-3"
        >
          <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-[#FFCC00]" />
          <div className="min-w-0 text-xs leading-relaxed">
            <p className="text-zinc-200">
              Stay monthly and you'll pay{' '}
              <span className="font-semibold text-[#FFCC00]">{formatPHP(savings)} more</span> this year.
            </p>
            <button
              type="button"
              onClick={() => select('annual')}
              className="mt-1.5 inline-flex items-center gap-1 font-semibold text-[#FFCC00] hover:underline"
            >
              <Sparkles className="h-3 w-3 shrink-0" />
              Switch to annual — get 2 months free
            </button>
          </div>
        </motion.div>
      )}

      {/* Annual confirmation anchor — honest per-month framing, low-key switch-back. */}
      {cycle === 'annual' && monthlyEquivalentCentavos !== undefined && (
        <p className="mt-3 text-xs text-zinc-500">
          That's {formatPHP(monthlyEquivalentCentavos)}/mo, billed annually.{' '}
          <button
            type="button"
            onClick={() => select('monthly')}
            className="text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline"
          >
            Prefer monthly?
          </button>
        </p>
      )}
    </div>
  );
};

import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Infinity as InfinityIcon } from 'lucide-react';
import type { PlanId } from '../../hooks/useSubscription';

interface QuotaMeterProps {
  plan: PlanId;
  used?: number;
  limit?: number;
  label?: string;
}

const TIER_LABELS: Record<PlanId, string> = {
  free: 'Free',
  creator: 'Creator',
  pro: 'Pro',
  business: 'Business',
};

// Default daily AI-call budgets shown to the user. These mirror the spirit of
// api/_lib/quota.ts (TTS/STS/CLONE caps) without binding to one specific
// counter — the real numbers will flow in via props once a useQuota hook lands.
const DEFAULT_LIMITS: Record<PlanId, number | null> = {
  free: 3,
  creator: 20,
  pro: null,
  business: null,
};

export const QuotaMeter: React.FC<QuotaMeterProps> = ({ plan, used = 0, limit, label }) => {
  const tier = TIER_LABELS[plan];
  const effectiveLimit = limit ?? DEFAULT_LIMITS[plan];
  const isUnlimited = effectiveLimit === null;
  const fillPct = isUnlimited
    ? 100
    : Math.min(100, Math.max(0, (used / Math.max(1, effectiveLimit)) * 100));

  return (
    <div className="flex items-center gap-3 bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2">
      <div className="flex items-center gap-2">
        {isUnlimited ? (
          <InfinityIcon className="w-4 h-4 text-[#FFCC00]" />
        ) : (
          <Sparkles className="w-4 h-4 text-[#FFCC00]" />
        )}
        <div className="flex items-baseline gap-1.5">
          {isUnlimited ? (
            <span className="text-sm lg:text-base font-mono font-bold text-white tabular-nums">
              Unlimited
            </span>
          ) : (
            <>
              <span className="text-sm lg:text-base font-mono font-bold text-white tabular-nums">
                {used}
              </span>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                / {effectiveLimit} {label ?? 'Daily AI'}
              </span>
            </>
          )}
        </div>
      </div>

      {!isUnlimited && (
        <div className="hidden sm:block w-16 h-1 rounded-full bg-zinc-800 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${fillPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-[#FFCC00] to-[#FFD93D] shadow-[0_0_8px_rgba(255,204,0,0.6)]"
          />
        </div>
      )}

      <div className="w-px h-4 bg-white/10" />

      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-[#FFCC00]" />
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
          {tier}
        </span>
      </div>
    </div>
  );
};

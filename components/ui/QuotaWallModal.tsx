import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { DUR, SPRING } from './motionTokens';
import { Check, Crown, Sparkles, X } from 'lucide-react';
import { GoldButton } from './GoldButton';
import { PLAN_FEATURES } from '../../config/planFeatures';
import type { PlanId } from '../../utils/planGate';
import type { MeterUnit } from '../../hooks/useQuota';

interface QuotaWallModalProps {
  open: boolean;
  scope: MeterUnit | null;
  currentPlan: PlanId;
  /** Tier to upsell. null when the user is already on the top plan. */
  nextPlan: Exclude<PlanId, 'free'> | null;
  used: number;
  limit: number;
  onUpgrade: () => void;
  /** Buy a standalone top-up (video_ads scope only). id is an ADD_ON / TopUp id. */
  onBuyTopup?: (id: 'video_ad_single' | 'video_ad_pack5') => void;
  onDismiss: () => void;
}

const SCOPE_LABEL: Record<MeterUnit, string> = {
  workflows: 'ad plans',
  reports: 'research reports',
  captions: 'captions & headlines',
  images: 'AI images',
  video_ads: 'video ads',
  omni_ads: 'AI style passes',
};

const TIER_LABEL: Record<Exclude<PlanId, 'free'>, string> = {
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
};

/**
 * The quota wall — fires when a user exhausts a monthly plan allowance mid-task.
 * The pain (they just hit the ceiling on something they were using) sells the
 * upgrade. Portals to <body> so `fixed` escapes any backdrop-filter ancestor;
 * mirrors the ExitIntentModal pattern (motion + reduced-motion, Escape dismiss,
 * scroll lock, overlay-click dismiss).
 */
export const QuotaWallModal: React.FC<QuotaWallModalProps> = ({
  open,
  scope,
  currentPlan,
  nextPlan,
  used,
  limit,
  onUpgrade,
  onBuyTopup,
  onDismiss,
}) => {
  const reduce = useReducedMotion();

  // Lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Escape to dismiss.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onDismiss]);

  if (typeof document === 'undefined') return null;

  const scopeLabel = scope ? SCOPE_LABEL[scope] : 'usage';
  const nextLabel = nextPlan ? TIER_LABEL[nextPlan] : null;
  const unlocks = nextPlan ? PLAN_FEATURES[nextPlan] : [];

  const handleUpgrade = () => {
    onUpgrade();
    onDismiss();
  };

  // Top-up door — only for video ads (the one metered unit with standalone
  // credits). Lets a capped user buy more now instead of waiting for the reset,
  // and is the ONLY path for a Business user already on the top plan.
  const showTopup = scope === 'video_ads' && !!onBuyTopup;
  const handleTopup = (id: 'video_ad_single' | 'video_ad_pack5') => {
    onBuyTopup?.(id);
    onDismiss();
  };
  const topupRow = showTopup ? (
    <div className="px-6 mt-4">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
        <span className="h-px flex-1 bg-white/10" /> or top up now <span className="h-px flex-1 bg-white/10" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleTopup('video_ad_single')}
          className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-left transition-colors hover:border-[#FFCC00]"
        >
          <span className="block text-sm font-semibold text-zinc-200">1 more ad</span>
          <span className="block text-xs text-zinc-400">₱499</span>
        </button>
        <button
          type="button"
          onClick={() => handleTopup('video_ad_pack5')}
          className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-left transition-colors hover:border-[#FFCC00]"
        >
          <span className="block text-sm font-semibold text-zinc-200">5-pack</span>
          <span className="block text-xs text-zinc-400">₱2,250 · ₱450/ad</span>
        </button>
      </div>
    </div>
  ) : null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="quota-wall-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DUR.fast }}
          onClick={onDismiss}
          role="dialog"
          aria-modal="true"
          aria-label="Monthly limit reached — upgrade"
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"
        >
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={SPRING.pop}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80 backdrop-blur-xl shadow-[0_0_60px_-12px_rgba(255,204,0,0.35)]"
          >
            {/* Dismiss */}
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 rounded-full bg-zinc-950/70 p-1.5 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4 shrink-0" />
            </button>

            {/* Sub-label */}
            <div className="flex items-center gap-1.5 px-6 pt-6 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              <Crown className="h-3.5 w-3.5 shrink-0 text-[#FFCC00]" /> Monthly limit reached
            </div>

            {/* Usage line */}
            <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-[#FFCC00]/25 bg-[#FFCC00]/5 px-3 py-2 text-xs text-zinc-300">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#FFCC00]" />
              <span>
                You've used{' '}
                <span className="font-semibold text-[#FFCC00] tabular-nums">
                  {used}/{limit}
                </span>{' '}
                {scopeLabel} this month on{' '}
                <span className="font-semibold uppercase text-zinc-200">{currentPlan}</span>.
              </span>
            </div>

            {nextPlan ? (
              <>
                <h2 className="px-6 mt-5 text-3xl font-bold leading-tight tracking-tight text-white">
                  Unlock more with{' '}
                  <span className="text-[#FFCC00]">{nextLabel}</span>
                </h2>
                <p className="px-6 mt-3 text-sm leading-relaxed text-zinc-400">
                  Keep your momentum — upgrade to {nextLabel} and pick up right where you left off.
                </p>

                {/* Unlock checklist */}
                <ul className="px-6 mt-5 space-y-2.5">
                  {unlocks.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#FFCC00]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="px-6 mt-6">
                  <GoldButton className="w-full" onClick={handleUpgrade}>
                    <span className="flex items-center justify-center gap-3">
                      <Sparkles className="h-5 w-5 shrink-0" /> Upgrade to {nextLabel}
                    </span>
                  </GoldButton>
                </div>

                {topupRow}

                <button
                  type="button"
                  onClick={onDismiss}
                  className="w-full px-6 py-2 mt-3 mb-6 text-center text-xs font-mono uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Maybe later
                </button>
              </>
            ) : (
              <>
                <h2 className="px-6 mt-5 text-2xl font-bold leading-tight tracking-tight text-white">
                  You're on our top plan
                </h2>
                <p className="px-6 mt-3 text-sm leading-relaxed text-zinc-400">
                  {showTopup
                    ? `You've used this month's ${scopeLabel} allowance on Business. Top up now to keep rendering — credits don't expire.`
                    : `You've reached this month's ${scopeLabel} allowance on Business. Need more? Reach out and we'll sort out a custom limit for you.`}
                </p>

                {topupRow}

                <div className="px-6 mt-6 mb-6">
                  <button
                    type="button"
                    onClick={onDismiss}
                    className="w-full rounded-xl border border-white/10 bg-zinc-950 px-6 py-3 text-sm font-semibold text-zinc-300 hover:border-[#FFCC00] hover:text-white transition-colors"
                  >
                    Got it
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

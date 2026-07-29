import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Clapperboard, X } from 'lucide-react';
import { MAT_VEIL } from './materialTokens';
import { GoldButton } from './GoldButton';
import { DUR, SPRING } from './motionTokens';
import { FOUNDING_OFFER, seatsRemaining } from '../../config/foundingOffer';
import { useCountdown } from './useCountdown';

interface ExitIntentModalProps {
  triggered: boolean;
  onDismiss: () => void;
  /** Start Free — navigates into the app. */
  onEnterApp: () => void;
}

/**
 * "FINAL TAKE" — a cinematic film slate that rises and snaps shut on desktop
 * exit-intent. Grifon is a studio; the free trial is the visitor's first take.
 * Portals to <body> so `fixed` escapes any backdrop-filter ancestor.
 */
export const ExitIntentModal: React.FC<ExitIntentModalProps> = ({ triggered, onDismiss, onEnterApp }) => {
  const reduce = useReducedMotion();
  // Same clock as UrgencyBar: once the founding deadline passes, the urgency
  // row must vanish here too — a stale "ends June 30" is fabricated scarcity.
  const { expired } = useCountdown(FOUNDING_OFFER.deadlineISO);

  // Lock background scroll while open.
  useEffect(() => {
    if (!triggered) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [triggered]);

  // Escape to dismiss.
  useEffect(() => {
    if (!triggered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [triggered, onDismiss]);

  if (typeof document === 'undefined') return null;

  const handleStartFree = () => {
    onEnterApp();
    onDismiss();
  };

  return createPortal(
    <AnimatePresence>
      {triggered && (
        <motion.div
          key="exit-intent-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DUR.fast }}
          onClick={onDismiss}
          role="dialog"
          aria-modal="true"
          aria-label="One more take — start free"
          className={`fixed inset-0 z-[80] flex items-center justify-center p-4 ${MAT_VEIL}`}
        >
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={SPRING.pop}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-zinc-900/90 shadow-[0_0_60px_-12px_rgba(255,204,0,0.35)]"
          >
            {/* Clapper sticks — snap shut on entrance. */}
            <motion.div
              aria-hidden
              initial={reduce ? undefined : { rotate: -11 }}
              animate={{ rotate: 0 }}
              transition={{ ...SPRING.overshoot, delay: 0.1 }}
              style={{
                transformOrigin: 'left center',
                background: 'repeating-linear-gradient(115deg, #FFCC00 0 20px, #09090B 20px 40px)',
              }}
              className="h-9 w-full"
            />

            {/* Proof slot — a real finished Grifon ad answers the headline's
                "patunayan mo" in the same breath. Lazy by construction: the whole
                modal only mounts on desktop exit-intent (once/session), so the
                clip never loads on a normal visit. Reduced-motion -> poster only. */}
            <div className="mx-auto mt-5 w-40 overflow-hidden rounded-xl border border-white/10 bg-zinc-950 aspect-[9/16] shadow-[0_0_30px_-10px_rgba(255,204,0,0.35)]">
              {reduce ? (
                <img
                  src="/exit/proof-ad-poster.jpg"
                  alt="A real ad made with Grifon"
                  className="h-full w-full object-cover"
                />
              ) : (
                <video
                  // Neil drops the real clip here (a webm <source> can be added alongside).
                  src="/exit/proof-ad.mp4"
                  poster="/exit/proof-ad-poster.jpg"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="none"
                  aria-label="A real ad made with Grifon"
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <p className="mt-2 text-center text-[10px] font-mono uppercase tracking-widest text-on-surface-sublabel">
              Real Grifon ad · 0 edits
            </p>

            {/* Dismiss */}
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 rounded-full bg-zinc-950/70 p-1.5 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4 shrink-0" />
            </button>

            {/* Slate row */}
            <div className="flex items-center justify-between px-6 pt-5 text-[10px] font-mono uppercase tracking-widest text-on-surface-sublabel">
              <span>Scene 01 · Take 1</span>
              <span className="flex items-center gap-1.5">
                <Clapperboard className="h-3.5 w-3.5 shrink-0" /> Grifon Studio
              </span>
            </div>

            {/* Honest urgency — only while the founding deadline is genuinely live */}
            {!expired && (
              <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-[#FFCC00]/25 bg-[#FFCC00]/5 px-3 py-2 text-xs text-zinc-300">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#FFCC00] animate-pulse" />
                <span>
                  Founding price ends {FOUNDING_OFFER.closesLabel} ·{' '}
                  <span className="font-semibold text-[#FFCC00]">
                    {seatsRemaining()} of {FOUNDING_OFFER.seatCap}
                  </span>{' '}
                  seats left
                </span>
              </div>
            )}

            {/* Headline — sentence-case (overrides the global uppercase heading LAW) for the
                conversational Taglish jab. */}
            <h2 className="!normal-case px-6 mt-5 text-3xl font-black leading-tight tracking-tight text-white">
              Akala mo AI <span className="text-[#FFCC00]">garbage</span> lang to?
            </h2>

            <p className="px-6 mt-3 text-sm leading-relaxed text-zinc-400">
              Patunayan mo. Gumawa ng isang totoong ad —{' '}
              <span className="font-semibold text-zinc-200">free, in 30 minutes.</span> Walang credit
              card. Kung basura, wala namang mawawala.
            </p>

            <div className="px-6 mt-6">
              <GoldButton glossy className="w-full" onClick={handleStartFree}>
                <span className="flex items-center justify-center gap-3">
                  <Clapperboard className="h-5 w-5 shrink-0" /> Gawin Ko — Free, No Card
                </span>
              </GoldButton>
            </div>

            <p className="px-6 mt-3 mb-6 text-center text-[11px] font-mono uppercase tracking-wider text-on-surface-sublabel">
              Walang card · Cancel anytime
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

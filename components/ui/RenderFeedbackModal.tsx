import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Check, Crown, Sparkles, Star, X } from 'lucide-react';
import { toast } from 'sonner';
import { GoldButton } from './GoldButton';
import { PLAN_FEATURES } from '../../config/planFeatures';
import { nextTier } from '../../utils/planGate';
import { useSubscription } from '../../hooks/useSubscription';
import { startCheckout } from '../../services/billingService';
import { submitRenderFeedback } from '../../services/feedbackService';

interface RenderFeedbackModalProps {
  open: boolean;
  renderId: string | null;
  onDismiss: () => void;
}

const TIER_LABEL: Record<'creator' | 'pro' | 'business', string> = {
  creator: 'Creator',
  pro: 'Pro',
  business: 'Business',
};

/**
 * Post-render Feedback + upgrade nudge. Fires at the peak moment a video is
 * delivered. Star rating branches the flow:
 *   - ≥4 → thank + optional testimonial/consent, then an upgrade nudge
 *          (Free/Creator) or a "share Grifon" line (top tier).
 *   - ≤3 → private feedback textarea, no upsell.
 * There is deliberately NO tip control here. Portals to <body> and mirrors the
 * QuotaWallModal pattern (motion + reduced-motion, Escape dismiss, scroll lock,
 * overlay-click dismiss, gold-glow glass card).
 */
export const RenderFeedbackModal: React.FC<RenderFeedbackModalProps> = ({
  open,
  renderId,
  onDismiss,
}) => {
  const reduce = useReducedMotion();
  const { plan_id, billing_cycle } = useSubscription();

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [testimonial, setTestimonial] = useState('');
  const [consent, setConsent] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<'rate' | 'thanks'>('rate');

  // Reset form each time a new render opens the modal.
  useEffect(() => {
    if (open) {
      setRating(0);
      setHover(0);
      setTestimonial('');
      setConsent(false);
      setDisplayName('');
      setFeedback('');
      setSubmitting(false);
      setStage('rate');
    }
  }, [open, renderId]);

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

  const happy = rating >= 4;
  const upsell = nextTier(plan_id);

  const handleSubmit = async () => {
    if (!rating || !renderId) return;
    setSubmitting(true);
    try {
      await submitRenderFeedback({
        render_id: renderId,
        rating,
        ...(happy
          ? {
              testimonial: testimonial.trim() || undefined,
              consent_to_share: consent,
              display_name: displayName.trim() || undefined,
            }
          : { feedback: feedback.trim() || undefined }),
      });
      toast.success('THANKS FOR THE FEEDBACK');
      setStage('thanks');
    } catch (err: any) {
      toast.error('FEEDBACK FAILED', { description: err?.message?.slice(0, 120) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpgrade = () => {
    if (upsell) startCheckout(upsell, billing_cycle ?? 'monthly');
    onDismiss();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="render-feedback-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onDismiss}
          role="dialog"
          aria-modal="true"
          aria-label="Rate your video"
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"
        >
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
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
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#FFCC00]" /> Your video is ready
            </div>

            {stage === 'rate' ? (
              <>
                <h2 className="px-6 mt-4 text-2xl font-bold leading-tight tracking-tight text-white">
                  How'd we do?
                </h2>
                <p className="px-6 mt-2 text-sm leading-relaxed text-zinc-400">
                  Rate the video you just rendered — it helps us make your next one even better.
                </p>

                {/* Star row */}
                <div className="flex items-center gap-2 px-6 mt-5">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const active = (hover || rating) >= n;
                    return (
                      <button
                        key={n}
                        type="button"
                        aria-label={`${n} star${n > 1 ? 's' : ''}`}
                        onClick={() => setRating(n)}
                        onMouseEnter={() => setHover(n)}
                        onMouseLeave={() => setHover(0)}
                        className="p-2 cursor-pointer transition-transform hover:scale-110"
                      >
                        <Star
                          className={`h-8 w-8 shrink-0 transition-colors ${
                            active ? 'fill-[#FFCC00] text-[#FFCC00]' : 'text-zinc-600'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Conditional branch once a rating is chosen */}
                {rating > 0 && (
                  <div className="px-6 mt-5">
                    {happy ? (
                      <>
                        <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                          Mind sharing what you loved? (optional)
                        </label>
                        <textarea
                          value={testimonial}
                          onChange={(e) => setTestimonial(e.target.value)}
                          rows={3}
                          placeholder="This saved me hours…"
                          className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] focus:outline-none"
                        />
                        <label className="mt-3 flex items-start gap-2 text-xs text-zinc-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                            className="mt-0.5 h-4 w-4 shrink-0 accent-[#FFCC00]"
                          />
                          <span>You can feature my words as a testimonial.</span>
                        </label>
                        {consent && (
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Name or handle (optional)"
                            className="mt-3 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] focus:outline-none"
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                          What went wrong? (optional, private)
                        </label>
                        <textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          rows={3}
                          placeholder="Tell us what to fix…"
                          className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] focus:outline-none"
                        />
                      </>
                    )}
                  </div>
                )}

                <div className="px-6 mt-6 mb-6">
                  <GoldButton
                    className="w-full"
                    onClick={handleSubmit}
                    disabled={!rating || submitting}
                  >
                    {submitting ? 'SENDING…' : 'SUBMIT'}
                  </GoldButton>
                </div>
              </>
            ) : (
              <>
                {/* Thank-you stage. ≥4 + eligible → upgrade nudge; top tier → share; ≤3 → close. */}
                {happy && upsell ? (
                  <>
                    <div className="flex items-center gap-1.5 px-6 mt-4 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                      <Crown className="h-3.5 w-3.5 shrink-0 text-[#FFCC00]" /> Glad you loved it
                    </div>
                    <h2 className="px-6 mt-3 text-2xl font-bold leading-tight tracking-tight text-white">
                      Make every video like this with{' '}
                      <span className="text-[#FFCC00]">{TIER_LABEL[upsell]}</span>
                    </h2>
                    <ul className="px-6 mt-5 space-y-2.5">
                      {PLAN_FEATURES[upsell].slice(0, 5).map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-300">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#FFCC00]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="px-6 mt-6">
                      <GoldButton className="w-full" onClick={handleUpgrade}>
                        <span className="flex items-center justify-center gap-3">
                          <Sparkles className="h-5 w-5 shrink-0" /> Upgrade to {TIER_LABEL[upsell]}
                        </span>
                      </GoldButton>
                    </div>
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
                    <h2 className="px-6 mt-4 text-2xl font-bold leading-tight tracking-tight text-white">
                      {happy ? 'Thanks — glad you loved it!' : 'Thanks for the feedback'}
                    </h2>
                    <p className="px-6 mt-3 text-sm leading-relaxed text-zinc-400">
                      {happy
                        ? 'Know a business owner who needs this? Share Grifon with them.'
                        : "We read every note — we'll use it to make your next render better."}
                    </p>
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
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

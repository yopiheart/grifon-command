import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { MessageCircle, X, CheckCircle } from 'lucide-react';
import { Pill } from './SegButton';
import Textarea from './Textarea';
import { GoldButton } from './GoldButton';
import { shouldShowFeedback, markFeedbackSeen, submitFeedback } from '../../services/feedbackService';
import { MAT_CHROME } from './materialTokens';

// Phase 1 of the Data-Driven Growth Loop (workflows/growth_loop.md): a compact,
// non-blocking NPS micro-widget. Fires at the "value delivered" moment (the
// finished-ad review screen) via the `active` prop. Self-gating — shows at most
// once per session, then cools down ~30 days after a submit OR dismiss (logic in
// feedbackService). DESIGN.md tokens only; never blocks the page.

const SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

interface FeedbackWidgetProps {
  /** True at the trigger moment (e.g. wizard currentStep === 8). */
  active: boolean;
  /** Where it fired, stamped on the feedback row. */
  module?: string;
}

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({ active, module }) => {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'thanks'>('idle');

  // Show once when the trigger goes true and the frequency gate allows it.
  useEffect(() => {
    if (active && shouldShowFeedback()) setVisible(true);
  }, [active]);

  // Auto-dismiss shortly after the thank-you.
  useEffect(() => {
    if (status !== 'thanks') return;
    const t = setTimeout(() => setVisible(false), 1800);
    return () => clearTimeout(t);
  }, [status]);

  const close = (action: 'submitted' | 'dismissed') => {
    markFeedbackSeen(action);
  };

  const handleDismiss = () => {
    close('dismissed');
    setVisible(false);
  };

  const handleSubmit = async () => {
    if (score === null || status === 'submitting') return;
    setStatus('submitting');
    await submitFeedback({
      npsScore: score,
      freeText: text.trim() || undefined,
      module,
    });
    // Mark seen regardless of network result — we never re-nag this session.
    close('submitted');
    setStatus('thanks');
  };

  const anim = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 16, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 16, scale: 0.98 },
        transition: { duration: 0.25, ease: 'easeOut' as const },
      };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="feedback-widget"
          {...anim}
          role="dialog"
          aria-label="Quick feedback"
          className={`fixed bottom-4 left-4 right-4 z-40 sm:left-auto sm:right-4 sm:w-96 rounded-2xl border border-white/10 ${MAT_CHROME} p-5`}
        >
          {status === 'thanks' ? (
            <div className="flex items-center gap-3 py-1">
              <CheckCircle className="w-5 h-5 text-[#FFCC00] shrink-0" />
              <p className="text-sm font-semibold text-white">Thanks for the feedback!</p>
            </div>
          ) : (
            <>
              <button
                onClick={handleDismiss}
                aria-label="Dismiss feedback"
                className="absolute top-2 right-2 p-2 text-on-surface-sublabel hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-3">
                <MessageCircle className="w-5 h-5 text-[#FFCC00] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-[#FFCC00]">
                    // QUICK FEEDBACK
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    How likely are you to recommend Grifon?
                  </p>
                </div>
              </div>

              <div className="mt-4">
                {/* grid-cols-6 at all widths: 0–5 then 6–10 as a tidy number pad.
                    Keeps each cell wide enough for the Pill's built-in px-3 (no fragile
                    class-order override) and avoids an 11-col row clipping "10" at 384px. */}
                <div className="grid grid-cols-6 gap-1">
                  {SCORES.map((n) => (
                    <Pill key={n} active={score === n} onClick={() => setScore(n)}>
                      {n}
                    </Pill>
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[10px] font-mono uppercase tracking-widest text-on-surface-sublabel">
                  <span>not likely</span>
                  <span>very likely</span>
                </div>
              </div>

              <div className="mt-4">
                <Textarea
                  label="Anything we can improve? (optional)"
                  id="feedback-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={2000}
                  rows={3}
                />
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleDismiss}
                  className="flex-1 rounded-full border border-white/10 bg-zinc-950 py-3 text-xs font-bold uppercase text-zinc-400 hover:text-white hover:border-[#FFCC00] transition-all"
                >
                  Dismiss
                </button>
                <GoldButton
                  onClick={handleSubmit}
                  disabled={score === null || status === 'submitting'}
                  className="flex-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {status === 'submitting' ? 'Sending…' : 'Send'}
                </GoldButton>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

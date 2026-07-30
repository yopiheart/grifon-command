import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Package, Wrench, Building2, Sparkles } from 'lucide-react';
import { MAT_VEIL } from '../ui/materialTokens';
import { GlassPanel } from '../ui/GlassPanel';
import { DUR, SPRING } from '../ui/motionTokens';

/** The four chips. `vertical` is the EXISTING One-Shot taxonomy (LaunchScreen
 * VERTICALS → deriveBusinessType); "Iba pa" maps to 'product' silently while the
 * raw label still rides the analytics event so the two stay distinguishable. */
const CHOICES: { label: string; vertical: string; Icon: typeof Package }[] = [
  { label: 'Produkto', vertical: 'product', Icon: Package },
  { label: 'Serbisyo', vertical: 'service', Icon: Wrench },
  { label: 'Real Estate', vertical: 'real_estate', Icon: Building2 },
  { label: 'Iba pa', vertical: 'product', Icon: Sparkles },
];

interface VerticalPickerModalProps {
  open: boolean;
  /** A chip tap — `vertical` is the stashed value, `rawLabel` the chip the user hit. */
  onPick: (vertical: string, rawLabel: string) => void;
  /** "Skip muna", Escape, or a backdrop click — all the same silent skip. */
  onSkip: () => void;
}

/**
 * One-question segmentation (workflows/post_preview_bridge.md Part 2). Intercepts
 * the landing page's primary signup CTA exactly once per session: one tap answers
 * "Anong business mo?" and the answer pre-fills the One-Shot vertical. Deliberately
 * tiny — every path out of it (chip, skip, Escape, backdrop) continues into signup,
 * so it can add friction but never a dead end. Portals to <body> so `fixed` escapes
 * any backdrop-filter ancestor (same reason as ExitIntentModal).
 */
export const VerticalPickerModal: React.FC<VerticalPickerModalProps> = ({ open, onPick, onSkip }) => {
  const reduce = useReducedMotion();

  // Lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Escape dismisses — treated as a skip, so the CTA still lands in the app.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onSkip]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="vertical-picker-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DUR.fast }}
          onClick={onSkip}
          role="dialog"
          aria-modal="true"
          aria-label="Anong business mo?"
          className={`fixed inset-0 z-[80] flex items-center justify-center p-4 ${MAT_VEIL}`}
        >
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={SPRING.pop}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md"
          >
            <GlassPanel className="p-6 shadow-[0_0_60px_-12px_rgba(255,204,0,0.35)]">
              <p className="text-[10px] text-on-surface-sublabel font-mono uppercase tracking-widest">
                // ISANG TANONG LANG
              </p>
              <h2 className="!normal-case mt-2 text-2xl font-black leading-tight tracking-tight text-white">
                Anong business mo?
              </h2>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {CHOICES.map(({ label, vertical, Icon }, i) => (
                  <button
                    key={label}
                    type="button"
                    autoFocus={i === 0}
                    onClick={() => onPick(vertical, label)}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm font-semibold text-zinc-300 transition-all hover:border-[#FFCC00] hover:bg-[#FFCC00]/10 hover:text-[#FFCC00] active:scale-[0.99]"
                  >
                    <Icon className="h-4 w-4 shrink-0" /> {label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onSkip}
                className="mt-4 w-full text-[10px] text-on-surface-sublabel font-mono uppercase tracking-widest transition-colors hover:text-white"
              >
                Skip muna
              </button>
            </GlassPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Play, Check } from 'lucide-react';
import { EASE, DUR } from '../ui/motionTokens';

/**
 * Tiny looping "show-don't-tell" demos, one per module, for the landing
 * "What You Get" grid. Pure motion + CSS — no assets. Every demo collapses to a
 * sensible static frame when the user prefers reduced motion.
 */

const DEMO_BOX =
  'relative w-full h-36 rounded-xl bg-zinc-950/60 border border-white/5 overflow-hidden';

/* ── Director AI — storyboard frames fill in + a render progress bar ── */
export const DirectorDemo: React.FC = () => {
  const reduce = useReducedMotion();
  return (
    <div className={DEMO_BOX}>
      <div className="absolute inset-0 p-3 flex flex-col gap-2">
        <div className="grid grid-cols-4 gap-1.5 flex-1">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="relative rounded-md border border-white/10 bg-zinc-900 flex items-center justify-center"
              initial={false}
              animate={reduce ? { opacity: 1 } : { opacity: [0.25, 1, 1, 0.25] }}
              transition={
                reduce
                  ? undefined
                  : { duration: DUR.ambient.breathe, repeat: Infinity, delay: i * 0.35, ease: EASE.inOut }
              }
            >
              <span className="absolute top-1 left-1 text-[7px] font-mono text-on-surface-sublabel">0{i + 1}</span>
              {i === 2 && (
                <span className="w-5 h-5 rounded-full bg-[#FFCC00] flex items-center justify-center shadow-[0_0_10px_rgba(255,204,0,0.5)]">
                  <Play className="w-2.5 h-2.5 text-black ml-0.5" fill="currentColor" />
                </span>
              )}
            </motion.div>
          ))}
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#FFCC00] to-[#FFCC00]/50"
            initial={false}
            animate={reduce ? { width: '64%' } : { width: ['8%', '100%'] }}
            transition={reduce ? undefined : { duration: DUR.ambient.breathe, repeat: Infinity, ease: EASE.inOut }}
          />
        </div>
      </div>
    </div>
  );
};

/* ── Market Research — data bars rising under a scan line ── */
export const ResearchDemo: React.FC = () => {
  const reduce = useReducedMotion();
  const bars = [0.5, 0.8, 0.4, 0.95, 0.65, 0.85, 0.55];
  return (
    <div className={DEMO_BOX}>
      <div className="absolute inset-0 p-3 flex items-end gap-1.5">
        {bars.map((h, i) => (
          <motion.div
            key={i}
            className="flex-1 rounded-sm bg-gradient-to-t from-[#FFCC00]/70 to-[#FFCC00]/20 origin-bottom"
            style={{ height: `${h * 100}%` }}
            initial={false}
            animate={reduce ? { scaleY: 1 } : { scaleY: [0.2, 1, 0.6, 1] }}
            transition={
              reduce
                ? undefined
                : { duration: DUR.ambient.pulse, repeat: Infinity, delay: i * 0.12, ease: EASE.inOut }
            }
          />
        ))}
      </div>
      {!reduce && (
        <motion.div
          className="absolute left-0 right-0 h-px bg-[#FFCC00]/50"
          initial={false}
          animate={{ top: ['85%', '15%', '85%'] }}
          transition={{ duration: DUR.ambient.breathe, repeat: Infinity, ease: EASE.inOut }}
        />
      )}
    </div>
  );
};

/* ── Offer Optimizer — line items check in, building a price ── */
export const OfferDemo: React.FC = () => {
  const reduce = useReducedMotion();
  const rows = ['Bonus stack', 'Scarcity', 'Guarantee'];
  return (
    <div className={DEMO_BOX}>
      <div className="absolute inset-0 p-3 flex flex-col justify-center gap-2">
        {rows.map((r, i) => (
          <motion.div
            key={r}
            className="flex items-center gap-2 text-[11px] text-zinc-300"
            initial={false}
            animate={reduce ? { opacity: 1, x: 0 } : { opacity: [0, 1, 1, 0], x: [-8, 0, 0, -8] }}
            transition={
              reduce
                ? undefined
                : { duration: DUR.ambient.breathe, repeat: Infinity, delay: i * 0.5, ease: EASE.inOut }
            }
          >
            <span className="w-4 h-4 rounded-full bg-[#FFCC00]/15 border border-[#FFCC00]/40 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-[#FFCC00]" />
            </span>
            {r}
          </motion.div>
        ))}
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-[10px] text-on-surface-sublabel line-through font-mono">₱30,000</span>
          <span className="text-[#FFCC00] font-bold font-mono text-sm">₱997</span>
        </div>
      </div>
    </div>
  );
};

/* ── Caption & Headline — headlines cycle with a blinking cursor ── */
const HEADLINES = [
  'Stop scrolling. Start selling.',
  'Your ad, done in 30 minutes.',
  'Hooks na talagang kumikita.',
];
export const CaptionDemo: React.FC = () => {
  const reduce = useReducedMotion();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setIdx((n) => (n + 1) % HEADLINES.length), 2600);
    return () => window.clearInterval(id);
  }, [reduce]);

  return (
    <div className={DEMO_BOX}>
      <div className="absolute inset-0 p-4 flex flex-col justify-center">
        <span className="text-[8px] font-mono uppercase tracking-widest text-on-surface-sublabel mb-2">
          // Headline
        </span>
        <div className="min-h-[2.5rem] flex items-start">
          <motion.p
            key={idx}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR.slow }}
            className="text-sm font-bold text-white leading-snug"
          >
            {HEADLINES[idx]}
            {!reduce && (
              <motion.span
                className="inline-block w-1.5 h-4 ml-0.5 bg-[#FFCC00] align-middle"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: DUR.expressive, repeat: Infinity }}
              />
            )}
          </motion.p>
        </div>
      </div>
    </div>
  );
};

/* ── Image Studio — ad tiles fade + shuffle in ── */
export const ImageDemo: React.FC = () => {
  const reduce = useReducedMotion();
  return (
    <div className={DEMO_BOX}>
      <div className="absolute inset-0 p-3 grid grid-cols-3 grid-rows-2 gap-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            className="rounded-md border border-white/10"
            style={{
              background:
                i % 2 === 0
                  ? 'linear-gradient(135deg, rgba(255,204,0,0.25), rgba(255,204,0,0.05))'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
            }}
            initial={false}
            animate={reduce ? { opacity: 1, scale: 1 } : { opacity: [0, 1, 1, 0], scale: [0.85, 1, 1, 0.85] }}
            transition={
              reduce
                ? undefined
                : { duration: DUR.ambient.breathe, repeat: Infinity, delay: i * 0.2, ease: EASE.inOut }
            }
          />
        ))}
      </div>
    </div>
  );
};

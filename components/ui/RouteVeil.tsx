import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { EASE, DUR } from './motionTokens';
import { GrifonMark } from './GrifonMark';

export interface VeilState {
  label: string;
}

/**
 * Route-transition veil: a pane sweeps across, led by a gold edge, and the new
 * route is behind it.
 *
 * RETUNED 2026-07-25 from a screen recording. The previous version ran ~0.9s —
 * a 0.32s cover, a ~0.25s hold and a 0.32s reveal — and at 6fps the recording
 * showed roughly a full second of almost-empty black with a small logo in it.
 * For a route change that is instantaneous (this is an SPA; nothing is being
 * fetched) that is the exact thing HIG Motion warns about: making people wait
 * for an animation. It read as a stall, not as a transition.
 *
 * Three changes:
 *   1. Total choreography roughly halved, and the dead hold removed entirely.
 *      The pane covers and immediately begins to leave.
 *   2. The fake progress hairline is gone. It drew itself over 0.45s while
 *      nothing loaded — a progress indicator for work that does not exist,
 *      against DESIGN.md's "No fake proof — trust is the brand asset."
 *   3. The mark is larger and a specular crosses it, so the brief moment the
 *      pane is up has something alive in it rather than a void. Same "light
 *      moving across the material" language as the BootScreen and CHROME.
 *
 * initial={false}: the route swap happens while the veil covers the screen, so
 * the destination tree mounts a fresh AnimatePresence mid-transition — it must
 * render the panel already in place (no replayed sweep), then animate the exit.
 */
export const RouteVeil: React.FC<{ veil: VeilState | null }> = ({ veil }) => {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {veil && (
        <motion.div
          key="route-veil"
          initial={reduce ? { opacity: 0 } : { y: '100%' }}
          animate={reduce ? { opacity: 1 } : { y: 0 }}
          exit={reduce ? { opacity: 0 } : { y: '-100%' }}
          transition={{ duration: reduce ? DUR.instant : DUR.fast, ease: EASE.veil }}
          className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Leading edge — thicker than a hairline so it actually reads at
              phone size, and it carries the bloom that sells the sweep. */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-[#FFCC00] to-transparent shadow-[0_0_34px_8px_rgba(255,204,0,0.5)]"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-transparent via-[#FFCC00] to-transparent shadow-[0_0_34px_8px_rgba(255,204,0,0.5)]"
          />

          {/* Ambient gold wash so the pane is a lit surface, not a black hole. */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(255,204,0,0.10), transparent 68%)',
            }}
          />

          <div className="relative flex flex-col items-center gap-5">
            {/* The light crossing the mark — the one live element, and the
                reason the pane doesn't need a hold to feel inhabited. */}
            {!reduce && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute -inset-x-16 top-1/2 h-24 -translate-y-1/2 rounded-full"
                style={{
                  background:
                    'radial-gradient(circle, rgba(255,204,0,0.55), transparent 70%)',
                  filter: 'blur(26px)',
                }}
                initial={{ x: '-70%', opacity: 0 }}
                animate={{ x: '70%', opacity: [0, 1, 0] }}
                transition={{ duration: DUR.slow, ease: EASE.inOut }}
              />
            )}
            <GrifonMark className="relative h-20 w-20 drop-shadow-[0_0_26px_rgba(255,204,0,0.55)]" />
            <p className="relative text-[10px] font-mono text-on-surface-sublabel tracking-[0.35em] uppercase">
              {veil.label}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { EASE, DUR } from './motionTokens';

export interface VeilState {
  label: string;
}

/**
 * Route-transition veil (landonorris.com page-wipe pattern, Grifon register):
 * a zinc-950 panel sweeps up with a gold scanline leading edge, holds a beat
 * with the pulsing logo + route-aware mono status, then sweeps away revealing
 * the new route. Mounted once in App; driven by the `veil` state there.
 * Total choreography ~0.9s — cover 0.32s, hold ~0.25s, reveal 0.32s.
 */
// initial={false}: the route swap happens while the veil covers the screen, so
// the destination tree mounts a fresh AnimatePresence mid-transition — it must
// render the panel already in place (no replayed sweep), then animate the exit.
export const RouteVeil: React.FC<{ veil: VeilState | null }> = ({ veil }) => (
  <AnimatePresence initial={false}>
    {veil && (
      <motion.div
        key="route-veil"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '-100%' }}
        transition={{ duration: DUR.base, ease: EASE.veil }}
        className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center overflow-hidden"
      >
        {/* Gold scanline leading edge — reads as a scanner sweeping the screen */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FFCC00] to-transparent shadow-[0_0_24px_4px_rgba(255,204,0,0.45)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FFCC00] to-transparent shadow-[0_0_24px_4px_rgba(255,204,0,0.45)]" />

        {/* Faint dot-grid texture, same family as the auth backdrop */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(#FFCC00 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: DUR.fast, delay: 0.18, ease: EASE.out }}
          className="relative flex flex-col items-center gap-4"
        >
          <img
            src="/logo.png"
            alt=""
            aria-hidden="true"
            className="h-14 w-auto object-contain drop-shadow-[0_0_20px_rgba(255,204,0,0.5)]"
          />
          {/* Drawing progress hairline */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: DUR.slow, delay: 0.22, ease: EASE.inOut }}
            className="h-px w-28 origin-left bg-gradient-to-r from-[#FFCC00] to-[#FFCC00]/30"
          />
          <p className="text-[10px] font-mono text-on-surface-sublabel tracking-[0.35em] uppercase">{veil.label}</p>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

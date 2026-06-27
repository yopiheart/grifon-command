import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { EASE, DUR } from '../ui/motionTokens';
import { Building2, UtensilsCrossed, ShoppingBag, Play } from 'lucide-react';

// Sample creative only (what a Grifon ad LOOKS like) — illustrative, not real
// campaign data. No performance metrics asserted; the badge states only that the
// creative was built in Grifon.
const FRAMES = [
  {
    label: 'REAL ESTATE',
    icon: Building2,
    hook: 'YOUR DREAM CONDO.',
    hookAccent: 'Closer than you think.',
    cta: 'BOOK A FREE TOUR',
    badge: 'MADE WITH GRIFON',
    bg: 'from-zinc-800 via-zinc-900 to-zinc-950',
  },
  {
    label: 'F&B',
    icon: UtensilsCrossed,
    hook: 'LUTONG BAHAY.',
    hookAccent: 'Delivered in 30.',
    cta: 'ORDER NA',
    badge: 'MADE WITH GRIFON',
    bg: 'from-zinc-900 via-zinc-800 to-zinc-950',
  },
  {
    label: 'E-COMMERCE',
    icon: ShoppingBag,
    hook: 'BIG SALE.',
    hookAccent: 'Ends tonight.',
    cta: 'SHOP NOW',
    badge: 'MADE WITH GRIFON',
    bg: 'from-zinc-800 via-zinc-950 to-zinc-900',
  },
];

const CYCLE_MS = 2800;

/**
 * Hero kinetic ad-output montage: a phone frame cycling through finished
 * Grifon ad frames (CSS-built, zero hosted media). Crossfade via
 * AnimatePresence; static first frame + no interval under reduced motion.
 */
export const AdMontagePhone: React.FC<{ className?: string }> = ({ className = '' }) => {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Subtle parallax drift as the hero scrolls by (transform-only).
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [20, -20]);

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % FRAMES.length), CYCLE_MS);
    return () => clearInterval(id);
  }, [reduceMotion]);

  const frame = FRAMES[index];
  const Icon = frame.icon;

  return (
    <motion.div ref={containerRef} style={reduceMotion ? undefined : { y }} className={className}>
      {/* Phone bezel */}
      <div className="relative mx-auto w-[240px] sm:w-[270px] lg:w-[300px] aspect-[9/19] rounded-[2.75rem] border border-white/15 bg-zinc-900 p-2 shadow-[0_30px_60px_rgba(0,0,0,0.8)]">
        {/* Notch */}
        <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-20 h-4 bg-zinc-950 rounded-full z-20 border border-white/10" />

        {/* Screen */}
        <div className="relative w-full h-full rounded-[2.25rem] overflow-hidden bg-zinc-950">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={reduceMotion ? false : { opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: DUR.slow, ease: EASE.out }}
              className={`absolute inset-0 bg-gradient-to-br ${frame.bg} flex flex-col`}
            >
              {/* Ad chrome: industry tag */}
              <div className="pt-10 px-4 flex items-center justify-between">
                <span className="px-2.5 py-1 bg-zinc-950/60 rounded-full border border-white/10 text-[8px] font-mono text-zinc-300 tracking-widest">
                  {frame.label}
                </span>
                <span className="text-[8px] font-mono text-zinc-500 tracking-widest">AD · 0:15</span>
              </div>

              {/* Creative */}
              <div className="flex-1 flex flex-col items-center justify-center px-5 text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Icon className="w-7 h-7 text-zinc-400" />
                </div>
                <div className="text-white font-black uppercase tracking-tighter text-2xl leading-[0.95]">
                  {frame.hook}
                  <span className="block font-serif italic normal-case tracking-normal text-[#FFCC00] text-xl mt-1">
                    {frame.hookAccent}
                  </span>
                </div>
                <div className="mt-2 px-4 py-2 rounded-full bg-[#FFCC00] text-black text-[9px] font-bold tracking-widest uppercase">
                  {frame.cta}
                </div>
              </div>

              {/* Result badge — existing proof-wall claims only */}
              <div className="pb-5 px-4 flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-[#FFCC00] shadow-[0_0_8px_rgba(255,204,0,0.6)]" />
                <span className="text-[10px] font-mono text-zinc-300 tracking-widest whitespace-nowrap">{frame.badge}</span>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Play affordance — reads as a video ad */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -mt-24 pointer-events-none">
            <div className="w-8 h-8 rounded-full bg-zinc-950/60 border border-white/20 flex items-center justify-center">
              <Play className="w-3 h-3 text-white/70 ml-0.5" fill="currentColor" />
            </div>
          </div>
        </div>

        {/* Frame progress dots */}
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 flex gap-1.5">
          {FRAMES.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${i === index ? 'w-5 bg-[#FFCC00]' : 'w-1.5 bg-zinc-700'}`}
            />
          ))}
        </div>
      </div>

      {/* Output caption */}
      <div className="mt-12 text-center text-[10px] font-mono uppercase tracking-widest text-zinc-500">
        // OUTPUT: COMPLETE VIDEO AD — SCRIPTED, DESIGNED, EXPORTED
      </div>
    </motion.div>
  );
};

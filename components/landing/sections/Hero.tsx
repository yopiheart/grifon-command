import React from 'react';
import { motion } from 'motion/react';
import { Star } from 'lucide-react';
import { GoldButton } from '../../ui/GoldButton';
import { AdMontagePhone } from '../AdMontagePhone';
import { SignatureScribble } from '../SignatureScribble';

interface HeroProps {
  onEnterApp: () => void;
  /** Sentinel observed by PinnedCtaPill — pill appears once the hero scrolls past. */
  heroSentinelRef: React.RefObject<HTMLDivElement>;
}

const lineReveal = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

/**
 * Kinetic ad-output hero: editorial headline (serif accent words must live in
 * <span>s — the global heading LAW in index.html forces Inter 900 uppercase on
 * the h1 itself) + phone montage cycling finished Grifon ads.
 */
export const Hero: React.FC<HeroProps> = ({ onEnterApp, heroSentinelRef }) => (
  <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 px-4 sm:px-6 lg:px-8 min-h-[88vh] flex flex-col justify-center overflow-hidden z-10">
    <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-12 lg:gap-8 items-center">
      {/* Headline column */}
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        transition={{ staggerChildren: 0.08 }}
        className="text-center lg:text-left"
      >
        <motion.p
          variants={lineReveal}
          className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-6"
        >
          // AI MARKETING STUDIO — BUILT FOR FILIPINO BUSINESSES
        </motion.p>

        <h1 className="text-5xl sm:text-6xl md:text-7xl xl:text-8xl font-bold uppercase tracking-tighter leading-[0.9]">
          <motion.span
            variants={lineReveal}
            className="block bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500 pb-1"
          >
            CREATE YOUR ENTIRE AD CAMPAIGN IN
          </motion.span>
          <motion.span variants={lineReveal} className="block mt-2">
            <SignatureScribble variant="underline" delay={0.9}>
              <span className="font-serif italic normal-case tracking-normal text-[#FFCC00]">
                30 minutes.
              </span>
            </SignatureScribble>{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500">
              NOT 3 DAYS.
            </span>
          </motion.span>
        </h1>

        <motion.p
          variants={lineReveal}
          className="mt-7 text-zinc-400 text-base md:text-lg max-w-xl mx-auto lg:mx-0"
        >
          You're spending 6 hours making one ad that doesn't convert. Your competitor just dropped 10. Grifon fixes that.
        </motion.p>

        <motion.div variants={lineReveal} className="mt-9">
          <GoldButton glossy onClick={onEnterApp} className="w-full sm:w-auto text-sm md:text-base px-10 py-4">
            CREATE MY FIRST AD — FREE
          </GoldButton>
          {/* Click-trigger trust row: one last "why believe" at the decision pixel.
              Claims mirror the proof band — nothing new is asserted here. */}
          <div className="mt-4 flex flex-wrap items-center justify-center lg:justify-start gap-x-2 gap-y-1 text-[11px] font-mono uppercase tracking-widest text-zinc-500">
            <span className="flex items-center gap-0.5" aria-label="5 stars">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={11} strokeWidth={0} fill="#FFCC00" />
              ))}
            </span>
            <span>early Filipino business owners</span>
            <span className="text-zinc-700">·</span>
            <span>No credit card needed</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Output column */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
      >
        <AdMontagePhone />
      </motion.div>
    </div>

    {/* Pill trigger sentinel */}
    <div ref={heroSentinelRef} className="absolute bottom-0 h-px w-px" aria-hidden="true" />
  </section>
);

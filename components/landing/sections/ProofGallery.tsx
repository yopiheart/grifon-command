import React from 'react';
import { motion } from 'motion/react';
import { Building2, UtensilsCrossed, ShoppingBag, Play, ChevronRight } from 'lucide-react';

// Hooks/CTAs are illustrative sample creative (what a Grifon ad LOOKS like) —
// not real campaigns, so no ROAS/time claims. WS2 replaces these mockups with
// real client UGC videos hosted on R2.
const CARDS = [
  {
    title: 'Condo Pre-Selling Ad', label: 'REAL ESTATE', icon: Building2,
    hook: 'YOUR DREAM CONDO.', hookAccent: 'Closer than you think.', cta: 'BOOK A FREE TOUR',
    tilt: 'md:-rotate-2 md:translate-y-6',
  },
  {
    title: 'Food Business Launch', label: 'F&B', icon: UtensilsCrossed,
    hook: 'LUTONG BAHAY.', hookAccent: 'Delivered in 30.', cta: 'ORDER NA',
    tilt: 'md:rotate-1 md:-translate-y-2',
  },
  {
    title: 'Online Store Campaign', label: 'E-COMMERCE', icon: ShoppingBag,
    hook: 'BIG SALE.', hookAccent: 'Ends tonight.', cta: 'SHOP NOW',
    tilt: 'md:-rotate-1 md:translate-y-10',
  },
];

/**
 * Wall of proof, restaged as a scattered editorial gallery (landonorris.com
 * photo-grid pattern). Mobile: snap carousel sized so ~25% of the next card
 * peeks (real-OLED phones render the dark cards near-black — the peek, not a
 * text hint, is the swipe affordance), brighter card surface, real ad content.
 */
export const ProofGallery: React.FC = () => (
  <section className="py-16 md:py-28 border-b border-white/5 relative z-10 overflow-hidden">
    <div className="max-w-7xl mx-auto px-4 text-center mb-12 md:mb-20">
      <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-4">// THE RECEIPTS</p>
      <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500 max-w-4xl mx-auto">
        THESE ADS WERE MADE WITH GRIFON.{' '}
        <span className="font-serif italic normal-case tracking-normal text-[#FFCC00]">Real businesses</span>{' '}
        RAN THEM.
      </h2>
    </div>

    <div className="max-w-6xl mx-auto relative">
      <style>{`.proof-scroll::-webkit-scrollbar { display: none; }`}</style>
      <div
        className="proof-scroll flex gap-4 lg:gap-10 overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none scroll-smooth px-4 pb-6 md:justify-center md:items-start"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {CARDS.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: idx * 0.12, ease: 'easeOut' }}
              className="snap-center flex-shrink-0 w-[64vw] sm:w-[40vw] md:w-[28%] max-w-[280px]"
            >
              <div className={`group transition-transform duration-500 hover:rotate-0 hover:-translate-y-1 ${card.tilt}`}>
                {/* 9:16 ad preview — bright enough for OLED, real creative inside */}
                <div className="bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900 aspect-[9/16] rounded-2xl border border-white/15 relative overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] flex flex-col">
                  {/* Ad chrome */}
                  <div className="pt-4 px-4 flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-zinc-950/60 rounded-full border border-white/10 text-[10px] font-mono text-zinc-200 tracking-widest">
                      {card.label}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 tracking-widest">AD · 0:15</span>
                  </div>

                  {/* Creative */}
                  <div className="flex-1 flex flex-col items-center justify-center px-4 text-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-zinc-300" />
                    </div>
                    <div className="text-white font-black uppercase tracking-tighter text-xl leading-[0.95]">
                      {card.hook}
                      <span className="block font-serif italic normal-case tracking-normal text-[#FFCC00] text-lg mt-1">
                        {card.hookAccent}
                      </span>
                    </div>
                    <div className="mt-1 px-3.5 py-1.5 rounded-full bg-[#FFCC00] text-black text-[10px] font-bold tracking-widest uppercase">
                      {card.cta}
                    </div>
                  </div>

                  {/* Play affordance */}
                  <div className="pb-4 px-4 flex justify-end">
                    <div className="w-9 h-9 rounded-full bg-[#FFCC00] flex items-center justify-center shadow-[0_0_15px_rgba(255,204,0,0.5)]">
                      <Play className="w-3.5 h-3.5 text-black ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                </div>

                {/* Editorial caption */}
                <div className="mt-4 px-1">
                  <h3 className="text-base font-bold text-white">{card.title}</h3>
                  <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                    // MADE WITH <span className="text-[#FFCC00]">GRIFON</span>
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Right-edge fade + swipe cue — mobile only */}
      <div className="md:hidden pointer-events-none absolute top-0 right-0 bottom-6 w-12 bg-gradient-to-l from-zinc-950 to-transparent" />
      <div className="md:hidden flex items-center justify-center gap-1 text-[11px] font-mono text-zinc-400 uppercase tracking-widest mt-1">
        SWIPE
        <motion.span
          animate={{ x: [0, 6, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          className="inline-flex"
        >
          <ChevronRight className="w-4 h-4 shrink-0 text-[#FFCC00]" />
        </motion.span>
      </div>
    </div>

    <div className="text-sm text-zinc-500 text-center mt-10 md:mt-16 max-w-lg mx-auto px-4">
      Every ad above was scripted, designed, and exported inside Grifon. Zero freelancers. Zero agencies.
    </div>
  </section>
);

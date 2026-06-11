import React from 'react';
import { motion } from 'motion/react';
import { Building2, UtensilsCrossed, ShoppingBag, Play } from 'lucide-react';

const CARDS = [
  { title: 'Condo Pre-Selling Ad', roas: '4.8×', time: '20 min', label: 'REAL ESTATE', icon: Building2, tilt: 'md:-rotate-2 md:translate-y-6' },
  { title: 'Food Business Launch', roas: '3.2×', time: '15 min', label: 'F&B', icon: UtensilsCrossed, tilt: 'md:rotate-1 md:-translate-y-2' },
  { title: 'Online Store Campaign', roas: '5.1×', time: '25 min', label: 'E-COMMERCE', icon: ShoppingBag, tilt: 'md:-rotate-1 md:translate-y-10' },
];

/**
 * Wall of proof, restaged as a scattered editorial gallery (landonorris.com
 * photo-grid pattern): tilted 9:16 cards with tiny mono captions. Mobile keeps
 * the proven snap carousel.
 */
export const ProofGallery: React.FC = () => (
  <section className="py-16 md:py-28 border-b border-white/5 relative z-10 overflow-hidden">
    <div className="max-w-7xl mx-auto px-4 text-center mb-12 md:mb-20">
      <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-4">// THE RECEIPTS</p>
      <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500 max-w-4xl mx-auto">
        THESE ADS WERE MADE BY AI. THEY{' '}
        <span className="font-serif italic normal-case tracking-normal text-[#FFCC00]">outperformed</span>{' '}
        AGENCIES.
      </h2>
    </div>

    <div className="max-w-6xl mx-auto">
      <style>{`.proof-scroll::-webkit-scrollbar { display: none; }`}</style>
      <div
        className="proof-scroll flex gap-5 lg:gap-10 overflow-x-auto md:overflow-visible snap-x snap-proximity scroll-smooth px-4 pb-6 md:justify-center md:items-start"
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
              className="snap-center flex-shrink-0 w-[72vw] sm:w-[42vw] md:w-[28%] max-w-[300px]"
            >
              <div className={`group transition-transform duration-500 hover:rotate-0 hover:-translate-y-1 ${card.tilt}`}>
                {/* 9:16 ad preview */}
                <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 aspect-[9/16] rounded-2xl border border-white/10 flex items-center justify-center relative overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)]">
                  <div className="absolute inset-0 bg-zinc-950/20 group-hover:bg-transparent transition-colors duration-500" />
                  <Icon className="w-16 h-16 text-zinc-700 z-10" />
                  <div className="absolute top-4 left-4 px-3 py-1 bg-black/50 rounded-full border border-white/10 text-[10px] font-mono text-zinc-300 tracking-widest">
                    {card.label}
                  </div>
                  <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-[#FFCC00] flex items-center justify-center shadow-[0_0_15px_rgba(255,204,0,0.5)]">
                    <Play className="w-3 h-3 text-black ml-0.5" fill="currentColor" />
                  </div>
                </div>

                {/* Editorial caption */}
                <div className="mt-4 px-1">
                  <h3 className="text-base font-bold text-white">{card.title}</h3>
                  <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                    // {card.label} — ROAS <span className="text-[#FFCC00]">{card.roas}</span> — {card.time}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      <div className="md:hidden text-center text-[10px] font-mono text-zinc-600 uppercase tracking-widest mt-2">
        ← swipe →
      </div>
    </div>

    <div className="text-sm text-zinc-500 text-center mt-10 md:mt-16 max-w-lg mx-auto px-4">
      Every ad above was scripted, designed, and exported inside Grifon. Zero freelancers. Zero agencies.
    </div>
  </section>
);

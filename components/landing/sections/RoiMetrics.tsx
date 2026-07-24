import React from 'react';
import { motion } from 'motion/react';
import { DUR } from '../../ui/motionTokens';
import { SignatureScribble } from '../SignatureScribble';

// All four are defensible: ~30-min build (product speed), ₱997 vs agency (real
// pricing), 20+ businesses helped (real 2025 client count), 5 modules (matches
// the Modules section). No fabricated ROAS / time-saved multipliers — Grifon has
// no campaign-performance data to back those.
const METRICS = [
  { metric: '30', label: 'Minutes to a full campaign' },
  { metric: '₱997', label: 'Per month — not ₱30K for an agency', circled: true },
  { metric: '100+', label: "Filipino businesses we've helped" },
  { metric: '5', label: 'AI modules in one app' },
];

export const RoiMetrics: React.FC = () => (
  <section className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 relative z-10">
    <div className="max-w-7xl mx-auto bg-zinc-900/30 backdrop-blur-xl border border-white/5 rounded-3xl sm:rounded-[40px] p-8 sm:p-12 md:p-16">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: DUR.entrance }}
      >
        <p className="text-[10px] font-mono text-on-surface-sublabel uppercase tracking-[0.25em] text-center mb-2">// PROOF</p>
        <h2 className="text-2xl md:text-4xl font-bold text-center mb-10 md:mb-16 uppercase tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500">
          THE NUMBERS DON'T{' '}
          <span className="font-serif italic normal-case tracking-normal text-[#FFCC00]">lie.</span>
        </h2>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center">
        {METRICS.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: DUR.entrance, delay: idx * 0.1 }}
            className="flex flex-col items-center"
          >
            <div className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[#FFCC00] tracking-tighter leading-none">
              {item.circled ? (
                <SignatureScribble variant="circle" delay={0.6} strokeWidth={2.5}>
                  {item.metric}
                </SignatureScribble>
              ) : (
                item.metric
              )}
            </div>
            <div className="text-xs md:text-sm text-zinc-400 mt-3 md:mt-5 max-w-[180px]">{item.label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

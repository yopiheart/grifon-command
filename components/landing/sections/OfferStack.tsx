import React from 'react';
import { motion } from 'motion/react';
import { DUR } from '../../ui/motionTokens';
import { ArrowRight } from 'lucide-react';
import { GlassPanel } from '../../ui/GlassPanel';
import { GoldButton } from '../../ui/GoldButton';
import { SignatureScribble } from '../SignatureScribble';
import { PRO_VALUE_STACK, PRO_VALUE_TOTAL, PRO_PRICE_LABEL, FOUNDING_NOTE } from '../../../config/valueStack';

interface OfferStackProps {
  onNavigatePricing: () => void;
  /** Observed by PinnedCtaPill — pill hides while this section is on screen. */
  sectionRef: React.RefObject<HTMLElement>;
}

/**
 * Final CTA offer stack. The crossed-out prices are the scribble system's money
 * moment: a gold signature strike draws across each value on scroll.
 */
export const OfferStack: React.FC<OfferStackProps> = ({ onNavigatePricing, sectionRef }) => (
  <section ref={sectionRef} className="py-16 md:py-32 px-4 sm:px-6 lg:px-8 relative z-10">
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: DUR.expressive }}
      >
        <GlassPanel className="p-8 md:p-16 text-center bg-gradient-to-b from-zinc-900/80 to-zinc-950 border border-[#FFCC00]/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FFCC00] to-transparent"></div>

          <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500">
            READY TO CREATE ADS THAT ACTUALLY{' '}
            <span className="font-serif italic normal-case tracking-normal text-[#FFCC00]">convert?</span>
          </h2>

          <div className="space-y-4 mb-12 text-left max-w-md mx-auto">
            {PRO_VALUE_STACK.map((entry, idx) => (
              <motion.div
                key={entry.item}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: DUR.slow, delay: idx * 0.06 }}
                className="flex items-center justify-between border-b border-white/10 pb-4"
              >
                <span className="text-zinc-400">{entry.item}</span>
                <SignatureScribble variant="strike" delay={0.4 + idx * 0.12} strokeWidth={2.5}>
                  <span className="font-mono text-zinc-500">{entry.value}</span>
                </SignatureScribble>
              </motion.div>
            ))}
            <div className="flex items-center justify-between gap-4 pt-4">
              <span className="text-lg md:text-xl font-bold whitespace-nowrap">TOTAL VALUE</span>
              <SignatureScribble variant="strike" delay={1.2} strokeWidth={3}>
                <span className="font-mono text-lg md:text-xl font-bold text-zinc-400 whitespace-nowrap">{PRO_VALUE_TOTAL}</span>
              </SignatureScribble>
            </div>
            {/* The anchor: ₱135k of deliverables, yours on Pro for a fraction. */}
            <div className="flex flex-col items-center gap-1.5 pt-7">
              <span className="text-base md:text-lg text-zinc-300 text-center">
                Everything above — yours on <span className="font-bold text-white">Pro</span> for{' '}
                <span className="font-bold text-[#FFCC00]">{PRO_PRICE_LABEL}</span>
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#FFCC00]/80 text-center">
                {FOUNDING_NOTE}
              </span>
            </div>
          </div>

          <GoldButton glossy onClick={onNavigatePricing} className="w-full md:w-auto text-lg md:text-xl px-12 py-6">
            <span className="inline-flex items-center justify-center gap-3">
              SEE ALL PLANS
              <ArrowRight className="w-5 h-5 shrink-0" />
            </span>
          </GoldButton>
          <p className="text-[10px] font-mono text-zinc-500 mt-6 tracking-widest uppercase">
            // 7-DAY MONEY-BACK — KEEP THE PLAN • SECURE CHECKOUT
          </p>
        </GlassPanel>
      </motion.div>
    </div>
  </section>
);

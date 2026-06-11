import React from 'react';
import { motion } from 'motion/react';
import { GlassPanel } from '../../ui/GlassPanel';
import { GoldButton } from '../../ui/GoldButton';
import { SignatureScribble } from '../SignatureScribble';

interface OfferStackProps {
  onNavigatePricing: () => void;
  /** Observed by PinnedCtaPill — pill hides while this section is on screen. */
  sectionRef: React.RefObject<HTMLElement>;
}

const LINE_ITEMS = [
  { name: 'Director AI Studio Access', value: '₱24,000/yr' },
  { name: 'Market Research Engine', value: '₱18,000/yr' },
  { name: 'Offer Optimizer', value: '₱12,000/yr' },
  { name: 'Caption & Headline Generator', value: '₱6,000/yr' },
  { name: 'Image Studio', value: '₱6,000/yr' },
];

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
        transition={{ duration: 0.8 }}
      >
        <GlassPanel className="p-8 md:p-16 text-center bg-gradient-to-b from-zinc-900/80 to-zinc-950 border border-[#FFCC00]/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FFCC00] to-transparent"></div>

          <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500">
            READY TO CREATE ADS THAT ACTUALLY{' '}
            <span className="font-serif italic normal-case tracking-normal text-[#FFCC00]">convert?</span>
          </h2>

          <div className="space-y-4 mb-12 text-left max-w-md mx-auto">
            {LINE_ITEMS.map((item, idx) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="flex items-center justify-between border-b border-white/10 pb-4"
              >
                <span className="text-zinc-400">{item.name}</span>
                <SignatureScribble variant="strike" delay={0.4 + idx * 0.15} strokeWidth={2.5}>
                  <span className="font-mono text-zinc-500">{item.value}</span>
                </SignatureScribble>
              </motion.div>
            ))}
            <div className="flex items-center justify-between pt-4">
              <span className="text-xl font-bold">TOTAL VALUE</span>
              <SignatureScribble variant="strike" delay={1.2} strokeWidth={3}>
                <span className="font-mono text-xl font-bold text-zinc-400">₱66,000/yr</span>
              </SignatureScribble>
            </div>
            <div className="flex items-center justify-center pt-6">
              <span className="text-lg font-bold text-white text-center uppercase tracking-tighter">
                PLANS FROM FREE TO BUSINESS
              </span>
            </div>
          </div>

          <GoldButton onClick={onNavigatePricing} className="w-full md:w-auto text-lg md:text-xl px-12 py-6 shadow-[0_0_40px_rgba(255,204,0,0.4)]">
            SEE ALL PLANS →
          </GoldButton>
          <p className="text-[10px] font-mono text-zinc-500 mt-6 tracking-widest uppercase">
            // SECURE 256-BIT ENCRYPTION • 7-DAY GUARANTEE
          </p>
        </GlassPanel>
      </motion.div>
    </div>
  </section>
);

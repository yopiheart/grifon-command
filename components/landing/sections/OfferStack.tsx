import React from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, Check } from 'lucide-react';
import { GoldButton } from '../../ui/GoldButton';
import { GlassPanel } from '../../ui/GlassPanel';
import { DUR, EASE } from '../../ui/motionTokens';
import { PRO_PRICE_LABEL } from '../../../config/valueStack';

interface OfferStackProps {
  onNavigatePricing: () => void;
  sectionRef: React.RefObject<HTMLElement>;
}

export const OfferStack: React.FC<OfferStackProps> = ({ onNavigatePricing, sectionRef }) => (
  <section ref={sectionRef} className="landing-plan landing-shell">
    <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: DUR.entrance, ease: EASE.expressive }}>
      <GlassPanel className="landing-plan-panel p-0">
        <div>
          <p className="landing-eyebrow">A little idea. Room to grow.</p>
          <h2 className="landing-section-title">Find your<br /><span className="font-serif italic normal-case tracking-normal text-[#FFCC00]">next chapter.</span></h2>
          <p className="landing-plan-description">Preview your first ad plan for free. Choose the production capacity that fits your business when you are ready to create more.</p>
          <GoldButton glossy onClick={onNavigatePricing} className="landing-primary">
            <span>Explore the plans <ArrowUpRight size={18} aria-hidden="true" /></span>
          </GoldButton>
        </div>
        <div className="landing-plan-detail">
          <p className="landing-eyebrow">For a regular content rhythm</p>
          <p className="landing-plan-name">Grifon Pro</p>
          <p className="landing-plan-price">{PRO_PRICE_LABEL}</p>
          <ul>
            {['8 finished video ads per month', 'Director mode and AI editing tools', 'Research, scripts, images, and captions'].map(item => <li key={item}><Check size={17} aria-hidden="true" />{item}</li>)}
          </ul>
          <p className="landing-plan-footnote">Compare all plan limits and payment options on the pricing page.</p>
        </div>
      </GlassPanel>
    </motion.div>
  </section>
);

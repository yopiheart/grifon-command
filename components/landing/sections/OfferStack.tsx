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
          <p className="landing-eyebrow">Start with a plan. Pay for production.</p>
          <h2 className="landing-section-title">Start small.<br /><span className="font-serif italic normal-case tracking-normal text-[#FFCC00]">Create more.</span></h2>
          <p className="landing-plan-description">Preview your first ad plan for free. Starter includes one finished video ad a month. Choose Pro when you need a regular flow of creative and more editing control.</p>
          <GoldButton glossy onClick={onNavigatePricing} className="landing-primary">
            <span>Compare the plans <ArrowUpRight size={18} aria-hidden="true" /></span>
          </GoldButton>
        </div>
        <div className="landing-plan-detail">
          <p className="landing-eyebrow">For owners creating ads regularly</p>
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

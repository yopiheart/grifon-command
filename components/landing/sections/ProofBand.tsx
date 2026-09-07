import React from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Layers3, ArrowUpRight } from 'lucide-react';
import { DUR, EASE } from '../../ui/motionTokens';
import { CreamBand } from '../CreamBand';

const STEPS = [
  { num: '01', title: 'Start with your business.', desc: 'Tell Grifon what you sell, who it is for, and what makes it different. Your idea is the starting point.', icon: MessageSquare },
  { num: '02', title: 'See the idea take shape.', desc: 'Research, an offer, a script, and a storyboard come together in one guided workflow. Review your ad plan for free.', icon: Layers3 },
  { num: '03', title: 'Make your next move.', desc: 'Choose a paid plan to create a finished video ad. Download your creative and publish it on your own channels.', icon: ArrowUpRight },
];

export const ProofBand: React.FC = () => (
  <CreamBand>
    <section id="how-it-works" tabIndex={-1} className="landing-process landing-shell">
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }} transition={{ duration: DUR.entrance, ease: EASE.expressive }}
        className="landing-process-heading">
        <p className="landing-eyebrow">01 / A simpler way to create</p>
        <h2 className="landing-section-title">Your idea.<br />A complete production.</h2>
        <p>You bring the business. Grifon brings the pieces together.</p>
      </motion.div>
      <div className="landing-process-grid">
        {STEPS.map((step, index) => (
          <motion.article key={step.num} initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: DUR.entrance, delay: index * DUR.instant, ease: EASE.expressive }}>
            <div className="landing-process-meta"><span>{step.num}</span><step.icon size={22} aria-hidden="true" /></div>
            <h3>{step.title}</h3><p>{step.desc}</p>
          </motion.article>
        ))}
      </div>
      <p className="landing-process-note">Start with One-Shot Ad. Explore Director mode on Pro when you want more control over each scene.</p>
    </section>
  </CreamBand>
);

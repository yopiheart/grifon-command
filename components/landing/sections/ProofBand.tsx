import React from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Layers3, ArrowUpRight } from 'lucide-react';
import { DUR, EASE } from '../../ui/motionTokens';
import { CreamBand } from '../CreamBand';

const STEPS = [
  { num: '01', title: 'Tell us what you sell.', desc: 'Start with your product, service, or property listing. Add your offer and the details that make your business different.', icon: MessageSquare },
  { num: '02', title: 'Review your free ad plan.', desc: 'See the research, script, and storyboard together. Check the direction and business details before paying to create the video.', icon: Layers3 },
  { num: '03', title: 'Create a video you can post.', desc: 'Choose a paid plan to turn your ad plan into a finished video. Review it, download it, and publish it on your own channels.', icon: ArrowUpRight },
];

export const ProofBand: React.FC = () => (
  <CreamBand>
    <section id="how-it-works" tabIndex={-1} className="landing-process landing-shell">
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }} transition={{ duration: DUR.entrance, ease: EASE.expressive }}
        className="landing-process-heading">
        <p className="landing-eyebrow">01 / From your business to your ad</p>
        <h2 className="landing-section-title">You know your business.<br />Start your ad here.</h2>
        <p>For owners who already have something to sell, but need help turning it into an ad. You can start on your own or with a small team.</p>
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

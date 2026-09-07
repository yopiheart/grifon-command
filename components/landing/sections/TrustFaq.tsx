import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { CONTACT } from '../../../config/contact';
import { DUR, EASE } from '../../ui/motionTokens';

const FAQS = [
  { q: 'Do I need design or editing experience?', a: 'You can start with a description of your business. Grifon guides you through the ad plan, script, scenes, and creative. You review the work as you go.' },
  { q: 'What can I try for free?', a: 'The Free plan includes one complete ad plan per month, available to preview. Creating and downloading a finished video ad requires a paid plan.' },
  { q: 'How many video ads can I create?', a: 'Starter includes one finished video ad per month, Pro includes eight, and Business includes fifteen. Each plan also has its own workflow and tool limits. The pricing page lists the full breakdown.' },
  { q: 'Can I control the creative direction?', a: 'Start with the guided One-Shot Ad workflow, or use Director mode on Pro for more control over the script, storyboard, and scenes.' },
  { q: 'What if it is not right for my business?', a: 'Paid plans include a 7-day money-back guarantee. Review the refund policy for the terms, or contact our team if you need help choosing a plan.' },
];

export const TrustFaq: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="landing-faq landing-shell">
      <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }} transition={{ duration: DUR.entrance, ease: EASE.expressive }}
        className="landing-faq-layout">
        <div className="landing-faq-intro">
          <p className="landing-eyebrow">Before your first ad</p>
          <h2 className="landing-section-title">Good questions.<br /><span className="font-serif italic normal-case tracking-normal text-[#FFCC00]">Clear answers.</span></h2>
          <p>Still thinking it through? Talk to our team.</p>
          <a href={CONTACT.messengerUrl} target="_blank" rel="noopener noreferrer" className="landing-text-link">
            Chat on Messenger <ArrowUpRight size={17} aria-hidden="true" />
          </a>
          <div className="landing-guarantee"><ShieldCheck size={20} aria-hidden="true" /><span>7-day money-back guarantee<br /><small>On paid plans. Refund policy applies.</small></span></div>
        </div>
        <div className="landing-faq-list">
          {FAQS.map((faq, index) => (
            <div key={faq.q} className="landing-faq-item" data-open={open === index}>
              <h3>
                <button type="button" aria-expanded={open === index} aria-controls={`landing-answer-${index}`}
                  id={`landing-question-${index}`} onClick={() => setOpen(open === index ? null : index)}>
                  <span className="landing-faq-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <span>{faq.q}</span><Plus size={20} aria-hidden="true" />
                </button>
              </h3>
              <div className="landing-faq-answer" id={`landing-answer-${index}`} role="region"
                aria-labelledby={`landing-question-${index}`} aria-hidden={open !== index}>
                <div><p>{faq.a}</p></div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

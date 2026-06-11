import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, ChevronDown } from 'lucide-react';
import { AnimatedBorder } from '../../ui/AnimatedBorder';
import { CONTACT } from '../../../config/contact';

const FAQS = [
  { q: 'DO I NEED ANY TECHNICAL SKILLS?', a: 'No. If you can type what you sell, Grifon does the rest. No design skills. No copywriting experience. No video editing.' },
  { q: 'HOW IS THIS DIFFERENT FROM CANVA OR CHATGPT?', a: 'Canva gives you templates. ChatGPT gives you generic text. Neither gives you market research, ad strategy, or a complete campaign. Grifon does all of it in one app.' },
  { q: 'IS THERE A LIMIT ON WHAT I CAN CREATE?', a: 'Yes. Each plan has specific limits. Free gives you 3 ad workflows per month. Creator gives you 15. Pro gives you 40 plus video ads. See the pricing page for full details.' },
  { q: "WHAT IF IT DOESN'T WORK FOR MY BUSINESS?", a: "Every paid plan has a 7-day money-back guarantee. If it doesn't save you time, you get a full refund." },
];

/** Guarantee + FAQ + Viber CTA — content unchanged from the proven page. */
export const TrustFaq: React.FC = () => (
  <section className="py-12 md:py-24 px-4 sm:px-6 lg:px-8 relative z-10">
    <div className="max-w-4xl mx-auto space-y-16">
      {/* The Guarantee */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <AnimatedBorder containerClassName="h-full w-full" className="p-8 md:p-12 text-center bg-zinc-900/80 backdrop-blur-xl relative overflow-hidden">
          <ShieldCheck className="w-12 h-12 text-[#FFCC00] mb-4 mx-auto" />
          <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tight mb-4 text-[#FFCC00]">
            7-DAY MONEY-BACK GUARANTEE
          </h2>
          <p className="text-zinc-300 md:text-lg max-w-2xl mx-auto">
            Subscribe to any paid plan. If Grifon doesn't save you at least 10 hours in your first week, we'll refund you 100%. No questions. No hoops.
          </p>
        </AnimatedBorder>
      </motion.div>

      {/* The FAQ */}
      <motion.div
        id="faq"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="scroll-mt-28 space-y-4"
      >
        <h3 className="text-2xl font-bold uppercase tracking-tight mb-8 text-center">FREQUENTLY ASKED QUESTIONS</h3>
        {FAQS.map((faq, idx) => (
          <details key={idx} className="group bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex items-center justify-between p-6 cursor-pointer font-bold uppercase tracking-wide hover:bg-white/5 transition-colors">
              {faq.q}
              <ChevronDown className="w-5 h-5 text-zinc-500 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="p-6 pt-0 text-zinc-400 border-t border-white/5">
              {faq.a}
            </div>
          </details>
        ))}
      </motion.div>

      {/* Viber CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center"
      >
        <div className="inline-flex flex-col items-center gap-4 p-8 border border-white/5 rounded-2xl bg-zinc-950/50 backdrop-blur-sm">
          <p className="text-zinc-400">Still have questions? Our onboarding team is standing by.</p>
          <a href={CONTACT.viberUrl} target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-full border border-white/20 text-white font-mono text-xs tracking-widest uppercase hover:bg-white/10 transition-colors flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20.144 19.382c-.105-.084-.21-.168-.315-.252-.42-.336-.84-.672-1.26-1.008-.315-.252-.63-.504-.945-.756-.105-.084-.21-.168-.315-.252-.21-.168-.42-.252-.63-.168-.21.084-.42.252-.525.42-.21.336-.42.672-.63 1.008-.105.168-.21.336-.315.504-.105.168-.21.252-.42.252-.105 0-.21-.084-.315-.168-.42-.252-.84-.504-1.26-.756-1.155-.756-2.205-1.68-3.15-2.73-.84-.945-1.575-1.995-2.1-3.15-.105-.21-.21-.42-.315-.63-.084-.21 0-.42.168-.525.168-.105.336-.21.504-.315.336-.21.672-.42 1.008-.63.168-.105.252-.315.336-.525.084-.21 0-.42-.084-.63-.084-.105-.168-.21-.252-.315-.252-.315-.504-.63-.756-.945-.336-.42-.672-.84-1.008-1.26-.084-.105-.168-.21-.252-.315-.168-.21-.336-.21-.525-.168-.21.084-.42.252-.525.42-.21.21-.42.42-.63.63-.336.336-.672.672-.945 1.008-.21.21-.315.42-.42.63-.105.336-.105.672-.105 1.008 0 .42.105.84.21 1.26.21 1.05.525 2.1.945 3.15.84 2.1 1.995 3.99 3.36 5.67 1.47 1.785 3.15 3.36 5.145 4.62 1.47.945 3.045 1.68 4.725 2.1.63.105 1.26.21 1.89.21.42 0 .84 0 1.26-.105.42-.105.84-.21 1.155-.42.336-.21.672-.42.84-.756.21-.336.42-.672.63-1.008.105-.21.21-.42.21-.63.084-.21 0-.42-.168-.525zM24 10.038c0-5.544-4.494-10.038-10.038-10.038S3.924 4.494 3.924 10.038c0 1.68.42 3.255 1.155 4.725l-1.47 4.41 4.515-1.47c1.47.735 3.045 1.155 4.725 1.155 5.544 0 10.038-4.494 10.038-10.038zm-2.1 0c0 4.41-3.57 7.98-7.98 7.98-1.47 0-2.835-.42-4.095-1.05l-.315-.105-2.94.945.945-2.94-.21-.315c-.735-1.26-1.155-2.73-1.155-4.2 0-4.41 3.57-7.98 7.98-7.98s7.98 3.57 7.98 7.98z"/></svg>
            CHAT ON VIBER
          </a>
        </div>
      </motion.div>
    </div>
  </section>
);

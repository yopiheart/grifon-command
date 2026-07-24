import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, ChevronDown } from 'lucide-react';
import { AnimatedBorder } from '../../ui/AnimatedBorder';
import { GlassPanel } from '../../ui/GlassPanel';
import { CONTACT } from '../../../config/contact';
import { MessengerIcon } from '../SocialIcons';

const FAQS = [
  { q: 'DO I NEED ANY TECHNICAL SKILLS?', a: 'No. If you can type what you sell, Grifon does the rest. No design skills. No copywriting experience. No video editing.' },
  { q: 'HOW IS THIS DIFFERENT FROM CANVA OR CHATGPT?', a: 'Canva gives you templates. ChatGPT gives you generic text. Neither gives you market research, ad strategy, or a complete campaign. Grifon does all of it in one app.' },
  { q: 'IS THERE A LIMIT ON WHAT I CAN CREATE?', a: 'Yes — each plan has its own limits. Free gives you 1 complete ad plan a month (preview only). Starter adds 1 finished video ad, Pro gives you 40 workflows and 8 finished video ads a month, and Business 100 workflows and 15. See the pricing page for the full breakdown.' },
  { q: "WHAT IF IT DOESN'T WORK FOR MY BUSINESS?", a: "Every paid plan has a 7-day money-back guarantee. Generate your first ad — if it's not something you'd actually run, get a full refund and keep the plan." },
];

/** Guarantee + FAQ + Messenger support CTA with a live presence indicator. */
export const TrustFaq: React.FC = () => (
  <section className="py-12 md:py-24 px-4 sm:px-6 lg:px-8 relative z-10">
    <div className="max-w-4xl mx-auto space-y-16">
      {/* The Guarantee */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <AnimatedBorder intense containerClassName="h-full w-full" className="p-8 md:p-12 text-center bg-zinc-900/80 backdrop-blur-xl relative overflow-hidden">
          <ShieldCheck className="w-12 h-12 text-[#FFCC00] mb-4 mx-auto" />
          <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tight mb-4 text-[#FFCC00]">
            7-DAY MONEY-BACK GUARANTEE
          </h2>
          <p className="text-zinc-300 md:text-lg max-w-2xl mx-auto">
            Subscribe to any paid plan and generate your first ad. If it's not something you'd actually run, get a full refund within 7 days — and keep the ad plan either way. No questions. No hoops.
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
              <ChevronDown className="w-5 h-5 shrink-0 ml-4 text-on-surface-sublabel group-open:rotate-180 transition-transform" />
            </summary>
            <div className="p-6 pt-0 text-zinc-400 border-t border-white/5">
              {faq.a}
            </div>
          </details>
        ))}
      </motion.div>

      {/* Support CTA — Messenger (works today), on-brand with a live presence dot */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center"
      >
        {/* Static glass (not AnimatedBorder) — deliberately distinct from the rotating-light
            guarantee box so the two don't read as twins. The pulsing dot carries the life. */}
        <GlassPanel className="inline-flex flex-col items-center gap-4 p-6 md:p-8">
          {/* Live presence indicator — functional status semaphore, not a brand accent */}
          <span className="flex items-center gap-2 text-[10px] text-on-surface-sublabel font-mono uppercase tracking-widest">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Onboarding team · Online
          </span>
          <p className="text-zinc-400">Still have questions? Our onboarding team is standing by.</p>
          <a
            href={CONTACT.messengerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full bg-zinc-950 border border-white/10 px-6 py-3 text-white font-mono text-xs tracking-widest uppercase transition-all hover:scale-[1.02] hover:border-[#FFCC00]/60 hover:bg-[#FFCC00]/5"
          >
            <MessengerIcon className="h-5 w-5 shrink-0 text-[#0084FF]" />
            Chat on Messenger
          </a>
        </GlassPanel>
      </motion.div>
    </div>
  </section>
);

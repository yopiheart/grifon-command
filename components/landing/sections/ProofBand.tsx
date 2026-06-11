import React from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Palette, Sparkles, Rocket, Star } from 'lucide-react';
import { CreamBand } from '../CreamBand';
import { SignatureScribble } from '../SignatureScribble';

const STEPS = [
  { num: '01', title: 'Tell Us Your Product', desc: 'Describe what you sell. Grifon analyzes your market, competitors, and ideal customer in seconds.', icon: MessageSquare },
  { num: '02', title: 'Pick Your Style', desc: 'Choose your ad format — video, image, carousel. Select tone, audience, and platform.', icon: Palette },
  { num: '03', title: 'Generate Everything', desc: 'Scripts, captions, images, headlines, offers — all generated in one workflow.', icon: Sparkles },
  { num: '04', title: 'Launch And Win', desc: 'Download your assets. Post them. Start converting. The whole process takes 30 minutes.', icon: Rocket },
];

const TESTIMONIALS = [
  { quote: <>Gumawa ako ng 5 video ads sa isang hapon. Before, 1 lang ginagawa ko per week.</>, name: 'Mark R.', role: 'Online Seller, Cebu' },
  { quote: <>Yung Market Research niya, mas detailed pa sa agency na <SignatureScribble variant="circle" strokeWidth={2.5}>₱30K/month</SignatureScribble> ko before.</>, name: 'Jessa L.', role: 'Food Business Owner, Manila' },
  { quote: <>Hindi ko kailangan mag-hire ng editor. Grifon does everything na.</>, name: 'Carlo D.', role: 'Freelance Marketer, Davao' },
];

/**
 * THE single light section (DESIGN.md marketing light band exception):
 * how-it-works + Taglish testimonials staged as printed editorial —
 * solid white cards, oversized serif numerals, serif pull-quotes.
 */
export const ProofBand: React.FC = () => (
  <CreamBand>
    {/* How it works */}
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-28 pb-12 md:pb-20">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12 md:mb-16"
      >
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-4">// HOW IT WORKS</p>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold uppercase tracking-tight leading-tight max-w-4xl mx-auto text-zinc-900">
          4 STEPS.{' '}
          <span className="font-serif italic normal-case tracking-normal text-[#B28F00]">30 minutes.</span>{' '}
          ONE COMPLETE AD CAMPAIGN.
        </h2>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {STEPS.map((step, idx) => (
          <motion.div
            key={step.num}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: idx * 0.1 }}
            className="bg-white border border-zinc-900/10 rounded-3xl p-7 flex flex-col h-full"
          >
            <div className="font-serif italic text-6xl leading-none text-zinc-900/10 mb-4 select-none">{step.num}</div>
            <step.icon className="w-9 h-9 text-[#B28F00] mb-4" />
            <h3 className="text-lg font-bold text-zinc-900 mb-2">{step.title}</h3>
            <p className="text-sm text-zinc-600 leading-relaxed flex-1">{step.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>

    {/* Testimonials — editorial pull quotes */}
    <div id="reviews" className="scroll-mt-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 md:pb-28">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12 md:mb-16 border-t border-zinc-900/10 pt-14 md:pt-20"
      >
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-4">// WHAT EARLY USERS ARE SAYING</p>
        <h2 className="text-2xl md:text-4xl font-bold uppercase tracking-tight text-zinc-900">
          TRUSTED BY FILIPINO BUSINESS OWNERS
        </h2>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
        {TESTIMONIALS.map((t, idx) => (
          <motion.figure
            key={idx}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: idx * 0.12 }}
            className="border-l-2 border-[#FFCC00] pl-6 flex flex-col"
          >
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={16} strokeWidth={0} fill="#FFCC00" />
              ))}
            </div>
            <blockquote className="font-serif italic text-xl md:text-2xl leading-snug text-zinc-900 flex-1">
              “{t.quote}”
            </blockquote>
            <figcaption className="mt-5">
              <div className="text-zinc-900 font-bold text-sm">{t.name}</div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mt-1">{t.role}</div>
            </figcaption>
          </motion.figure>
        ))}
      </div>
    </div>
  </CreamBand>
);

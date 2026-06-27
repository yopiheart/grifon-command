import React from 'react';
import { motion } from 'motion/react';
import { DUR } from '../../ui/motionTokens';
import { MessageSquare, Sparkles, Rocket, SlidersHorizontal } from 'lucide-react';
import { CreamBand } from '../CreamBand';

// One-shot is the signature motion: one description in, a complete ad out.
// Beat 2 stays honest to the Free tripwire — the full ad is generated and free
// to PREVIEW; the finished, watermark-free video is the Starter/Pro unlock
// (Free is video_ads: 0 in utils/planGate.ts). Director's 8-step manual control
// is positioned as the Pro power-up below, not as the default path.
const STEPS = [
  {
    num: '01',
    title: 'Describe your business',
    desc: 'Tell Grifon what you sell and who you sell to. One short description — no brief, no agency meeting, no blank page.',
    icon: MessageSquare,
  },
  {
    num: '02',
    title: 'Grifon builds your complete ad',
    desc: 'In one shot, ~30 minutes: market research, a winning script, storyboard, captions, and creative. Watch it appear — free to preview.',
    icon: Sparkles,
  },
  {
    num: '03',
    title: 'Unlock it and launch',
    desc: 'Love what you see? Unlock the finished, watermark-free video, download, and post. Real inquiries start rolling in.',
    icon: Rocket,
  },
];

/**
 * THE single light section (DESIGN.md marketing light band exception):
 * how-it-works staged as printed editorial — solid white cards, oversized
 * serif numerals. Reframed around the one-shot signature (3 beats); Director
 * mode is the Pro upsell underneath. Testimonials live in the ReceiptsRail.
 */
export const ProofBand: React.FC = () => (
  <CreamBand>
    {/* How it works */}
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-28 pb-16 md:pb-28">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: DUR.entrance }}
        className="text-center mb-12 md:mb-16"
      >
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-4">// HOW IT WORKS</p>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold uppercase tracking-tight leading-tight max-w-4xl mx-auto text-zinc-900">
          ONE SHOT.{' '}
          <span className="font-serif italic normal-case tracking-normal text-[#B28F00]">30 minutes.</span>{' '}
          A COMPLETE AD.
        </h2>
        <p className="mt-5 text-base md:text-lg text-zinc-600 max-w-2xl mx-auto">
          No timeline. No freelancers. You describe it once — Grifon builds the whole thing.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {STEPS.map((step, idx) => (
          <motion.div
            key={step.num}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: DUR.entrance, delay: idx * 0.1 }}
            className="bg-white border border-zinc-900/10 rounded-3xl p-7 flex flex-col h-full"
          >
            <div className="font-serif italic text-6xl leading-none text-zinc-900/10 mb-4 select-none">{step.num}</div>
            <step.icon className="w-9 h-9 text-[#B28F00] mb-4" />
            <h3 className="text-lg font-bold text-zinc-900 mb-2">{step.title}</h3>
            <p className="text-sm text-zinc-600 leading-relaxed flex-1">{step.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Director-mode = the Pro power-up (reinforces Pro as the hero tier). */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: DUR.slow, delay: 0.2 }}
        className="mt-8 flex items-center justify-center"
      >
        <div className="inline-flex items-center gap-3 rounded-full border border-zinc-900/10 bg-white/70 px-5 py-3 text-sm text-zinc-700">
          <SlidersHorizontal className="w-4 h-4 shrink-0 text-[#B28F00]" />
          <span>
            Want to direct every scene yourself?{' '}
            <span className="font-bold text-zinc-900">Director mode</span> gives you frame-by-frame control — on Pro.
          </span>
        </div>
      </motion.div>
    </div>

  </CreamBand>
);

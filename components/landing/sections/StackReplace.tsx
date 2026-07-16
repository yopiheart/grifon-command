import React from 'react';
import { motion } from 'motion/react';
import { DUR } from '../../ui/motionTokens';
import { PenLine, AudioLines, Clapperboard, ImageIcon, BarChart3, Target, Scissors } from 'lucide-react';

// The software-consolidation anchor (distinct from the deliverable value stack):
// one subscription replaces a whole rack of separate AI tools. Framed by
// CAPABILITY, never by engine/provider name — the underlying engines are a
// protected secret (see tools/check-bundle-leak.mjs + the hidden-engine-names
// decision in workflows/pricing_unit_economics.md). The ~USD figures are typical
// market prices for each TOOL CATEGORY (not Grifon's cost), used as an anchor.
const TOOLS = [
  { cap: 'AI Scriptwriter & Copywriter', solo: '≈ $20/mo', icon: PenLine },
  { cap: 'AI Voiceover', solo: '≈ $22/mo', icon: AudioLines },
  { cap: 'AI Video Generator', solo: '≈ $30/mo', icon: Clapperboard },
  { cap: 'AI Image Generator', solo: '≈ $20/mo', icon: ImageIcon },
  { cap: 'Market Research AI', solo: '≈ $30/mo', icon: BarChart3 },
  { cap: 'Offer & Funnel Strategist', solo: 'a paid consultant', icon: Target },
];

/**
 * "Replaces your whole AI stack" — the consolidation anchor. Sits after the
 * Modules grid (what you get) and before the ROI metrics. Capability-framed so
 * it never leaks the engine stack or reads as "just a wrapper."
 */
export const StackReplace: React.FC = () => (
  <section className="py-12 md:py-16 px-4 sm:px-6 lg:px-8 relative z-10">
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: DUR.entrance }}
        className="text-center mb-12 md:mb-16"
      >
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-4">// REPLACES YOUR WHOLE AI STACK</p>
        <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tight leading-tight max-w-3xl mx-auto bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500">
          SIX AI TOOLS + YOUR VIDEO EDITOR.{' '}
          <span className="font-serif italic normal-case tracking-normal text-[#FFCC00]">Or one Grifon.</span>
        </h2>
        <p className="mt-5 text-base md:text-lg text-zinc-400 max-w-2xl mx-auto">
          No more juggling a separate tool — or a freelancer — for every step. All of it, built for Filipino businesses, in one app.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {TOOLS.map((tool, idx) => (
          <motion.div
            key={tool.cap}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: DUR.slow, delay: idx * 0.07 }}
            className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-900/40 backdrop-blur-sm p-5 md:p-6"
          >
            <tool.icon className="w-7 h-7 text-[#FFCC00]" />
            <div className="text-sm md:text-base font-bold text-white leading-tight">{tool.cap}</div>
            <div className="mt-auto flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              <span className="line-through decoration-zinc-600">{tool.solo}</span>
              <span className="text-[#FFCC00]">included</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Featured: the AI video editor — the band's hero (the single biggest
          labor cost it kills). Filipino-first framing per the leadership-claim
          decision; we do NOT claim "first in PH" (unverifiable). */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: DUR.slow, delay: 0.1 }}
        className="mt-4 flex flex-col gap-4 rounded-2xl border border-[#FFCC00]/30 bg-gradient-to-br from-[#FFCC00]/10 to-zinc-900/40 backdrop-blur-sm p-6 md:p-7 sm:flex-row sm:items-center"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#FFCC00]/30 bg-[#FFCC00]/15">
          <Scissors className="w-6 h-6 text-[#FFCC00]" />
        </div>
        <div className="flex-1">
          <div className="text-lg md:text-xl font-bold text-white">AI Video Editor — built for Filipino content</div>
          <p className="mt-1 text-sm text-zinc-300">
            Auto-captions, cuts, music, and retention effects that keep viewers watching — Taglish-ready, no timeline, no skills. Stop paying a freelance editor every single video.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest sm:flex-col sm:items-end sm:gap-1">
          <span className="text-zinc-500 line-through decoration-zinc-600">a freelance editor</span>
          <span className="text-[#FFCC00]">included</span>
        </div>
      </motion.div>

      {/* The anchor: a rack of tools + an editor, or one app at ₱2,497. */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: DUR.slow, delay: 0.2 }}
        className="mt-10 flex flex-col items-center gap-1.5 text-center"
      >
        <p className="text-base md:text-lg text-zinc-300">
          That's <span className="font-bold text-white">$120+/mo</span> of AI tools
          {' '}(<span className="font-mono">~₱7,000</span>) — plus a freelance editor every video — replaced by{' '}
          <span className="font-bold text-[#FFCC00]">one app at ₱2,497/mo.</span>
        </p>
        <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">
          // typical standalone prices per tool category
        </p>
      </motion.div>
    </div>
  </section>
);

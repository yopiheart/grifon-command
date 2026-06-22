import React from 'react';
import { motion } from 'motion/react';
import { PenLine, AudioLines, Clapperboard, ImageIcon, BarChart3, Target } from 'lucide-react';

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
  <section className="py-16 md:py-28 px-4 sm:px-6 lg:px-8 relative z-10">
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12 md:mb-16"
      >
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-500 mb-4">// REPLACES YOUR WHOLE AI STACK</p>
        <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tight leading-tight max-w-3xl mx-auto bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500">
          SIX AI SUBSCRIPTIONS.{' '}
          <span className="font-serif italic normal-case tracking-normal text-[#FFCC00]">Or one Grifon.</span>
        </h2>
        <p className="mt-5 text-base md:text-lg text-zinc-400 max-w-2xl mx-auto">
          No more juggling a separate tool — and a separate bill — for every step. It's all in one app.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {TOOLS.map((tool, idx) => (
          <motion.div
            key={tool.cap}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.07 }}
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

      {/* The anchor: a rack of tools at $120+/mo, or one app at ₱2,497. */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-10 flex flex-col items-center gap-1.5 text-center"
      >
        <p className="text-base md:text-lg text-zinc-300">
          That's <span className="font-bold text-white">$120+/mo</span> of separate AI tools
          {' '}(<span className="font-mono">~₱7,000</span>) — replaced by{' '}
          <span className="font-bold text-[#FFCC00]">one app at ₱2,497/mo.</span>
        </p>
        <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">
          // typical standalone prices per tool category
        </p>
      </motion.div>
    </div>
  </section>
);

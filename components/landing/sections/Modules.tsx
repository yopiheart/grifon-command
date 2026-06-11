import React from 'react';
import { motion } from 'motion/react';
import { Film, Search, Target, Type, ImageIcon } from 'lucide-react';
import { AnimatedBorder } from '../../ui/AnimatedBorder';
import { DirectorDemo, ResearchDemo, OfferDemo, CaptionDemo, ImageDemo } from '../InclusionDemos';

const SECONDARY_MODULES = [
  { title: 'Market Research', label: 'Intelligence', desc: 'Know your market, competitors, and dream buyer before you spend a single peso on ads.', icon: Search, Demo: ResearchDemo },
  { title: 'Offer Optimizer', label: 'Conversion', desc: 'Build an offer people feel stupid saying no to — using real pricing psychology.', icon: Target, Demo: OfferDemo },
  { title: 'Caption & Headline', label: 'Copywriting', desc: 'Scroll-stopping hooks and captions for every platform, generated in seconds.', icon: Type, Demo: CaptionDemo },
  { title: 'Image Studio', label: 'Visuals', desc: 'Studio-grade ad images — product shots, lifestyle, anything — walang photographer.', icon: ImageIcon, Demo: ImageDemo },
];

/** What You Get: Director AI as the full-width feature row, the other four working modules in a grid. */
export const Modules: React.FC = () => (
  <section id="what-you-get" className="scroll-mt-28 py-16 md:py-32 px-4 sm:px-6 lg:px-8 relative z-10">
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12 md:mb-16"
      >
        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.25em] mb-4">// WHAT YOU GET</p>
        <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500">
          <span className="font-serif italic normal-case tracking-normal text-[#FFCC00]">Everything</span>{' '}
          YOU NEED. NOTHING YOU DON'T.
        </h2>
        <p className="text-zinc-400 max-w-2xl mx-auto text-base mt-4">
          Five battle-tested AI modules. Each one replaces a freelancer, an agency, or 6 hours of your time. Hindi lang sinasabi — ipinapakita.
        </p>
      </motion.div>

      {/* Director AI — full-width feature row */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-6"
      >
        <AnimatedBorder containerClassName="w-full" className="bg-zinc-900/40 backdrop-blur-2xl rounded-3xl p-6 md:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                <Film className="w-3.5 h-3.5 text-[#FFCC00]" />
                Video Ads
              </div>
              <h3 className="mt-3 text-2xl md:text-3xl font-bold text-white uppercase tracking-tight">Director AI</h3>
              <p className="mt-3 text-zinc-400 leading-relaxed md:text-lg">
                Your whole video ad — script, storyboard, shot list — in one 8-step flow. Replaces a ₱24k/yr video team.
              </p>
            </div>
            <DirectorDemo />
          </div>
        </AnimatedBorder>
      </motion.div>

      {/* Remaining working modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {SECONDARY_MODULES.map((module, idx) => (
          <motion.div
            key={module.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.08 }}
            className="h-full bg-zinc-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 md:p-7"
          >
            <module.Demo />
            <div className="mt-5 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              <module.icon className="w-3.5 h-3.5 text-[#FFCC00]" />
              {module.label}
            </div>
            <h3 className="mt-2 text-lg font-bold text-white">{module.title}</h3>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{module.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

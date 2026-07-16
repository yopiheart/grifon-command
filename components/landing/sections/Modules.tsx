import React from 'react';
import { motion } from 'motion/react';
import { DUR } from '../../ui/motionTokens';
import { Film, Search, Target, Type, ImageIcon } from 'lucide-react';
import { DirectorDemo, ResearchDemo, OfferDemo, CaptionDemo, ImageDemo } from '../InclusionDemos';
import { setIntendedModule } from '../../../services/moduleIntentService';

/**
 * Director AI's signature frame: a camera viewfinder — breathing gold corner
 * brackets + a blinking REC chip. Distinct from the guarantee's rotating-arc
 * AnimatedBorder (TrustFaq) so the two hero treatments never read as twins.
 */
const ViewfinderFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative rounded-3xl border border-white/10 bg-zinc-900/40 p-6 backdrop-blur-2xl md:p-10">
    <span aria-hidden="true" className="finder-corner pointer-events-none absolute left-3 top-3 h-6 w-6 rounded-tl-lg border-l-2 border-t-2 border-[#FFCC00]" />
    <span aria-hidden="true" className="finder-corner pointer-events-none absolute right-3 top-3 h-6 w-6 rounded-tr-lg border-r-2 border-t-2 border-[#FFCC00]" style={{ animationDelay: '0.8s' }} />
    <span aria-hidden="true" className="finder-corner pointer-events-none absolute bottom-3 left-3 h-6 w-6 rounded-bl-lg border-b-2 border-l-2 border-[#FFCC00]" style={{ animationDelay: '1.6s' }} />
    <span aria-hidden="true" className="finder-corner pointer-events-none absolute bottom-3 right-3 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-[#FFCC00]" style={{ animationDelay: '2.4s' }} />
    <span className="pointer-events-none absolute right-12 top-4 flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest text-[#FFCC00]">
      <span className="rec-dot h-1.5 w-1.5 rounded-full bg-red-500" />
      REC
    </span>
    {children}
  </div>
);

// Each secondary module gets a task-specific ghost CTA that stashes module
// intent (moduleIntentService, mirroring billing's popIntendedPlan) and routes
// through signup; App.tsx pops the intent post-auth to land the user in-module.
// `moduleId` values are the exact activeModule strings App.tsx switches on.
const SECONDARY_MODULES = [
  { title: 'Market Research', label: 'Intelligence', desc: 'Know your market, competitors, and dream buyer before you spend a single peso on ads.', icon: Search, Demo: ResearchDemo, moduleId: 'market_research', cta: 'Research my market' },
  { title: 'Offer Optimizer', label: 'Conversion', desc: 'Build an offer people feel stupid saying no to — using real pricing psychology.', icon: Target, Demo: OfferDemo, moduleId: 'offer_optimizer', cta: 'Fix my offer' },
  { title: 'Caption & Headline', label: 'Copywriting', desc: 'Scroll-stopping hooks and captions for every platform, generated in seconds.', icon: Type, Demo: CaptionDemo, moduleId: 'caption_headline', cta: 'Write my captions' },
  { title: 'Image Studio', label: 'Visuals', desc: 'Studio-grade ad images — product shots, lifestyle, anything — walang photographer.', icon: ImageIcon, Demo: ImageDemo, moduleId: 'image_ads', cta: 'Make my image ads' },
];

interface ModulesProps {
  onEnterApp: () => void;
}

/** What You Get: Director AI as the full-width feature row, the other four working modules in a grid. */
export const Modules: React.FC<ModulesProps> = ({ onEnterApp }) => (
  <section id="what-you-get" className="scroll-mt-28 py-16 md:py-32 px-4 sm:px-6 lg:px-8 relative z-10">
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: DUR.entrance }}
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
        transition={{ duration: DUR.entrance }}
        className="mb-6"
      >
        <ViewfinderFrame>
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
        </ViewfinderFrame>
      </motion.div>

      {/* Remaining working modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {SECONDARY_MODULES.map((module, idx) => (
          <motion.div
            key={module.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: DUR.slow, delay: idx * 0.08 }}
            className="h-full bg-zinc-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 md:p-7"
          >
            <module.Demo />
            <div className="mt-5 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              <module.icon className="w-3.5 h-3.5 text-[#FFCC00]" />
              {module.label}
            </div>
            <h3 className="mt-2 text-lg font-bold text-white">{module.title}</h3>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{module.desc}</p>
            {/* Ghost text-CTA — subordinate to the page's gold CTAs (no fill). */}
            <button
              onClick={() => {
                setIntendedModule(module.moduleId);
                onEnterApp();
              }}
              className="mt-4 inline-flex items-center gap-1.5 text-zinc-300 hover:text-[#FFCC00] text-sm font-semibold transition-colors"
            >
              {module.cta}
              <span aria-hidden="true">→</span>
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

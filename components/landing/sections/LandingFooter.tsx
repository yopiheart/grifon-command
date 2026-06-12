import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { CONTACT } from '../../../config/contact';
import { Marquee } from '../Marquee';
import { SignatureScribble } from '../SignatureScribble';
import { GoldButton } from '../../ui/GoldButton';

type LegalRoute = 'terms' | 'privacy' | 'refund' | 'support';

interface LandingFooterProps {
  onEnterApp: () => void;
  onNavigatePricing: () => void;
  onNavigateLegal: (page: LegalRoute) => void;
}

/**
 * Lando-anatomy footer: dark rounded card (publish-everywhere marquee → trust
 * row → link columns → giant signature tagline → griffin glyph cropped by the
 * card edge with the final CTA on top) closed by a gold strip. Link content
 * and wiring unchanged from the proven page — only the staging is new.
 */
export const LandingFooter: React.FC<LandingFooterProps> = ({ onEnterApp, onNavigatePricing, onNavigateLegal }) => (
  <>
    {/* Mobile Login Link */}
    <div className="md:hidden text-center py-6">
      <p className="text-sm text-zinc-500">
        Already have an account? <span onClick={onEnterApp} className="text-[#FFCC00] hover:underline cursor-pointer">Log in</span>
      </p>
    </div>

    <footer className="relative z-10 bg-zinc-950 pt-12">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-zinc-900/60">
          {/* Where Bryan's ads end up — honest platform row, not fake partnerships. */}
          <Marquee
            variant="mono"
            shine
            duration={22}
            items={['YOUR ADS ON', 'FACEBOOK', 'TIKTOK', 'INSTAGRAM', 'SHOPEE', 'LAZADA', 'YOUTUBE']}
          />

          {/* Trust row */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-b border-white/5 px-6 py-8 text-[11px] font-mono uppercase tracking-widest text-zinc-500">
            <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#FFCC00]" /> 7-Day Money-Back Guarantee</span>
            <span className="flex items-center gap-2"><Lock className="w-4 h-4 text-[#FFCC00]" /> Secure Checkout · PayMongo</span>
            <span className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#FFCC00]" /> Built for Filipino Businesses</span>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 px-6 py-10 sm:px-10 md:grid-cols-4 md:py-12">
            {/* Brand Column */}
            <div className="col-span-2 mb-8 md:col-span-1 md:mb-0">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="GRIFON Logo" className="h-8 w-auto object-contain" />
                <span className="text-white font-black italic text-xl tracking-tight">
                  GRIFON
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-3 leading-relaxed max-w-[200px]">
                AI-powered marketing studio. Built in the Philippines.
              </p>
            </div>

            {/* Product Column */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">PRODUCT</h4>
              <nav className="space-y-2">
                <a href="#what-you-get" className="text-sm text-zinc-500 hover:text-white transition-all block">Director AI</a>
                <a href="#what-you-get" className="text-sm text-zinc-500 hover:text-white transition-all block">Market Research</a>
                <a href="#what-you-get" className="text-sm text-zinc-500 hover:text-white transition-all block">Offer Optimizer</a>
                <a href="#what-you-get" className="text-sm text-zinc-500 hover:text-white transition-all block">Caption & Headline</a>
                <a href="#what-you-get" className="text-sm text-zinc-500 hover:text-white transition-all block">Image Studio</a>
                <a href="/pricing" onClick={(e) => { e.preventDefault(); onNavigatePricing(); }} className="text-sm text-zinc-500 hover:text-white transition-all block">Pricing</a>
              </nav>
            </div>

            {/* Legal Column */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">LEGAL</h4>
              <nav className="space-y-2">
                <a href="/privacy" onClick={(e) => { e.preventDefault(); onNavigateLegal('privacy'); }} className="text-sm text-zinc-500 hover:text-white transition-all block">Privacy Policy</a>
                <a href="/terms" onClick={(e) => { e.preventDefault(); onNavigateLegal('terms'); }} className="text-sm text-zinc-500 hover:text-white transition-all block">Terms of Service</a>
                <a href="/refund" onClick={(e) => { e.preventDefault(); onNavigateLegal('refund'); }} className="text-sm text-zinc-500 hover:text-white transition-all block">Refund Policy</a>
                <a href="/support" onClick={(e) => { e.preventDefault(); onNavigateLegal('support'); }} className="text-sm text-zinc-500 hover:text-white transition-all block">Support</a>
              </nav>
            </div>

            {/* Social Column */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">CONNECT</h4>
              <nav className="space-y-2">
                <a href={CONTACT.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-500 hover:text-white transition-all block">Facebook</a>
                <a href={CONTACT.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-500 hover:text-white transition-all block">Instagram</a>
                <a href={CONTACT.tiktokUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-500 hover:text-white transition-all block">TikTok</a>
                <a href={CONTACT.viberUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-500 hover:text-white transition-all block">Viber Community</a>
              </nav>
            </div>
          </div>

          {/* Signature tagline — the brand's closing line */}
          <div className="border-t border-white/5 px-6 pt-14 text-center md:pt-20">
            <h2 className="text-4xl font-black uppercase tracking-tighter leading-[0.95] sm:text-6xl md:text-7xl">
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500">ALWAYS </span>
              <SignatureScribble variant="underline" strokeWidth={2.5} delay={0.4}>
                <span className="font-serif italic normal-case tracking-normal text-[#FFCC00]">shipping</span>
              </SignatureScribble>
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500"> THE AD.</span>
            </h2>
          </div>

          {/* Final CTA + griffin emblem rising behind it, cropped by the card edge
              (the helmet move). Static sculpture, staged motion only: one-time
              rise-on-reveal + a slow-breathing gold aura — animating the emblem
              itself would cheapen the realism that sells it. */}
          <div className="relative z-10 mt-10 flex justify-center md:mt-12">
            <GoldButton onClick={onEnterApp} className="rounded-full px-10 py-4 text-sm shadow-[0_8px_30px_rgba(0,0,0,0.45)]">
              START FREE
              <ArrowRight className="ml-2 inline h-4 w-4" />
            </GoldButton>
          </div>
          <div className="relative">
            <div
              aria-hidden="true"
              className="griffin-glow pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-[#FFCC00]/20 blur-[90px]"
            />
            <motion.img
              src="/griffin-emblem.png"
              alt=""
              aria-hidden="true"
              initial={{ opacity: 0, y: 64 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="pointer-events-none relative z-0 mx-auto -mt-12 -mb-28 h-72 w-auto select-none object-contain md:-mt-16 md:-mb-44 md:h-[26rem]"
            />
          </div>
        </div>
      </div>

      {/* Gold closing strip */}
      <div className="mt-10 bg-[#FFCC00] text-black md:mt-14">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 sm:px-6 lg:px-8">
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs font-bold uppercase tracking-widest">
            <a href="/privacy" onClick={(e) => { e.preventDefault(); onNavigateLegal('privacy'); }} className="hover:underline">Privacy Policy</a>
            <a href="/terms" onClick={(e) => { e.preventDefault(); onNavigateLegal('terms'); }} className="hover:underline">Terms</a>
          </nav>
          <span className="text-xs font-semibold">© 2026 Haste Enterprises. All rights reserved</span>
        </div>
      </div>
    </footer>
  </>
);

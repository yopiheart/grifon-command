import React from 'react';
import { ShieldCheck, Lock, Sparkles } from 'lucide-react';
import { CONTACT } from '../../../config/contact';

type LegalRoute = 'terms' | 'privacy' | 'refund' | 'support';

interface LandingFooterProps {
  onEnterApp: () => void;
  onNavigatePricing: () => void;
  onNavigateLegal: (page: LegalRoute) => void;
}

/** Trust row + 4-column footer — content and wiring unchanged from the proven page. */
export const LandingFooter: React.FC<LandingFooterProps> = ({ onEnterApp, onNavigatePricing, onNavigateLegal }) => (
  <>
    {/* Mobile Login Link */}
    <div className="md:hidden text-center py-6">
      <p className="text-sm text-zinc-500">
        Already have an account? <span onClick={onEnterApp} className="text-[#FFCC00] hover:underline cursor-pointer">Log in</span>
      </p>
    </div>

    <footer className="border-t border-white/5 bg-zinc-950 px-4 sm:px-6 lg:px-8 py-12 relative z-10">
      {/* Trust row */}
      <div className="max-w-7xl mx-auto mb-10 pb-10 border-b border-white/5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[11px] font-mono uppercase tracking-widest text-zinc-500">
        <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#FFCC00]" /> 7-Day Money-Back Guarantee</span>
        <span className="flex items-center gap-2"><Lock className="w-4 h-4 text-[#FFCC00]" /> Secure Checkout · PayMongo</span>
        <span className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#FFCC00]" /> Built for Filipino Businesses</span>
      </div>
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {/* Brand Column */}
        <div className="col-span-2 md:col-span-1 mb-8 md:mb-0">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="GRIFON Logo" className="h-8 w-auto object-contain" />
            <span className="text-white font-black italic text-xl tracking-tight">
              GRIFON<span className="text-[#FFCC00]">.AI</span>
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-3 leading-relaxed max-w-[200px]">
            AI-powered marketing studio. Built in the Philippines.
          </p>
          <p className="text-[10px] text-zinc-600 font-mono mt-4">
            © 2026 Haste Enterprises
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
    </footer>
  </>
);

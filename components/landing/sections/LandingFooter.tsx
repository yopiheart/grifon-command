import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { CONTACT } from '../../../config/contact';
import { Marquee } from '../Marquee';
import { SignatureScribble } from '../SignatureScribble';
import { GoldButton } from '../../ui/GoldButton';
import { FacebookIcon, InstagramIcon, TikTokIcon, ViberIcon } from '../SocialIcons';

type LegalRoute = 'terms' | 'privacy' | 'refund' | 'support';

interface LandingFooterProps {
  onEnterApp: () => void;
  onNavigateLegal: (page: LegalRoute) => void;
}

/** Social channels shown as clickable black glyphs in the gold strip. */
const SOCIALS = [
  { label: 'Facebook', href: CONTACT.facebookUrl, Icon: FacebookIcon },
  { label: 'Instagram', href: CONTACT.instagramUrl, Icon: InstagramIcon },
  { label: 'TikTok', href: CONTACT.tiktokUrl, Icon: TikTokIcon },
  // TODO(Neil): Viber number pending — icon renders but the link is inert until
  // CONTACT.viberUrl gets a real number/community URL.
  { label: 'Viber', href: CONTACT.viberUrl, Icon: ViberIcon },
];

/**
 * Lando-anatomy footer: dark rounded card (publish-everywhere marquee → trust
 * row → link columns → giant signature tagline → griffin glyph cropped by the
 * card edge with the final CTA on top) closed by a gold strip. Link content
 * and wiring unchanged from the proven page — only the staging is new.
 */
export const LandingFooter: React.FC<LandingFooterProps> = ({ onEnterApp, onNavigateLegal }) => (
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

          {/* Signature tagline — the brand's closing line. Follows the trust row
              directly now that the link-column grid is gone (the trust row's
              own border-b is the only divider needed — no border-t here). */}
          <div className="px-6 pt-16 text-center md:pt-24">
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
            <GoldButton glossy onClick={onEnterApp} className="rounded-full px-10 py-4 text-sm">
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
              className="pointer-events-none relative z-0 mx-auto -mt-6 -mb-28 h-72 w-auto select-none object-contain md:-mt-10 md:-mb-44 md:h-[26rem]"
            />
          </div>
        </div>
      </div>

      {/* Gold closing strip — Huly-style: social glyphs on the left, legal +
          copyright on the right. Stacked + centered on mobile (icons → legal →
          copyright), justified on desktop. */}
      <div className="mt-10 bg-[#FFCC00] text-black md:mt-14">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-6 text-center sm:flex-row sm:justify-between sm:gap-6 sm:px-6 sm:py-4 sm:text-left lg:px-8">
          {/* Social icons — anchors are 44px touch targets (mobile floor) with
              the 20px glyph optically centered; negative inline margin keeps the
              visual gap tight despite the padded hit area. */}
          <nav className="flex items-center gap-1 -mx-2" aria-label="Social media">
            {SOCIALS.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-11 w-11 items-center justify-center text-black opacity-80 transition hover:opacity-100 hover:scale-110"
              >
                <Icon />
              </a>
            ))}
          </nav>

          {/* Legal + copyright */}
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-6">
            <nav className="flex items-center gap-6 text-xs font-bold uppercase tracking-widest">
              <a href="/privacy" onClick={(e) => { e.preventDefault(); onNavigateLegal('privacy'); }} className="hover:underline">Privacy Policy</a>
              <a href="/terms" onClick={(e) => { e.preventDefault(); onNavigateLegal('terms'); }} className="hover:underline">Terms</a>
            </nav>
            <span className="text-xs font-normal text-black/70">© 2026 Haste Enterprises. All rights reserved</span>
          </div>
        </div>
      </div>
    </footer>
  </>
);

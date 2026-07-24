import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Cookie, X } from 'lucide-react';
import { GoldButton } from './GoldButton';
import { EASE, DUR } from './motionTokens';
import { getPixelConsent, setPixelConsent } from '../../services/analyticsService';

// Minimal, consent-first cookie/analytics notice for the Data-Driven Growth Loop
// (Phase 0). The Meta Pixel does NOT fire until the user accepts here. DESIGN.md
// tokens only — glass panel, Grifon Gold accent, lucide icon. Self-gating: once a
// choice (accept or decline) is recorded in localStorage, the banner never shows
// again on this device.
//
// Sanctioned deviation (Neil, 2026-07-03 pixel-funnel plan): resting gold border
// (#FFCC00/20) + gold glow shadow on this one panel — a deliberate stand-out
// treatment for the consent ask, mirroring BillingSuccess's celebration border.
// Real UI panels elsewhere stay glass + blur per DESIGN.md.

interface ConsentBannerProps {
  /** Called with the user's choice. Parent inits the pixel on `true`. */
  onConsent: (granted: boolean) => void;
  /** When provided, the Privacy link navigates in-SPA instead of a full reload. */
  onNavigatePrivacy?: () => void;
}

export const ConsentBanner: React.FC<ConsentBannerProps> = ({ onConsent, onNavigatePrivacy }) => {
  // Only show when no decision has been made yet.
  const [visible, setVisible] = useState(() => getPixelConsent() === null);
  const reduceMotion = useReducedMotion();

  if (!visible) return null;

  const decide = (granted: boolean) => {
    setPixelConsent(granted);
    setVisible(false);
    onConsent(granted);
  };

  return (
    <motion.div
      role="dialog"
      aria-label="Analytics consent"
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.entrance, delay: DUR.entrance, ease: EASE.expressive }}
      className="fixed bottom-4 left-4 right-4 z-40 sm:left-auto sm:right-4 sm:w-96 rounded-2xl border border-[#FFCC00]/20 bg-zinc-900/80 backdrop-blur-xl p-5 shadow-[0_0_30px_rgba(255,204,0,0.12)]"
    >
      <button
        onClick={() => decide(false)}
        aria-label="Decline analytics"
        className="absolute top-2 right-2 p-2 text-on-surface-sublabel hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <Cookie className="w-4 h-4 text-[#FFCC00] flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-widest text-[#FFCC00]">
            // PRIVACY
          </p>
          <p className="mt-1 text-sm font-semibold text-white">Cookies &amp; analytics</p>
          <p className="mt-1 text-xs text-zinc-400">
            We use analytics to understand how Grifon is used and improve it. Your call.{' '}
            {onNavigatePrivacy ? (
              <button type="button" onClick={onNavigatePrivacy} className="text-[#FFCC00] hover:underline align-baseline">
                Privacy Policy
              </button>
            ) : (
              <a href="/privacy" className="text-[#FFCC00] hover:underline">
                Privacy Policy
              </a>
            )}
            .
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <button
          onClick={() => decide(false)}
          className="flex-1 rounded-full border border-white/10 bg-zinc-950 py-3 text-xs font-bold uppercase text-zinc-400 hover:text-white hover:border-[#FFCC00] transition-all"
        >
          Decline
        </button>
        <GoldButton onClick={() => decide(true)} className="flex-1">
          Accept
        </GoldButton>
      </div>
    </motion.div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Cookie, X } from 'lucide-react';
import { EASE, DUR } from './motionTokens';
import { getPixelConsent, setPixelConsent } from '../../services/analyticsService';
import { MAT_CHROME } from './materialTokens';

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
  const bannerRef = useRef<HTMLDivElement>(null);
  const [clearance, setClearance] = useState(0);
  const reduceMotion = useReducedMotion();
  const choiceClass = 'flex-1 min-w-0 min-h-11 rounded-full border border-white/15 bg-zinc-950 px-2 text-xs font-semibold text-zinc-200 hover:text-white hover:border-[#FFCC00] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFCC00]';

  useEffect(() => {
    if (!visible) return;
    const banner = bannerRef.current;
    if (!banner) return;
    // Reserve enough page-end room even for the last footer control. Measure
    // again when wrapping, font loading or the viewport changes the notice.
    const measure = () => setClearance(banner.offsetHeight + parseFloat(getComputedStyle(banner).bottom) + 16);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(banner);
    window.addEventListener('resize', measure);
    // Keep this nonmodal notice from hiding a form control reached by keyboard.
    const revealFocus = (event: FocusEvent) => {
      const target = event.target;
      const banner = bannerRef.current;
      if (!(target instanceof HTMLElement) || !banner || banner.contains(target)) return;
      const control = target.getBoundingClientRect();
      const notice = banner.getBoundingClientRect();
      if (control.bottom > notice.top && control.top < notice.bottom && control.right > notice.left && control.left < notice.right) {
        target.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
    };
    document.addEventListener('focusin', revealFocus);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      document.removeEventListener('focusin', revealFocus);
    };
  }, [visible]);

  if (!visible) return null;

  const decide = (granted: boolean) => {
    setPixelConsent(granted);
    setVisible(false);
    onConsent(granted);
  };

  return (
    <>
    <motion.div
      ref={bannerRef}
      role="dialog"
      aria-label="Analytics consent"
      aria-describedby="analytics-consent-description"
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.entrance, delay: DUR.entrance, ease: EASE.expressive }}
      className={`public-purchase fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-40 sm:left-auto sm:right-4 sm:w-96 rounded-2xl border border-[#FFCC00]/20 ${MAT_CHROME} p-4 shadow-[0_0_30px_rgba(255,204,0,0.12)]`}
    >
      <button
        onClick={() => decide(false)}
        aria-label="Decline analytics"
        className="absolute top-1 right-1 flex h-11 w-11 items-center justify-center rounded-full text-zinc-400 hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FFCC00]"
      >
        <X className="w-4 h-4 shrink-0" aria-hidden="true" />
      </button>

      <div className="flex items-center gap-3 pr-7">
        <Cookie className="w-5 h-5 text-[#FFCC00] shrink-0" aria-hidden="true" />
        <p className="text-sm font-semibold text-white">Cookies &amp; analytics</p>
      </div>
      <p id="analytics-consent-description" className="mt-1 text-xs leading-4 text-zinc-300">
        We use analytics to understand how Grifon is used and improve it. Your call.
      </p>

      <div className="mt-3 flex gap-2">
        {onNavigatePrivacy ? (
          <button type="button" onClick={onNavigatePrivacy} className={`${choiceClass} whitespace-nowrap`} style={{ flexGrow: 1.4 }}>
            Privacy Policy
          </button>
        ) : (
          <a href="/privacy" className={`${choiceClass} inline-flex items-center justify-center whitespace-nowrap`} style={{ flexGrow: 1.4 }}>
            Privacy Policy
          </a>
        )}
        <button
          onClick={() => decide(false)}
          className={choiceClass}
        >
          Decline
        </button>
        <button onClick={() => decide(true)} className={choiceClass}>
          Accept
        </button>
      </div>
    </motion.div>
    <div aria-hidden="true" className="pointer-events-none shrink-0" style={{ height: clearance }} />
    </>
  );
};

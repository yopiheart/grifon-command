import React, { useEffect, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { LandingAtmosphere } from './landing/LandingAtmosphere';
import './landing/landing.css';
import { SiteHeader, type SiteNavLink } from './ui/SiteHeader';
import { PinnedCtaPill } from './landing/PinnedCtaPill';
import { VerticalPickerModal } from './landing/VerticalPickerModal';
import { setIntendedVertical } from '../services/verticalIntentService';
import { trackEvent } from '../services/analyticsService';
import { Hero } from './landing/sections/Hero';
import { ProofBand } from './landing/sections/ProofBand';
import { ReceiptsRail } from './landing/sections/ReceiptsRail';
import { Modules } from './landing/sections/Modules';
import { OfferStack } from './landing/sections/OfferStack';
import { TrustFaq } from './landing/sections/TrustFaq';
import { LandingFooter } from './landing/sections/LandingFooter';

type LegalRoute = 'terms' | 'privacy' | 'refund' | 'support';

interface LandingPageProps {
  onEnterApp: () => void;
  onNavigatePricing: () => void;
  onNavigateLegal: (page: LegalRoute) => void;
  isAuthenticated?: boolean;
}

// Scroll-spy over the anchor sections so the header can squiggle the active link.
const SPY_SECTIONS = ['#what-you-get', '#reviews', '#faq'];

// One-question segmentation: asked at most ONCE per session, whether the visitor
// answered or skipped. The stash itself can't be the marker (a skip stores
// nothing), so the "already decided" flag is its own key. sessionStorage-backed
// with the same swallow-everything contract as the intent services.
const VERTICAL_ASKED_KEY = 'grifon_vertical_asked';

const hasDecidedVertical = (): boolean => {
  try {
    return sessionStorage.getItem(VERTICAL_ASKED_KEY) === '1';
  } catch {
    return true; // storage unavailable → never interrupt the CTA
  }
};

const markVerticalDecided = () => {
  try {
    sessionStorage.setItem(VERTICAL_ASKED_KEY, '1');
  } catch {}
};

const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp, onNavigatePricing, onNavigateLegal, isAuthenticated = false }) => {
  const heroSentinelRef = useRef<HTMLDivElement>(null);
  const offerStackRef = useRef<HTMLElement>(null);
  // Trust/FAQ/footer zone has its own CTAs (Viber, login, footer links) — pill stays out of it.
  const bottomZoneRef = useRef<HTMLDivElement>(null);
  // The Receipts Rail ends on its own CTA card — pill hides so they never compete.
  const railZoneRef = useRef<HTMLDivElement>(null);
  const [activeHref, setActiveHref] = useState<string | undefined>(undefined);

  // One-question segmentation (workflows/post_preview_bridge.md Part 2). The
  // first primary-CTA click of a guest session opens the chip modal; the answer
  // is stashed for App.tsx to pop after auth. Deliberately NOT wired to the
  // Modules CTAs (they already carry a module intent), the exit-intent modal
  // (already an interception), the header login button, or logged-in visitors.
  const [askVertical, setAskVertical] = useState(false);

  // Every path here is fail-open: any throw (or a DOM-less environment where the
  // modal can't portal) falls straight through to onEnterApp — the signup CTA is
  // never allowed to die for a segmentation question.
  const enterAppWithSegmentation = () => {
    let ask = false;
    try {
      ask = !isAuthenticated && typeof document !== 'undefined' && !hasDecidedVertical();
    } catch {
      ask = false; // any throw → straight into the app, question skipped
    }
    if (ask) setAskVertical(true);
    else onEnterApp();
  };

  const handlePickVertical = (vertical: string, rawLabel: string) => {
    try {
      markVerticalDecided();
      setIntendedVertical(vertical);
      void trackEvent({ event: 'segmentation_answered', meta: { vertical, raw: rawLabel } });
    } catch {
      /* the answer is a nice-to-have; entering the app is not */
    }
    setAskVertical(false);
    onEnterApp();
  };

  const handleSkipVertical = () => {
    try {
      markVerticalDecided();
      void trackEvent({ event: 'segmentation_skipped' });
    } catch {}
    setAskVertical(false);
    onEnterApp();
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveHref(`#${entry.target.id}`);
        }
      },
      // "Active" = section occupies the middle band of the viewport.
      { rootMargin: '-35% 0px -55% 0px' }
    );
    const targets = SPY_SECTIONS
      .map((href) => document.getElementById(href.slice(1)))
      .filter((el): el is HTMLElement => !!el);
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Order mirrors the actual section order (reviews band renders before the modules grid).
  const navLinks: SiteNavLink[] = [
    { label: 'Reviews', href: '#reviews' },
    { label: 'What You Get', href: '#what-you-get' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Pricing', onClick: onNavigatePricing },
  ];

  return (
    <MotionConfig reducedMotion="user">
    <div className="landing-page min-h-screen bg-zinc-950 text-white font-sans overflow-x-clip selection:bg-[#FFCC00] selection:text-black">
      <a href="#how-it-works" className="landing-skip">Skip introduction</a>

      <VerticalPickerModal open={askVertical} onPick={handlePickVertical} onSkip={handleSkipVertical} />

      <LandingAtmosphere />

      <div className="landing-nav sticky top-0 z-50">
        <SiteHeader onEnterApp={onEnterApp} navLinks={navLinks} showLogin ctaLabel="Try it free" activeHref={activeHref} />
      </div>

      <Hero onEnterApp={enterAppWithSegmentation} heroSentinelRef={heroSentinelRef} />

      <ProofBand />

      <div ref={railZoneRef}>
        <ReceiptsRail onEnterApp={enterAppWithSegmentation} />
      </div>

      <Modules onEnterApp={onEnterApp} />

      <OfferStack onNavigatePricing={onNavigatePricing} sectionRef={offerStackRef} />

      <div ref={bottomZoneRef}>
        <TrustFaq />

        <LandingFooter
          onEnterApp={onEnterApp}
          onNavigateLegal={onNavigateLegal}
        />
      </div>

      <PinnedCtaPill
        onEnterApp={enterAppWithSegmentation}
        heroSentinelRef={heroSentinelRef}
        hideRefs={[railZoneRef, offerStackRef, bottomZoneRef]}
      />
    </div>
    </MotionConfig>
  );
};

export default LandingPage;

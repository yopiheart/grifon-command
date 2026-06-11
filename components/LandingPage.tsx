import React, { useEffect, useRef, useState } from 'react';
import { Aurora } from './ui/Aurora';
import { SiteHeader, type SiteNavLink } from './ui/SiteHeader';
import { UrgencyBar } from './ui/UrgencyBar';
import { ExitIntentModal } from './ui/ExitIntentModal';
import { useExitIntent } from './ui/useExitIntent';
import { FOUNDING_OFFER } from '../config/foundingOffer';
import { Marquee } from './landing/Marquee';
import { PinnedCtaPill } from './landing/PinnedCtaPill';
import { Hero } from './landing/sections/Hero';
import { ProofGallery } from './landing/sections/ProofGallery';
import { ProofBand } from './landing/sections/ProofBand';
import { Modules } from './landing/sections/Modules';
import { RoiMetrics } from './landing/sections/RoiMetrics';
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

const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp, onNavigatePricing, onNavigateLegal, isAuthenticated = false }) => {
  // Desktop-only exit-intent recapture — once/session, never for logged-in visitors.
  const { triggered: exitTriggered, dismiss: dismissExit } = useExitIntent({
    enabled: !isAuthenticated && FOUNDING_OFFER.enabled,
  });

  const heroSentinelRef = useRef<HTMLDivElement>(null);
  const offerStackRef = useRef<HTMLElement>(null);
  // Trust/FAQ/footer zone has its own CTAs (Viber, login, footer links) — pill stays out of it.
  const bottomZoneRef = useRef<HTMLDivElement>(null);
  const [activeHref, setActiveHref] = useState<string | undefined>(undefined);

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
    <div className="min-h-screen bg-zinc-950 text-white font-sans overflow-x-clip selection:bg-[#FFCC00] selection:text-black">

      <ExitIntentModal triggered={exitTriggered} onDismiss={dismissExit} onEnterApp={onEnterApp} />

      <Aurora intensity="marketing" />

      {/* STICKY TOP — founding urgency bar + nav */}
      <div className="sticky top-0 z-50">
        <UrgencyBar />
        <SiteHeader onEnterApp={onEnterApp} navLinks={navLinks} showLogin activeHref={activeHref} />
      </div>

      <Hero onEnterApp={onEnterApp} heroSentinelRef={heroSentinelRef} />

      <Marquee
        items={['Scripts', 'CAPTIONS', 'Storyboards', 'MARKET RESEARCH', 'Image Ads', 'OFFERS']}
        duration={32}
        className="relative z-10 bg-zinc-950/60"
      />

      <ProofGallery />

      <ProofBand />

      <Modules />

      <RoiMetrics />

      <Marquee
        items={['30 minutes', 'NOT 3 DAYS', '₱997/mo', 'BUILT FOR FILIPINO BUSINESSES']}
        duration={26}
        reverse
        className="relative z-10 bg-zinc-950/60"
      />

      <OfferStack onNavigatePricing={onNavigatePricing} sectionRef={offerStackRef} />

      <div ref={bottomZoneRef}>
        <TrustFaq />

        <LandingFooter
          onEnterApp={onEnterApp}
          onNavigatePricing={onNavigatePricing}
          onNavigateLegal={onNavigateLegal}
        />
      </div>

      <PinnedCtaPill
        onEnterApp={onEnterApp}
        heroSentinelRef={heroSentinelRef}
        hideRefs={[offerStackRef, bottomZoneRef]}
      />
    </div>
  );
};

export default LandingPage;

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { playTick } from '../../services/uiSoundService';

interface PinnedCtaPillProps {
  onEnterApp: () => void;
  /** Sentinel at the end of the hero — pill appears once it scrolls past. */
  heroSentinelRef: React.RefObject<HTMLElement>;
  /** Regions with their own CTAs (offer stack, trust/footer) — pill hides while any is on screen. */
  hideRefs: React.RefObject<HTMLElement>[];
}

/**
 * Persistent CTA pill (landonorris.com pinned-STORE pattern). Fixed bottom-center
 * on mobile, bottom-right on md+. Driven by two IntersectionObserver sentinels —
 * no scroll listeners. Hidden while the final CTA section is visible so it never
 * competes with the page's own offer-stack button.
 */
export const PinnedCtaPill: React.FC<PinnedCtaPillProps> = ({
  onEnterApp,
  heroSentinelRef,
  hideRefs,
}) => {
  const [pastHero, setPastHero] = useState(false);
  const [hiddenZoneInView, setHiddenZoneInView] = useState(false);

  useEffect(() => {
    const hero = heroSentinelRef.current;
    const hideEls = hideRefs.map((r) => r.current).filter((el): el is HTMLElement => !!el);
    if (!hero || hideEls.length === 0) return;

    const heroObserver = new IntersectionObserver(([entry]) => {
      setPastHero(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    const inView = new Map<Element, boolean>();
    const hideObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => inView.set(entry.target, entry.isIntersecting));
      setHiddenZoneInView([...inView.values()].some(Boolean));
    });
    heroObserver.observe(hero);
    hideEls.forEach((el) => hideObserver.observe(el));
    return () => {
      heroObserver.disconnect();
      hideObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroSentinelRef, ...hideRefs]);

  const visible = pastHero && !hiddenZoneInView;

  return (
    <div
      className="fixed z-40 bottom-4 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 md:bottom-6 pointer-events-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <AnimatePresence>
        {visible && (
          <motion.button
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={() => {
              playTick();
              onEnterApp();
            }}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-[#FFCC00] text-black font-bold uppercase text-xs tracking-widest px-6 py-3.5 shadow-[0_8px_30px_rgba(255,204,0,0.35)] hover:shadow-[0_8px_40px_rgba(255,204,0,0.55)] hover:scale-105 active:scale-95 transition-[box-shadow,transform] whitespace-nowrap"
          >
            START FREE
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { playTick } from '../../services/uiSoundService';

interface PinnedCtaPillProps {
  onEnterApp: () => void;
  /** Sentinel at the end of the hero — pill appears once it scrolls past. */
  heroSentinelRef: React.RefObject<HTMLDivElement | null>;
  /** Sentinel at the offer stack / footer — pill hides while it's on screen. */
  endSentinelRef: React.RefObject<HTMLDivElement | null>;
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
  endSentinelRef,
}) => {
  const [pastHero, setPastHero] = useState(false);
  const [endInView, setEndInView] = useState(false);

  useEffect(() => {
    const hero = heroSentinelRef.current;
    const end = endSentinelRef.current;
    if (!hero || !end) return;

    const heroObserver = new IntersectionObserver(([entry]) => {
      setPastHero(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    const endObserver = new IntersectionObserver(([entry]) => {
      setEndInView(entry.isIntersecting);
    });
    heroObserver.observe(hero);
    endObserver.observe(end);
    return () => {
      heroObserver.disconnect();
      endObserver.disconnect();
    };
  }, [heroSentinelRef, endSentinelRef]);

  const visible = pastHero && !endInView;

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

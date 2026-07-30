import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { DUR, EASE, reducedMotion } from '../theme/motionTokens';
import { scrollToLeadForm } from '../lib/scrollToForm';

// ===========================================================================
// StickyCta — the always-there booking bar, docked to the bottom of the screen.
//
// Neil, 2026-07-30: "baka pwede lagyan ng call to action habang nag sscroll sya
// after ng hero.. para if ever gusto nya mag pa schedule na ma dederetso na sya
// sa form."
//
// It does NOT break the single-anchor rule (L8, 3/3 corroborated). There is
// still exactly ONE form on the page; this is another door into the same room,
// same as every ctaBlock. What it adds is that the decision moment and the
// action stop being separated by a scroll — on a long price page the moment
// someone decides is unpredictable, and asking them to hunt for the form is
// where intent leaks out.
//
// Two doors, deliberately: BOOK for the planner, TAWAG for the person whose
// tank is overflowing right now. Both are one tap.
//
// Hidden until the hero is out of view, so it never covers the price on first
// paint. Hidden again at the form itself, because a floating "go to the form"
// bar sitting on top of the form is noise — and on a 390px screen it would
// physically cover the submit button.
// ===========================================================================

interface StickyCtaProps {
  label: string;
  phone?: string;
  phoneLabel?: string;
}

export const StickyCta: React.FC<StickyCtaProps> = ({ label, phone, phoneLabel = 'Tawag' }) => {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const form = document.getElementById('lead-form');
    const hero = document.querySelector('section');
    if (!hero) return;

    let heroOut = false;
    let formIn = false;
    const sync = () => setVisible(heroOut && !formIn);

    const heroObserver = new IntersectionObserver(
      ([entry]) => {
        heroOut = !entry.isIntersecting;
        sync();
      },
      { threshold: 0 },
    );
    heroObserver.observe(hero);

    // The form may mount after this effect on a slow first paint, so guard it
    // rather than assuming it is there.
    const formObserver = form
      ? new IntersectionObserver(
          ([entry]) => {
            formIn = entry.isIntersecting;
            sync();
          },
          { threshold: 0.15 },
        )
      : null;
    if (form && formObserver) formObserver.observe(form);

    return () => {
      heroObserver.disconnect();
      formObserver?.disconnect();
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={reducedMotion(reduce, { duration: DUR.base, ease: EASE.expressive })}
          className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-white/20 bg-brand-elevated/95 px-4 py-3 backdrop-blur-sm"
          // pb-safe: iOS home-indicator gutter, so the bar is not half-swallowed.
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto flex max-w-shell items-center gap-3">
            <button
              type="button"
              onClick={scrollToLeadForm}
              className="flex-1 rounded-brand bg-brand-primary px-5 py-3.5 text-sm font-bold uppercase tracking-wide text-brand-elevated transition-colors duration-200 hover:brightness-95"
            >
              {label}
            </button>
            {phone && (
              <a
                href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                aria-label={`Tumawag sa ${phone.split('').join(' ')}`}
                className="flex shrink-0 items-center gap-2 rounded-brand border-2 border-white/25 px-4 py-3.5 text-sm font-bold uppercase tracking-wide text-brand-on-surface transition-colors duration-200 hover:border-brand-primary hover:text-brand-primary"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                {phoneLabel}
              </a>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

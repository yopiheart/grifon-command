import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { DUR, EASE, reducedMotion } from '../theme/motionTokens';
import { scrollToLeadForm } from '../lib/scrollToForm';
import { MessengerGlyph } from './MessengerButton';

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
  /** `m.me/...`. Omit and the bar stays two doors wide. */
  messenger?: string;
}

// Secondary doors. Same slab, so neither competes with the amber primary.
//
// The LABEL hides below 640px and the button becomes the glyph alone. That is
// what buys room for a third door without touching the approved primary copy.
// aria-label carries the meaning at every width, so nothing is lost to a
// screen reader when the text is not painted.
//
// The mobile paddings below are MEASURED, not guessed: the first attempt left
// the primary 223px, and "Mag-book ng schedule" wants ~231px at 14px, so it
// wrapped to two lines and the bar grew to 68px tall. Every horizontal value
// here tightens below `sm` — container gap, secondary padding, primary padding
// and type size — because the constraint is not 390px, it is 360px (Galaxy A
// class), where the same row has 24px less to spend.
const SECONDARY =
  'flex shrink-0 items-center gap-2 rounded-brand border-2 border-white/25 px-3 py-3.5 sm:px-4 ' +
  'text-sm font-bold uppercase tracking-wide text-brand-on-surface ' +
  'transition-colors duration-200 hover:border-brand-primary hover:text-brand-primary';

export const StickyCta: React.FC<StickyCtaProps> = ({
  label,
  phone,
  phoneLabel = 'Tawag',
  messenger,
}) => {
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
          // 🔴 OPAQUE, and no backdrop-filter. It used to be `bg-brand-elevated/95
          // backdrop-blur-sm`, and BOTH halves of that were wrong. The brand
          // tokens are raw hex custom properties, so a Tailwind opacity modifier
          // on one silently produces nothing (see the NOTE in tailwind.config.js)
          // — the bar shipped with NO background at all, and the "Mag-book ng
          // schedule" heading read straight through it as a ghost. The blur was
          // the fallback that made it look almost-intentional, and it is banned
          // outright: clients/oceanides/DESIGN.md law #2, "walang glass."
          // Solid surface-deep, one hairline top edge, print world.
          className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-brand-elevated px-4 py-3"
          // pb-safe: iOS home-indicator gutter, so the bar is not half-swallowed.
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto flex max-w-shell items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={scrollToLeadForm}
              className="flex-1 whitespace-nowrap rounded-brand bg-brand-primary px-4 py-3.5 text-[13px] font-bold uppercase tracking-wide text-brand-elevated transition-colors duration-200 hover:brightness-95 sm:px-5 sm:text-sm"
            >
              {label}
            </button>
            {phone && (
              <a
                href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                aria-label={`Tumawag sa ${phone.split('').join(' ')}`}
                className={SECONDARY}
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
                <span className="hidden sm:inline">{phoneLabel}</span>
              </a>
            )}
            {messenger && (
              <a
                href={messenger}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Mag-message sa Messenger"
                className={SECONDARY}
              >
                {/* The bolt is knocked out in surface-deep, which is exactly
                    this bar's fill, so the glyph reads as one shape here with
                    no disc behind it. */}
                <MessengerGlyph className="h-4 w-4" />
                <span className="hidden sm:inline">Message</span>
              </a>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

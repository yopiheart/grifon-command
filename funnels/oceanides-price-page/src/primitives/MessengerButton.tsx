import React from 'react';

// ===========================================================================
// MessengerButton — the low-commitment door.
//
// Neil, 2026-08-01: "messenger button na maglaland sa page pag may questions
// sila." The page gives a visitor exactly two ways to act, and BOTH of them are
// high-commitment: fill a form, or dial a stranger. Someone who just wants to
// ask "kasama ba ang bakbak?" has nowhere to go, and the market research says
// this audience lives in Messenger 90% of the time. So this is not a third CTA
// competing with the other two, it is the ONLY door for a question.
//
// Shape follows PhonePill, not CtaButton: bordered slab, tonal fill, flat. It
// is a sibling of the phone, so it must not out-shout it. Amber stays on the
// glyph disc only. Print world, per clients/oceanides/DESIGN.md law #2.
//
// The glyph is inline SVG for the same reason the phone icon is: this funnel
// ships zero external requests, and one glyph does not justify an icon library.
// ===========================================================================

/**
 * The Messenger mark. Two paths, both solid: the bubble, then the bolt knocked
 * out of it. Filled rather than stroked so it stays recognisable at 20px, where
 * an outline version reads as a generic chat bubble and loses the whole point.
 */
export const MessengerGlyph: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg aria-hidden viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 2C6.24 2 2 6.13 2 11.7c0 2.9 1.19 5.44 3.14 7.2.16.15.26.35.27.57l.05 1.78c.02.57.61.94 1.13.71l1.99-.88a.75.75 0 0 1 .5-.03c.91.25 1.88.38 2.92.38 5.76 0 10-4.13 10-9.73C22 6.13 17.76 2 12 2z" />
    <path
      d="M5.99 14.53l2.94-4.66c.47-.74 1.47-.93 2.18-.4l2.34 1.75c.21.16.5.16.72 0l3.16-2.4c.42-.32.97.19.69.65l-2.94 4.66c-.47.74-1.47.93-2.18.4l-2.34-1.75a.6.6 0 0 0-.72 0l-3.16 2.4c-.42.32-.97-.19-.69-.65z"
      fill="var(--brand-surface-elevated)"
    />
  </svg>
);

interface MessengerButtonProps {
  /** `m.me/...` or the full page URL. */
  href: string;
  label?: string;
  className?: string;
}

export const MessengerButton: React.FC<MessengerButtonProps> = ({
  href,
  label = 'Mag-message',
  className = '',
}) => (
  <a
    href={href}
    // A chat thread is a different place, so it opens as one. noreferrer rides
    // along with noopener because target="_blank" hands the new tab a live
    // window.opener reference otherwise.
    target="_blank"
    rel="noopener noreferrer"
    className={`inline-flex items-center gap-3 rounded-brand border-2 border-white/20 bg-brand-elevated px-4 py-3 transition-colors duration-200 hover:border-brand-primary ${className}`}
  >
    <span
      aria-hidden
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary"
    >
      <MessengerGlyph className="h-6 w-6" />
    </span>
    <span className="text-left leading-tight">
      <span className="block text-lg font-bold text-brand-on-surface md:text-xl">{label}</span>
      <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-on-surface-dim">
        Sagot sa Messenger
      </span>
    </span>
  </a>
);

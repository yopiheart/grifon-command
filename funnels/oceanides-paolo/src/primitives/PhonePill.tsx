import React from 'react';

// ===========================================================================
// PhonePill — the DESIGN.md component, verbatim:
//   "amber circle + surface-deep icon + white number + sky carrier label"
//
// WHY IT MATTERS HERE (Neil, 2026-07-30): "wala ding contact number. Kasi ung
// iba deretso tawag emergency ayaw na mag intay." An overflowing septic tank at
// 9pm is not a form-filling moment. The form is the default path; this is the
// escape hatch for the highest-intent visitor on the page.
//
// It is a real <a href="tel:"> — on a phone that dials, which is the entire
// point. `aria-label` spells the number out so a screen reader does not read it
// as one long integer.
//
// The icon is inline SVG, not lucide: funnels ship zero external requests and
// this instance has no icon dependency. One glyph does not justify one.
// ===========================================================================

interface PhonePillProps {
  /** Display form, e.g. "0917 123 4567". */
  number: string;
  /** Sky-coloured caption under the number — carrier, hours, or both. */
  label?: string;
  /** Tel URI. Defaults to the number with everything but digits and + stripped. */
  href?: string;
  className?: string;
}

export const PhonePill: React.FC<PhonePillProps> = ({ number, label, href, className = '' }) => (
  <a
    href={href ?? `tel:${number.replace(/[^\d+]/g, '')}`}
    aria-label={`Tumawag sa ${number.split('').join(' ')}`}
    className={`inline-flex items-center gap-3 rounded-brand border-2 border-white/20 bg-brand-elevated px-4 py-3 transition-colors duration-200 hover:border-brand-primary ${className}`}
  >
    <span
      aria-hidden
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#0A1F45" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    </span>
    <span className="text-left leading-tight">
      <span className="block text-lg font-bold text-brand-on-surface md:text-xl">{number}</span>
      {label && (
        <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-on-surface-dim">
          {label}
        </span>
      )}
    </span>
  </a>
);

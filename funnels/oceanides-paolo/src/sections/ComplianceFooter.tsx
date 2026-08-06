import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { PhonePill } from '../primitives/PhonePill';
import { MessengerButton } from '../primitives/MessengerButton';

// Ad-platform compliance surface: the brand line, the disclaimer Meta looks for
// on income/results claims, and the policy links. Deliberately un-animated —
// nothing about a legal footer should slide.
//
// It now also carries THE LAST DOOR (Neil, 2026-08-01). Someone who read the
// whole page and neither filled the form nor tapped the sticky bar is not a
// dead lead; they are a question nobody answered. The contact block sits ABOVE
// the legal stack because the fine print is the last thing to READ and this is
// the last thing to DO. It stays un-animated with the rest of the footer.
export const ComplianceFooter: React.FC<PropsOf<'complianceFooter'>> = ({
  brandLine,
  disclaimer,
  links,
  logo,
  contactLine,
  phone,
  phoneLabel,
  messenger,
  messengerLabel,
}) => (
  // pb-28: the StickyCta bar comes back once the form scrolls out of view, so
  // the last thing on the page needs a gutter it can never sit on top of.
  <SectionShell rhythm="band" className="border-t-2 border-white/15 pb-28 md:pb-28">
    {(phone || messenger) && (
      <div className="mb-10 space-y-5 border-b border-brand-hairline pb-10 text-center">
        {contactLine && (
          <p className="text-base font-bold leading-snug text-brand-on-surface md:text-lg">
            {contactLine}
          </p>
        )}
        {/* Stacked on a phone, side by side from 640px. Both are the same slab
            shape on purpose: neither is the primary, they are two doors into
            the same room and the visitor picks by temperament.
            `items-stretch` inside the capped column is what makes the stacked
            pair share one width — centred but unequal slabs read as two loose
            objects, matched ones read as a pair. */}
        <div className="mx-auto flex w-full max-w-xs flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:items-center sm:justify-center">
          {phone && <PhonePill number={phone} label={phoneLabel} />}
          {messenger && <MessengerButton href={messenger} label={messengerLabel} />}
        </div>
      </div>
    )}

    <div className="space-y-4 text-center">
      {/* Paper chip, same treatment as the hero lockup: logo.jpg carries a
          near-white ground, and keying white out of a JPEG fringes on navy. */}
      {logo && (
        <img
          src={logo}
          alt=""
          width={40}
          height={40}
          loading="lazy"
          className="mx-auto h-10 w-10 rounded-[3px] bg-brand-proof-band object-contain p-0.5"
        />
      )}
      <p className="text-sm font-semibold text-brand-on-surface">{brandLine}</p>
      {disclaimer && (
        <p className="mx-auto max-w-prose text-xs leading-relaxed text-brand-on-surface-dim">{disclaimer}</p>
      )}
      {links && links.length > 0 && (
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-xs uppercase tracking-widest text-brand-on-surface-dim transition-colors duration-200 hover:text-brand-primary"
            >
              {link.label}
            </a>
          ))}
        </nav>
      )}
    </div>
  </SectionShell>
);

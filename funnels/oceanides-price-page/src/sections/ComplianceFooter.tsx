import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';

// Ad-platform compliance surface: the brand line, the disclaimer Meta looks for
// on income/results claims, and the policy links. Deliberately un-animated —
// nothing about a legal footer should slide.
export const ComplianceFooter: React.FC<PropsOf<'complianceFooter'>> = ({
  brandLine,
  disclaimer,
  links,
  logo,
}) => (
  // pb-28: the StickyCta bar comes back once the form scrolls out of view, so
  // the last thing on the page needs a gutter it can never sit on top of.
  <SectionShell rhythm="band" className="border-t-2 border-white/15 pb-28 md:pb-28">
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

import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';

// Ad-platform compliance surface: the brand line, the disclaimer Meta looks for
// on income/results claims, and the policy links. Deliberately un-animated —
// nothing about a legal footer should slide.
export const ComplianceFooter: React.FC<PropsOf<'complianceFooter'>> = ({ brandLine, disclaimer, links }) => (
  <SectionShell rhythm="band" className="border-t border-white/10">
    <div className="space-y-4 text-center">
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

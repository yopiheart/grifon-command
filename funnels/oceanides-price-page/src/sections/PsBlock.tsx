import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { Reveal } from '../primitives/Reveal';

// The P.S. ladder (F01) — the second-most-read part of a sales letter. Labels
// are generated (P.S., P.P.S., P.P.P.S.…) so the config carries only the copy.
//
// The label is Inter 800, NOT `font-accent`. The template reached for the mono
// face to make it look typewritten; clients/oceanides/DESIGN.md scopes
// `data-mono` to "internal dashboards/tickets LANG — hindi customer-facing
// creative," and this is the most customer-facing paragraph on the page.
const psLabel = (index: number): string => `P.${'P.'.repeat(index)}S.`;

export const PsBlock: React.FC<PropsOf<'psBlock'>> = ({ items }) => (
  <SectionShell width="prose" rhythm="band">
    <div className="space-y-4">
      {items.map((item, i) => (
        <Reveal key={i} index={i}>
          <p className="text-base leading-relaxed text-brand-on-surface-muted">
            <span className="font-extrabold uppercase tracking-[1px] text-brand-on-surface">{psLabel(i)} </span>
            {item}
          </p>
        </Reveal>
      ))}
    </div>
  </SectionShell>
);

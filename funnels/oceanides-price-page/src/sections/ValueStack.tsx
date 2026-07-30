import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { GlassCard } from '../primitives/GlassCard';
import { Reveal } from '../primitives/Reveal';

import { goldEmphasis } from '../lib/goldEmphasis';

// Itemised deliverables, then the total.
//
// OCEANIDES: this is NOT the classic inflated "₱25,000 VALUE, yours for ₱499"
// ladder, and that is a deliberate refusal — see §4 of
// workflows/oceanides_offer_price_page.md. The whole positioning is "nakikita mo
// ang totoong numero"; a fake value stack sounds exactly like the scammer these
// buyers are running from. Honesty is the lever here, not inflation. So the rows
// carry no invented peso values and the total is the real, single price.
//
// Rendered as the DESIGN.md CHECKLIST ROW: 2px box, and a ✔ in `good-on-dark`
// (#3ED36B) — never amber. DESIGN.md is explicit that semantic ≠ accent: "amber
// = 'tingnan mo ito,' hindi 'tama ito.'" A done-marker is a verdict, so it is
// green; amber would spend the scroll-stop colour on a checkmark.
export const ValueStack: React.FC<PropsOf<'valueStack'>> = ({ heading, items, totalLine }) => (
  <SectionShell width="prose">
    <Reveal>
      <h2 className="mb-8 text-center text-2xl md:text-4xl">{goldEmphasis(heading)}</h2>
    </Reveal>
    <Reveal index={1}>
      <GlassCard padded={false}>
        <ul>
          {items.map((item, i) => (
            <li
              key={`${item.label}-${i}`}
              className="flex items-start gap-4 border-b border-white/10 px-5 py-4 last:border-b-0 md:px-8"
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="mt-0.5 h-5 w-5 shrink-0"
                fill="none"
                stroke="#3ED36B"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span className="flex-1 text-base leading-snug text-brand-on-surface-muted">{item.label}</span>
              {item.value && (
                <span className="shrink-0 text-base font-semibold text-brand-on-surface">{item.value}</span>
              )}
            </li>
          ))}
        </ul>
        {totalLine && (
          <p className="border-t-2 border-white/20 px-5 py-5 text-center font-display text-2xl uppercase leading-none tracking-[0.5px] text-brand-primary md:px-8 md:text-3xl">
            {totalLine}
          </p>
        )}
      </GlassCard>
    </Reveal>
  </SectionShell>
);

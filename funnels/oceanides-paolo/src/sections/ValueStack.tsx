import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { GlassCard } from '../primitives/GlassCard';
import { Reveal } from '../primitives/Reveal';

import { SectionHeading } from '../primitives/SectionHeading';

// Itemised deliverables, then the total.
//
// OCEANIDES: this is NOT the classic inflated "₱25,000 VALUE, yours for ₱499"
// ladder, and that is a deliberate refusal — see §4 of
// workflows/oceanides_offer_price_page.md. The whole positioning is "nakikita mo
// ang totoong numero"; a fake value stack sounds exactly like the scammer these
// buyers are running from. Honesty is the lever here, not inflation. So the rows
// carry no invented peso values and the total is the real, single price.
//
// Rendered as the DESIGN.md CHECKLIST ROW: 2px box, and a ✔ in `good` — never
// amber. DESIGN.md is explicit that semantic ≠ accent: "amber = 'tingnan mo
// ito,' hindi 'tama ito.'" A done-marker is a verdict, so it is green; amber
// would spend the scroll-stop colour on a checkmark. The green STEP is
// ground-relative (#3ED36B on navy, #1B8A3C on paper) and comes from the token,
// so this section does not care which chapter it is printed on.
//
// The total is an amber CHIP, not amber type. This section sits on the paper
// chapter and amber TEXT on paper is 1.7:1 — a hard ban in the contrast floor.
// As a fill with surface-deep text it is 8.8:1, and it reads more like a stamped
// figure on a quotation than a coloured word did.
export const ValueStack: React.FC<PropsOf<'valueStack'>> = ({ heading, items, totalLine }) => (
  <SectionShell width="prose">
    <Reveal>
      <SectionHeading className="mb-8">{heading}</SectionHeading>
    </Reveal>
    <Reveal index={1}>
      <GlassCard padded={false}>
        <ul>
          {items.map((item, i) => (
            <li
              key={`${item.label}-${i}`}
              className="flex items-start gap-4 border-b border-brand-hairline px-5 py-4 last:border-b-0 md:px-8"
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="mt-0.5 h-5 w-5 shrink-0 stroke-brand-good"
                fill="none"
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
          <div className="border-t-2 border-brand-card-border px-5 py-5 md:px-8">
            <span className="inline-block rounded-[4px] bg-brand-primary px-4 py-2.5 font-display text-xl uppercase leading-none tracking-[0.5px] text-brand-elevated md:text-2xl">
              {totalLine}
            </span>
          </div>
        )}
      </GlassCard>
    </Reveal>
  </SectionShell>
);

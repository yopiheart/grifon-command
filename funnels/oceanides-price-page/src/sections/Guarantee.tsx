import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { GlassCard } from '../primitives/GlassCard';
import { Reveal } from '../primitives/Reveal';
import { SectionHeading } from '../primitives/SectionHeading';
import { goldEmphasis } from '../lib/goldEmphasis';

// Risk reversal, printed as a warranty card.
//
// WAS: a centred "certificate" with a bare <h2> and no eyebrow, no amber rule.
// Two things were wrong with it. The centring broke the one-rail law (DESIGN.md
// "Kaliwa. Walang exception."); lint-layout greps for the centring PROP, so the
// `text-center` className this section used walked straight past the gate. And
// skipping SectionHeading meant the page's single loudest promise rendered a
// full tier quieter than the FAQ above it. That is the exact defect
// SectionHeading was built to fix; this section had simply never adopted it.
//
// NOW: the rail, the eyebrow chip, the amber rule — same as every sibling — and
// two devices ported from IM8's guarantee block (read 2026-08-02):
//
//   `seal`   their "90 DAY" slab. A number is legible at scroll speed in a way
//            a sentence is not, and this brand HAS a real one (30-day bara
//            warranty) so it costs nothing to be honest about.
//   `chips`  their checkmark row. Ours carries papers and terms instead of
//            certifications-for-hire, and every entry restates something the
//            page already proves above. See the type comment: an unbacked chip
//            poisons the backed ones beside it.
//
// What did NOT come across from IM8: the star rating and the review count. This
// brand has no reviews, and DESIGN.md bans inventing proof outright. An empty
// star row is not a smaller version of that lever, it is the fabrication.
export const Guarantee: React.FC<PropsOf<'guarantee'>> = ({ eyebrow, heading, body, seal, chips }) => (
  <SectionShell width="prose">
    <Reveal>
      <SectionHeading eyebrow={eyebrow}>{heading}</SectionHeading>
    </Reveal>
    <Reveal index={1}>
      <GlassCard className="mt-6 border-brand-primary">
        {seal && (
          // Anton is set globally on h1-h3 only, so a display number outside a
          // heading has to ask for `font-display` by name. It stays a <p>: this
          // is a figure, not a section title, and the h-tag trap (DESIGN.md
          // 2026-08-01) is exactly what happens when that line gets blurred.
          <div className="flex items-baseline gap-3 border-b border-dashed border-brand-card-border pb-5">
            <p className="font-display text-[4rem] leading-[0.8] text-brand-primary md:text-[5rem]">
              {seal.value}
            </p>
            <div>
              <p className="font-display text-[1.25rem] leading-none text-brand-on-surface">
                {seal.unit}
              </p>
              <p className="mt-2 text-[11px] font-black uppercase leading-none tracking-[1.2px] text-brand-on-surface-dim">
                {seal.label}
              </p>
            </div>
          </div>
        )}
        <p className={`text-base leading-relaxed text-brand-on-surface-muted md:text-lg ${seal ? 'mt-5' : ''}`}>
          {goldEmphasis(body)}
        </p>
      </GlassCard>
    </Reveal>
    {chips && chips.length > 0 && (
      <Reveal index={2}>
        {/* DESIGN.md checklist grammar: "tapos = good na may ✔, hindi amber."
            The tick is the semantic token, the amber stays on the card border
            above where it means "look here" rather than "this is correct". */}
        <ul className="mt-5 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li
              key={chip}
              className="inline-flex items-center gap-2 rounded-brand border border-brand-card-border px-3 py-2"
            >
              <span aria-hidden className="text-sm leading-none text-brand-good">
                ✓
              </span>
              <span className="text-[11px] font-black uppercase leading-none tracking-[1px] text-brand-on-surface">
                {chip}
              </span>
            </li>
          ))}
        </ul>
      </Reveal>
    )}
  </SectionShell>
);

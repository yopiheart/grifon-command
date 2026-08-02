import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { Reveal } from '../primitives/Reveal';
import { SectionHeading } from '../primitives/SectionHeading';
import { goldEmphasis } from '../lib/goldEmphasis';

// The cost of waiting, argued as a work order rather than a countdown.
//
// WHY TWO IDENTICAL COLUMNS. The reader is not being told they will lose money
// — they will not, and saying so on a page whose entire product is an honest
// price would cost more trust than the urgency could ever buy. They are being
// shown the same job booked at two different moments. Identical structure is
// what makes that readable at a glance: same box, same rule, same rhythm, one
// variable changed.
//
// The amber border on the second column is DESIGN.md's "tingnan mo ito", NOT a
// status colour ("huwag gamitin ang amber para sa status"). Nothing here is
// marked good or bad; the columns simply are what they are, and the amber says
// which one the eye should land on. A `danger` red was the obvious first reach
// and is wrong twice over: it would be a status use of a semantic token, and
// #D7263D on navy measures 3.25:1 — below the floor for text this size.
//
// No icons in the rows either. A ✓/✗ pair would grade the two columns, and the
// point is that BOTH are real futures the reader is choosing between. Dashed
// hairlines separate the items instead: receipt grammar, the same device the
// hero ticket and the proof strip already use.
const Column: React.FC<{ label: string; items: string[]; attention?: boolean }> = ({
  label,
  items,
  attention = false,
}) => (
  <div
    className={`rounded-brand border-2 p-5 ${
      attention ? 'border-brand-primary' : 'border-dashed border-white/25'
    }`}
  >
    <p
      className={`text-[11px] font-black uppercase leading-none tracking-[1.2px] ${
        attention ? 'text-brand-primary' : 'text-brand-on-surface-dim'
      }`}
    >
      {label}
    </p>
    <ul className="mt-4 space-y-3">
      {items.map((item, i) => (
        <li
          key={item}
          className={`text-[15px] leading-relaxed text-brand-on-surface-muted ${
            i > 0 ? 'border-t border-dashed border-white/15 pt-3' : ''
          }`}
        >
          {item}
        </li>
      ))}
    </ul>
  </div>
);

export const CostOfDelay: React.FC<PropsOf<'costOfDelay'>> = ({
  eyebrow,
  heading,
  body,
  compare,
  close,
}) => (
  <SectionShell width="prose">
    <Reveal>
      <SectionHeading eyebrow={eyebrow}>{heading}</SectionHeading>
    </Reveal>
    <Reveal index={1}>
      <div className="mt-6 space-y-4">
        {body.map((paragraph, i) => (
          <p key={i} className="text-base leading-relaxed text-brand-on-surface-muted md:text-lg">
            {goldEmphasis(paragraph)}
          </p>
        ))}
      </div>
    </Reveal>
    {compare && (
      <Reveal index={2}>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Column label={compare.nowLabel} items={compare.nowItems} />
          <Column label={compare.laterLabel} items={compare.laterItems} attention />
        </div>
      </Reveal>
    )}
    {close && (
      <Reveal index={3}>
        <p className="mt-8 text-base font-bold leading-relaxed text-brand-on-surface md:text-lg">
          {goldEmphasis(close)}
        </p>
      </Reveal>
    )}
  </SectionShell>
);

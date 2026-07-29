import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { GlassCard } from '../primitives/GlassCard';
import { Reveal } from '../primitives/Reveal';

// Itemised deliverables with prices attached, then the total — the classic
// "here is what it's worth before I tell you what it costs" ladder.
export const ValueStack: React.FC<PropsOf<'valueStack'>> = ({ heading, items, totalLine }) => (
  <SectionShell width="prose">
    <Reveal>
      <h2 className="mb-8 text-center text-2xl font-bold md:text-4xl">{heading}</h2>
    </Reveal>
    <Reveal index={1}>
      <GlassCard padded={false}>
        <ul>
          {items.map((item, i) => (
            <li
              key={`${item.label}-${i}`}
              className="flex items-baseline justify-between gap-4 border-b border-white/10 px-5 py-4 last:border-b-0 md:px-8"
            >
              <span className="text-base text-brand-on-surface-muted">{item.label}</span>
              {item.value && (
                <span className="shrink-0 text-base font-semibold text-brand-on-surface">{item.value}</span>
              )}
            </li>
          ))}
        </ul>
        {totalLine && (
          <p className="border-t border-white/15 px-5 py-5 text-center text-lg font-bold text-brand-primary md:px-8">
            {totalLine}
          </p>
        )}
      </GlassCard>
    </Reveal>
  </SectionShell>
);

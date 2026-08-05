import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { GlassCard } from '../primitives/GlassCard';
import { Reveal } from '../primitives/Reveal';

// Numbered so the reader feels the pile growing — the count is generated, not
// authored, so reordering bonuses in the config can't leave a stale "BONUS #3".
export const BonusStack: React.FC<PropsOf<'bonusStack'>> = ({ heading, bonuses }) => (
  <SectionShell>
    <Reveal>
      <h2 className="mb-10 text-center text-2xl font-bold md:text-4xl">{heading}</h2>
    </Reveal>
    <div className="grid gap-5 md:grid-cols-2">
      {bonuses.map((bonus, i) => (
        <Reveal key={`${bonus.title}-${i}`} index={i}>
          <GlassCard className="h-full">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-primary">
              Bonus #{i + 1}
            </p>
            <h3 className="mt-3 text-lg font-bold md:text-xl">{bonus.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-brand-on-surface-muted">{bonus.blurb}</p>
            {bonus.value && (
              <p className="mt-4 text-sm font-semibold text-brand-on-surface">{bonus.value}</p>
            )}
          </GlassCard>
        </Reveal>
      ))}
    </div>
  </SectionShell>
);

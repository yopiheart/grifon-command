import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { GlassCard } from '../primitives/GlassCard';
import { Reveal } from '../primitives/Reveal';

// L9 — the specific-number authority stack. The metric is set oversized and in
// the brand colour on purpose: a scanner who reads nothing else still leaves
// with three numbers.
export const CaseStudyMetrics: React.FC<PropsOf<'caseStudyMetrics'>> = ({ heading, items }) => (
  <SectionShell>
    {heading && (
      <Reveal>
        <h2 className="mb-10 text-center text-2xl font-bold md:text-4xl">{heading}</h2>
      </Reveal>
    )}
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, i) => (
        <Reveal key={`${item.metric}-${i}`} index={i}>
          <GlassCard className="h-full text-center">
            <p className="font-display text-4xl font-bold leading-none text-brand-primary md:text-5xl">
              {item.metric}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-brand-on-surface-muted">{item.caption}</p>
          </GlassCard>
        </Reveal>
      ))}
    </div>
  </SectionShell>
);

import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { GlassCard } from '../primitives/GlassCard';
import { Reveal } from '../primitives/Reveal';
import { LeadForm } from './LeadForm';

// F03/F06 anatomy — the minimal archetype's whole page above the fold: claim on
// the left, the form itself on the right. No CTA button, because the CTA IS the
// form; there is nowhere else to scroll to.
export const HeroOptin: React.FC<PropsOf<'heroOptin'>> = ({ eyebrow, headline, subhead, mockupImage }) => (
  <SectionShell>
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <Reveal>
        {eyebrow && (
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-primary">{eyebrow}</p>
        )}
        <h1 className="text-[2rem] font-bold leading-[1.1] md:text-[3.25rem]">{headline}</h1>
        {subhead && (
          <p className="mt-5 text-base leading-relaxed text-brand-on-surface-muted md:text-lg">{subhead}</p>
        )}
        {mockupImage && (
          <img
            src={mockupImage}
            alt=""
            loading="eager"
            className="mt-8 w-full max-w-sm rounded-brand border border-white/10 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)]"
          />
        )}
      </Reveal>

      <Reveal index={1}>
        <GlassCard>
          <LeadForm />
        </GlassCard>
      </Reveal>
    </div>
  </SectionShell>
);

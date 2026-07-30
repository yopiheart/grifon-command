import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { Reveal } from '../primitives/Reveal';
import { CtaButton } from '../primitives/CtaButton';
import { scrollToLeadForm } from '../lib/scrollToForm';

// Longform hero — big claim, then the first of several CTAs that all land on
// the same single form further down the page (L8).
export const Hero: React.FC<PropsOf<'hero'>> = ({ eyebrow, headline, subhead, ctaLabel }) => (
  <SectionShell width="prose" className="text-center">
    <Reveal>
      {eyebrow && (
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-primary">{eyebrow}</p>
      )}
      <h1 className="text-[2.125rem] font-bold leading-[1.08] md:text-[3.5rem]">{headline}</h1>
      {subhead && (
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-brand-on-surface-muted md:text-lg">
          {subhead}
        </p>
      )}
      <div className="mt-9 flex justify-center">
        <CtaButton onClick={scrollToLeadForm}>{ctaLabel}</CtaButton>
      </div>
    </Reveal>
  </SectionShell>
);

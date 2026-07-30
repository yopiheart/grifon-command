import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { GlassCard } from '../primitives/GlassCard';
import { Reveal } from '../primitives/Reveal';
import { LeadForm } from './LeadForm';

// The longform archetype's single conversion point — the destination every
// ctaBlock on the page scrolls to.
export const LeadFormSection: React.FC<PropsOf<'leadFormSection'>> = ({ heading }) => (
  <SectionShell width="prose">
    {heading && (
      <Reveal>
        <h2 className="mb-8 text-center text-2xl font-bold md:text-4xl">{heading}</h2>
      </Reveal>
    )}
    <Reveal index={1}>
      <GlassCard>
        <LeadForm />
      </GlassCard>
    </Reveal>
  </SectionShell>
);

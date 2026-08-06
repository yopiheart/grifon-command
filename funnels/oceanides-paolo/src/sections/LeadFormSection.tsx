import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { GlassCard } from '../primitives/GlassCard';
import { Reveal } from '../primitives/Reveal';
import { SectionHeading } from '../primitives/SectionHeading';
import { LeadForm } from './LeadForm';

// The longform archetype's single conversion point — the destination every
// ctaBlock on the page scrolls to.
//
// ⚠️ ONE heading, never two. The section heading and LeadForm's own `headline`
// were both rendering, so "Mag-book ng schedule" appeared twice, back to back
// (caught in the 2026-08-01 render pass). The section heading wins when it is
// present, because it is the one with the Anton + amber-rule treatment every
// other section uses; the form's own headline is what carries `heroOptin`,
// where there is no section heading above it.
export const LeadFormSection: React.FC<PropsOf<'leadFormSection'>> = ({ heading }) => (
  <SectionShell width="prose">
    {heading && (
      <Reveal>
        <SectionHeading className="mb-8">{heading}</SectionHeading>
      </Reveal>
    )}
    <Reveal index={1}>
      <GlassCard>
        <LeadForm showHeadline={!heading} />
      </GlassCard>
    </Reveal>
  </SectionShell>
);

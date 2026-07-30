import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { Reveal } from '../primitives/Reveal';
import { CtaButton } from '../primitives/CtaButton';
import { scrollToLeadForm } from '../lib/scrollToForm';

// L8 — repeatable, and every instance goes to the SAME form. The config owns
// the label and the urgency line; the destination is not configurable, which is
// exactly what stops a long page from sprouting rival conversion points.
export const CtaBlock: React.FC<PropsOf<'ctaBlock'>> = ({ label, urgency }) => (
  <SectionShell rhythm="band" width="prose" className="text-center">
    <Reveal>
      <CtaButton onClick={scrollToLeadForm}>{label}</CtaButton>
      {urgency && <p className="mt-4 text-sm text-brand-on-surface-dim">{urgency}</p>}
    </Reveal>
  </SectionShell>
);

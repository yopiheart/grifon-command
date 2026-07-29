import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { GlassCard } from '../primitives/GlassCard';
import { Reveal } from '../primitives/Reveal';

// Risk reversal, deliberately styled like a certificate: brand-coloured frame,
// centred, nothing else competing on screen.
export const Guarantee: React.FC<PropsOf<'guarantee'>> = ({ heading, body }) => (
  <SectionShell width="prose">
    <Reveal>
      <GlassCard className="border-brand-primary text-center">
        <h2 className="text-xl font-bold uppercase tracking-wide text-brand-primary md:text-2xl">{heading}</h2>
        <p className="mt-4 text-base leading-relaxed text-brand-on-surface-muted md:text-lg">{body}</p>
      </GlassCard>
    </Reveal>
  </SectionShell>
);

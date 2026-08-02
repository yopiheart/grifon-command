import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { GlassCard } from '../primitives/GlassCard';
import { Reveal } from '../primitives/Reveal';
import { goldEmphasis } from '../lib/goldEmphasis';

// Risk reversal, deliberately styled like a certificate: brand-coloured frame,
// centred, nothing else competing on screen.
export const Guarantee: React.FC<PropsOf<'guarantee'>> = ({ heading, body }) => (
  <SectionShell width="prose">
    <Reveal>
      <GlassCard className="border-brand-primary text-center">
        <h2 className="text-[1.5rem] leading-[0.98] text-brand-accent-text md:text-[2.125rem]">
          {goldEmphasis(heading)}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-brand-on-surface-muted md:text-lg">
          {goldEmphasis(body)}
        </p>
      </GlassCard>
    </Reveal>
  </SectionShell>
);

import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { Reveal } from '../primitives/Reveal';

// Prose measure, not grid width — this is the one section people actually read
// end to end, so it gets a reading column instead of the page column.
export const OriginStory: React.FC<PropsOf<'originStory'>> = ({ heading, paragraphs }) => (
  <SectionShell width="prose">
    <Reveal>
      <h2 className="text-2xl font-bold md:text-4xl">{heading}</h2>
    </Reveal>
    <div className="mt-6 space-y-5">
      {paragraphs.map((paragraph, i) => (
        <Reveal key={i} index={i}>
          <p className="text-base leading-relaxed text-brand-on-surface-muted md:text-lg">{paragraph}</p>
        </Reveal>
      ))}
    </div>
  </SectionShell>
);

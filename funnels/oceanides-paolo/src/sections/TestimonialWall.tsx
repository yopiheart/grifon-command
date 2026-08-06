import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { GlassCard } from '../primitives/GlassCard';
import { Reveal } from '../primitives/Reveal';

// The documented light band. Flipping tone here (rather than at, say, the value
// stack) gives a long page one deliberate breath of daylight where the proof
// lives — the reader's eye registers the change as "other people talking".
export const TestimonialWall: React.FC<PropsOf<'testimonialWall'>> = ({ heading, items }) => (
  <SectionShell tone="proof">
    {heading && (
      <Reveal>
        <h2 className="mb-10 text-center text-2xl font-bold md:text-4xl">{heading}</h2>
      </Reveal>
    )}
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item, i) => (
        <Reveal key={`${item.name}-${i}`} index={i}>
          <GlassCard tone="proof" className="h-full">
            <p className="font-accent text-lg leading-relaxed">“{item.quote}”</p>
            <p className="mt-5 text-sm font-semibold">{item.name}</p>
            {item.role && <p className="text-sm text-black/60">{item.role}</p>}
          </GlassCard>
        </Reveal>
      ))}
    </div>
  </SectionShell>
);

import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { Reveal } from '../primitives/Reveal';

// Names the reader's objection out loud, then dismantles it. Left-ruled in the
// brand colour so it reads as an aside in the argument, not another pitch.
export const ObjectionReversal: React.FC<PropsOf<'objectionReversal'>> = ({ heading, body }) => (
  <SectionShell width="prose">
    <Reveal>
      <div className="border-l-2 border-brand-primary pl-5 md:pl-8">
        <h2 className="text-2xl font-bold md:text-3xl">{heading}</h2>
        <div className="mt-5 space-y-4">
          {body.map((paragraph, i) => (
            <p key={i} className="text-base leading-relaxed text-brand-on-surface-muted md:text-lg">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </Reveal>
  </SectionShell>
);

import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { Reveal } from '../primitives/Reveal';
import { SectionHeading } from '../primitives/SectionHeading';

// Names the reader's objection out loud, then dismantles it.
//
// ⚠️ The heading stays ON THE RAIL. This section used to wrap EVERYTHING —
// heading included — in a left-ruled `pl-5` box, which pushed its heading 22px
// right of every other heading on the page. Nothing looked wrong in this file;
// it only showed as a sideways jump when scrolling the whole page, which is
// exactly the class of bug Neil called out on 2026-07-30 ("dapat aligned yan").
//
// The amber rule is still worth having, so it now wraps only the BODY. The
// aside reads as an aside, and the heading keeps the rail.
export const ObjectionReversal: React.FC<PropsOf<'objectionReversal'>> = ({ heading, body }) => (
  <SectionShell width="prose">
    <Reveal>
      <SectionHeading>{heading}</SectionHeading>
      <div className="mt-6 space-y-4 border-l-2 border-brand-primary pl-5 md:pl-8">
        {body.map((paragraph, i) => (
          <p key={i} className="text-base leading-relaxed text-brand-on-surface-muted md:text-lg">
            {paragraph}
          </p>
        ))}
      </div>
    </Reveal>
  </SectionShell>
);

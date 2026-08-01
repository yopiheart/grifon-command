import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { Reveal } from '../primitives/Reveal';
import { SectionHeading } from '../primitives/SectionHeading';
import { goldEmphasis } from '../lib/goldEmphasis';

// Prose measure, not grid width — this is the one section people actually read
// end to end, so it gets a reading column instead of the page column.
//
// The fleet photo lives HERE now, not under the hero CTA. Under the hero it was
// only ever seen as a sliver at the fold, doing the job of neither a product
// shot nor a proof shot. At the end of the kwento it lands where a reader has
// just been told what actually happens, and the picture answers "sino ang
// darating." Same reason DESIGN.md keeps "totoong litrato ni Marvin" in the
// system at all: the photo is evidence, not decoration.
export const OriginStory: React.FC<PropsOf<'originStory'>> = ({ heading, paragraphs, image, imageAlt }) => (
  <SectionShell width="prose">
    <Reveal>
      <SectionHeading>{heading}</SectionHeading>
    </Reveal>
    <div className="mt-6 space-y-5">
      {paragraphs.map((paragraph, i) => (
        <Reveal key={i} index={i}>
          <p className="text-base leading-relaxed text-brand-on-surface-muted md:text-lg">{goldEmphasis(paragraph)}</p>
        </Reveal>
      ))}
    </div>
    {image && (
      <Reveal index={paragraphs.length}>
        <div className="mt-9 overflow-hidden rounded-brand border-2 border-brand-card-border">
          <img src={image} alt={imageAlt ?? ''} loading="lazy" className="block w-full" />
        </div>
      </Reveal>
    )}
  </SectionShell>
);

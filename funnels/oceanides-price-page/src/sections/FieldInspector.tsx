import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { SectionHeading } from '../primitives/SectionHeading';
import { Reveal } from '../primitives/Reveal';
import { goldEmphasis } from '../lib/goldEmphasis';

// ===========================================================================
// FieldInspector — "sino ang darating."
//
// The page has already answered magkano completely by the time a reader gets
// here. What is left is the last thing a household actually weighs before
// booking: a stranger is coming into their yard, and right now he has no face.
// A named person with a photograph converts an abstract "kami" into somebody
// who can be held to the price he quotes.
//
// This is the same lever clients/oceanides/DESIGN.md keeps "totoong litrato ni
// Marvin" in the system for: the photo is evidence, not decoration. It carries
// the same precondition too — a signed likeness consent (Gabriel's, 2026-08-01)
// before the face ships anywhere customer-facing.
//
// Photo left, text right, and under the photo a name plate set like the
// signature block on a work order: the person is the credential.
// ===========================================================================

export const FieldInspector: React.FC<PropsOf<'fieldInspector'>> = ({
  eyebrow,
  heading,
  body,
  image,
  imageAlt,
  name,
  role,
}) => (
  <SectionShell width="prose">
    <Reveal>
      <SectionHeading eyebrow={eyebrow}>{heading}</SectionHeading>
    </Reveal>

    <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
      <Reveal className="md:w-2/5 md:shrink-0">
        {/* Capped, because the plate is a 2:3 portrait: run to the full rail on
            a phone and one photograph stands 525px tall, which is most of the
            viewport and pushes every word of the copy below the fold. The cap
            only bites on mobile — the md column is already narrower than it. */}
        <figure className="m-0 max-w-[18rem]">
          <div className="overflow-hidden rounded-brand border-2 border-brand-card-border">
            <img src={image} alt={imageAlt} loading="lazy" className="block w-full" />
          </div>
          <figcaption className="mt-3">
            <p className="text-base font-extrabold leading-tight text-brand-on-surface">{name}</p>
            <p className="mt-1 text-[10px] font-black uppercase leading-none tracking-[1.2px] text-brand-on-surface-dim">
              {role}
            </p>
          </figcaption>
        </figure>
      </Reveal>

      <div className="space-y-5 md:w-3/5">
        {body.map((paragraph, i) => (
          <Reveal key={i} index={i + 1}>
            <p className="text-base leading-relaxed text-brand-on-surface-muted md:text-lg">
              {goldEmphasis(paragraph)}
            </p>
          </Reveal>
        ))}
      </div>
    </div>
  </SectionShell>
);

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
// LAYOUT, DALAWANG ANYO (binago 2026-08-03, Neil: "ang liit ng picture nilang
// dalawa sa PC, sa mobile ganun rin... gawin mong swipe type").
//
//   ISANG tao   photo left, text right. Ang mukha ay credential, at ang
//               name plate sa ilalim ay parang pirma sa work order.
//   DALAWA      sariling hanay ang mga litrato sa itaas, teksto sa ilalim.
//
// Bakit napilitang maghiwalay. Ang prose rail ay 46rem = 736px, at doon ay
// 2/5 lang ang hanay ng litrato. Hatiin mo yun sa dalawa at 140px na lang ang
// bawat mukha — mas maliit pa kaysa sa thumbnail sa Messenger. Walang laki na
// mabibili sa loob ng dalawang hanay; ang buong lapad lang ang makakapagbigay
// nun. Sa buong rail, tumataas sila sa mga 350px kada isa sa PC at mga 270px
// sa cellphone, mahigit doble ng dati.
//
// Ang carousel ay purong CSS scroll-snap, walang library. Sa cellphone, 72%
// ang lapad ng card kaya sumisilip ang kasunod — yun ang nagsasabing pwedeng
// i-swipe, hindi isang tuldok o arrow na kailangan pang pindutin. Sa PC,
// kalahati bawat isa kaya magkatabi silang dalawa at walang ginagalaw.
//
// 🔴 NANANATILI SYA SA RAIL. Ang Apple na carousel ay umaabot sa gilid ng
// screen; dito hindi, kasi print world to at isang rail ang batas
// (lint-layout.mjs). Ang silip sa gilid ang nagbibigay ng parehong senyas
// nang hindi binabali ang rail.
// ===========================================================================

interface Person {
  image: string;
  imageAlt: string;
  name: string;
  role: string;
}

/** Ang litrato at ang pangalan sa ilalim nya. Isang anyo lang, saan man sya ilagay. */
const Plate: React.FC<Person & { className?: string }> = ({
  image,
  imageAlt,
  name,
  role,
  className = '',
}) => (
  <figure className={`m-0 ${className}`}>
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
);

export const FieldInspector: React.FC<PropsOf<'fieldInspector'>> = ({
  eyebrow,
  heading,
  body,
  image,
  imageAlt,
  name,
  role,
  second,
}) => {
  const people: Person[] = [{ image, imageAlt, name, role }, ...(second ? [second] : [])];
  const isPair = people.length > 1;

  const copy = body.map((paragraph, i) => (
    <Reveal key={i} index={i + 1}>
      <p className="text-base leading-relaxed text-brand-on-surface-muted md:text-lg">
        {goldEmphasis(paragraph)}
      </p>
    </Reveal>
  ));

  return (
    <SectionShell width="prose">
      <Reveal>
        <SectionHeading eyebrow={eyebrow}>{heading}</SectionHeading>
      </Reveal>

      {isPair ? (
        <>
          <Reveal>
            {/* Nakatago ang scrollbar sa tatlong engine. Hindi kalinisan lang
                ito: ang isang scrollbar sa ilalim ng dalawang litrato ay
                mukhang sira sa print world, at sa PC ay wala namang aabot sa
                gilid kaya wala rin syang silbi doon. Ang silip sa kanan ang
                nagsasabi kung ano ang gagawin. */}
            <div
              role="region"
              aria-label="Ang field inspector ng Oceanides"
              className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {people.map((p) => (
                <Plate
                  key={p.name}
                  {...p}
                  className="w-[72%] shrink-0 snap-start sm:w-[calc(50%-0.5rem)]"
                />
              ))}
            </div>
          </Reveal>
          <div className="mt-8 space-y-5">{copy}</div>
        </>
      ) : (
        <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
          <Reveal className="md:w-2/5 md:shrink-0">
            {/* May takip ang nag-iisa, kasi 2:3 portrait sya: pabayaan mo syang
                umabot sa buong rail sa cellphone at 525px ang taas nya, halos
                buong screen, at naitulak na lahat ng teksto sa ilalim ng fold.
                Sa cellphone lang sya kumakagat — mas makipot na sa kanya ang
                md na hanay. */}
            <Plate {...people[0]} className="max-w-[18rem]" />
          </Reveal>
          <div className="space-y-5 md:w-3/5">{copy}</div>
        </div>
      )}
    </SectionShell>
  );
};

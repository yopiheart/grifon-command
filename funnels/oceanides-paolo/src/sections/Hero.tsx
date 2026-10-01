import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { Reveal } from '../primitives/Reveal';
import { CtaButton } from '../primitives/CtaButton';
import { EyebrowChip } from '../primitives/EyebrowChip';
import { PhonePill } from '../primitives/PhonePill';
import { PriceTicket } from '../primitives/PriceTicket';
import { goldEmphasis } from '../lib/goldEmphasis';
import { scrollToLeadForm } from '../lib/scrollToForm';

// ===========================================================================
// Hero — OCEANIDES build. Claim on the left, QUOTATION on the right.
//
// v3 was a centred Apple-style stack with the truck photo underneath. The stack
// was right about restraint and wrong about what the product is. Apple puts the
// product under the claim because the product is a photograph. Here the product
// is a PRICE, and the thing that makes this page different from every siphoner
// who says "depende" is that the price is WRITTEN DOWN. So the printed ticket
// takes the product slot, and the truck photo moves to the kwento chapter where
// it can be looked at instead of glimpsed as a sliver at the fold.
//
// Composition:
//   ≥lg   two columns — claim + action on the rail, ticket held to ~400px right
//   <lg   one column, DOM order = reading order:
//         eyebrow → H1 → audience → subhead → TICKET → CTA + phone → papers
//
// The ticket has to start inside the 844px fold on a 390px phone, which is why
// the CTA block is a separate grid item rather than part of the copy column: on
// desktop it tucks under the claim (row 2, col 1) beside the full-height ticket,
// and on mobile it simply falls after it. One DOM, no duplicated markup.
//
// Still not stolen from Apple: the white ground and the light type. This stays
// navy + amber matte print per clients/oceanides/DESIGN.md.
// ===========================================================================

export const Hero: React.FC<PropsOf<'hero'>> = ({
  eyebrow,
  headline,
  subhead,
  audience,
  ctaLabel,
  logo,
  logoAlt,
  phone,
  phoneLabel,
  ticket,
  trustChips,
}) => (
  <SectionShell>
    <div className="grid items-start gap-9 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14">
      <Reveal className="mx-auto w-full max-w-2xl text-center lg:col-start-1 lg:row-start-1 lg:mx-0 lg:max-w-none lg:text-left">
        {/* Keep the approved square logo intact, including its dark background. */}
        {logo && (
          <img
            src={logo}
            alt={logoAlt ?? 'Oceanides'}
            width={72}
            height={72}
            className="mx-auto mb-6 h-16 w-16 object-contain md:h-[72px] md:w-[72px] lg:mx-0"
          />
        )}

        {eyebrow && (
          <div className="mb-5">
            <EyebrowChip>{eyebrow}</EyebrowChip>
          </div>
        )}

        <h1 className="text-[2.5rem] leading-[0.95] md:text-[4.25rem] lg:text-[3.75rem] xl:text-[4.25rem]">
          {goldEmphasis(headline)}
        </h1>

        {/* S8 audience callout — names the reader before they hit the price. */}
        {audience && (
          <p className="mt-6 text-sm font-semibold leading-snug text-brand-on-surface md:text-base">{audience}</p>
        )}

        {subhead && (
          <p className="mt-5 text-base leading-relaxed text-brand-on-surface-muted md:text-lg">{subhead}</p>
        )}
      </Reveal>

      {/* self-center, not start: the ticket is ~300px against a ~800px copy
          column, and pinned to the top it left the right half of the fold
          empty. Centred it sits against the claim it is evidence for. */}
      {ticket && (
        <Reveal
          index={1}
          className="mx-auto w-full max-w-md lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-w-none lg:self-center"
        >
          <PriceTicket {...ticket} />
        </Reveal>
      )}

      <Reveal
        index={2}
        className="mx-auto w-full max-w-2xl lg:col-start-1 lg:row-start-2 lg:mx-0 lg:max-w-none"
      >
        <div className="flex w-full flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
          <CtaButton onClick={scrollToLeadForm}>{ctaLabel}</CtaButton>
          {phone && <PhonePill number={phone} label={phoneLabel} />}
        </div>

        {phone && (
          <p className="mt-4 text-center text-sm text-brand-on-surface-dim lg:text-left">
            Umaapaw na ngayon? Tumawag ka na, wag ka nang mag-fill ng form.
          </p>
        )}

        {/* The papers, pulled up to the fold. Bordered text chips, not seals:
            a text chip cannot show the wrong DENR region the way the badge
            artwork did, and it costs no image request at the fold. */}
        {trustChips && trustChips.length > 0 && (
          <ul className="mt-7 flex flex-wrap justify-center gap-2 lg:justify-start">
            {trustChips.map((chip) => (
              <li
                key={chip}
                className="rounded-[4px] border border-white/25 px-3 py-1.5 text-[11px] font-extrabold uppercase leading-none tracking-[1px] text-brand-on-surface"
              >
                {chip}
              </li>
            ))}
          </ul>
        )}
      </Reveal>
    </div>
  </SectionShell>
);

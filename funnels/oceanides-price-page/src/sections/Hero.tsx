import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { Reveal } from '../primitives/Reveal';
import { CtaButton } from '../primitives/CtaButton';
import { EyebrowChip } from '../primitives/EyebrowChip';
import { PhonePill } from '../primitives/PhonePill';
import { goldEmphasis } from '../lib/goldEmphasis';
import { scrollToLeadForm } from '../lib/scrollToForm';

// ===========================================================================
// Hero — OCEANIDES build, CENTRED STACK (Neil, 2026-07-30, Apple as the ref).
//
// v2 was a two-column split: copy left, truck photo right. Neil asked to centre
// the lockup and drop the truck below the CTA, pointing at apple.com. He is
// right, and the reason is structural rather than fashion:
//
//   - A side-by-side hero forces the headline to share horizontal space, so the
//     type has to shrink exactly where it should be loudest. Centred, the
//     headline gets the full measure and ₱5,000 can actually shout.
//   - The photo below the CTA means the PRICE and the ACTION both clear the
//     fold on a 390px phone, every time, with no stacking guesswork.
//   - It collapses to one column on mobile with zero layout change, so what
//     Neil approves on desktop is what ships to the phone.
//
// The Apple move worth stealing is restraint, not the aesthetic: one centred
// claim, one line under it, one action, then the product photographed large and
// clean. What is NOT stolen is Apple's white ground and light type — this stays
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
  image,
  imageAlt,
  phone,
  phoneLabel,
}) => (
  <SectionShell>
    <Reveal>
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        {/* Logo as a floating DISC — build-assets.mjs circle-masks the source so
            the white square is gone and it reads as a seal, not a pasted box. */}
        {logo && (
          <img
            src={logo}
            alt={logoAlt ?? 'Oceanides'}
            width={72}
            height={72}
            className="mb-6 h-16 w-16 rounded-full ring-2 ring-brand-primary md:h-[72px] md:w-[72px]"
          />
        )}

        {eyebrow && (
          <div className="mb-5">
            <EyebrowChip>{eyebrow}</EyebrowChip>
          </div>
        )}

        <h1 className="text-[2.5rem] leading-[0.95] md:text-[4.25rem]">{goldEmphasis(headline)}</h1>

        {/* S8 audience callout — names the reader before they hit the price.
            Centred, so the amber rule sits under it instead of beside it. */}
        {audience && (
          <p className="mt-6 max-w-xl text-sm font-semibold leading-snug text-brand-on-surface md:text-base">
            {audience}
          </p>
        )}

        {subhead && (
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-brand-on-surface-muted md:text-lg">
            {subhead}
          </p>
        )}

        <div className="mt-9 flex w-full flex-col items-stretch gap-4 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
          <CtaButton onClick={scrollToLeadForm}>{ctaLabel}</CtaButton>
          {phone && <PhonePill number={phone} label={phoneLabel} />}
        </div>

        {phone && (
          <p className="mt-4 text-sm text-brand-on-surface-dim">
            Umaapaw na ngayon? Tumawag ka na, wag ka nang mag-fill ng form.
          </p>
        )}
      </div>
    </Reveal>

    {/* The truck, large and centred under the action — the Apple product shot
        slot. Wider than the copy measure so it reads as the payoff, not a
        thumbnail hanging off the text. */}
    {image && (
      <Reveal index={1}>
        <div className="relative mx-auto mt-14 max-w-4xl overflow-hidden rounded-brand border-2 border-white/15">
          <img
            src={image}
            alt={imageAlt ?? ''}
            className="block w-full"
            loading="eager"
          />
          {/* photoScrim, verbatim from DESIGN.md — "ang tanging cinematic move ng
              brand." Bottom-up here so the photo settles into the navy ground
              instead of ending on a hard edge. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(0deg,rgba(10,31,69,0.9),rgba(10,31,69,0))]"
          />
        </div>
      </Reveal>
    )}
  </SectionShell>
);

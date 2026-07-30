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
// Hero — OCEANIDES build. Rebuilt from the template's centred text block after
// Neil's read on 2026-07-30: "ganto talaga plain lang walang theme or design?"
// He was right. The template hero is brand-agnostic by design; this one uses the
// components clients/oceanides/DESIGN.md actually specifies:
//
//   - logo lockup on a PAPER chip. logo.jpg has a near-white ground (sampled
//     243,252,251) and keying white out of a JPEG fringes on navy, so the paper
//     surface is the honest treatment — and it is already in the system.
//   - eyebrowChip ("ang signature element ng brand"), not plain tracked text
//   - gold-emphasis Anton headline via `**…**` (Anton has ONE weight, so colour
//     is the brand's only emphasis channel)
//   - photoScrim over the truck photo: "Ito ang tanging cinematic move ng brand."
//   - phonePill for the caller who will not fill a form
//
// LEFT-ALIGNED, not centred. The print world this brand lives in sets copy on a
// left rail; a centred column reads as a deck. Text left, photo right, stacking
// on mobile with the photo BELOW the CTA — the price and the action must clear
// the fold on a 390px screen before any image does.
// ===========================================================================

export const Hero: React.FC<PropsOf<'hero'>> = ({
  eyebrow,
  headline,
  subhead,
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
      <div className="grid items-center gap-10 md:grid-cols-[1.05fr_1fr] md:gap-12">
        <div>
          {logo && (
            <div className="mb-7 inline-flex items-center gap-3 rounded-brand bg-brand-proof-band p-2 pr-4">
              <img
                src={logo}
                alt={logoAlt ?? 'Oceanides'}
                width={44}
                height={44}
                className="h-11 w-11 rounded-[2px] object-contain"
              />
              <span className="text-[11px] font-black uppercase leading-tight tracking-[1px] text-[#0b1b33]">
                Oceanides
                <span className="block font-semibold tracking-[0.5px] text-[#5b6b85]">
                  Siphoning Services
                </span>
              </span>
            </div>
          )}

          {eyebrow && (
            <div className="mb-5">
              <EyebrowChip>{eyebrow}</EyebrowChip>
            </div>
          )}

          <h1 className="text-[2.375rem] leading-[0.95] md:text-[3.75rem]">{goldEmphasis(headline)}</h1>

          {subhead && (
            <p className="mt-6 max-w-xl text-base leading-relaxed text-brand-on-surface-muted md:text-lg">
              {subhead}
            </p>
          )}

          <div className="mt-9 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
            <CtaButton onClick={scrollToLeadForm}>{ctaLabel}</CtaButton>
            {phone && <PhonePill number={phone} label={phoneLabel} />}
          </div>

          {phone && (
            <p className="mt-4 text-sm text-brand-on-surface-dim">
              Umaapaw na ngayon? Tumawag ka na, wag ka nang mag-fill ng form.
            </p>
          )}
        </div>

        {image && (
          <div className="relative overflow-hidden rounded-brand border-2 border-white/15">
            <img
              src={image}
              alt={imageAlt ?? ''}
              className="block h-full w-full object-cover"
              loading="eager"
            />
            {/* photoScrim, verbatim from DESIGN.md — the brand's one cinematic move.
                Left-to-right on desktop so the photo dissolves toward the copy;
                bottom-up on mobile, where the copy sits above it instead. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(0deg,rgba(10,31,69,0.96),rgba(10,31,69,0))] md:bg-[linear-gradient(270deg,rgba(10,31,69,0),rgba(10,31,69,0.96))]"
            />
          </div>
        )}
      </div>
    </Reveal>
  </SectionShell>
);

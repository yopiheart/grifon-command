import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { Reveal } from '../primitives/Reveal';

// A thin trust strip directly under the fold. `line` is the authority sentence
// (L9 — specific numbers a funnel can actually stand behind); rating/logos are
// the classic strip. A funnel with no review count omits it rather than
// inventing one.
//
// OCEANIDES: this brand has NO conventional proof — no testimonials, no
// years-in-service, no household count, no rating. DESIGN.md bans making any of
// them up ("Walang fake proof"), so the L9 lever sits empty and this page does
// not pretend otherwise.
//
// What it DOES have is the moat: real SEC / BIR / DENR registration. Per
// workflows/oceanides_business_model.md — "Ang moat ay ang PAPEL, hindi ang
// truck. Ang crews ay hindi makaka-issue ng DENR-compliance certificate; si
// Oceanides lang." Hence `badges`: the actual marks, not words, because a
// customer who has been burned reads a seal faster than a sentence.
//
// The template's rule that this strip triggers no network request still holds —
// badges are same-origin bundled webp from scripts/build-assets.mjs, not a CDN.
export const SocialProofBar: React.FC<PropsOf<'socialProofBar'>> = ({
  line,
  rating,
  reviewCount,
  logos,
  badges,
}) => (
  <SectionShell rhythm="band" className="border-y-2 border-white/15">
    <Reveal>
      <div className="space-y-6 text-center">
        {/* PER-BADGE DECAL CHIPS.
            v1 was ONE wide paper band holding both marks — Neil, 2026-07-30:
            "bat gayan parang paperboard na white gara kadiri." He was right, and
            the cause was aspect ratio, not taste: the DENR mark is a 9:1
            horizontal lockup and the BIR mark is a 1:1 seal. Sizing both to a
            shared height inside one box left a huge empty white field with two
            small marks adrift in it.
            Fix: each mark gets its OWN chip, sized snug to its own artwork, with
            a shared HEIGHT so their visual weight matches while their widths are
            free to differ. Reads as two decals on a truck door, which is the
            print grammar this brand already speaks.
            Still on paper, not reversed out: an official seal is never recoloured
            and a government mark is not ours to repaint. */}
        {badges && badges.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-4">
            {badges.map((badge) => (
              <span
                key={badge.src}
                className="inline-flex items-center rounded-brand bg-brand-proof-band px-4 py-3 md:px-5 md:py-4"
              >
                <img
                  src={badge.src}
                  alt={badge.alt}
                  loading="lazy"
                  className="h-12 w-auto object-contain md:h-16"
                />
              </span>
            ))}
          </div>
        )}
        {line && (
          <p className="mx-auto max-w-prose text-sm leading-relaxed text-brand-on-surface-muted md:text-base">
            {line}
          </p>
        )}
        {(rating || (logos && logos.length > 0)) && (
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            {rating && (
              <div className="flex items-center gap-2">
                <span aria-hidden className="text-brand-primary">
                  ★★★★★
                </span>
                <span className="text-sm font-semibold text-brand-on-surface">{rating}</span>
                {reviewCount && <span className="text-sm text-brand-on-surface-dim">({reviewCount})</span>}
              </div>
            )}
            {logos?.map((logo) => (
              <span
                key={logo}
                className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-on-surface-dim"
              >
                {logo}
              </span>
            ))}
          </div>
        )}
      </div>
    </Reveal>
  </SectionShell>
);

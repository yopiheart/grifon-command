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
// Oceanides lang."
//
// 🔴 THE BADGE IMAGES ARE GONE (2026-08-01). `badge-denr.webp` shows the WRONG
// DENR region. A wrong seal on a page whose entire product is trust is worse
// than no seal at all, and the BIR mark went with it so the row does not read as
// half-finished. The prop stays in the type for template compatibility; this
// instance simply stops passing it, and the files stay on disk.
//
// So this is a TEXT band now, and it is sized like one: the sentence is the
// element, not a caption under something else. The same three papers also ride
// the hero as `trustChips`, above the fold, where a text chip cannot be the
// wrong artwork.
export const SocialProofBar: React.FC<PropsOf<'socialProofBar'>> = ({ line, rating, reviewCount, logos }) => (
  <SectionShell rhythm="band" className="border-y-2 border-white/15">
    <Reveal>
      <div className="space-y-6 text-center">
        {line && (
          <p className="mx-auto max-w-prose text-base font-bold leading-relaxed text-brand-on-surface md:text-lg">
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

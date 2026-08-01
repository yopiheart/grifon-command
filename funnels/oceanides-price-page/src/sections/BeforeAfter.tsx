import React, { useState } from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { SectionHeading } from '../primitives/SectionHeading';
import { Reveal } from '../primitives/Reveal';

// ===========================================================================
// BeforeAfter — the only outcome proof this brand actually owns.
//
// There are no testimonials, no review count, no years-in-service, no household
// count, and clients/oceanides/DESIGN.md bans inventing any of them ("Walang
// fake proof"). So the L9 specific-number authority lever is empty and stays
// empty. What is left is the thing the work itself produces: a photograph of
// the same tank before and after.
//
// It also does double duty. Neil, 2026-07-30: "before & after may picture
// naman ung septic tank para mapagkumpara bago magsimula at umalis." Those
// photos are not marketing, they are how the 30-day warranty gets settled
// without an argument. Showing them here proves the process AND the outcome in
// the same frame — the customer sees exactly what they will be handed.
//
// ⛔ Only MATCHED pairs. Same fixture, same light, same surrounding concrete.
// A "pair" of two different manholes proves nothing and teaches the reader to
// distrust every other pair on the page. See scripts/build-assets.mjs.
//
// THE WIPE (2026-08-01). The pair used to sit side by side, which asks the eye
// to do the comparing across a seam. Stacking them under a draggable wipe puts
// both states in the SAME rectangle, so the change is the only thing that moves
// and the reader performs the proof with their own hand. A photo you touched is
// harder to dismiss as a stock shot than one you scrolled past.
//
// BEFORE keeps the navy tag; AFTER carries the amber one. Both tags sit OUTSIDE
// the clip, pinned to opposite corners, so neither state is ever unlabelled no
// matter where the handle rests.
//
// The frame is ground-relative (`brand-card` / `brand-card-border`), so on the
// paper chapter the photos sit in a white mount instead of a navy one. The two
// TAGS are NOT ground-relative and must not be: they sit on the photograph, so
// their contrast is against the image, not against the page.
// ===========================================================================

const TAG = 'absolute top-2 z-20 rounded-[4px] px-2 py-1 text-[10px] font-black uppercase leading-none tracking-[1px]';

type Pair = PropsOf<'beforeAfter'>['pairs'][number];

const WipePair: React.FC<{ pair: Pair }> = ({ pair }) => {
  // Percent, not pixels — the divider, the handle and the clip all read the one
  // `--pos` custom property, so they can never drift out of step with the input.
  const [pos, setPos] = useState(50);

  return (
    // The pair is capped rather than run to the full prose measure: these are
    // 2:3 portraits, and at 46rem wide a single one stands ~900px tall, which
    // pushes the caption clean off a phone screen.
    <figure className="max-w-[26rem] overflow-hidden rounded-brand border-2 border-brand-card-border bg-brand-card">
      <div className="relative select-none" style={{ '--pos': `${pos}%` } as React.CSSProperties}>
        <img
          src={pair.before}
          alt={`Before: ${pair.alt}`}
          loading="lazy"
          className="block aspect-[3/4] w-full object-cover"
        />
        <img
          src={pair.after}
          alt={`After: ${pair.alt}`}
          loading="lazy"
          className="absolute inset-0 block h-full w-full object-cover"
          style={{ clipPath: 'inset(0 calc(100% - var(--pos)) 0 0)' }}
        />

        {/* The boundary itself: an amber rule with a round grip, the print
            equivalent of a cut line. Decorative — the range input below is what
            actually carries the value and the a11y contract. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 z-10 w-[3px] -translate-x-1/2 bg-brand-primary"
          style={{ left: 'var(--pos)' }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand-primary"
          style={{ left: 'var(--pos)' }}
        >
          {/* Drawn, not typed: a glyph here depends on the body face carrying it
              and renders as tofu when it does not. */}
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-brand-elevated">
            <path d="M9.5 5 3 12l6.5 7zM14.5 5 21 12l-6.5 7z" />
          </svg>
        </span>

        {/* BEFORE / AFTER in English, not "Bago / Pagkatapos". Neil, 2026-07-30:
            "BAGO PAGKATAPOS? BEFORE & AFTER MO NALANG SANA KAKA STRESS NAMAN."
            He is right and it is the rule, not a preference: taglish-voice.md
            puts English on the THINGS and technical labels, Tagalog on the human
            part. A photo label is as technical as it gets, and every Filipino
            already says "before and after" out loud.

            Both tags sit above the clip, at opposite corners, so wherever the
            handle rests neither state is left unlabelled. */}
        <span className={`${TAG} left-2 bg-brand-elevated text-white`}>Before</span>
        <span className={`${TAG} right-2 bg-brand-primary text-brand-elevated`}>After</span>

        <input
          type="range"
          min={0}
          max={100}
          value={pos}
          // React maps onChange for a range onto the native `input` event, so
          // this fires on every pixel of the drag, not on release.
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label="Hilahin para ihambing ang before at after"
          className="wipe-range absolute inset-0 z-30 h-full w-full"
        />
      </div>

      {pair.caption && (
        <figcaption className="border-t-2 border-brand-card-border px-4 py-3 text-sm leading-snug text-brand-on-surface-muted">
          {pair.caption}
        </figcaption>
      )}
    </figure>
  );
};

export const BeforeAfter: React.FC<PropsOf<'beforeAfter'>> = ({ heading, eyebrow, note, pairs }) => (
  <SectionShell width="prose">
    <Reveal>
      <SectionHeading eyebrow={eyebrow}>{heading}</SectionHeading>
    </Reveal>

    <div className="mt-10 flex flex-col gap-8">
      {pairs.map((pair, i) => (
        <Reveal key={pair.before} index={i}>
          <WipePair pair={pair} />
        </Reveal>
      ))}
    </div>

    {note && (
      <Reveal index={pairs.length}>
        <p className="mt-8 max-w-prose text-sm leading-relaxed text-brand-on-surface-dim">{note}</p>
      </Reveal>
    )}
  </SectionShell>
);

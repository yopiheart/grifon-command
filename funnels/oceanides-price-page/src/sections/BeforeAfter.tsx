import React from 'react';
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
// BEFORE is on the left and dimmed slightly; AFTER carries the amber label.
// The eye lands on the resolved state, which is what is being sold.
// ===========================================================================

export const BeforeAfter: React.FC<PropsOf<'beforeAfter'>> = ({ heading, eyebrow, note, pairs }) => (
  <SectionShell width="prose">
    <Reveal>
      <SectionHeading eyebrow={eyebrow}>{heading}</SectionHeading>
    </Reveal>

    <div className="mt-10 flex flex-col gap-8">
      {pairs.map((pair, i) => (
        <Reveal key={pair.before} index={i}>
          <figure className="overflow-hidden rounded-brand border-2 border-white/20 bg-brand-elevated">
            <div className="grid grid-cols-2">
              {(
                // BEFORE / AFTER in English, not "Bago / Pagkatapos".
                // Neil, 2026-07-30: "BAGO PAGKATAPOS? BEFORE & AFTER MO NALANG
                // SANA KAKA STRESS NAMAN." He is right and it is the rule, not a
                // preference: taglish-voice.md puts English on the THINGS and
                // technical labels, Tagalog on the human part. A photo label is
                // as technical as it gets, and every Filipino already says
                // "before and after" out loud.
                [
                  { src: pair.before, label: 'Before', tone: 'dim' as const },
                  { src: pair.after, label: 'After', tone: 'amber' as const },
                ]
              ).map((shot) => (
                <div key={shot.src} className="relative">
                  <img
                    src={shot.src}
                    alt={`${shot.label}: ${pair.alt}`}
                    loading="lazy"
                    className="block aspect-[3/4] w-full object-cover"
                  />
                  <span
                    className={`absolute left-2 top-2 rounded-[4px] px-2 py-1 text-[10px] font-black uppercase leading-none tracking-[1px] ${
                      shot.tone === 'amber'
                        ? 'bg-brand-primary text-brand-elevated'
                        : 'bg-[rgba(7,22,48,0.85)] text-brand-on-surface-muted'
                    }`}
                  >
                    {shot.label}
                  </span>
                </div>
              ))}
            </div>
            {pair.caption && (
              <figcaption className="border-t-2 border-white/15 px-4 py-3 text-sm leading-snug text-brand-on-surface-muted">
                {pair.caption}
              </figcaption>
            )}
          </figure>
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

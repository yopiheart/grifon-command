import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { Reveal } from '../primitives/Reveal';

// A thin trust strip directly under the fold. Logos are plain strings by
// contract (wordmarks, not images) so a funnel can ship proof without waiting
// on asset permissions — and so nothing here can trigger a network request.
export const SocialProofBar: React.FC<PropsOf<'socialProofBar'>> = ({ rating, reviewCount, logos }) => (
  <SectionShell rhythm="band" className="border-y border-white/10">
    <Reveal>
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-center">
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
    </Reveal>
  </SectionShell>
);

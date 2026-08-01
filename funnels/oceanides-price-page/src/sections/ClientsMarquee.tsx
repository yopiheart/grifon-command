import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { Reveal } from '../primitives/Reveal';

// ===========================================================================
// ClientsMarquee — the second half of the trust chapter.
//
// SocialProofBar states the papers; this states the customers. Together they
// answer the only two questions a household has about a stranger with a truck:
// is he legal, and has anyone else trusted him.
//
// ⛔ NAMES ONLY, NEVER LOGOS. Two reasons and both are hard: we hold no licence
// to any of this artwork, and clients/oceanides/DESIGN.md is a matte PRINT
// world — a row of full-colour brand marks is a SaaS deck device, not a work
// order. Text chips also cannot be the wrong artwork, which is exactly why the
// DENR seal came off this page (see SocialProofBar).
//
// The list is verbatim from Oceanides' own company profile deck (Neil,
// 2026-08-01). Nothing here is inferred, sorted, or padded — "Walang fake
// proof" applies to a client list at least as hard as it applies to a number.
//
// It is a BAND, not a reading column: a strip that runs past the eye, sized and
// registered as such in scripts/lint-layout.mjs.
// ===========================================================================

export const ClientsMarquee: React.FC<PropsOf<'clientsMarquee'>> = ({ label, names }) => {
  // The list is rendered TWICE. The first copy is the content; the second is
  // purely the mechanism that makes the loop seamless, so it is hidden from
  // assistive tech and dropped entirely under prefers-reduced-motion.
  const row = (hidden: boolean) => (
    <div className="marquee__row" aria-hidden={hidden || undefined}>
      {names.map((name) => (
        <span
          key={name}
          className="mr-3 whitespace-nowrap rounded-[4px] border border-white/25 px-4 py-2 text-[13px] font-bold text-brand-on-surface"
        >
          {name}
        </span>
      ))}
    </div>
  );

  return (
    <SectionShell rhythm="band">
      <Reveal>
        {label && (
          <p className="mb-4 text-center text-[10px] font-black uppercase leading-none tracking-[1.2px] text-brand-on-surface-dim">
            {label}
          </p>
        )}
        <div className="marquee">
          <div className="marquee__track">
            {row(false)}
            {row(true)}
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
};

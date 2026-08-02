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
  // Open wordmark treatment, hindi boxed chips (Neil, 2026-08-01 — plain ang
  // dating ng chips). Ang D07 Stripe logo bar ang ebidensya: ang malaki at
  // TAHIMIK na marka ang mukhang endorsement; ang naka-kahon na maliit na text
  // ay mukhang UI tag. Kaya: malaking Inter 800 na pangalan, amber diamond na
  // separator, walang border. Ang laki mismo ang trust device.
  const row = (hidden: boolean) => (
    <div className="marquee__row items-baseline" aria-hidden={hidden || undefined}>
      {names.map((name) => (
        <React.Fragment key={name}>
          <span className="whitespace-nowrap text-lg font-extrabold tracking-wide text-brand-on-surface md:text-xl">
            {name}
          </span>
          <span aria-hidden className="mx-5 text-[9px] text-brand-primary md:mx-7">
            ◆
          </span>
        </React.Fragment>
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

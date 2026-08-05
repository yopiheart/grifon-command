import React, { useEffect } from 'react';
import type { BattlePlan, FunnelConfig } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { SectionHeading } from '../primitives/SectionHeading';
import { GlassCard } from '../primitives/GlassCard';
import { EyebrowChip } from '../primitives/EyebrowChip';
import { Reveal } from '../primitives/Reveal';
import { CtaButton } from '../primitives/CtaButton';
import { PhonePill } from '../primitives/PhonePill';
import { goldEmphasis } from '../lib/goldEmphasis';
import { trackLead } from '../lib/pixel';

interface ThankYouProps {
  config: FunnelConfig;
}

/** A body line the config marked as a fill-in-the-blanks script, not prose. */
const SKELETON_PREFIX = 'SKELETON:';

// ===========================================================================
// The magnet, rendered as the HANDOUT it is.
//
// It used to be one dark card floating on the flat navy field. On 2026-08-01 the
// landing became a chaptered print piece, and the thank-you page did not follow
// it: the same argument arrived on the same stock as everything around it. So
// the magnet now sits on the `paper` chapter, where the text ladder flips and it
// reads as a sheet handed over at the door rather than another panel.
//
// Two ground-safety rules are load-bearing here and were both broken before:
//   - block headings use `accent-text`, NOT `primary`. Amber text on paper is
//     1.7:1 and a hard ban in the DESIGN.md contrast floor; the token resolves
//     to ocean (#1C63AD, 5.7:1) inside a paper chapter.
//   - the SKELETON block dropped `bg-black/30` and `font-mono`. Pure black is
//     banned brand-wide ("ang itim ay Grifon"), and data-mono is documented as
//     "internal dashboards LANG, hindi customer-facing creative". What is left
//     is a print device: a card with an amber left rule. Amber as a FILL on
//     paper is fine, it is amber TEXT on paper that is banned.
//
// The renderer is still copy-free: it knows about a title, blocks and the
// SKELETON marker, and nothing about what any of them say.
// ===========================================================================
const MagnetPlan: React.FC<{ plan: BattlePlan; eyebrow?: string }> = ({ plan, eyebrow }) => (
  <>
    <Reveal>
      <SectionHeading eyebrow={eyebrow}>{plan.title}</SectionHeading>
    </Reveal>

    <div className="mt-10 space-y-9">
      {plan.blocks.map((block, i) => (
        <Reveal key={i} index={i + 1}>
          {/* Hairline above each block after the first: the ruled divider of a
              printed checklist, in place of a card per block. */}
          <div className={i > 0 ? 'border-t border-brand-hairline pt-9' : ''}>
            {/* A HEADING, sized like one. This shipped at `text-[11px]
                font-black uppercase` in ocean blue and Neil called it on sight:
                "ang liliit ng text? ung kulay blue at orange?" Three separate
                mistakes stacked into one element, and the first caused the rest:

                1. It is an <h3>, and the global rule in index.css forces
                   h1/h2/h3 to the DISPLAY face. So what was written as a small
                   Inter label rendered as ANTON at 11px — a condensed display
                   face squeezed to fine-print size, which is why it looked
                   broken rather than merely small. Every other small label on
                   this funnel is a <p> for exactly this reason.
                2. `font-black` on Anton does nothing. Anton ships ONE weight;
                   SectionHeading.tsx documents this trap in its own comment.
                3. `accent-text` made it ocean blue, which is the correct token
                   for accent TEXT on paper, but it was never an accent — it is
                   structure. Blue plus the amber chip put two accents in one
                   chapter and the small one read as a link.

                Fixed by treating it as what it is: an Anton subhead, one tier
                under the chapter heading, in the same navy as the body ladder.
                No colour class fights the chip; no size class fights the face. */}
            <h3 className="text-[1.375rem] leading-[0.95] text-brand-on-surface md:text-[1.75rem]">
              {block.heading}
            </h3>
            <div className="mt-4 space-y-3">
              {block.body.map((paragraph, j) =>
                paragraph.startsWith(SKELETON_PREFIX) ? (
                  <p
                    key={j}
                    className="rounded-brand border-2 border-brand-card-border border-l-[3px] border-l-brand-primary bg-brand-card px-4 py-3 text-[17px] leading-relaxed text-brand-on-surface"
                  >
                    {paragraph.slice(SKELETON_PREFIX.length).trim()}
                  </p>
                ) : (
                  // 17/18px, a step above the 16px used elsewhere: this is the
                  // one block on the thank-you page a visitor actually READS
                  // through, standing in a yard looking for a tank lid.
                  <p key={j} className="text-[17px] leading-relaxed text-brand-on-surface-muted md:text-lg">
                    {paragraph}
                  </p>
                )
              )}
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  </>
);

/** `?v=Food%20%26%20Beverage` → the matching variant, else the configured fallback. */
const resolveMagnetPlan = (
  magnet: NonNullable<FunnelConfig['thankYou']['magnet']>,
  search: string
): BattlePlan | undefined => {
  const key = new URLSearchParams(search).get('v');
  return (key ? magnet.variants[key] : undefined) ?? magnet.variants[magnet.fallback];
};

// ===========================================================================
// L1 — a thank-you page is a BRIDGE, never a receipt. Three jobs, in order:
// confirm the magnet is on its way, set expectations, then hand over exactly
// ONE next step. More than one CTA here is how a warm lead goes cold.
//
// CHAPTERS (2026-08-01) — the same ladder the landing runs, for the same reason:
// a printed piece changes stock when it changes argument.
//
//   navy-gradient   ang kumpirmasyon      the arrival, the one centred moment
//   navy            ang susunod           what happens next, on the rail
//   paper           ang handout           the magnet, on quotation stock
//   void            ang isang hakbang     the bridge CTA, bottom of the page
//
// Chapter 2 is `navy`, NOT `navy-deep`, and that is a correction rather than a
// preference: the gradient above it RESOLVES to surface-deep, which is exactly
// what `navy-deep` paints, so the two chapters met at the same hex and read as
// one unbroken field. The ladder's own rule is that chapter transitions are
// HARD edges. Lighter navy gives a real edge, and the card inside still gets
// its tonal step, just inverted: it recesses (surface-deep on surface) instead
// of lifting. A printed panel is allowed to be the darker box on the sheet.
//
// Everything after the arrival sits on the ONE left rail — clients/oceanides/
// DESIGN.md, "Layout: isang rail". The old page centred the whole document,
// which is the slide-deck failure that rule exists to stop. Note that
// scripts/lint-layout.mjs only walks src/sections, so this file is on the
// honour system; the rule is the same either way.
// ===========================================================================
export const ThankYou: React.FC<ThankYouProps> = ({ config }) => {
  const { thankYou } = config;

  // The magnet, when the funnel delivers it on-page (no magnet configured →
  // this page simply renders one chapter fewer).
  const search = typeof window === 'undefined' ? '' : window.location.search;
  const plan = thankYou.magnet ? resolveMagnetPlan(thankYou.magnet, search) : undefined;

  // Funnel → product hand-off: the lead's email arrives as ?email=, is read
  // into memory, appended to the bridge CTA (the product's signup prefills
  // from it), and scrubbed from this page's URL immediately below.
  const leadEmail = new URLSearchParams(search).get('email') ?? undefined;
  useEffect(() => {
    if (typeof window === 'undefined' || !leadEmail) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('email');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, [leadEmail]);
  // Ang ?email= rider ay para lang sa http(s) bridge (product signup prefill).
  // Ang tel: URI ay walang query string. Ang `tel:+639...?email=x` ay sirang
  // dial sa totoong phone, kaya web URLs lang ang dinidikitan.
  const isWebBridge = /^https?:/i.test(thankYou.nextStep.href);
  const bridgeHref =
    leadEmail && isWebBridge
      ? `${thankYou.nextStep.href}${thankYou.nextStep.href.includes('?') ? '&' : '?'}email=${encodeURIComponent(leadEmail)}`
      : thankYou.nextStep.href;

  // The conversion event lives here, not on submit: this page only renders
  // after the server has accepted the lead, so it can't fire on a failed POST.
  // A reload or a direct visit is NOT a conversion — trackLead spends the
  // one-shot token submitLead set, so it fires once per submission. See pixel.ts.
  useEffect(() => {
    trackLead(config.tracking.metaPixelId);
  }, [config.tracking.metaPixelId]);

  return (
    // min-h-screen + a growing last chapter: a thank-you page is short, and
    // without this the void footer stops mid-viewport and the body navy shows
    // under it as a stray band.
    <main className="flex min-h-screen flex-col">
      {/* 1 — ANG KUMPIRMASYON. Same stock as the landing hero, and the same one
          licensed centred moment. Everything below settles onto the rail. */}
      <div className="ground-navy-gradient">
        <SectionShell>
          <Reveal className="mx-auto max-w-2xl text-center">
            {thankYou.eyebrow && (
              <div className="mb-5">
                <EyebrowChip>{thankYou.eyebrow}</EyebrowChip>
              </div>
            )}
            <h1 className="text-[2.25rem] leading-[0.95] md:text-[3.5rem]">
              {goldEmphasis(thankYou.headline)}
            </h1>
            <p className="mt-6 text-base leading-relaxed text-brand-on-surface-muted md:text-lg">
              {thankYou.body}
            </p>
            <span aria-hidden className="mx-auto mt-8 block h-[3px] w-14 bg-brand-primary" />
          </Reveal>
        </SectionShell>
      </div>

      {/* 2 — ANG SUSUNOD. */}
      {thankYou.steps && thankYou.steps.length > 0 && (
        <div className="ground-navy">
          <SectionShell width="prose">
            {thankYou.stepsHeading && (
              <Reveal>
                <SectionHeading className="mb-8">{thankYou.stepsHeading}</SectionHeading>
              </Reveal>
            )}
            <Reveal index={1}>
              <GlassCard>
                <ol className="space-y-5">
                  {thankYou.steps.map((step, i) => (
                    <li key={i} className="flex gap-4">
                      {/* surface-deep on amber, never black: DESIGN.md pairs amber
                          chips with surface-deep text, and bans pure #000 brand-wide. */}
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary text-sm font-bold text-brand-elevated">
                        {i + 1}
                      </span>
                      <span className="text-base leading-relaxed text-brand-on-surface-muted">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              </GlassCard>
            </Reveal>
          </SectionShell>
        </div>
      )}

      {/* 3 — ANG HANDOUT. Quotation stock, same as the presyo chapter. */}
      {plan && (
        <div className="ground-paper">
          <SectionShell width="prose">
            <MagnetPlan plan={plan} eyebrow={thankYou.magnetDelivery} />
          </SectionShell>
        </div>
      )}

      {/* 4 — ANG ISANG HAKBANG. `grow` so the darkest stock always runs to the
          bottom edge of the screen. */}
      <div className="ground-void grow">
        <SectionShell width="prose">
          <Reveal>
            {thankYou.nextStep.blurb && (
              <p className="mb-6 text-base leading-relaxed text-brand-on-surface-muted">
                {thankYou.nextStep.blurb}
              </p>
            )}
            {/* The button and the PRINTED number, same row grammar as the hero.
                Asking someone to save a number the page never shows is asking
                them to save nothing, and a bare `tel:` button is a dead end on
                any desktop browser. The pill is the number; the button is the
                action. Both dial on a phone, which is the correct redundancy. */}
            <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
              <CtaButton onClick={() => (window.location.href = bridgeHref)}>
                {thankYou.nextStep.label}
              </CtaButton>
              {thankYou.phone && (
                <PhonePill number={thankYou.phone} label={thankYou.phoneLabel} />
              )}
            </div>
          </Reveal>
        </SectionShell>
      </div>
    </main>
  );
};

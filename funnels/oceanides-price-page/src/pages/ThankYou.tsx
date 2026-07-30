import React, { useEffect } from 'react';
import type { BattlePlan, FunnelConfig } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { GlassCard } from '../primitives/GlassCard';
import { Reveal } from '../primitives/Reveal';
import { CtaButton } from '../primitives/CtaButton';
import { trackLead } from '../lib/pixel';

interface ThankYouProps {
  config: FunnelConfig;
}

/** A body line the config marked as a fill-in-the-blanks script, not prose. */
const SKELETON_PREFIX = 'SKELETON:';

// The magnet renderer is deliberately copy-free: it knows about a title, blocks
// and the SKELETON marker, and nothing about what any of them say. Every word
// on screen here came out of the funnel's own config.
const MagnetPlan: React.FC<{ plan: BattlePlan }> = ({ plan }) => (
  <GlassCard className="mt-10 text-left">
    <h2 className="text-xl font-bold leading-tight md:text-2xl">{plan.title}</h2>
    <div className="mt-7 space-y-8">
      {plan.blocks.map((block, i) => (
        <div key={i}>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-primary">
            {block.heading}
          </h3>
          <div className="mt-3 space-y-3">
            {block.body.map((paragraph, j) =>
              paragraph.startsWith(SKELETON_PREFIX) ? (
                <p
                  key={j}
                  className="rounded-brand border-l-2 border-brand-primary bg-black/30 px-4 py-3 font-mono text-sm leading-relaxed text-brand-on-surface"
                >
                  {paragraph.slice(SKELETON_PREFIX.length).trim()}
                </p>
              ) : (
                <p key={j} className="text-base leading-relaxed text-brand-on-surface-muted">
                  {paragraph}
                </p>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  </GlassCard>
);

/** `?v=Food%20%26%20Beverage` → the matching variant, else the configured fallback. */
const resolveMagnetPlan = (
  magnet: NonNullable<FunnelConfig['thankYou']['magnet']>,
  search: string
): BattlePlan | undefined => {
  const key = new URLSearchParams(search).get('v');
  return (key ? magnet.variants[key] : undefined) ?? magnet.variants[magnet.fallback];
};

// L1 — a thank-you page is a BRIDGE, never a receipt. Three jobs, in order:
// confirm the magnet is on its way, set expectations, then hand over exactly
// ONE next step. More than one CTA here is how a warm lead goes cold.
export const ThankYou: React.FC<ThankYouProps> = ({ config }) => {
  const { thankYou } = config;

  // The magnet, when the funnel delivers it on-page (no magnet configured →
  // this page renders exactly as it always has).
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
  const bridgeHref = leadEmail
    ? `${thankYou.nextStep.href}${thankYou.nextStep.href.includes('?') ? '&' : '?'}email=${encodeURIComponent(leadEmail)}`
    : thankYou.nextStep.href;

  // The conversion event lives here, not on submit: this page only renders
  // after the server has accepted the lead, so it can't fire on a failed POST.
  useEffect(() => {
    trackLead(config.tracking.metaPixelId);
  }, [config.tracking.metaPixelId]);

  return (
    <main className="flex min-h-screen items-center">
      <SectionShell width="prose" className="text-center">
        <Reveal>
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-primary">
            {thankYou.magnetDelivery}
          </p>
          <h1 className="text-[2rem] font-bold leading-[1.1] md:text-[3rem]">{thankYou.headline}</h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-brand-on-surface-muted md:text-lg">
            {thankYou.body}
          </p>
        </Reveal>

        {plan && (
          <Reveal index={1}>
            <MagnetPlan plan={plan} />
          </Reveal>
        )}

        {thankYou.steps && thankYou.steps.length > 0 && (
          <Reveal index={2}>
            <GlassCard className="mt-10 text-left">
              <ol className="space-y-4">
                {thankYou.steps.map((step, i) => (
                  <li key={i} className="flex gap-4">
                    {/* surface-deep on amber, never black: DESIGN.md pairs amber
                        chips with surface-deep text, and bans pure #000 brand-wide. */}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary text-sm font-bold text-brand-elevated">
                      {i + 1}
                    </span>
                    <span className="text-base leading-relaxed text-brand-on-surface-muted">{step}</span>
                  </li>
                ))}
              </ol>
            </GlassCard>
          </Reveal>
        )}

        <Reveal index={3}>
          <div className="mt-10">
            {thankYou.nextStep.blurb && (
              <p className="mb-5 text-base text-brand-on-surface-muted">{thankYou.nextStep.blurb}</p>
            )}
            <CtaButton onClick={() => (window.location.href = bridgeHref)}>
              {thankYou.nextStep.label}
            </CtaButton>
          </div>
        </Reveal>
      </SectionShell>
    </main>
  );
};

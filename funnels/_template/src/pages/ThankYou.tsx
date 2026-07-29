import React, { useEffect } from 'react';
import type { FunnelConfig } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { GlassCard } from '../primitives/GlassCard';
import { Reveal } from '../primitives/Reveal';
import { CtaButton } from '../primitives/CtaButton';
import { trackLead } from '../lib/pixel';

interface ThankYouProps {
  config: FunnelConfig;
}

// L1 — a thank-you page is a BRIDGE, never a receipt. Three jobs, in order:
// confirm the magnet is on its way, set expectations, then hand over exactly
// ONE next step. More than one CTA here is how a warm lead goes cold.
export const ThankYou: React.FC<ThankYouProps> = ({ config }) => {
  const { thankYou } = config;

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

        {thankYou.steps && thankYou.steps.length > 0 && (
          <Reveal index={1}>
            <GlassCard className="mt-10 text-left">
              <ol className="space-y-4">
                {thankYou.steps.map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-primary text-sm font-bold text-black">
                      {i + 1}
                    </span>
                    <span className="text-base leading-relaxed text-brand-on-surface-muted">{step}</span>
                  </li>
                ))}
              </ol>
            </GlassCard>
          </Reveal>
        )}

        <Reveal index={2}>
          <div className="mt-10">
            {thankYou.nextStep.blurb && (
              <p className="mb-5 text-base text-brand-on-surface-muted">{thankYou.nextStep.blurb}</p>
            )}
            <CtaButton onClick={() => (window.location.href = thankYou.nextStep.href)}>
              {thankYou.nextStep.label}
            </CtaButton>
          </div>
        </Reveal>
      </SectionShell>
    </main>
  );
};

import React from 'react';
import type { PropsOf } from '../config.types';
import { SectionShell } from '../primitives/SectionShell';
import { GlassCard } from '../primitives/GlassCard';
import { Reveal } from '../primitives/Reveal';
import { SectionHeading } from '../primitives/SectionHeading';
import { goldEmphasis } from '../lib/goldEmphasis';

// Native <details>/<summary>: keyboard and screen-reader correct for free, open
// state survives Ctrl+F, and it needs no JS state or motion — so there is no
// reduced-motion question to answer here at all.
export const FaqAccordion: React.FC<PropsOf<'faqAccordion'>> = ({ items, heading }) => (
  <SectionShell width="prose">
    {heading && (
      <Reveal>
        <SectionHeading className="mb-8">{heading}</SectionHeading>
      </Reveal>
    )}
    <div className="space-y-3">
      {items.map((item, i) => (
        <Reveal key={`${item.q}-${i}`} index={i}>
          <GlassCard padded={false}>
            <details className="group">
              {/* list-none alone doesn't hide the marker in Safari — the webkit
                  pseudo-element has to go too, or the row shows two glyphs. */}
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-base font-semibold [&::-webkit-details-marker]:hidden md:px-6">
                {item.q}
                <span
                  aria-hidden
                  // accent-text, not primary: this section rides the paper
                  // chapter, where amber type is 1.7:1 and banned. Ocean there.
                  className="shrink-0 text-brand-accent-text transition-transform duration-200 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-brand-on-surface-muted md:px-6">
                {goldEmphasis(item.a)}
              </p>
            </details>
          </GlassCard>
        </Reveal>
      ))}
    </div>
  </SectionShell>
);

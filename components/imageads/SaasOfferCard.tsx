import React, { forwardRef } from 'react';
import type { AdVariant } from '../../types';
import { AD_RATIO_DIMENSIONS } from '../../utils/captureToPng';
import { resolveAdTheme, type AdTheme } from '../../utils/adTheme';

// GP-1 "SaaS Offer / Upsell" templates (see workflows/static_ad_swipe_file.md):
// Guarantee Hero, Ticket Compare, Offer Stack Checklist. Text-composited React
// cards (the Gemini image model can't render legible text). The color scheme is
// the CUSTOMER's brand, resolved contrast-safe by utils/adTheme.ts — premium but
// BRIGHT/LEGIBLE (IM8 lane = true-dark + STRONG accent + bright white), never a
// faint tint on near-black. Every variant renders a visible headline and a
// centered CTA pill.

interface SaasOfferCardProps {
  variant: AdVariant;
  aspectRatio: '9:16' | '4:5' | '1:1' | '16:9';
  theme?: AdTheme;
  // Legacy inputs (resolved into a theme when `theme` isn't supplied).
  hexCodes?: string;
  brandName?: string;
}

export const SaasOfferCard = forwardRef<HTMLDivElement, SaasOfferCardProps>(
  ({ variant, aspectRatio, theme, hexCodes, brandName }, ref) => {
    const { w, h } = AD_RATIO_DIMENSIONS[aspectRatio] ?? AD_RATIO_DIMENSIONS['4:5'];
    const t = theme ?? resolveAdTheme({ hexCodes });
    const c = variant.composition || {};

    const isStory = aspectRatio === '9:16';
    const padX = Math.round(w * 0.1);
    const padY = Math.round(h * (isStory ? 0.16 : 0.09));
    const headSize = Math.round(w * 0.058);
    const bodySize = Math.round(w * 0.034);
    const eyebrow = Math.round(w * 0.024);

    const rootStyle: React.CSSProperties = {
      width: w,
      height: h,
      background: t.bg,
      fontFamily: 'Inter, Geist, "SF Pro", system-ui, sans-serif',
      padding: `${padY}px ${padX}px`,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      color: t.text,
      position: 'relative',
      overflow: 'hidden',
      gap: Math.round(h * 0.03),
    };

    const Eyebrow = () =>
      brandName ? (
        <div style={{ fontSize: eyebrow, letterSpacing: '0.3em', textTransform: 'uppercase', color: t.accent, fontWeight: 800 }}>
          {brandName}
        </div>
      ) : null;

    const Cta = () =>
      c.ctaLabel ? (
        <div
          style={{
            marginTop: Math.round(h * 0.02),
            display: 'inline-flex',
            alignSelf: 'center',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            background: t.accent,
            color: t.onAccent,
            fontWeight: 800,
            fontSize: bodySize,
            padding: `${Math.round(h * 0.018)}px ${Math.round(w * 0.06)}px`,
            borderRadius: 999,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {c.ctaLabel}
        </div>
      ) : null;

    // Headline is REQUIRED to render — fall back through the composition so a
    // Guarantee Hero with an empty headline never collapses to just the brand.
    const displayHeadline = variant.headline?.trim() || c.guarantee || c.badge || brandName || '';
    const headline = displayHeadline ? (
      <h2 style={{ fontSize: headSize, fontWeight: 800, lineHeight: 1.12, margin: 0, color: t.text }}>
        {displayHeadline}
      </h2>
    ) : null;

    let body: React.ReactNode = null;

    if (variant.templateType === 'Ticket Compare' && c.tiers?.length) {
      body = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: Math.round(h * 0.022), width: '100%' }}>
          {c.tiers.map((tier, i) => (
            <div
              key={i}
              style={{
                border: `2px solid ${tier.highlight ? t.accent : t.border}`,
                background: tier.highlight ? t.panel : 'transparent',
                borderRadius: Math.round(w * 0.03),
                padding: `${Math.round(h * 0.02)}px ${Math.round(w * 0.05)}px`,
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: bodySize * 1.1, fontWeight: 800, color: tier.highlight ? t.accent : t.text, marginBottom: 6 }}>
                {tier.name}
              </div>
              {(tier.lines || []).map((ln, j) => (
                <div key={j} style={{ fontSize: bodySize, color: t.muted, lineHeight: 1.5 }}>{ln}</div>
              ))}
            </div>
          ))}
        </div>
      );
    } else if (variant.templateType === 'Offer Stack Checklist' && c.bullets?.length) {
      body = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: Math.round(h * 0.016), width: '100%', alignItems: 'flex-start' }}>
          {c.bullets.map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: Math.round(w * 0.02), fontSize: bodySize, color: t.text, textAlign: 'left' }}>
              <span style={{ color: t.accent, fontWeight: 800 }}>✓</span>
              <span style={{ lineHeight: 1.4 }}>{b}</span>
            </div>
          ))}
          {c.guarantee ? (
            <div style={{ marginTop: Math.round(h * 0.015), fontSize: bodySize * 0.95, color: t.accent, fontWeight: 700 }}>{c.guarantee}</div>
          ) : null}
        </div>
      );
    } else if (c.guarantee || c.badge) {
      // Guarantee Hero — the badge/guarantee carry the visual.
      body = (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Math.round(h * 0.02) }}>
          {c.badge ? (
            <div style={{ fontSize: eyebrow * 1.1, fontWeight: 800, color: t.onAccent, background: t.accent, padding: `6px ${Math.round(w * 0.035)}px`, borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {c.badge}
            </div>
          ) : null}
          {/* Only show the guarantee line when it isn't already the headline. */}
          {c.guarantee && c.guarantee !== displayHeadline ? (
            <div style={{ fontSize: bodySize * 1.05, color: t.muted, lineHeight: 1.4, maxWidth: '90%' }}>{c.guarantee}</div>
          ) : null}
        </div>
      );
    }

    return (
      <div ref={ref} style={rootStyle} data-ad-artwork>
        <Eyebrow />
        {headline}
        {body}
        <Cta />
      </div>
    );
  },
);

SaasOfferCard.displayName = 'SaasOfferCard';

export default SaasOfferCard;

import React, { forwardRef } from 'react';
import type { AdVariant } from '../../types';
import { AD_RATIO_DIMENSIONS } from '../../utils/captureToPng';

// GP-1 "SaaS Offer / Upsell" templates (see workflows/static_ad_swipe_file.md):
// Guarantee Hero, Ticket Compare, Offer Stack Checklist. Text-composited React
// cards (the Gemini image model can't render legible text), rendered in Grifon's
// premium dark+gold lane and accented with the customer's brand color.

const FALLBACK_ACCENT = '#FFCC00';

const firstHex = (hexCodes?: string): string => {
  const m = (hexCodes || '').match(/#?[0-9a-fA-F]{6}/);
  if (!m) return FALLBACK_ACCENT;
  return m[0].startsWith('#') ? m[0] : `#${m[0]}`;
};

interface SaasOfferCardProps {
  variant: AdVariant;
  aspectRatio: '9:16' | '4:5' | '1:1' | '16:9';
  hexCodes?: string;
  brandName?: string;
}

export const SaasOfferCard = forwardRef<HTMLDivElement, SaasOfferCardProps>(
  ({ variant, aspectRatio, hexCodes, brandName }, ref) => {
    const { w, h } = AD_RATIO_DIMENSIONS[aspectRatio] ?? AD_RATIO_DIMENSIONS['4:5'];
    const accent = firstHex(hexCodes);
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
      background: `radial-gradient(130% 100% at 50% 0%, ${accent}1a 0%, #09090B 55%)`,
      fontFamily: 'Inter, Geist, "SF Pro", system-ui, sans-serif',
      padding: `${padY}px ${padX}px`,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      color: '#FAFAFA',
      position: 'relative',
      overflow: 'hidden',
      gap: Math.round(h * 0.03),
    };

    const Eyebrow = () =>
      brandName ? (
        <div style={{ fontSize: eyebrow, letterSpacing: '0.3em', textTransform: 'uppercase', color: accent, fontWeight: 700 }}>
          {brandName}
        </div>
      ) : null;

    const Cta = () =>
      c.ctaLabel ? (
        <div
          style={{
            marginTop: Math.round(h * 0.02),
            background: accent,
            color: '#09090B',
            fontWeight: 800,
            fontSize: bodySize,
            padding: `${Math.round(h * 0.018)}px ${Math.round(w * 0.06)}px`,
            borderRadius: 999,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            boxShadow: `0 0 ${Math.round(w * 0.04)}px ${accent}66`,
          }}
        >
          {c.ctaLabel}
        </div>
      ) : null;

    const headline = (
      <h2 style={{ fontSize: headSize, fontWeight: 800, lineHeight: 1.12, margin: 0 }}>
        {variant.headline}
      </h2>
    );

    let body: React.ReactNode = null;

    if (variant.templateType === 'Ticket Compare' && c.tiers?.length) {
      body = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: Math.round(h * 0.022), width: '100%' }}>
          {c.tiers.map((t, i) => (
            <div
              key={i}
              style={{
                border: `2px solid ${t.highlight ? accent : 'rgba(255,255,255,0.12)'}`,
                background: t.highlight ? `${accent}14` : 'rgba(255,255,255,0.03)',
                borderRadius: Math.round(w * 0.03),
                padding: `${Math.round(h * 0.02)}px ${Math.round(w * 0.05)}px`,
                boxShadow: t.highlight ? `0 0 ${Math.round(w * 0.035)}px ${accent}55` : 'none',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: bodySize * 1.1, fontWeight: 800, color: t.highlight ? accent : '#FFFFFF', marginBottom: 6 }}>
                {t.name}
              </div>
              {(t.lines || []).map((ln, j) => (
                <div key={j} style={{ fontSize: bodySize, color: '#D4D4D8', lineHeight: 1.5 }}>{ln}</div>
              ))}
            </div>
          ))}
        </div>
      );
    } else if (variant.templateType === 'Offer Stack Checklist' && c.bullets?.length) {
      body = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: Math.round(h * 0.016), width: '100%', alignItems: 'flex-start' }}>
          {c.bullets.map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: Math.round(w * 0.02), fontSize: bodySize, color: '#FAFAFA', textAlign: 'left' }}>
              <span style={{ color: accent, fontWeight: 800 }}>✓</span>
              <span style={{ lineHeight: 1.4 }}>{b}</span>
            </div>
          ))}
          {c.guarantee ? (
            <div style={{ marginTop: Math.round(h * 0.015), fontSize: bodySize * 0.95, color: accent, fontWeight: 700 }}>{c.guarantee}</div>
          ) : null}
        </div>
      );
    } else if (c.guarantee || c.badge) {
      // Guarantee Hero
      body = (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Math.round(h * 0.02) }}>
          {c.badge ? (
            <div style={{ fontSize: eyebrow * 1.1, fontWeight: 800, color: '#09090B', background: accent, padding: `6px ${Math.round(w * 0.035)}px`, borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {c.badge}
            </div>
          ) : null}
          {c.guarantee ? (
            <div style={{ fontSize: bodySize * 1.05, color: '#D4D4D8', lineHeight: 1.4, maxWidth: '90%' }}>{c.guarantee}</div>
          ) : null}
        </div>
      );
    }

    return (
      <div ref={ref} style={rootStyle}>
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

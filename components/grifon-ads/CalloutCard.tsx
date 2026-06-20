import React, { forwardRef } from 'react';
import { GRIFON_AD as T, AD_DIMENSIONS, type AdFormat } from './grifonAdTheme';

// Grifon self-promo TEXT-ONLY niche callout (no character) — the Iman / Sabri
// "self-identification" pattern from the swipe file: a huge legible headline on
// the brand system, niche emphasized in gold. Rendered as DOM → PNG. This is the
// character-free callout treatment (feedback #6): the niche line hits harder as
// type with no face competing.

export interface CalloutCardProps {
  format?: AdFormat;
  brand?: string; // wordmark, e.g. "GRIFON AI"
  badge?: string; // eyebrow, e.g. "ECOM SELLERS"
  preLine?: string; // white part, e.g. "Para Sa"
  accentLine: string; // gold part, e.g. "Online Sellers"
  cta?: string; // e.g. "Try It Free"
}

export const CalloutCard = forwardRef<HTMLDivElement, CalloutCardProps>(
  ({ format = '1:1', brand = 'GRIFON AI', badge, preLine, accentLine, cta = 'Try It Free' }, ref) => {
    const { w, h } = AD_DIMENSIONS[format] ?? AD_DIMENSIONS['1:1'];
    const pad = Math.round(w * 0.1);
    const brandSize = Math.round(w * 0.034);
    const badgeSize = Math.round(w * 0.024);
    const headSize = Math.round(w * 0.115);
    const ctaSize = Math.round(w * 0.032);

    const root: React.CSSProperties = {
      width: w,
      height: h,
      // solid zinc-950 + a centered gold radial glow (DESIGN.md gold-glow depth)
      background: `radial-gradient(60% 45% at 50% 46%, rgba(255,204,0,0.16) 0%, ${T.bg} 62%)`,
      fontFamily: T.sans,
      padding: pad,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      color: T.text,
      position: 'relative',
      overflow: 'hidden',
    };

    return (
      <div ref={ref} style={root}>
        {/* wordmark */}
        <div
          style={{
            position: 'absolute',
            top: Math.round(h * 0.07),
            fontSize: brandSize,
            fontWeight: 900,
            letterSpacing: '0.04em',
          }}
        >
          <span style={{ color: T.gold }}>GRIFON</span>
          <span style={{ color: T.text }}> {brand.replace(/^GRIFON\s*/i, '') || 'AI'}</span>
        </div>

        {badge ? (
          <div
            style={{
              fontFamily: T.mono,
              fontSize: badgeSize,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: T.gold,
              border: `2px solid ${T.gold}`,
              borderRadius: 999,
              padding: `${Math.round(h * 0.01)}px ${Math.round(w * 0.04)}px`,
              fontWeight: 700,
              marginBottom: Math.round(h * 0.03),
            }}
          >
            {badge}
          </div>
        ) : null}

        <div style={{ fontSize: headSize, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
          {preLine ? <span style={{ color: T.text }}>{preLine} </span> : null}
          <span style={{ color: T.gold }}>{accentLine}</span>
        </div>

        {cta ? (
          <div
            style={{
              position: 'absolute',
              bottom: Math.round(h * 0.08),
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: T.gold,
              color: '#000000',
              fontWeight: 800,
              fontSize: ctaSize,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: `${Math.round(h * 0.02)}px ${Math.round(w * 0.08)}px`,
              borderRadius: 999,
            }}
          >
            {cta}
          </div>
        ) : null}
      </div>
    );
  },
);

CalloutCard.displayName = 'CalloutCard';
export default CalloutCard;

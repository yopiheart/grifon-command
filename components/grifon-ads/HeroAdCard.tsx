import React, { forwardRef } from 'react';
import { GRIFON_AD as T, AD_DIMENSIONS, type AdFormat } from './grifonAdTheme';

// HYBRID hero ad: a Codex-generated photo PLATE (Zam + gold glow, NO baked text)
// as the background, with the wordmark / badge / headline / CTA composited on top
// in REAL Inter + Instrument Serif. Fixes the baked-text font problem permanently
// — typography is now true to DESIGN.md and identical across every creative,
// while the subject stays photoreal. Rendered as DOM → screenshot to PNG.

export interface HeadlineSegment {
  t: string;
  gold?: boolean; // render in Grifon Gold (else white)
  serif?: boolean; // Instrument Serif italic flourish (marketing-only)
}

export interface HeroAdCardProps {
  photoSrc: string; // the no-text Codex plate
  format?: AdFormat;
  brand?: string; // wordmark; "GRIFON" is gold, the rest white
  badge?: string; // eyebrow pill
  headline: HeadlineSegment[];
  cta?: string;
}

export const HeroAdCard = forwardRef<HTMLDivElement, HeroAdCardProps>(
  ({ photoSrc, format = '4:5', brand = 'GRIFON AI', badge, headline, cta = 'Try It Free' }, ref) => {
    const { w, h } = AD_DIMENSIONS[format] ?? AD_DIMENSIONS['4:5'];
    const brandSize = Math.round(w * 0.038);
    const badgeSize = Math.round(w * 0.024);
    const headSize = Math.round(w * 0.072);
    const ctaSize = Math.round(w * 0.032);
    const restName = brand.replace(/^GRIFON\s*/i, '').trim() || 'AI';

    const root: React.CSSProperties = {
      width: w,
      height: h,
      background: T.bg,
      fontFamily: T.sans,
      position: 'relative',
      overflow: 'hidden',
      color: T.text,
    };

    const fill: React.CSSProperties = { position: 'absolute', left: 0, right: 0 };

    return (
      <div ref={ref} style={root}>
        {/* photo plate */}
        <img src={photoSrc} alt="" style={{ ...fill, top: 0, width: w, height: h, objectFit: 'cover', display: 'block' }} />

        {/* scrims for text legibility over the photo */}
        <div style={{ ...fill, top: 0, height: Math.round(h * 0.22), background: `linear-gradient(to bottom, rgba(9,9,11,0.92) 0%, rgba(9,9,11,0) 100%)` }} />
        <div style={{ ...fill, bottom: 0, height: Math.round(h * 0.5), background: `linear-gradient(to top, rgba(9,9,11,0.97) 0%, rgba(9,9,11,0.85) 35%, rgba(9,9,11,0) 100%)` }} />

        {/* wordmark — real Inter 900 */}
        <div
          style={{
            position: 'absolute',
            top: Math.round(h * 0.05),
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: brandSize,
            fontWeight: 900,
            letterSpacing: '0.04em',
            zIndex: 2,
          }}
        >
          <span style={{ color: T.gold }}>GRIFON</span>
          <span style={{ color: T.text }}> {restName}</span>
        </div>

        {/* bottom stack — badge / headline / CTA, all centered, real fonts */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: Math.round(h * 0.06),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: Math.round(h * 0.025),
            padding: `0 ${Math.round(w * 0.08)}px`,
            zIndex: 2,
          }}
        >
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
                padding: `${Math.round(h * 0.009)}px ${Math.round(w * 0.04)}px`,
                fontWeight: 700,
              }}
            >
              {badge}
            </div>
          ) : null}

          <div style={{ fontSize: headSize, fontWeight: 900, lineHeight: 1.04, letterSpacing: '-0.02em', textAlign: 'center' }}>
            {headline.map((seg, i) => (
              <span
                key={i}
                style={{
                  color: seg.gold ? T.gold : T.text,
                  ...(seg.serif ? { fontFamily: T.serif, fontStyle: 'italic', fontWeight: 400 } : null),
                }}
              >
                {i > 0 ? ' ' : ''}
                {seg.t}
              </span>
            ))}
          </div>

          {cta ? (
            <div
              style={{
                marginTop: Math.round(h * 0.01),
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
      </div>
    );
  },
);

HeroAdCard.displayName = 'HeroAdCard';
export default HeroAdCard;

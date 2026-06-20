import React, { forwardRef } from 'react';
import type { AdComposition } from '../../types';
import { AD_RATIO_DIMENSIONS } from '../../utils/captureToPng';

// GP-2 "Niche Callout" template (see workflows/static_ad_swipe_file.md, E5 /
// pattern S8). A self-identification pattern-interrupt: "If you run a [niche]
// [qualifier], we built [leadMagnet] for you." — the niche + qualifier carry the
// ad. Rendered as a real DOM node so captureToPng() can rasterize legible text
// (the Gemini image model can't render text — NO_TEXT_CONSTRAINT).
//
// The creative belongs to the CUSTOMER, so it accents with their brand color
// (first hex of UplinkData.hexCodes), falling back to Grifon gold. Layout is
// safe-zone aware: on 9:16 the content sits in the central band so the
// Stories/Reels UI (top header, bottom caption + CTA rail) never covers it.

const FALLBACK_ACCENT = '#FFCC00';

const firstHex = (hexCodes?: string): string => {
  const match = (hexCodes || '').match(/#?[0-9a-fA-F]{6}/);
  if (!match) return FALLBACK_ACCENT;
  const hex = match[0].startsWith('#') ? match[0] : `#${match[0]}`;
  return hex;
};

interface NicheCalloutCardProps {
  composition: AdComposition;
  aspectRatio: '9:16' | '4:5' | '1:1' | '16:9';
  hexCodes?: string;
  brandName?: string;
}

export const NicheCalloutCard = forwardRef<HTMLDivElement, NicheCalloutCardProps>(
  ({ composition, aspectRatio, hexCodes, brandName }, ref) => {
    const { w, h } = AD_RATIO_DIMENSIONS[aspectRatio] ?? AD_RATIO_DIMENSIONS['4:5'];
    const accent = firstHex(hexCodes);

    // Type + spacing scale off card width so every ratio reads correctly.
    const bodySize = Math.round(w * 0.066);
    const brandSize = Math.round(w * 0.026);
    const lineHeight = 1.32;

    // 9:16 keeps content in the central ~60% safe band (top ~14% header,
    // bottom ~22% caption/CTA rail). Other ratios use even padding.
    const isStory = aspectRatio === '9:16';
    const padX = Math.round(w * 0.12);
    const padTop = Math.round(h * (isStory ? 0.2 : 0.12));
    const padBottom = Math.round(h * (isStory ? 0.26 : 0.12));

    const { niche, qualifier, leadMagnet } = composition;

    const rootStyle: React.CSSProperties = {
          width: w,
          height: h,
          background: `radial-gradient(120% 90% at 50% 38%, ${accent}1f 0%, #09090B 58%)`,
          fontFamily: 'Inter, Geist, "SF Pro", system-ui, sans-serif',
          paddingLeft: padX,
          paddingRight: padX,
          paddingTop: padTop,
          paddingBottom: padBottom,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          color: '#FAFAFA',
          position: 'relative',
          overflow: 'hidden',
    };

    return (
      <div ref={ref} style={rootStyle}>
        {brandName ? (
          <div
            style={{
              fontSize: brandSize,
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: accent,
              fontWeight: 700,
              marginBottom: Math.round(h * 0.05),
              opacity: 0.95,
            }}
          >
            {brandName}
          </div>
        ) : null}

        <p
          style={{
            fontSize: bodySize,
            lineHeight,
            fontWeight: 600,
            margin: 0,
            maxWidth: '100%',
          }}
        >
          If you run a{' '}
          <strong style={{ color: accent, fontWeight: 800 }}>{niche || 'business'}</strong>
          {qualifier ? (
            <>
              {' '}
              <strong style={{ color: accent, fontWeight: 800 }}>{qualifier}</strong>
            </>
          ) : null}
          , we built{' '}
          <strong style={{ color: '#FFFFFF', fontWeight: 800 }}>
            {leadMagnet || 'this'}
          </strong>{' '}
          for you.
        </p>

        {/* subtle gold/accent underline accent under the sentence */}
        <div
          style={{
            marginTop: Math.round(h * 0.045),
            width: Math.round(w * 0.18),
            height: Math.max(3, Math.round(w * 0.006)),
            borderRadius: 999,
            background: accent,
            boxShadow: `0 0 ${Math.round(w * 0.03)}px ${accent}`,
          }}
        />
      </div>
    );
  },
);

NicheCalloutCard.displayName = 'NicheCalloutCard';

export default NicheCalloutCard;

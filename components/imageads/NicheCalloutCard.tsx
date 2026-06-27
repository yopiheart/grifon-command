import React, { forwardRef } from 'react';
import type { AdComposition } from '../../types';
import { AD_RATIO_DIMENSIONS } from '../../utils/captureToPng';
import { resolveAdTheme, type AdTheme } from '../../utils/adTheme';

// GP-2 "Niche Callout" template (see workflows/static_ad_swipe_file.md, E5 /
// pattern S8). A self-identification pattern-interrupt: "If you run a [niche]
// [qualifier], we built [leadMagnet] for you." — the niche + qualifier carry the
// ad. Rendered as a real DOM node so captureToPng() can rasterize legible text
// (the Gemini image model can't render text — NO_TEXT_CONSTRAINT).
//
// The creative belongs to the CUSTOMER, so its color scheme is resolved by
// utils/adTheme.ts (bold solid brand block / clean light / true-dark + accent),
// always contrast-safe — NEVER Grifon's muddy dark-on-dark UI. niche/qualifier
// are emphasized by CONTRAST + weight (accent only when it clears contrast).
// Layout is safe-zone aware: on 9:16 the content sits in the central band so the
// Stories/Reels UI never covers it.

interface NicheCalloutCardProps {
  composition: AdComposition;
  aspectRatio: '9:16' | '4:5' | '1:1' | '16:9';
  theme?: AdTheme;
  // Legacy inputs (resolved into a theme when `theme` isn't supplied).
  hexCodes?: string;
  brandName?: string;
}

export const NicheCalloutCard = forwardRef<HTMLDivElement, NicheCalloutCardProps>(
  ({ composition, aspectRatio, theme, hexCodes, brandName }, ref) => {
    const { w, h } = AD_RATIO_DIMENSIONS[aspectRatio] ?? AD_RATIO_DIMENSIONS['4:5'];
    const t = theme ?? resolveAdTheme({ hexCodes });

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
      background: t.bg, // SOLID brand block / clean light / true-dark — never a tint
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
      color: t.text,
      position: 'relative',
      overflow: 'hidden',
    };

    // Emphasis = weight + contrast-safe accent (accent already clears 4.5:1 vs bg).
    const emph: React.CSSProperties = { color: t.accent, fontWeight: 800 };

    return (
      <div ref={ref} style={rootStyle}>
        {brandName ? (
          <div
            style={{
              fontSize: brandSize,
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: t.accent, // legible (contrast-resolved) — no faint ghost
              fontWeight: 800,
              marginBottom: Math.round(h * 0.05),
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
            color: t.text,
          }}
        >
          If you run a{' '}
          <strong style={emph}>{niche || 'business'}</strong>
          {qualifier ? (
            <>
              {' '}
              <strong style={emph}>{qualifier}</strong>
            </>
          ) : null}
          , we built{' '}
          <strong style={{ color: t.text, fontWeight: 800 }}>{leadMagnet || 'this'}</strong>{' '}
          for you.
        </p>

        {/* accent underline under the sentence */}
        <div
          style={{
            marginTop: Math.round(h * 0.045),
            width: Math.round(w * 0.18),
            height: Math.max(4, Math.round(w * 0.008)),
            borderRadius: 999,
            background: t.accent,
          }}
        />
      </div>
    );
  },
);

NicheCalloutCard.displayName = 'NicheCalloutCard';

export default NicheCalloutCard;

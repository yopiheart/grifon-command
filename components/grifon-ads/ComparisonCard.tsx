import React, { forwardRef } from 'react';
import { Check, X } from 'lucide-react';
import { GRIFON_AD as T, AD_DIMENSIONS, type AdFormat } from './grifonAdTheme';

// Grifon self-promo "Old Way vs New Way" comparison creative — the text-table
// treatment the image model garbles (see the landing reference). Rendered as
// real DOM → screenshot to PNG. Props-driven so we can ship a landing variant
// (price visible) and a paid-ad variant (price dropped, agency anchor kept).

export interface ComparisonCardProps {
  format?: AdFormat;
  preHeadline?: string; // e.g. "THE OLD WAY VS."
  accentHeadline?: string; // serif gold flourish, e.g. "the Grifon way"
  oldLabel?: string;
  newLabel?: string;
  oldItems: string[];
  newItems: string[];
  cta?: string;
}

export const ComparisonCard = forwardRef<HTMLDivElement, ComparisonCardProps>(
  (
    {
      format = '1:1',
      preHeadline = 'THE OLD WAY VS.',
      accentHeadline = 'the Grifon way',
      oldLabel = 'THE OLD WAY',
      newLabel = 'THE GRIFON WAY',
      oldItems,
      newItems,
      cta,
    },
    ref,
  ) => {
    const { w, h } = AD_DIMENSIONS[format] ?? AD_DIMENSIONS['1:1'];
    const pad = Math.round(w * 0.06);
    const headSize = Math.round(w * 0.05);
    const colLabel = Math.round(w * 0.024);
    const itemSize = Math.round(w * 0.0265);
    const gap = Math.round(w * 0.03);
    const iconSize = Math.round(itemSize * 1.05);

    const root: React.CSSProperties = {
      width: w,
      height: h,
      background: T.bg,
      fontFamily: T.sans,
      padding: pad,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      color: T.text,
      position: 'relative',
      overflow: 'hidden',
    };

    const Column = ({ win, label, items }: { win: boolean; label: string; items: string[] }) => (
      <div
        style={{
          flex: 1,
          background: win ? 'rgba(255,204,0,0.05)' : 'rgba(255,255,255,0.02)',
          border: `2px solid ${win ? T.gold : T.border}`,
          borderRadius: Math.round(w * 0.03),
          boxShadow: win ? `0 0 ${Math.round(w * 0.05)}px rgba(255,204,0,0.18)` : 'none',
          padding: Math.round(w * 0.038),
          display: 'flex',
          flexDirection: 'column',
          gap: Math.round(h * 0.018),
        }}
      >
        <div
          style={{
            fontFamily: T.mono,
            fontSize: colLabel,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: win ? T.gold : T.sublabel,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: Math.round(h * 0.008),
          }}
        >
          {win ? <Check size={colLabel} color={T.gold} strokeWidth={3} /> : <X size={colLabel} color={T.sublabel} strokeWidth={3} />}
          {label}
        </div>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: Math.round(w * 0.016), fontSize: itemSize, lineHeight: 1.35, color: win ? T.text : T.dim }}>
            {win ? (
              <Check size={iconSize} color={T.gold} strokeWidth={3} style={{ flexShrink: 0, marginTop: 2 }} />
            ) : (
              <X size={iconSize} color={T.sublabel} strokeWidth={3} style={{ flexShrink: 0, marginTop: 2 }} />
            )}
            <span>{it}</span>
          </div>
        ))}
      </div>
    );

    return (
      <div ref={ref} style={root}>
        <div
          style={{
            fontSize: headSize,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
            textAlign: 'center',
            marginBottom: Math.round(h * 0.04),
            marginTop: Math.round(h * 0.01),
            lineHeight: 1.1,
          }}
        >
          <span style={{ color: T.text }}>{preHeadline} </span>
          <span style={{ fontFamily: T.serif, fontStyle: 'italic', fontWeight: 400, color: T.gold, textTransform: 'none' }}>
            {accentHeadline}
          </span>
        </div>

        <div style={{ display: 'flex', gap, width: '100%', flex: 1, alignItems: 'stretch' }}>
          <Column win={false} label={oldLabel} items={oldItems} />
          <Column win label={newLabel} items={newItems} />
        </div>

        {cta ? (
          <div
            style={{
              marginTop: Math.round(h * 0.035),
              alignSelf: 'center',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: T.gold,
              color: '#000000',
              fontWeight: 800,
              fontSize: Math.round(w * 0.03),
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: `${Math.round(h * 0.018)}px ${Math.round(w * 0.07)}px`,
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

ComparisonCard.displayName = 'ComparisonCard';
export default ComparisonCard;

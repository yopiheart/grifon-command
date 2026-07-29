import React from 'react';

// ===========================================================================
// GlassCard — the content surface (forms, testimonials, value rows).
//
// Simplified from the app's GlassPanel, and deliberately NOT dependent on
// backdrop-filter: mobile WebViews render it unreliably and it costs GPU on
// mid-range phones for no optical gain over a near-opaque ground. The premium
// read is built instead from four cheap layers —
//   1. a tonal fill on --brand-surface-elevated
//   2. an inset top-edge highlight (the light source)
//   3. a soft sheen gradient across the top third
//   4. a lifted drop shadow + hairline border
// backdrop-blur is layered on top only where the browser supports it.
// ===========================================================================

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** `proof` inverts onto the light proof band (dark text on --brand-proof-band). */
  tone?: 'default' | 'proof';
  /** Set false when the caller owns its own padding. */
  padded?: boolean;
}

const DARK =
  'bg-brand-elevated border-white/10 text-brand-on-surface ' +
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_40px_-24px_rgba(0,0,0,0.9)] ' +
  'supports-[backdrop-filter]:backdrop-blur-xl';

const PROOF =
  'bg-brand-proof-band border-black/10 text-black ' +
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_18px_40px_-28px_rgba(0,0,0,0.35)]';

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  tone = 'default',
  padded = true,
  className = '',
  ...props
}) => (
  <div
    className={`relative overflow-hidden rounded-brand border ${tone === 'proof' ? PROOF : DARK} ${
      padded ? 'p-6 md:p-8' : ''
    } ${className}`}
    {...props}
  >
    {/* Sheen — the "glass" read that survives without backdrop-filter. */}
    <span
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 top-0 h-1/3 ${
        tone === 'proof' ? 'bg-gradient-to-b from-white/60' : 'bg-gradient-to-b from-white/[0.07]'
      } to-transparent`}
    />
    <div className="relative">{children}</div>
  </div>
);

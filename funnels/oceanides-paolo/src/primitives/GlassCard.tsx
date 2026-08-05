import React from 'react';

// ===========================================================================
// GlassCard — the content surface (forms, price rows, FAQ).
//
// ⚠️ The NAME is inherited from the template (every section imports it under
// this name). For OCEANIDES it is NOT glass, on purpose.
//
// clients/oceanides/DESIGN.md, Overview law #2: "Walang glass. No backdrop-filter,
// no frosted panels. Elevation = tonal fill + print devices." The brand is a matte
// PRINT world — clipboard-in-the-truck, not sci-fi deck — and law #1 ("Hindi
// Mukhang Ad") means anything that reads as a glossy SaaS panel raises the exact
// guard the creative works to lower.
//
// So versus the template this drops:
//   - `supports-[backdrop-filter]:backdrop-blur-xl`  (the glass)
//   - the white sheen gradient across the top third  (the gloss)
//   - the inset top-edge highlight                   (the fake light source)
//
// and replaces them with two print devices:
//   - a 2px defined border (DESIGN.md checklist-row grammar)
//   - a flat tonal fill, no gradient anywhere
//
// Border colour is a low-alpha neutral, not a brand token: the tailwind brand
// tokens are raw hex vars, so opacity modifiers like `border-brand-on-surface-dim/25`
// silently do nothing (see the NOTE in tailwind.config.js). white/black overlays
// are the sanctioned way to get translucency here.
// ===========================================================================

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** `proof` inverts onto the light proof band (dark text on --brand-proof-band). */
  tone?: 'default' | 'proof';
  /** Set false when the caller owns its own padding. */
  padded?: boolean;
}

// GROUND-RELATIVE (2026-08-01). `--brand-card` / `--brand-card-border` are navy
// by default and flip to white-on-paper inside a `.ground-paper` band, so the
// SAME card renders correctly in both chapters and no section has to ask which
// ground it landed on. Separation still comes from the border and the tonal
// step, never from a blur or a shadow bloom.
const DARK = 'bg-brand-card border-brand-card-border text-brand-on-surface';

// Paper card. DESIGN.md paper-surface rule: white cards, rgba(11,27,51,.1) borders,
// dark text. Kept a hair heavier here so the border survives on a phone.
const PROOF = 'bg-brand-proof-band border-[rgba(11,27,51,0.18)] text-[#0b1b33]';

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  tone = 'default',
  padded = true,
  className = '',
  ...props
}) => (
  <div
    className={`relative overflow-hidden rounded-brand border-2 ${
      tone === 'proof' ? PROOF : DARK
    } ${padded ? 'p-6 md:p-8' : ''} ${className}`}
    {...props}
  >
    {children}
  </div>
);

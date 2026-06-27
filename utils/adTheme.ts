// utils/adTheme.ts — single source of truth for the text-composited Image Ads
// color scheme (Niche Callout / SaaS-Upsell). See
// workflows/image_ads_design_system.md.
//
// The ad belongs to the CUSTOMER's brand and must be BOLD + LEGIBLE — NEVER
// Grifon's dark-on-dark app aesthetic. Every color this returns is resolved
// against the chosen background by luminance so text always clears a WCAG
// contrast floor; a brand color that's too dark/light for its role is SHIFTED
// toward legibility rather than rendered invisible.
//
// Fallback chain (per the design brief):
//   1. Brand Kit (colors [+ vibe + logo]) → use it.
//   2. Else brand color(s) provided (hexCodes) → bold block of it.
//   3. Else → clean default: white bg + near-black text + one accent.

import type { AdVibe } from '../types';

export type { AdVibe };

export interface BrandKit {
  colors?: string[]; // brand colors, first = primary, second = secondary
  logo?: string; // data URL / remote URL
  vibe?: AdVibe;
}

export interface AdTheme {
  bg: string; // card surface (solid)
  text: string; // primary text — contrast-safe vs bg
  muted: string; // secondary text — still legible vs bg
  accent: string; // emphasis color — contrast-safe vs bg (usable as text)
  onAccent: string; // text color on top of an accent fill (pills/badges)
  panel: string; // faint surface for nested cards (tiers)
  border: string; // faint border vs bg
  isDark: boolean; // true when bg is dark (text is near-white)
  vibe: AdVibe;
  logo?: string;
}

const GRIFON_GOLD = '#FFCC00'; // last-resort accent only
const NEAR_WHITE = '#FAFAFA';
const NEAR_BLACK = '#0A0A0A';
const PURE_WHITE = '#FFFFFF';

interface RGB {
  r: number;
  g: number;
  b: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function parseHex(input?: string): RGB | null {
  if (!input) return null;
  const m = input.match(/[0-9a-fA-F]{6}|[0-9a-fA-F]{3}/);
  if (!m) return null;
  let h = m[0];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

const toHex = ({ r, g, b }: RGB): string =>
  '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');

// Linear-light mix of two colors (t=0 → a, t=1 → b).
const mix = (a: RGB, b: RGB, t: number): RGB => ({
  r: a.r + (b.r - a.r) * t,
  g: a.g + (b.g - a.g) * t,
  b: a.b + (b.b - a.b) * t,
});

// WCAG relative luminance.
function relLuminance({ r, g, b }: RGB): number {
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

function contrastRatio(a: RGB, b: RGB): number {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const isDarkBg = (bg: RGB): boolean =>
  contrastRatio({ r: 255, g: 255, b: 255 }, bg) >= contrastRatio({ r: 0, g: 0, b: 0 }, bg);

// Near-white or near-black, whichever reads better on `bg`.
function pickTextColor(bg: RGB): string {
  return isDarkBg(bg) ? NEAR_WHITE : NEAR_BLACK;
}

// Shift `fg` toward white (on dark bg) or black (on light bg) until it clears
// `target` contrast — so a brand color too close to its background is nudged
// into legibility instead of disappearing. Returns the original if already fine.
function ensureContrast(fg: RGB, bg: RGB, target = 4.5): RGB {
  if (contrastRatio(fg, bg) >= target) return fg;
  const toward: RGB = isDarkBg(bg) ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 };
  let best = fg;
  for (let t = 0.1; t <= 1.0001; t += 0.1) {
    best = mix(fg, toward, t);
    if (contrastRatio(best, bg) >= target) return best;
  }
  return best; // pushed to the extreme — guaranteed maximal contrast
}

// Build a fully contrast-safe scheme from a chosen background + accent source.
function buildScheme(bg: RGB, accentSource: RGB, vibe: AdVibe, logo?: string): AdTheme {
  const textHex = pickTextColor(bg);
  const text = parseHex(textHex) as RGB;
  return {
    bg: toHex(bg),
    text: textHex,
    muted: toHex(mix(text, bg, 0.32)), // ~68% toward text — legible secondary
    accent: toHex(ensureContrast(accentSource, bg, 4.5)),
    onAccent: pickTextColor(ensureContrast(accentSource, bg, 4.5)),
    panel: toHex(mix(text, bg, 0.9)), // very faint nested surface
    border: toHex(mix(text, bg, 0.8)),
    isDark: isDarkBg(bg),
    vibe,
    logo,
  };
}

// One-click "Style Presets" — swipe-file-derived looks for users who don't know
// their brand color/vibe (per Neil 2026-06-20: let them CHOOSE a look, not
// recall a hex). Each is a pre-vetted, contrast-safe {colors + vibe} bundle.
// "Use My Brand Colors" is the absence of a preset (the brand-color chain).
export interface AdStylePreset {
  id: string;
  label: string;
  description: string;
  colors: string[]; // [primary, secondary?]
  vibe: AdVibe;
  swatch: { bg: string; accent: string }; // preview only
}

export const AD_STYLE_PRESETS: AdStylePreset[] = [
  {
    id: 'crimson-authority',
    label: 'Crimson Authority',
    description: 'IM8 — true-dark + bright crimson',
    colors: ['#E10600'],
    vibe: 'Premium',
    swatch: { bg: '#0B0B0D', accent: '#E10600' },
  },
  {
    id: 'green-block',
    label: 'Green Block',
    description: 'Grüns — saturated green block + cream',
    colors: ['#1F7A3D', '#F4EBD0'],
    vibe: 'Bold',
    swatch: { bg: '#1F7A3D', accent: '#F4EBD0' },
  },
  {
    id: 'gold-on-black',
    label: 'Gold on Black',
    description: 'Iman — black + Grifon gold',
    colors: ['#FFCC00'],
    vibe: 'Premium',
    swatch: { bg: '#0B0B0D', accent: '#FFCC00' },
  },
  {
    id: 'clean-white',
    label: 'Clean White',
    description: 'Sabri — white + one bold accent',
    colors: ['#E63946'],
    vibe: 'Clean',
    swatch: { bg: '#FFFFFF', accent: '#E63946' },
  },
];

export const getAdStylePreset = (id?: string): AdStylePreset | undefined =>
  id ? AD_STYLE_PRESETS.find((p) => p.id === id) : undefined;

export interface ResolveAdThemeInput {
  hexCodes?: string; // comma/space-separated, e.g. "#3b2417, #c98a3a"
  brandKit?: BrandKit;
  logo?: string;
  vibe?: AdVibe;
  presetId?: string; // a Style Preset overrides hexCodes/vibe; falsy = brand-color chain
}

const parseHexList = (s?: string): RGB[] =>
  (s || '')
    .split(/[,\s]+/)
    .map(parseHex)
    .filter((c): c is RGB => !!c);

/**
 * Resolve a contrast-safe {bg, text, accent, …} scheme for the customer's brand.
 * Single source of truth — every composited ad card consumes this.
 */
export function resolveAdTheme(input: ResolveAdThemeInput = {}): AdTheme {
  // A chosen Style Preset wins — it's a pre-vetted look for users who don't know
  // their brand color. Otherwise fall back to the brand-color chain.
  const preset = getAdStylePreset(input.presetId);
  const kitColors = (input.brandKit?.colors || []).map(parseHex).filter((c): c is RGB => !!c);
  const presetColors = (preset?.colors || []).map(parseHex).filter((c): c is RGB => !!c);
  const colors = presetColors.length
    ? presetColors
    : kitColors.length
      ? kitColors
      : parseHexList(input.hexCodes);
  const vibe: AdVibe = preset?.vibe ?? input.brandKit?.vibe ?? input.vibe ?? 'Bold';
  const logo = input.brandKit?.logo ?? input.logo;

  const primary = colors[0];
  const secondary = colors[1];
  const gold = parseHex(GRIFON_GOLD) as RGB;

  // 3. No brand color → clean default: white bg, near-black text, gold accent.
  if (!primary) {
    return buildScheme(parseHex(PURE_WHITE) as RGB, gold, vibe === 'Bold' ? 'Clean' : vibe, logo);
  }

  // 1/2. Brand color present → choose the background by vibe, then resolve a
  // contrast-safe accent. The brand color is never a faint tint on near-black.
  switch (vibe) {
    case 'Premium': {
      // True-dark lane + STRONG brand accent (IM8 crimson / Iman gold-on-black).
      const bg = parseHex('#0B0B0D') as RGB;
      return buildScheme(bg, primary, vibe, logo);
    }
    case 'Clean': {
      // Bright + minimal: white surface, brand color as the single accent.
      const bg = parseHex(PURE_WHITE) as RGB;
      return buildScheme(bg, primary, vibe, logo);
    }
    case 'Playful':
    case 'Bold':
    default: {
      // SOLID saturated brand block; accent = secondary brand color, else gold.
      return buildScheme(primary, secondary ?? gold, vibe, logo);
    }
  }
}

// Exposed for tests / callers that need the raw helpers.
export const __adThemeInternals = { parseHex, toHex, relLuminance, contrastRatio, pickTextColor, ensureContrast };

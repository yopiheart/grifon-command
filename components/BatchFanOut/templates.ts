// Layout presets for the Batch Creative compositor. Each preset is pure data;
// compositor.ts interprets it against a Canvas. Variants rotate through these so
// a 100-creative batch isn't 100 visually identical frames.

export type BandPosition = 'top' | 'bottom' | 'left' | 'framed' | 'scrim';
export type FillToken = 'brand' | 'brandDark' | 'gold' | 'white' | 'scrim';
export type TextToken = 'auto' | 'white' | 'black' | 'gold';
export type Corner = 'tl' | 'tr' | 'bl' | 'br';

export interface TemplatePreset {
  id: string;
  name: string;
  /** Where the headline band sits relative to the hero image. */
  band: BandPosition;
  /** Band thickness as a fraction of the canvas's short edge. */
  bandHeightFrac: number;
  bandFill: FillToken;
  headlineColor: TextToken;
  headlineAlign: 'left' | 'center';
  showBadge: boolean;
  badgeCorner: Corner;
  badgeFill: Exclude<FillToken, 'scrim'>;
}

export const TEMPLATES: TemplatePreset[] = [
  {
    id: 'top-banner',
    name: 'Top Banner',
    band: 'top',
    bandHeightFrac: 0.26,
    bandFill: 'brand',
    headlineColor: 'auto',
    headlineAlign: 'left',
    showBadge: true,
    badgeCorner: 'br',
    badgeFill: 'gold',
  },
  {
    id: 'bottom-bar',
    name: 'Bottom Bar',
    band: 'bottom',
    bandHeightFrac: 0.28,
    bandFill: 'white',
    headlineColor: 'black',
    headlineAlign: 'left',
    showBadge: true,
    badgeCorner: 'tr',
    badgeFill: 'brand',
  },
  {
    id: 'side-badge',
    name: 'Side Slab',
    band: 'left',
    bandHeightFrac: 0.42,
    bandFill: 'brandDark',
    headlineColor: 'white',
    headlineAlign: 'left',
    showBadge: true,
    badgeCorner: 'tr',
    badgeFill: 'gold',
  },
  {
    id: 'framed',
    name: 'Framed Scrim',
    band: 'framed',
    bandHeightFrac: 0.30,
    bandFill: 'scrim',
    headlineColor: 'white',
    headlineAlign: 'center',
    showBadge: true,
    badgeCorner: 'tl',
    badgeFill: 'gold',
  },
  {
    id: 'gold-bottom',
    name: 'Gold Strip',
    band: 'bottom',
    bandHeightFrac: 0.24,
    bandFill: 'gold',
    headlineColor: 'black',
    headlineAlign: 'center',
    showBadge: true,
    badgeCorner: 'tl',
    badgeFill: 'brand',
  },
];

/** Deterministic round-robin so adjacent tiles look different. */
export const pickTemplate = (index: number): TemplatePreset =>
  TEMPLATES[index % TEMPLATES.length];

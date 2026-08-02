import type { FunnelConfig } from '../config.types';

// Placeholder brand for BOTH demo configs — Grifon's own DESIGN.md frontmatter,
// copied here as data. A real funnel replaces this block wholesale with the
// client's DESIGN.md values; nothing in the section components changes.
export const DEMO_BRAND: FunnelConfig['brand'] = {
  colors: {
    primary: '#FFCC00',
    surface: '#09090B',
    surfaceElevated: '#18181B',
    onSurface: '#FFFFFF',
    onSurfaceMuted: '#D4D4D8',
    onSurfaceDim: '#A1A1AA',
    proofBand: '#F2F1EA',
  },
  fonts: {
    display: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    body: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    accent: "'Instrument Serif', Georgia, 'Times New Roman', serif",
  },
  rounded: 'lg',
};

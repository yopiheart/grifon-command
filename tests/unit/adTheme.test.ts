import { describe, it, expect } from 'vitest';
import {
  resolveAdTheme,
  AD_STYLE_PRESETS,
  __adThemeInternals,
  type AdVibe,
} from '../../utils/adTheme.js';

const { parseHex, contrastRatio } = __adThemeInternals;

const ratio = (a: string, b: string) => contrastRatio(parseHex(a)!, parseHex(b)!);

// The whole point of the v2 rebuild: text is ALWAYS legible on the chosen bg,
// regardless of how dark/light the customer's brand color is. See
// workflows/image_ads_design_system.md ("Contrast is non-negotiable").
describe('adTheme — contrast guarantees', () => {
  const cases: { name: string; input: Parameters<typeof resolveAdTheme>[0] }[] = [
    { name: 'very dark brand (Barako brown)', input: { hexCodes: '#3B2417' } },
    { name: 'very light brand (pale cream)', input: { hexCodes: '#F4EBD0' } },
    { name: 'bright brand (sky blue)', input: { hexCodes: '#1FA9E0' } },
    { name: 'mid brand (forest green)', input: { hexCodes: '#1F7A3D' } },
    { name: 'no brand color (clean default)', input: {} },
    { name: 'two-color brand kit', input: { brandKit: { colors: ['#3B2417', '#C98A3A'] } } },
  ];

  for (const v of ['Bold', 'Premium', 'Playful', 'Clean'] as AdVibe[]) {
    for (const c of cases) {
      it(`${c.name} @ ${v}: text ≥ 4.5:1 and accent ≥ 4.5:1`, () => {
        const t = resolveAdTheme({ ...c.input, vibe: v });
        expect(ratio(t.text, t.bg)).toBeGreaterThanOrEqual(4.49);
        expect(ratio(t.accent, t.bg)).toBeGreaterThanOrEqual(4.49);
        // text on an accent fill (CTA pill / badge) must also be legible
        expect(ratio(t.onAccent, t.accent)).toBeGreaterThanOrEqual(2.9);
      });
    }
  }

  it('every Style Preset resolves to a contrast-safe theme', () => {
    for (const p of AD_STYLE_PRESETS) {
      const t = resolveAdTheme({ presetId: p.id });
      expect(ratio(t.text, t.bg)).toBeGreaterThanOrEqual(4.49);
      expect(ratio(t.accent, t.bg)).toBeGreaterThanOrEqual(4.49);
      expect(ratio(t.onAccent, t.accent)).toBeGreaterThanOrEqual(2.9);
    }
  });

  it('a chosen preset overrides the supplied brand color', () => {
    const t = resolveAdTheme({ hexCodes: '#000000', presetId: 'green-block' });
    // Green Block bg is the saturated green block, not the black hex.
    expect(ratio(t.text, t.bg)).toBeGreaterThanOrEqual(4.49);
    expect(t.vibe).toBe('Bold');
  });

  it('falls back to brand colors when presetId is falsy', () => {
    const t = resolveAdTheme({ hexCodes: '#1F7A3D', presetId: undefined });
    expect(ratio(t.text, t.bg)).toBeGreaterThanOrEqual(4.49);
  });
});

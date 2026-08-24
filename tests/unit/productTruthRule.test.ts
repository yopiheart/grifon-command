import { describe, it, expect } from 'vitest';
import { buildStoryboardPrompt } from '../../api/_lib/prompts.js';
import type { BusinessInfo } from '../../types.js';

/**
 * Run apr_fa7cedc3 (2026-08-23), scene 8, stored imagePrompt verbatim:
 *
 *   "Still hero product shot of the Hiraya Glow serum bottle positioned NEXT TO ITS OUTER
 *    PACKAGE BOX on a clean wooden table surface, front label facing camera..."
 *
 * Neil uploaded one hero.png of a bottle. There was no box. The STORYBOARD invented it and
 * the image model rendered exactly what it was told, so the defect is in this prompt builder,
 * not in the image layer.
 *
 * The script layer had guarded invented price / scarcity / bonuses since long before that run
 * (see PRICE_RULE and the CTA scarcity block). The image side had no equivalent. These tests
 * pin the twin rule into every scriptType arm, because the failure was a MISSING branch, not a
 * weak sentence — a rule that reaches only some formats is how this happened in the first place.
 */

const baseInfo = (overrides: Partial<BusinessInfo> = {}): BusinessInfo => ({
  product: 'Hiraya Glow serum',
  audience: 'Filipina women 25-40',
  benefit: 'evens out dark spots',
  painPoint: 'uneven skin tone',
  separator: 'locally made, dermatologist tested',
  features: '30ml amber dropper bottle',
  productImageDescription: 'a single amber glass dropper bottle',
  businessType: 'product',
  ...overrides,
});

const buildFor = (info: BusinessInfo) =>
  buildStoryboardPrompt({
    script: ['Hook line.', 'Beat two.', 'Beat three.', 'Closing line.'],
    avatarDescription: 'Filipina, late twenties',
    businessInfo: info,
    ethnicity: 'Filipino',
    language: 'Taglish',
  });

/** Every scriptType the picker can produce. */
const SCRIPT_TYPES: NonNullable<BusinessInfo['scriptType']>[] = [
  'MrBeast',
  'Testimonial',
  'Temu',
  'Custom',
  'Cinematic',
  'Services',
  'RealEstate',
  'UGCPro',
];

describe('PRODUCT_TRUTH_RULE reaches the storyboard prompt', () => {
  it('is present for Testimonial — the scriptType that actually shipped the box', () => {
    const prompt = buildFor(baseInfo({ scriptType: 'Testimonial' }));
    expect(prompt).toContain('PRODUCT_TRUTH_RULE');
  });

  it('is present for every scriptType, so no format is left unguarded', () => {
    for (const scriptType of SCRIPT_TYPES) {
      const prompt = buildFor(baseInfo({ scriptType }));
      expect(prompt, `scriptType ${scriptType} has no PRODUCT_TRUTH_RULE`).toContain(
        'PRODUCT_TRUTH_RULE'
      );
    }
  });

  it('is present for the non-product UGC Pro arms and every UGC Pro sub-format', () => {
    for (const businessType of ['product', 'service', 'realestate'] as const) {
      const prompt = buildFor(baseInfo({ scriptType: 'UGCPro', businessType }));
      expect(prompt, `UGCPro/${businessType} has no PRODUCT_TRUTH_RULE`).toContain(
        'PRODUCT_TRUTH_RULE'
      );
    }
    for (const ugcProFormat of ['tryon', 'unboxing', 'demo', 'transformation', 'tutorial'] as const) {
      const prompt = buildFor(baseInfo({ scriptType: 'UGCPro', ugcProFormat }));
      expect(prompt, `UGCPro/${ugcProFormat} has no PRODUCT_TRUTH_RULE`).toContain(
        'PRODUCT_TRUTH_RULE'
      );
    }
  });

  it('names the specific invented forms, not just a vague "be accurate"', () => {
    const prompt = buildFor(baseInfo({ scriptType: 'Testimonial' }));
    // The failure was an outer box; the neighbouring forms are the same mistake wearing a
    // different noun, so each must be named or the model will simply pick the next one.
    for (const form of ['outer box', 'carton', 'sleeve', 'sachet', 'multi-pack', 'gift set']) {
      expect(prompt, `PRODUCT_TRUTH_RULE does not name "${form}"`).toContain(form);
    }
  });

  it('carries the run apr_fa7cedc3 failure verbatim as a banned example', () => {
    const prompt = buildFor(baseInfo({ scriptType: 'Testimonial' }));
    expect(prompt).toContain('next to its outer package box');
  });

  it('states that a product-alone hero shot is complete, so the model has a legal way out', () => {
    // Without this the model satisfies "make it a hero shot" by adding something, which is
    // exactly the pressure that produced the box.
    const prompt = buildFor(baseInfo({ scriptType: 'Testimonial' }));
    expect(prompt).toMatch(/product ALONE is correct and complete/);
  });
});

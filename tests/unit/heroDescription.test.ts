import { describe, expect, it } from 'vitest';
import { mapReportToWizard, type ProductionInput } from '../../services/oneShotIntake.js';
import type { MarketResearchReport } from '../../types.js';

/**
 * businessInfo.productImageDescription is consumed as a description of what the product LOOKS
 * LIKE. buildStoryboardPrompt reads it as the writer's only clue about physical form, and the
 * storyboard flow is text-only (api/gemini/text.ts sends `contents: prompt`, no image), so
 * whatever lands in this field is the whole of what the writer will ever know.
 *
 * The guided verticals fill it from describeBusinessAsset. The Product path fell straight
 * through to productDescription — which LaunchScreen sets to `offer.trim()`. In run
 * apr_fa7cedc3 that meant the storyboard was told the serum "looks like":
 *
 *   "₱499 launch promo (reg. ₱799), free shipping nationwide, ends Sunday"
 *
 * and it invented a retail box to fill the gap. These tests pin the hero's real description
 * into the field, and pin the fallback so a failed best-effort describe changes nothing.
 */

const OFFER = '₱499 launch promo (reg. ₱799), free shipping nationwide, ends Sunday';
const HERO_DESC = 'A single amber glass dropper bottle with a white minimalist label, on a plain surface in soft daylight.';

const report = {} as MarketResearchReport;

const input = (overrides: Partial<ProductionInput> = {}): ProductionInput =>
  ({
    brandName: 'Hiraya Glow',
    offer: OFFER,
    price: '499',
    productName: 'Hiraya Glow',
    productDescription: OFFER, // LaunchScreen sends offer.trim() here — this is the real payload
    heroImageBase64: 'data:image/jpeg;base64,AAAA',
    avatar: { prompt: '', url: '', description: '', ethnicity: '', gender: 'Any' },
    voiceId: 'v1',
    language: 'Taglish',
    aspectRatio: '9:16',
    scriptType: 'Testimonial',
    businessType: 'product',
    ...overrides,
  }) as ProductionInput;

describe('mapReportToWizard — the hero photo describes the product, the offer does not', () => {
  it('uses the hero description on the Product path', () => {
    const { businessInfo } = mapReportToWizard(input({ heroDescription: HERO_DESC }), report);
    expect(businessInfo.productImageDescription).toBe(HERO_DESC);
  });

  it('never lets the offer become the product description when a hero description exists', () => {
    const { businessInfo } = mapReportToWizard(input({ heroDescription: HERO_DESC }), report);
    expect(businessInfo.productImageDescription).not.toBe(OFFER);
    expect(businessInfo.productImageDescription).not.toContain('₱499');
  });

  it('falls back to the old behaviour when the best-effort describe produced nothing', () => {
    // describeBusinessAsset is deliberately non-blocking: a 401 or a quota wall must not stop
    // the upload. When it yields nothing the run must behave exactly as it did before.
    for (const heroDescription of [undefined, '', '   ']) {
      const { businessInfo } = mapReportToWizard(input({ heroDescription }), report);
      expect(businessInfo.productImageDescription, `heroDescription ${JSON.stringify(heroDescription)}`)
        .toBe(OFFER);
    }
  });

  it('leaves the guided verticals untouched — their description comes from the slot photos', () => {
    const guided = input({
      businessType: 'service',
      heroDescription: HERO_DESC,
      servicePhotos: [
        { slot: 'before', url: 'before-data', description: 'A cluttered bathroom before cleaning.' },
        { slot: 'after', url: 'after-data', description: 'The same bathroom, clean and dry.' },
      ],
    });
    const { businessInfo } = mapReportToWizard(guided, report);
    // The hero description must NOT hijack the guided path's own slot-built description.
    expect(businessInfo.productImageDescription).not.toBe(HERO_DESC);
    expect(businessInfo.productImageDescription).toContain('bathroom');
  });

  it('still routes the raw productDescription into features, unchanged', () => {
    // features is a copy/brief field, not a visual one — this change must not move it.
    const { businessInfo } = mapReportToWizard(input({ heroDescription: HERO_DESC }), report);
    expect(businessInfo.features).toBe(OFFER);
  });
});

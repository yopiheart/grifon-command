import { describe, it, expect } from 'vitest';
import {
  buildAdScriptPrompt,
  buildStoryboardPrompt,
  type AdScriptInput,
  type StoryboardFlowInput,
} from '../../api/_lib/prompts.js';
import type { BusinessInfo } from '../../types.js';

// Slice 4 core acceptance criterion (the regression guard for the whole slice):
// introducing `businessType` must NOT perturb the product path. For every UGC Pro
// sub-format, the prompt built with businessType:'product' must be byte-for-byte
// identical to the prompt built with businessType left undefined (legacy drafts).
// If this ever diverges, a bt-gated branch has leaked into the product default.

const FORMATS: NonNullable<BusinessInfo['ugcProFormat']>[] = [
  'tryon',
  'unboxing',
  'demo',
  'transformation',
  'tutorial',
];

const businessInfo = (over: Partial<BusinessInfo> = {}): BusinessInfo => ({
  product: 'Aurora Activewear Set',
  audience: 'Fashion-forward gym-goers',
  benefit: 'Feel confident in every workout',
  painPoint: 'Leggings that go see-through when you squat',
  separator: 'Squat-proof compression fabric',
  features: 'squat-proof, buttery-soft, high-waist',
  scriptType: 'UGCPro',
  ...over,
});

const adInput = (bi: BusinessInfo): AdScriptInput => ({
  businessInfo: bi,
  brandName: 'Aurora',
  language: 'Taglish',
  offer: '₱899 per set (free shipping)',
  chosenAngleBrief: '',
});

const sbInput = (bi: BusinessInfo): StoryboardFlowInput => ({
  script: ['Okay, I had to try this set. Watch this.', 'Obsessed.'],
  avatarDescription: 'A Filipina creator in her twenties',
  businessInfo: bi,
  ethnicity: 'Filipino',
  language: 'Taglish',
});

describe('UGC Pro product-path invariance — businessType:"product" === undefined', () => {
  for (const fmt of FORMATS) {
    it(`buildAdScriptPrompt('${fmt}') is byte-identical (product vs undefined)`, () => {
      const withProduct = buildAdScriptPrompt(
        adInput(businessInfo({ businessType: 'product' })),
        undefined,
        fmt,
      );
      const withUndefined = buildAdScriptPrompt(
        adInput(businessInfo({ businessType: undefined })),
        undefined,
        fmt,
      );
      expect(withProduct).toBe(withUndefined);
    });

    it(`buildStoryboardPrompt('${fmt}') is byte-identical (product vs undefined)`, () => {
      const withProduct = buildStoryboardPrompt(
        sbInput(businessInfo({ ugcProFormat: fmt, businessType: 'product' })),
      );
      const withUndefined = buildStoryboardPrompt(
        sbInput(businessInfo({ ugcProFormat: fmt, businessType: undefined })),
      );
      expect(withProduct).toBe(withUndefined);
    });
  }

  // The Services / RealEstate scriptType arms do NOT branch on businessType (bt is only
  // read inside the isUGCPro arm), so their output is invariant to the field's presence.
  it("Services storyboard is byte-identical whether businessType is absent or 'service'", () => {
    const absent = buildStoryboardPrompt(
      sbInput(businessInfo({ scriptType: 'Services', businessType: undefined })),
    );
    const service = buildStoryboardPrompt(
      sbInput(businessInfo({ scriptType: 'Services', businessType: 'service' })),
    );
    expect(absent).toBe(service);
  });

  it("RealEstate storyboard is byte-identical whether businessType is absent or 'realestate'", () => {
    const absent = buildStoryboardPrompt(
      sbInput(businessInfo({ scriptType: 'RealEstate', businessType: undefined })),
    );
    const realestate = buildStoryboardPrompt(
      sbInput(businessInfo({ scriptType: 'RealEstate', businessType: 'realestate' })),
    );
    expect(absent).toBe(realestate);
  });
});

import { describe, it, expect } from 'vitest';
import { mapReportToWizard, type ProductionInput } from '../../services/oneShotIntake.js';
import type { MarketResearchReport } from '../../types.js';

// Intent: an explicit UGC Pro sub-format picked at intake must survive the report→wizard
// projection into businessInfo.ugcProFormat (the field the server reads to HONOR the pick
// and SKIP the classifier), while the 'Auto' path (undefined) stays undefined so the server
// classifies from the brief. Slice 3 widens the honored set from 2 to all 5 sub-formats.

const baseInput = (over: Partial<ProductionInput> = {}): ProductionInput => ({
  brandName: 'Aurora',
  offer: '₱899 per set',
  price: '₱899',
  productName: 'Aurora Activewear Set',
  productDescription: 'squat-proof high-waist leggings',
  heroImageBase64: '',
  avatar: { url: '', description: '', ethnicity: '', gender: 'Any', prompt: '' },
  voiceId: 'v1',
  language: 'Taglish',
  aspectRatio: '9:16',
  scriptType: 'UGCPro',
  ...over,
});

const report = { winningAvatar: 'Gym-goer', emotionalPayoff: 'confidence' } as MarketResearchReport;

describe('mapReportToWizard — UGC Pro sub-format passthrough', () => {
  it("carries an explicit 'tryon' into businessInfo.ugcProFormat", () => {
    const { businessInfo } = mapReportToWizard(baseInput({ ugcProFormat: 'tryon' }), report);
    expect(businessInfo.scriptType).toBe('UGCPro');
    expect(businessInfo.ugcProFormat).toBe('tryon');
  });

  it("carries an explicit 'transformation' into businessInfo.ugcProFormat", () => {
    const { businessInfo } = mapReportToWizard(baseInput({ ugcProFormat: 'transformation' }), report);
    expect(businessInfo.ugcProFormat).toBe('transformation');
  });

  it.each(['tryon', 'unboxing', 'demo', 'transformation', 'tutorial'] as const)(
    "carries each explicit sub-format '%s' through (server then honors + skips classify)",
    (fmt) => {
      const { businessInfo } = mapReportToWizard(baseInput({ ugcProFormat: fmt }), report);
      expect(businessInfo.ugcProFormat).toBe(fmt);
    },
  );

  it('leaves ugcProFormat undefined on the Auto path (server classifies)', () => {
    const { businessInfo } = mapReportToWizard(baseInput({ ugcProFormat: undefined }), report);
    expect(businessInfo.ugcProFormat).toBeUndefined();
  });
});

describe('mapReportToWizard — ASMR flag passthrough', () => {
  it('carries asmrFlag=true onto businessInfo.asmrFlag', () => {
    const { businessInfo } = mapReportToWizard(baseInput({ ugcProFormat: 'unboxing', asmrFlag: true }), report);
    expect(businessInfo.asmrFlag).toBe(true);
  });

  it('leaves businessInfo.asmrFlag undefined when the flag is absent', () => {
    const { businessInfo } = mapReportToWizard(baseInput({ ugcProFormat: 'unboxing' }), report);
    expect(businessInfo.asmrFlag).toBeUndefined();
  });
});

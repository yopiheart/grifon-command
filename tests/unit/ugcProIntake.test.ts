import { describe, it, expect } from 'vitest';
import { mapReportToWizard, type ProductionInput } from '../../services/oneShotIntake.js';
import type { MarketResearchReport } from '../../types.js';

// Intent: an explicit UGC Pro sub-format picked at intake must survive the report→wizard
// projection into businessInfo.ugcProFormat (the field the server reads), while the
// 'Auto' path (undefined) stays undefined so the server classifies from the brief.

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

  it('leaves ugcProFormat undefined on the Auto path (server classifies)', () => {
    const { businessInfo } = mapReportToWizard(baseInput({ ugcProFormat: undefined }), report);
    expect(businessInfo.ugcProFormat).toBeUndefined();
  });
});

import { describe, it, expect } from 'vitest';
import { mapReportToWizard, type ProductionInput } from '../../services/oneShotIntake.js';
import { deriveScriptType, deriveBusinessType } from '../../components/OneShotAd/launchDerivation.js';
import type { MarketResearchReport } from '../../types.js';

// Slice 4 / A1 + A2: businessType is the vertical's OWN field, not a scriptType derivation.
// An explicit businessType (emitted by LaunchScreen's vertical) WINS, so a UGC Pro pick on a
// service/real-estate vertical no longer collapses to 'product'. The legacy scriptType→bt
// fallback must still hold when businessType is absent (older drafts / other composers).

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

describe('businessTypeFor (via mapReportToWizard) — explicit vertical wins', () => {
  it("honors an explicit businessType:'service' even with scriptType:'UGCPro'", () => {
    const { businessInfo } = mapReportToWizard(baseInput({ scriptType: 'UGCPro', businessType: 'service' }), report);
    expect(businessInfo.businessType).toBe('service');
    expect(businessInfo.scriptType).toBe('UGCPro');
  });

  it("honors an explicit businessType:'realestate' with scriptType:'UGCPro'", () => {
    const { businessInfo } = mapReportToWizard(baseInput({ scriptType: 'UGCPro', businessType: 'realestate' }), report);
    expect(businessInfo.businessType).toBe('realestate');
    expect(businessInfo.scriptType).toBe('UGCPro');
  });

  it("scriptType:'UGCPro' with NO businessType falls back to 'product' (legacy)", () => {
    const { businessInfo } = mapReportToWizard(baseInput({ scriptType: 'UGCPro', businessType: undefined }), report);
    expect(businessInfo.businessType).toBe('product');
  });

  it("legacy scriptType fallback still works: 'Services' → 'service' when businessType absent", () => {
    const { businessInfo } = mapReportToWizard(baseInput({ scriptType: 'Services', businessType: undefined }), report);
    expect(businessInfo.businessType).toBe('service');
  });

  it("legacy scriptType fallback still works: 'RealEstate' → 'realestate' when businessType absent", () => {
    const { businessInfo } = mapReportToWizard(baseInput({ scriptType: 'RealEstate', businessType: undefined }), report);
    expect(businessInfo.businessType).toBe('realestate');
  });
});

describe('LaunchScreen derivation — UGC Pro is cross-vertical', () => {
  it("service × ugc_pro → scriptType 'UGCPro' (format wins over vertical)", () => {
    expect(deriveScriptType('service', 'ugc_pro', 'Testimonial')).toBe('UGCPro');
  });

  it("real_estate × ugc_pro → scriptType 'UGCPro'", () => {
    expect(deriveScriptType('real_estate', 'ugc_pro', 'MrBeast')).toBe('UGCPro');
  });

  it("service default (ugc) still derives 'Services' — no existing flow changes", () => {
    expect(deriveScriptType('service', 'ugc', 'Testimonial')).toBe('Services');
  });

  it("real_estate default (ugc) still derives 'RealEstate'", () => {
    expect(deriveScriptType('real_estate', 'ugc', 'Testimonial')).toBe('RealEstate');
  });

  it('product axes are unchanged (ugc→strategy, product_ugc→Temu, ugc_pro→UGCPro)', () => {
    expect(deriveScriptType('product', 'ugc', 'MrBeast')).toBe('MrBeast');
    expect(deriveScriptType('product', 'ugc', 'Testimonial')).toBe('Testimonial');
    expect(deriveScriptType('product', 'product_ugc', 'Testimonial')).toBe('Temu');
    expect(deriveScriptType('product', 'ugc_pro', 'Testimonial')).toBe('UGCPro');
  });

  it("deriveBusinessType maps vertical → businessType (real_estate → 'realestate')", () => {
    expect(deriveBusinessType('product')).toBe('product');
    expect(deriveBusinessType('service')).toBe('service');
    expect(deriveBusinessType('real_estate')).toBe('realestate');
  });
});

describe('One-Shot service × ugc_pro — end-to-end derivation + emission', () => {
  it("derives scriptType 'UGCPro' + businessType 'service' and both survive mapReportToWizard", () => {
    const scriptType = deriveScriptType('service', 'ugc_pro', 'Testimonial');
    const businessType = deriveBusinessType('service');
    expect(scriptType).toBe('UGCPro');
    expect(businessType).toBe('service');
    const { businessInfo } = mapReportToWizard(baseInput({ scriptType, businessType }), report);
    expect(businessInfo.scriptType).toBe('UGCPro');
    expect(businessInfo.businessType).toBe('service');
  });
});

import { describe, it, expect } from 'vitest';
import { scriptTypeForBusinessType } from '../../components/step2ScriptType.js';

// Slice 4 / A3: the live bug — a restored 'UGCPro' draft used to reset to 'MrBeast' on one tap
// of the already-active businessType segment, because 'UGCPro' was absent from the ok-lists.
// UGC Pro is valid in ALL three groups, so it must SURVIVE any businessType toggle. Custom too.

describe('scriptTypeForBusinessType — UGC Pro survives every toggle', () => {
  it("preserves 'UGCPro' toggling to product", () => {
    expect(scriptTypeForBusinessType('product', 'UGCPro')).toBe('UGCPro');
  });
  it("preserves 'UGCPro' toggling to service", () => {
    expect(scriptTypeForBusinessType('service', 'UGCPro')).toBe('UGCPro');
  });
  it("preserves 'UGCPro' toggling to realestate", () => {
    expect(scriptTypeForBusinessType('realestate', 'UGCPro')).toBe('UGCPro');
  });

  it("preserves 'Custom' across all three groups", () => {
    expect(scriptTypeForBusinessType('product', 'Custom')).toBe('Custom');
    expect(scriptTypeForBusinessType('service', 'Custom')).toBe('Custom');
    expect(scriptTypeForBusinessType('realestate', 'Custom')).toBe('Custom');
  });
});

describe('scriptTypeForBusinessType — invalid picks fall to the group default', () => {
  it("service default is 'Services' when the current pick isn't valid for service", () => {
    expect(scriptTypeForBusinessType('service', 'MrBeast')).toBe('Services');
    expect(scriptTypeForBusinessType('service', undefined)).toBe('Services');
  });
  it("realestate default is 'RealEstate' when the pick isn't valid for realestate", () => {
    expect(scriptTypeForBusinessType('realestate', 'Testimonial')).toBe('RealEstate');
  });
  it("product default is 'MrBeast' when the pick isn't valid for product", () => {
    expect(scriptTypeForBusinessType('product', 'Services')).toBe('MrBeast');
    expect(scriptTypeForBusinessType('product', 'RealEstate')).toBe('MrBeast');
  });
  it("keeps a still-valid same-group pick (e.g. product 'Testimonial')", () => {
    expect(scriptTypeForBusinessType('product', 'Testimonial')).toBe('Testimonial');
  });
});

import { describe, it, expect } from 'vitest';
import { buildAdScriptPrompt, type AdScriptInput } from '../../api/_lib/prompts.js';
import type { BusinessInfo } from '../../types.js';

// Intent: the UGCPro adscript branch selects the right sub-format skeleton from the
// third arg, defaults to transformation when unspecified, always bakes the Meta
// appearance-claim guardrail into the transformation skeleton, and — like Temu —
// deliberately OMITS the HOOK SEED PROTOCOL even when a contrarianTruth is present.

const businessInfo = (): BusinessInfo => ({
  product: 'Aurora Activewear Set',
  audience: 'Fashion-forward gym-goers',
  benefit: 'Feel confident in every workout',
  painPoint: 'Leggings that go see-through when you squat',
  separator: 'Squat-proof compression fabric',
  features: 'squat-proof, buttery-soft, high-waist',
  scriptType: 'UGCPro',
});

const inputWith = (contrarianTruth?: string): AdScriptInput => ({
  businessInfo: businessInfo(),
  brandName: 'Aurora',
  language: 'Taglish',
  offer: '₱899 per set (free shipping)',
  chosenAngleBrief: '',
  contrarianTruth,
});

describe('buildAdScriptPrompt — UGCPro skeleton selection', () => {
  it("ugcProSubType 'tryon' → TRY-ON skeleton, not TRANSFORMATION", () => {
    const out = buildAdScriptPrompt(inputWith(), undefined, 'tryon');
    expect(out).toContain('TRY-ON 4-BEAT');
    expect(out).not.toContain('TRANSFORMATION 4-BEAT');
  });

  it("ugcProSubType 'transformation' → TRANSFORMATION skeleton with the appearance-claim guardrail, not TRY-ON", () => {
    const out = buildAdScriptPrompt(inputWith(), undefined, 'transformation');
    expect(out).toContain('TRANSFORMATION 4-BEAT');
    expect(out).toContain('APPEARANCE-CLAIM GUARDRAIL');
    expect(out).not.toContain('TRY-ON 4-BEAT');
  });

  it('no sub-format → defaults to transformation', () => {
    const out = buildAdScriptPrompt(inputWith(), undefined, undefined);
    expect(out).toContain('TRANSFORMATION 4-BEAT');
    expect(out).not.toContain('TRY-ON 4-BEAT');
  });

  it('never injects the HOOK SEED PROTOCOL, even when a contrarianTruth is supplied', () => {
    const out = buildAdScriptPrompt(
      inputWith('Your skin isn’t oily — it’s thirsty.'),
      undefined,
      'transformation',
    );
    expect(out).not.toContain('HOOK SEED PROTOCOL');
  });
});

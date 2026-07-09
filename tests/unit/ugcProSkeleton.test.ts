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

  it("ugcProSubType 'unboxing' → UNBOXING skeleton only", () => {
    const out = buildAdScriptPrompt(inputWith(), undefined, 'unboxing');
    expect(out).toContain('UNBOXING 4-BEAT');
    expect(out).not.toContain('TRY-ON 4-BEAT');
    expect(out).not.toContain('TRANSFORMATION 4-BEAT');
    expect(out).not.toContain('DEMO 5-BEAT');
    expect(out).not.toContain('TUTORIAL 5-BEAT');
  });

  it("ugcProSubType 'demo' → DEMO skeleton only", () => {
    const out = buildAdScriptPrompt(inputWith(), undefined, 'demo');
    expect(out).toContain('DEMO 5-BEAT');
    expect(out).not.toContain('UNBOXING 4-BEAT');
    expect(out).not.toContain('TUTORIAL 5-BEAT');
    expect(out).not.toContain('TRANSFORMATION 4-BEAT');
  });

  it("ugcProSubType 'tutorial' → TUTORIAL skeleton only", () => {
    const out = buildAdScriptPrompt(inputWith(), undefined, 'tutorial');
    expect(out).toContain('TUTORIAL 5-BEAT');
    expect(out).not.toContain('DEMO 5-BEAT');
    expect(out).not.toContain('UNBOXING 4-BEAT');
    expect(out).not.toContain('TRANSFORMATION 4-BEAT');
  });

  it('the 5 subtypes each surface their strategy label in the header', () => {
    expect(buildAdScriptPrompt(inputWith(), undefined, 'tryon')).toContain('Virtual Try-On (fashion reveal)');
    expect(buildAdScriptPrompt(inputWith(), undefined, 'unboxing')).toContain('Unboxing (tactile reveal)');
    expect(buildAdScriptPrompt(inputWith(), undefined, 'demo')).toContain('Demo / Addiction (watch it work)');
    expect(buildAdScriptPrompt(inputWith(), undefined, 'transformation')).toContain('Transformation (Before & After)');
    expect(buildAdScriptPrompt(inputWith(), undefined, 'tutorial')).toContain('Tutorial / Hack (steps 1-2-3)');
  });
});

describe('buildAdScriptPrompt — UGCPro ASMR register (unboxing only)', () => {
  const asmrInput = (): AdScriptInput => ({
    ...inputWith(),
    businessInfo: { ...businessInfo(), asmrFlag: true },
  });

  it('asmrFlag + unboxing appends the ASMR REGISTER block', () => {
    const out = buildAdScriptPrompt(asmrInput(), undefined, 'unboxing');
    expect(out).toContain('UNBOXING 4-BEAT');
    expect(out).toContain('ASMR REGISTER');
  });

  it('unboxing WITHOUT asmrFlag omits the ASMR REGISTER block', () => {
    const out = buildAdScriptPrompt(inputWith(), undefined, 'unboxing');
    expect(out).not.toContain('ASMR REGISTER');
  });

  it('asmrFlag does NOT leak ASMR REGISTER into the demo skeleton', () => {
    const out = buildAdScriptPrompt(asmrInput(), undefined, 'demo');
    expect(out).toContain('DEMO 5-BEAT');
    expect(out).not.toContain('ASMR REGISTER');
  });
});

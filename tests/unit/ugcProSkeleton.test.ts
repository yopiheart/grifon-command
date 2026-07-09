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

// Slice 4 (B1): non-product verticals reach UGC Pro. `businessInfo.businessType` gates
// the operator/agent VOICE, the SERVICE/REAL-ESTATE skeleton variants, and the
// BOOK-DON'T-SELL CTA guard. Legal combos only (service × {transformation, tutorial},
// realestate × {tutorial}) — the A4 clamp enforces this upstream.
describe('buildAdScriptPrompt — SERVICE variant (businessType:"service")', () => {
  const svcInput = (sub: 'transformation' | 'tutorial'): AdScriptInput => ({
    businessInfo: {
      product: 'SofaFresh Deep Clean',
      audience: 'Metro Manila homeowners',
      benefit: 'A sofa that looks brand new',
      painPoint: 'Years of stains and dust',
      separator: 'Steam + deep-vacuum method',
      features: 'steam clean, deep vacuum, same-day service',
      scriptType: 'UGCPro',
      businessType: 'service',
      ugcProFormat: sub,
    },
    brandName: 'SofaFresh',
    language: 'Taglish',
    offer: 'Free re-clean if unsatisfied',
    chosenAngleBrief: '',
  });

  it('service transformation → operator voice + service skeleton + BOOK-DONT-SELL, never the product creator voice', () => {
    const out = buildAdScriptPrompt(svcInput('transformation'), undefined, 'transformation');
    expect(out).toContain('FIRST-PERSON OPERATOR');
    expect(out).toContain('SERVICE VARIANT');
    expect(out).toContain("BOOK, DON'T SELL");
    expect(out).toContain('derma, aesthetic, dental');
    expect(out).not.toContain('FIRST-PERSON CREATOR');
  });

  it('service transformation header labels the input as a Service', () => {
    const out = buildAdScriptPrompt(svcInput('transformation'), undefined, 'transformation');
    expect(out).toContain('Service: "SofaFresh Deep Clean"');
  });

  it('service tutorial → authority-builder "ganito namin ginagawa" variant', () => {
    const out = buildAdScriptPrompt(svcInput('tutorial'), undefined, 'tutorial');
    expect(out).toContain('ganito namin ginagawa');
    expect(out).toContain("BOOK, DON'T SELL");
  });
});

describe('buildAdScriptPrompt — REAL-ESTATE variant (businessType:"realestate")', () => {
  const reInput = (listingPrice?: string): AdScriptInput => ({
    businessInfo: {
      product: 'Amaia Steps Sucat 2BR',
      audience: 'First-time condo buyers',
      benefit: 'Move-in ready near the city',
      painPoint: 'Confusing terms and hidden fees',
      separator: 'Clean title, transparent terms',
      features: 'clean title, natural light, low assoc dues',
      scriptType: 'UGCPro',
      businessType: 'realestate',
      ugcProFormat: 'tutorial',
      ...(listingPrice ? { listingPrice } : {}),
    },
    brandName: 'Amaia',
    language: 'Taglish',
    offer: 'Free viewing schedule',
    chosenAngleBrief: '',
  });

  it('realestate tutorial → agent voice + agent-authority listicle + Listing header', () => {
    const out = buildAdScriptPrompt(reInput(), undefined, 'tutorial');
    expect(out).toContain('FIRST-PERSON AGENT ON-SITE');
    expect(out).toContain('agent-authority listicle');
    expect(out).toContain('Listing: "Amaia Steps Sucat 2BR"');
    expect(out).not.toContain('FIRST-PERSON CREATOR');
  });

  it('renders the price-GIVEN rule when listingPrice is set', () => {
    const out = buildAdScriptPrompt(reInput('25k/month'), undefined, 'tutorial');
    expect(out).toContain('**PRICE RULE:** A price was given');
    expect(out).not.toContain('**PRICE RULE:** NO price was given');
  });

  it('renders the NO-price INQUIRY-ONLY rule when listingPrice is absent', () => {
    const out = buildAdScriptPrompt(reInput(), undefined, 'tutorial');
    expect(out).toContain('**PRICE RULE:** NO price was given');
    expect(out).not.toContain('**PRICE RULE:** A price was given');
  });
});

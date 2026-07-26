import { describe, it, expect } from 'vitest';
import { buildAdScriptPrompt } from '../../api/_lib/prompts.js';

// The APPEARANCE-CLAIM GUARDRAIL is Meta-policy + PH-FDA exposure, not style. It existed on the
// UGC Pro sub-formats but NOT on the Testimonial branch, and `real_talk` derives
// scriptType 'Testimonial' — so the highest-volume person-facing format shipped unguarded. A live
// run on 2026-07-25 produced "Iba ito, dahil focus ito sa pag-heal…" on a cosmetic: a therapeutic
// claim, generated entirely within the rules as they stood.
//
// These assert the RULE, not the wording, so the prompt can be reworded without breaking them —
// except for the banned terms, which are the specific thing the guardrail has to name to work.

const testimonialInput = (overrides: Record<string, unknown> = {}) =>
  ({
    businessInfo: {
      product: 'Vitamin C Brightening Serum',
      features: 'brightening',
      productImageDescription: 'dropper bottle',
      audience: 'working moms',
      painPoint: 'dark spots',
      benefit: 'confidence',
      separator: '',
      scriptType: 'Testimonial',
      ...(overrides.businessInfo as object),
    },
    brandName: 'Hiraya Glow',
    language: 'Taglish',
    offer: '',
    chosenAngleBrief: '',
    contrarianTruth: '',
  }) as any;

// Written as a table, not one test per branch, so ADDING a person-facing scriptType and
// forgetting its guardrail fails here instead of shipping. That omission is the entire bug
// class: three copies of the guardrail existed and nobody noticed which branches lacked one.
// `marker` is a structure header unique to that branch. Without it these tests could all be
// silently exercising the SAME branch and still pass, which would prove nothing.
const PERSON_FACING = [
  { name: 'Testimonial', scriptType: 'Testimonial', marker: 'TESTIMONIAL STRUCTURE' },
  { name: 'Services', scriptType: 'Services', marker: 'SERVICES TESTIMONIAL 6-BEAT' },
  { name: 'MrBeast (default branch)', scriptType: 'MrBeast', marker: 'MRBEAST STRUCTURE' },
] as const;

describe('adscript — APPEARANCE-CLAIM GUARDRAIL coverage', () => {
  for (const branch of PERSON_FACING) {
    it(`the ${branch.name} branch carries the guardrail`, () => {
      const prompt = buildAdScriptPrompt(
        testimonialInput({ businessInfo: { scriptType: branch.scriptType } }),
      );
      expect(prompt).toContain(branch.marker); // we are really in the branch we think we are
      expect(prompt).toContain('APPEARANCE-CLAIM GUARDRAIL');
      // The Tagalog forms are the whole reason the original ban list failed to catch
      // "nag-heal talaga" — every branch that generates Taglish needs them, not just the first.
      expect(prompt).toContain('nag-heal');
      expect(prompt).toContain('gumaling');
      expect(prompt).toContain('SPEED RULE');
    });
  }

  it('bans therapeutic claims in BOTH languages the branch generates in', () => {
    const prompt = buildAdScriptPrompt(testimonialInput());
    // English list inherited from the UGC Pro blocks…
    for (const banned of ['removes wrinkles', 'cures acne', 'whitens in 7 days']) {
      expect(prompt).toContain(banned);
    }
    // …and the Tagalog forms, without which the ban cannot catch what actually shipped.
    // This branch generates Taglish; an English-only ban list is a ban list with a hole in it.
    for (const banned of ['nag-heal', 'gumaling']) {
      expect(prompt).toContain(banned);
    }
  });

  it('keeps the SPEED RULE, and states it has no visual-convention escape hatch', () => {
    const prompt = buildAdScriptPrompt(testimonialInput());
    expect(prompt).toContain('SPEED RULE');
    // A testimonial is spoken end to end, so the "hard cut is a visual convention" defence
    // that the UGC Pro blocks grant does NOT transfer here.
    expect(prompt).toMatch(/spoken first-person claim/i);
  });

  it('still permits dramatic before/after on objects (guardrail is not a blanket ban)', () => {
    expect(buildAdScriptPrompt(testimonialInput())).toMatch(
      // \s+ so the assertion survives re-wrapping of the prompt's line breaks.
      /Surfaces, fabrics, and objects may show\s+dramatic before\/after freely/,
    );
  });
});

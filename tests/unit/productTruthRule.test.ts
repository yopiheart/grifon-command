import { describe, it, expect } from 'vitest';
import { buildStoryboardPrompt, type StoryboardFlowInput } from '../../api/_lib/prompts.js';
import type { BusinessInfo } from '../../types.js';

// Intent: a frame prompt may name the uploaded product and nothing else. No invented packaging.
//
// The run this pins is apr_fa7cedc3 (2026-08-23, Hiraya Glow, Testimonial). Scene 8 rendered an
// outer package box the business never made. It was read as an image-model hallucination and
// filed as "the image layer has no never-invent rule". The stored storyboard says otherwise —
// scene 8's imagePrompt, verbatim:
//
//   "Still hero product shot of the Hiraya Glow serum bottle positioned next to its outer
//    package box on a clean wooden table surface, front label facing camera, centered
//    composition, ordinary indoor daylight."
//
// The uploaded hero (pulled from the run and looked at, 2026-08-27) is a hand holding one amber
// dropper bottle in a bathroom. No box anywhere in frame. So the image model did not invent the
// box; it obeyed. The invention happened HERE, one layer up.
//
// That also explains why the existing guard could not have caught it: NO_UNSOLICITED_PRODUCT
// (services/geminiService.ts:2368) bans unrequested packaging "unless the Scene Prompt explicitly
// names them" — and the Scene Prompt explicitly named it. A rule added down there would have
// looked right and changed nothing.
//
// The rule therefore lives in STILL_FRAME_RULE, which is shared by every format, and these tests
// pin that placement: a later edit that quietly moves it inside one format's branch reopens the
// hole for every other format.

const businessInfo = (overrides: Partial<BusinessInfo> = {}): BusinessInfo => ({
  product: 'Hiraya Glow Serum',
  audience: 'Filipina shift workers in their twenties',
  benefit: 'Skin that looks fresh even on no sleep',
  painPoint: 'Dull, dry skin from night shifts',
  separator: 'Cleans without bleaching',
  features: 'gentle, non-comedogenic',
  scriptType: 'Testimonial',
  ...overrides,
});

const storyboardInput = (bi: BusinessInfo): StoryboardFlowInput => ({
  script: ['Hindi kailangan pumuti. Linisin lang ang dullness.', 'Ako si Elena.'],
  avatarDescription: 'A Filipina in her twenties',
  businessInfo: bi,
  ethnicity: 'Filipino',
  language: 'Taglish',
});

const promptFor = (scriptType: BusinessInfo['scriptType']) =>
  buildStoryboardPrompt(storyboardInput(businessInfo({ scriptType })));

describe('buildStoryboardPrompt — PRODUCT_TRUTH_RULE', () => {
  it('states that the uploaded photo is the only product that exists', () => {
    const out = promptFor('Testimonial');
    expect(out).toContain('PRODUCT_TRUTH_RULE');
    expect(out).toContain('The uploaded product photo is the ONLY product that exists');
  });

  it('names the packaging forms by hand, because a generic ban does not catch a carton', () => {
    // "do not invent packaging" leaves the model to decide what counts as packaging. The
    // enumeration is the rule; deleting a noun from it reopens that noun.
    const out = promptFor('Testimonial');
    for (const form of ['outer box', 'carton', 'pouch', 'sachet', 'refill', 'gift set', 'sleeve']) {
      expect(out).toContain(form);
    }
  });

  it('bans a quantity the photo does not show, not just an unshown object', () => {
    // The same invention wearing a different hat: one bottle photographed, three rendered.
    const out = promptFor('Testimonial');
    expect(out).toContain('three bottles');
  });

  it('pins the real failure as the WRONG example', () => {
    // Per the sibling hook test: an example teaches harder than a rule. This one is not
    // hypothetical — it is the exact string that shipped a fake box.
    const out = promptFor('Testimonial');
    expect(out).toContain('positioned next to its outer package box');
    expect(out).toContain('the box is invented');
  });

  it('keeps unbranded props legal, so the rule does not collapse into "no props"', () => {
    // Over-correcting here would strip every staging object and flatten product B-roll.
    const out = promptFor('Testimonial');
    expect(out).toContain('an unbranded prop is fine');
    expect(out).toContain('UNBRANDED staging');
  });

  it('refuses to let a format argue its way into inventing inventory', () => {
    // An unboxing format with no box in the upload is the obvious loophole.
    // Whitespace-normalised on purpose: the rule spans a wrapped line, and asserting the raw
    // newline + indentation would redden this on a reflow that changed no behaviour.
    const flat = promptFor('Testimonial').replace(/\s+/g, ' ');
    expect(flat).toContain('a format is not a licence to invent inventory');
  });

  it.each(['Testimonial', 'Services', 'RealEstate', 'UGCPro', 'Temu'] as const)(
    'applies to %s — the rule is format-independent by placement',
    (scriptType) => {
      // STILL_FRAME_RULE is shared. If a future edit moves this block inside one format's
      // branch, every other format silently loses the guard and this row goes red.
      expect(promptFor(scriptType)).toContain('PRODUCT_TRUTH_RULE');
    },
  );
});

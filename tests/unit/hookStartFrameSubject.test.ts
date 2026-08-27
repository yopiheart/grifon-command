import { describe, it, expect } from 'vitest';
import { buildStoryboardPrompt, type StoryboardFlowInput } from '../../api/_lib/prompts.js';
import type { BusinessInfo } from '../../types.js';

// Intent: on the morph-hook formats (real_talk, hype_drop, rapid_fire, pure_hype) the two
// hook stills must be built from the SCRIPT and anchored on the PERFORMER'S OWN BODY.
//
// History this file pins, in order:
//  1. Run apr_23a6657b (2026-07-26) opened on a clay pot. The prompt asked for "a dry, matte,
//     textured surface in a neutral beige tone" — a material and a colour, no subject — so the
//     model rendered an arbitrary matching object on the one beat every viewer sees.
//  2. Run apr_1c8d24ca (2026-08-19) opened on an orange fruit. That was the OLD anchor rule
//     working as written: it derived the anchor colour FROM THE PRODUCT (an amber bottle) and
//     let any similarly-coloured stand-in carry it. A fruit is not the performer, so the morph
//     had to interpolate between two unrelated subjects.
//  3. Neil's call (2026-08-20): the anchor is the performer's own skin, present in BOTH stills
//     by construction. That makes the colour carry on its own AND makes the morph a pull-back
//     on one continuous subject instead of an object swap.
//
// The examples are pinned as a SET of three DIFFERENT products on purpose. An example teaches
// harder than a rule — a single example gets copied verbatim (the coffee-mug example is why
// hooks kept opening on coffee; the cheek example is why they then all opened on skin). Three
// unlike products force the model to copy the STRUCTURE. Deleting any one re-opens the hole.

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

const morphHookPrompt = () => buildStoryboardPrompt(storyboardInput(businessInfo()));

describe('buildStoryboardPrompt — HOOK START-FRAME SUBJECT (morph-hook formats)', () => {
  it('requires a named subject and forbids the material-only phrasing that produced the clay pot', () => {
    const out = morphHookPrompt();
    expect(out).toContain('HOOK START-FRAME SUBJECT');
    expect(out).toContain('Name a concrete subject a viewer recognises in under one second');
    // The exact phrasing that failed live — pinned so the ban stays concrete, not abstract.
    expect(out).toContain('a dry matte textured surface');
  });

  it('anchors both stills on the performer body, not on a colour-matched stand-in', () => {
    const out = morphHookPrompt();
    expect(out).toContain('HOOK ANCHOR RULE');
    expect(out).toContain("The anchor is the PERFORMER'S OWN BODY");
    // The orange-fruit failure, banned by name rather than by principle alone.
    expect(out).toContain('is BANNED -- a fruit, a fabric, a wall, any stand-in');
  });

  it('keeps the product out of the anchor so any product colour still works', () => {
    // The old rule derived the anchor colour FROM THE PRODUCT, which only holds for products
    // whose packaging happens to sit near skin tones. Under the body anchor the product is an
    // addition to the end frame, so a blue box is as valid as an amber bottle.
    const out = morphHookPrompt();
    expect(out).toContain('The product does NOT carry the anchor');
    expect(out).toContain('NEVER recolor, mute, or restyle');
  });

  it('builds both frames from the script line, not from a template', () => {
    const out = morphHookPrompt();
    expect(out).toContain('HOOK FRAMES = THE SCROLL-STOP');
    expect(out).toContain("Build them from Scene 1's own scriptLine");
    expect(out).toContain('read the hook line off these two frames alone');
  });

  it('requires the performer in the end frame, which is what makes the morph a pull-back', () => {
    const out = morphHookPrompt();
    expect(out).toContain('HOOK END-FRAME = THE PERFORMER WITH THE PRODUCT');
    expect(out).toContain('The performer is REQUIRED here, not optional');
  });

  it('still bans a face in the start frame, so the anchor rule is not traded away', () => {
    // A face-to-product morph is the flesh-toned-mush failure the HOOK ANCHOR RULE exists to
    // prevent. Naming the human problem must not become permission to open on a face.
    const out = morphHookPrompt();
    expect(out).toContain('Do NOT name a full face or eyes in the start frame');
  });

  it('keeps the problem area FLAT, which is what stopped it morphing into an object', () => {
    // Run apr_34d06c7f (2026-08-27) rolled the same scene twice and grew the problem patch into
    // an object both times: a cluster of peanuts stuck to the cheek, then a raised glossy
    // blister. Both sat under the caption for roughly half of a 3s hook, and BOTH survived into
    // cuts Neil had already watched. The rule said the start frame is a cropped detail of the
    // performer and the end frame is that performer holding the product; it never said the
    // problem must stay flat, so the model closed the gap by inflating the patch.
    const out = morphHookPrompt();
    expect(out).toContain('The problem the start frame carries is FLAT');
    expect(out).toContain('never an object sitting ON it');
    // The failure modes banned by name, not by principle alone.
    expect(out).toContain('no bumps, blisters, lumps, beads, nodules, or growths');
  });

  it('carries THREE worked examples on three different products', () => {
    const out = morphHookPrompt();
    expect(out).toContain('dull, uneven patch of skin on a cheek');       // skincare
    expect(out).toContain('hand pressed flat against a lower back');      // pain relief
    expect(out).toContain('phone showing a red low-battery bar');         // electronics
    expect(out).toContain('NEVER the subject matter');
  });

  it('does NOT leak into UGC Pro, which has no morph hook at all', () => {
    const out = buildStoryboardPrompt(
      storyboardInput(businessInfo({ scriptType: 'UGCPro', ugcProFormat: 'tryon' })),
    );
    expect(out).not.toContain('HOOK START-FRAME SUBJECT');
    expect(out).not.toContain("The anchor is the PERFORMER'S OWN BODY");
  });

  it('does NOT reach Real Estate, which has no product to hold', () => {
    // Real Estate shares the morph branch but sells a place, not a package. It keeps the
    // pre-2026-08-20 product-reveal wording verbatim; the body anchor would be nonsense there.
    const out = buildStoryboardPrompt(storyboardInput(businessInfo({ scriptType: 'RealEstate' })));
    expect(out).not.toContain("The anchor is the PERFORMER'S OWN BODY");
    expect(out).toContain('HOOK END-FRAME = RESOLVED REVEAL');
  });

  it('does NOT reach Services, which reveals no product in the hook', () => {
    const out = buildStoryboardPrompt(storyboardInput(businessInfo({ scriptType: 'Services' })));
    expect(out).not.toContain("The anchor is the PERFORMER'S OWN BODY");
    expect(out).toContain('HOOK FRAMES (Scene 1, Services)');
  });
});

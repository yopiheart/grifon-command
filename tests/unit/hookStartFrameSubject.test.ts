import { describe, it, expect } from 'vitest';
import { buildStoryboardPrompt, type StoryboardFlowInput } from '../../api/_lib/prompts.js';
import type { BusinessInfo } from '../../types.js';

// Intent: the hook's start frame must name a SUBJECT, not just a material.
//
// Run apr_23a6657b (2026-07-26) opened its ad on a clay pot. The prompt had asked for
// "a dry, matte, textured surface in a neutral beige tone" — a material and a colour, no
// subject — so the model picked an arbitrary object that matched. The ad's first second
// showed something the viewer could not decode.
//
// The rule alone is not the fix. The anchor rule's ONLY worked example was object-led
// (coffee grounds beside a mug), and an example teaches harder than a rule — the same way
// the scarcity ✅ example taught fabrication until c25a9c9 corrected both together. So the
// invariant below is deliberately a PAIR: the person-led example must exist AND the
// object-led one must survive beside it. Deleting either re-opens the hole.

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

describe('buildStoryboardPrompt — HOOK START-FRAME SUBJECT (morph-hook formats)', () => {
  it('requires a named subject and forbids the material-only phrasing that produced the clay pot', () => {
    const out = buildStoryboardPrompt(storyboardInput(businessInfo()));
    expect(out).toContain('HOOK START-FRAME SUBJECT');
    expect(out).toContain('Name a concrete subject a viewer recognises in under one second');
    // The exact phrasing that failed live — pinned so the ban stays concrete, not abstract.
    expect(out).toContain('a dry matte textured surface');
  });

  it('routes the subject by what the hook SAYS, not by ad format', () => {
    const out = buildStoryboardPrompt(storyboardInput(businessInfo()));
    expect(out).toContain('When the script\'s hook names a HUMAN problem or feeling');
    expect(out).toContain('an object subject is correct');
  });

  it('still bans a face in the start frame, so the anchor rule is not traded away', () => {
    // A face-to-product morph is the flesh-toned-mush failure the HOOK ANCHOR RULE exists to
    // prevent. Naming the human problem must not become permission to open on a face.
    const out = buildStoryboardPrompt(storyboardInput(businessInfo()));
    expect(out).toContain('Do NOT name a full face or eyes in the start frame');
    expect(out).toContain('HOOK ANCHOR RULE');
  });

  it('carries BOTH a person-led and an object-led example', () => {
    const out = buildStoryboardPrompt(storyboardInput(businessInfo()));
    expect(out).toContain("close-up of a woman's dull, dry cheek"); // person-led (added)
    expect(out).toContain('burnt-orange ceramic mug');              // object-led (pre-existing)
  });

  it('does NOT leak into UGC Pro, which has no morph hook at all', () => {
    const out = buildStoryboardPrompt(
      storyboardInput(businessInfo({ scriptType: 'UGCPro', ugcProFormat: 'tryon' })),
    );
    expect(out).not.toContain('HOOK START-FRAME SUBJECT');
  });
});

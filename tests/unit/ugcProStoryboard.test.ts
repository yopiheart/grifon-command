import { describe, it, expect } from 'vitest';
import {
  buildStoryboardPrompt,
  hasApplicationVerb,
  type StoryboardFlowInput,
} from '../../api/_lib/prompts.js';
import type { BusinessInfo } from '../../types.js';

// Intent: Slice 2 teaches the storyboard prompt to speak UGC Pro — a continuous
// performance boarded as hard cuts, NOT a metaphor-morph. The deterministic
// application-verb guard (detect + re-roll) is exercised via hasApplicationVerb.

describe('hasApplicationVerb — TRANSFORMATION beat-1 application check', () => {
  it('passes lines with a real application verb', () => {
    expect(hasApplicationVerb('watch this — isang swipe lang')).toBe(true);
    expect(hasApplicationVerb('dalawang spray lang ng X')).toBe(true);
    expect(hasApplicationVerb('I just apply it here')).toBe(true);
  });

  it('fails posed product intros with no application verb', () => {
    expect(hasApplicationVerb('Eto ang serum ko.')).toBe(false);
    expect(hasApplicationVerb('This is the toner.')).toBe(false);
    expect(hasApplicationVerb('Ang ganda niya.')).toBe(false);
  });
});

const businessInfo = (overrides: Partial<BusinessInfo> = {}): BusinessInfo => ({
  product: 'Aurora Activewear Set',
  audience: 'Fashion-forward gym-goers',
  benefit: 'Feel confident in every workout',
  painPoint: 'Leggings that go see-through when you squat',
  separator: 'Squat-proof compression fabric',
  features: 'squat-proof, buttery-soft, high-waist',
  scriptType: 'UGCPro',
  ...overrides,
});

const storyboardInput = (bi: BusinessInfo): StoryboardFlowInput => ({
  script: ['Okay, I had to try this set. Watch this.', 'Obsessed.'],
  avatarDescription: 'A Filipina creator in her twenties',
  businessInfo: bi,
  ethnicity: 'Filipino',
  language: 'Taglish',
});

describe('buildStoryboardPrompt — UGCPro branch', () => {
  it('emits the continuous-performance hard-cut strategy', () => {
    const out = buildStoryboardPrompt(storyboardInput(businessInfo({ ugcProFormat: 'tryon' })));
    expect(out).toContain('CONTINUOUS PERFORMANCE');
    expect(out).toContain('HARD CUTS ONLY');
  });

  it('does NOT leak the morph hook rules (HOOK ANCHOR RULE / HOOK END-FRAME)', () => {
    const out = buildStoryboardPrompt(storyboardInput(businessInfo({ ugcProFormat: 'transformation' })));
    expect(out).not.toContain('HOOK ANCHOR RULE');
    expect(out).not.toContain('HOOK END-FRAME');
  });

  it('does NOT leak the 3-consecutive-avatar ban into UGC Pro', () => {
    const out = buildStoryboardPrompt(storyboardInput(businessInfo({ ugcProFormat: 'tryon' })));
    expect(out).not.toContain('MUST NOT HAVE 3 CONSECUTIVE');
  });

  it("ugcProFormat 'tryon' selects the Try-On beats", () => {
    const out = buildStoryboardPrompt(storyboardInput(businessInfo({ ugcProFormat: 'tryon' })));
    expect(out).toContain('Virtual Try-On');
    expect(out).not.toContain('Before & After');
  });

  it("ugcProFormat 'transformation' selects the Before & After beats", () => {
    const out = buildStoryboardPrompt(storyboardInput(businessInfo({ ugcProFormat: 'transformation' })));
    expect(out).toContain('Before & After');
    expect(out).not.toContain('Virtual Try-On');
  });

  // Regression guard, 2026-08-16. Two consecutive before_after producer runs each rendered a
  // DIFFERENT WOMAN in one scene (run 1 = S1, run 2 = S3) because the skeleton offered
  // referenceImage="none" on exactly those two beats and the model took it. With no avatar
  // reference the scene has no identity anchor, so the before/after proof — the entire point of
  // the format — collapses. The fix forbids "none" on S1 and S3 for PERSON transformations.
  // If this test fails, someone reopened that door; read the run write-up before "fixing" it.
  it("'transformation' FORBIDS referenceImage=none on the person beats (identity lock)", () => {
    const out = buildStoryboardPrompt(storyboardInput(businessInfo({ ugcProFormat: 'transformation' })));
    // The rules wrap across template lines, so match on whitespace-normalised text.
    const flat = out.replace(/\s+/g, ' ');
    expect(flat).toContain('PERSON TRANSFORMATION');
    expect(flat).toContain('IDENTITY RULE');
    // Both person beats name the avatar as mandatory.
    expect(flat).toContain('referenceImage="avatar", MANDATORY');
    // The escape hatch survives ONLY for non-person subjects (surfaces, fabric, objects, spaces).
    expect(flat).toContain('Only a NON-person transformation may use referenceImage="none"');
    // ...and the old opt-out wording that let the model drop the face is gone.
    expect(flat).not.toContain('referenceImage="none" (or "avatar" if the problem is on the person)');
    expect(flat).not.toContain('the change is the only variable. referenceImage="none" (or "avatar")');
  });

  // The storyboard layer is the HIGHER-LEVERAGE half of the expression fix: it writes the
  // imagePrompt text that both the image model and the video-prompt brain then read. Before
  // 2026-08-16 its APPEARANCE_LOCK_RULE actively REQUIRED expression and offered three extreme
  // examples ("brow furrowed", "eyes wide in surprise", "lips parted in confusion") — so the big
  // reactions were not model randomness, they were instructed. See the matching video-layer guard
  // in geminiService.schemas.test.ts.
  it('caps expression in avatar-scene frame prompts instead of demanding it', () => {
    const flat = buildStoryboardPrompt(storyboardInput(businessInfo({ ugcProFormat: 'transformation' })))
      .replace(/\s+/g, ' ');
    expect(flat).toContain('EXPRESSION CEILING');
    expect(flat).toContain('TEETH RULE');
    // The ceiling must outrank the variety instruction, or "make each scene different" gets
    // satisfied by escalating emotion — which is exactly how the live run produced its reactions.
    expect(flat).toContain('OVERRIDES CINEMATIC VARIETY');
    // The three extreme examples are gone from the REQUIRED list and from the CORRECT sample.
    expect(flat).not.toContain('"eyes wide in surprise"');
    expect(flat).not.toContain('"lips parted in confusion"');
    expect(flat).not.toContain('eyes wide in surprise, looking at a smartphone');
  });

  // Neil's call, 2026-08-16, after watching the first finished ad: the hook was a neutral
  // portrait of someone saying she looks tired. Compliant with beat-0 (problem state, no
  // product) and still weak, because the first 3 seconds are decided by the EYE. The tuned
  // script rule already asked for a "visual complaint" and the storyboard had nothing making
  // the FRAME show one. This also supplies the reason for a camera push-in, which was the
  // other thing missing from scene 1.
  it('makes the hook SHOW the flaw rather than only mention it', () => {
    const flat = buildStoryboardPrompt(storyboardInput(businessInfo({ ugcProFormat: 'transformation' })))
      .replace(/\s+/g, ' ');
    expect(flat).toContain('SHOW THE FLAW, DO NOT MERELY MENTION IT');
    expect(flat).toContain('EXTREME CLOSE-UP');
    expect(flat).toContain('INDICATING it');
    expect(flat).toContain('the camera moving IN on it');
    // The pointing hand must not become the next identity problem — a hand across the face
    // starves the lock exactly like the mirror-selfie phone did.
    expect(flat).toContain('must NOT cover the face');
  });

  it("ugcProFormat 'unboxing' selects the Unboxing beats", () => {
    const out = buildStoryboardPrompt(storyboardInput(businessInfo({ ugcProFormat: 'unboxing' })));
    expect(out).toContain('CONTINUOUS PERFORMANCE (Unboxing)');
    expect(out).not.toContain('Before & After');
    expect(out).not.toContain('Virtual Try-On');
  });

  it("ugcProFormat 'demo' selects the Demo / Addiction beats", () => {
    const out = buildStoryboardPrompt(storyboardInput(businessInfo({ ugcProFormat: 'demo' })));
    expect(out).toContain('CONTINUOUS PERFORMANCE (Demo / Addiction)');
    expect(out).not.toContain('Before & After');
  });

  it("ugcProFormat 'tutorial' selects the Tutorial / Hack beats", () => {
    const out = buildStoryboardPrompt(storyboardInput(businessInfo({ ugcProFormat: 'tutorial' })));
    expect(out).toContain('CONTINUOUS PERFORMANCE (Tutorial / Hack)');
    expect(out).not.toContain('Before & After');
  });

  it("an unknown value degrades to Before & After, NOT the generic morph strategy", () => {
    const out = buildStoryboardPrompt(
      storyboardInput(businessInfo({ ugcProFormat: 'bogus' as BusinessInfo['ugcProFormat'] })),
    );
    expect(out).toContain('Before & After');
    expect(out).not.toContain('NARRATIVE RETENTION');
  });

  it('asmrFlag + unboxing appends the ASMR TREATMENT clause; without it, omitted', () => {
    const withAsmr = buildStoryboardPrompt(
      storyboardInput(businessInfo({ ugcProFormat: 'unboxing', asmrFlag: true })),
    );
    expect(withAsmr).toContain('ASMR TREATMENT');
    const withoutAsmr = buildStoryboardPrompt(
      storyboardInput(businessInfo({ ugcProFormat: 'unboxing' })),
    );
    expect(withoutAsmr).not.toContain('ASMR TREATMENT');
  });

  it('regression: a NON-UGCPro scriptType keeps HOOK ANCHOR RULE + the 3-consecutive ban', () => {
    const out = buildStoryboardPrompt(
      storyboardInput(businessInfo({ scriptType: 'MrBeast', ugcProFormat: undefined })),
    );
    expect(out).toContain('HOOK ANCHOR RULE');
    expect(out).toContain('MUST NOT HAVE 3 CONSECUTIVE');
  });
});

describe('buildStoryboardPrompt — UGCPro venueSlotRouting', () => {
  it('opens the product legend + UGC Pro routing clause when servicePhotos are present', () => {
    const bi = businessInfo({
      ugcProFormat: 'tryon',
      servicePhotos: [{ url: 'https://example.com/onbody.jpg', slot: 'onbody' }],
    });
    const out = buildStoryboardPrompt(storyboardInput(bi));
    expect(out).toContain('-> onbody');
    expect(out).toContain('For UGC Pro, the creator IS in nearly every scene');
  });
});

// Slice 4 (B2): the storyboard prompt gains bt-gated non-product UGC Pro arms — the
// SERVICE before/after + tutorial jobsite boards and the REAL-ESTATE property board —
// each grafting the PHILIPPINE GROUND-TRUTH REALISM block and its own slot legend.
describe('buildStoryboardPrompt — non-product UGC Pro arms', () => {
  it('service transformation → ONE OPERATOR, ONE JOBSITE + PH realism + service routing, no product onbody slot', () => {
    const bi = businessInfo({
      businessType: 'service',
      ugcProFormat: 'transformation',
      servicePhotos: [{ url: 'https://example.com/before.jpg', slot: 'before' }],
    });
    const out = buildStoryboardPrompt(storyboardInput(bi));
    expect(out).toContain('ONE OPERATOR, ONE JOBSITE');
    expect(out).toContain('PHILIPPINE GROUND-TRUTH REALISM');
    expect(out).toContain('JOBSITE, the WORK, or the BEFORE/AFTER');
    expect(out).not.toContain('-> onbody');
  });

  it('service tutorial → the Tutorial — SERVICE jobsite board', () => {
    const bi = businessInfo({ businessType: 'service', ugcProFormat: 'tutorial' });
    const out = buildStoryboardPrompt(storyboardInput(bi));
    expect(out).toContain('Tutorial — SERVICE');
    expect(out).toContain('ONE OPERATOR, ONE JOBSITE');
  });

  it('realestate → ONE AGENT, ONE PROPERTY + the facade slot legend', () => {
    const bi = businessInfo({
      businessType: 'realestate',
      ugcProFormat: 'tutorial',
      servicePhotos: [{ url: 'https://example.com/facade.jpg', slot: 'facade' }],
    });
    const out = buildStoryboardPrompt(storyboardInput(bi));
    expect(out).toContain('ONE AGENT, ONE PROPERTY');
    expect(out).toContain('-> facade');
  });

  it('regression: the Services scriptType arm still grafts PHILIPPINE GROUND-TRUTH REALISM', () => {
    const bi = businessInfo({ scriptType: 'Services', ugcProFormat: undefined });
    const out = buildStoryboardPrompt(storyboardInput(bi));
    expect(out).toContain('PHILIPPINE GROUND-TRUTH REALISM');
  });
});

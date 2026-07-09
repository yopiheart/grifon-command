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

import { describe, it, expect } from 'vitest';
import { seedCaptionsEnabled } from '../../utils/asmrSeeds.js';

// Intent (Slice 3, Decision 2): ASMR is audio-led, so the captions toggle DEFAULTS off
// on an ASMR run (subtitles fight the whispered register). An explicit picker value always
// wins; only the unset default flips on the flag. The value stays user-flippable — this
// helper only picks the starting position. Shared by EditVideo + GenerateVideo.
describe('seedCaptionsEnabled', () => {
  it('seeds OFF when asmrFlag is true and no explicit value', () => {
    expect(seedCaptionsEnabled(undefined, true)).toBe(false);
  });

  it("keeps today's default ON when asmrFlag is absent/false", () => {
    expect(seedCaptionsEnabled(undefined, undefined)).toBe(true);
    expect(seedCaptionsEnabled(undefined, false)).toBe(true);
  });

  it('an explicit picker value always wins over the ASMR default', () => {
    expect(seedCaptionsEnabled(true, true)).toBe(true);   // user forced captions on
    expect(seedCaptionsEnabled(false, false)).toBe(false); // VOX-style explicit off
  });
});

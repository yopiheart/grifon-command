import { describe, it, expect } from 'vitest';
import { FILIPINO_LIBRARY } from '../../api/_lib/filipinoLibrary.js';

/**
 * Guards the `gender` field added 2026-08-29 for PRESENTER_VOICE_COHERENCE.
 *
 * Why this exists: Neil picked "Pinay Vlogger" on an AUTO presenter and the run cast a
 * MALE avatar, because the voice picker and the AUTO cast decided gender in two places
 * that never spoke to each other. The fix routes the chosen voice's gender into the
 * cast, which only works while this field is present and CORRECT.
 *
 * The expectation is deliberately NOT derived from `gender` itself — it is read out of
 * the human-written `description` prose ("Female, 30s · ...", "Child, 8-14 · ..."), an
 * independent source of truth. A test that read `gender` and asserted `gender` would
 * pass on every possible value and catch nothing.
 *
 * This is the failure it is here to stop: someone appends a sixth voice, writes a good
 * description, forgets `gender`, and the coherence fix silently stops applying to it —
 * with a green build, because nothing else reads the field at compile time.
 */
describe('FILIPINO_LIBRARY gender metadata', () => {
  /** Reads the gender the human-written description CLAIMS, independent of the field. */
  const genderFromDescription = (description: string): 'male' | 'female' | null => {
    const first = description.split('·')[0].toLowerCase();
    if (first.includes('female')) return 'female';
    if (first.includes('male')) return 'male';
    return null; // "Child, 8-14" and anything else with no stated gender
  };

  it('is not empty (a vacuous pass would make every case below meaningless)', () => {
    expect(FILIPINO_LIBRARY.length).toBeGreaterThan(0);
  });

  it.each(FILIPINO_LIBRARY.map((v) => [v.displayName, v] as const))(
    '%s: gender matches what its description states',
    (_name, voice) => {
      expect(voice.gender ?? null).toBe(genderFromDescription(voice.description));
    },
  );

  it('still carries at least one voice of each gender, so a filtered picker is never empty', () => {
    const genders = FILIPINO_LIBRARY.map((v) => v.gender);
    expect(genders).toContain('male');
    expect(genders).toContain('female');
  });

  it('keeps the genderless case real — the Kid voice must stay unconstrained', () => {
    // Not decoration. The "unknown gender is never filtered out" branch in LaunchScreen
    // exists for this row; if the library ever became all-gendered, that branch would go
    // untested by anything and could rot unnoticed.
    const genderless = FILIPINO_LIBRARY.filter((v) => !v.gender);
    expect(genderless.length).toBeGreaterThan(0);
    for (const v of genderless) {
      expect(genderFromDescription(v.description)).toBeNull();
    }
  });

  it('never lets a description say one gender while the field says the other', () => {
    // The control: this is the mismatch the whole file is guarding, stated directly.
    const mismatched = FILIPINO_LIBRARY.filter((v) => {
      const claimed = genderFromDescription(v.description);
      return claimed !== null && v.gender !== undefined && claimed !== v.gender;
    });
    expect(mismatched.map((v) => v.displayName)).toEqual([]);
  });
});

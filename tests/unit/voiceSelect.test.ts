import { describe, it, expect } from 'vitest';
import { inferAvatarGender, preferGenderVoice } from '../../utils/voiceSelect.js';

describe('inferAvatarGender', () => {
  it('returns the explicit Step 4 pick when Male/Female', () => {
    expect(inferAvatarGender({ gender: 'Female', description: 'A man in a suit' })).toBe('Female');
    expect(inferAvatarGender({ gender: 'Male', description: '' })).toBe('Male');
  });

  it('falls back to the describeImage text when gender is Any or missing', () => {
    expect(inferAvatarGender({ gender: 'Any', description: 'Young woman with long black hair, smiling.' })).toBe('Female');
    expect(inferAvatarGender({ description: 'Middle-aged man with a beard, friendly vibe.' })).toBe('Male');
  });

  it('does not misread "woman" as male (word-boundary check)', () => {
    expect(inferAvatarGender({ description: 'A woman holding a coffee bag' })).toBe('Female');
  });

  it('returns undefined for ambiguous, empty, or null input', () => {
    expect(inferAvatarGender({ description: 'A man and a woman at a market' })).toBeUndefined();
    expect(inferAvatarGender({ gender: 'Any', description: '' })).toBeUndefined();
    expect(inferAvatarGender(null)).toBeUndefined();
    expect(inferAvatarGender(undefined)).toBeUndefined();
  });
});

describe('preferGenderVoice', () => {
  const stock = [
    { voice_id: 'sarah', labels: { gender: 'female' } },
    { voice_id: 'liam', labels: { gender: 'male' } },
  ];
  // Mirrors the FILIPINO_LIBRARY shape: gender lives in the curated description.
  const library = [
    { voice_id: 'pinay-spokesperson', description: 'Female, 30s · Polished brand voiceover' },
    { voice_id: 'pinoy-reviewer', description: 'Male, 30s · Confident testimonial / DR pitch' },
  ];

  it('matches stock voices via labels.gender (case-insensitive)', () => {
    expect(preferGenderVoice(stock, 'Male')?.voice_id).toBe('liam');
    expect(preferGenderVoice(stock, 'Female')?.voice_id).toBe('sarah');
  });

  it('matches library voices via the curated description', () => {
    expect(preferGenderVoice(library, 'Male')?.voice_id).toBe('pinoy-reviewer');
    expect(preferGenderVoice(library, 'Female')?.voice_id).toBe('pinay-spokesperson');
  });

  it('does not match "Male" inside "Female" descriptions', () => {
    const onlyFemale = [{ voice_id: 'f', description: 'Female, 20s · Bubbly creator' }];
    expect(preferGenderVoice(onlyFemale, 'Male')).toBeUndefined();
  });

  it('returns undefined when gender is undefined (caller keeps its default)', () => {
    expect(preferGenderVoice(stock, undefined)).toBeUndefined();
  });

  it('returns undefined when nothing matches', () => {
    expect(preferGenderVoice([{ voice_id: 'kid', description: 'Child, 8–14 · Kids ads' }], 'Female')).toBeUndefined();
  });
});

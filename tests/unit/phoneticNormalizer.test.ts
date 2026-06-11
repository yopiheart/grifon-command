import { describe, it, expect } from 'vitest';
import { normalizeTaglish } from '../../services/phoneticNormalizer.js';

// Locks every TAGLISH_PHONETIC_MAP rule. The map is hand-curated from the
// Gemini video audit (Session M) — a typo'd regex or dropped entry regresses
// TTS cadence silently, so each rule gets its own assertion.
describe('normalizeTaglish', () => {
  it('respells each phonetic map entry', () => {
    expect(normalizeTaglish('I-click')).toBe('Ee-click');
    expect(normalizeTaglish('Bago')).toBe('Bah-goh');
    expect(normalizeTaglish('lang')).toBe('lahng');
    expect(normalizeTaglish('mukha')).toBe('moo-khah');
    expect(normalizeTaglish('mabilisang')).toBe('mah-beh-lee-sahng');
    expect(normalizeTaglish('swabe')).toBe('swah-beh');
  });

  it('matches case-insensitively (replacement casing is fixed)', () => {
    expect(normalizeTaglish('BAGO')).toBe('Bah-goh');
    expect(normalizeTaglish('Swabe')).toBe('swah-beh');
    expect(normalizeTaglish('i-CLICK')).toBe('Ee-click');
  });

  it('respects word boundaries — no substring bleeding', () => {
    expect(normalizeTaglish('langit')).toBe('langit');
    expect(normalizeTaglish('mukhang')).toBe('mukhang');
  });

  it('KNOWN EDGE: hyphen counts as a word boundary, so reduplications are partially respelled', () => {
    // \bBago\b matches the second half of "kabago-bago" because "-" is a
    // non-word character. Locking current behavior; if this ever shows up as
    // a TTS artifact, the fix belongs in TAGLISH_PHONETIC_MAP (Tier 2 /
    // tuned-adjacent — needs approval + a render check, per audit B/D notes).
    expect(normalizeTaglish('kabago-bago')).toBe('kabago-Bah-goh');
  });

  it('replaces all occurrences and survives punctuation boundaries', () => {
    expect(normalizeTaglish('lang lang, lang!')).toBe('lahng lahng, lahng!');
    expect(normalizeTaglish('Bago, swabe.')).toBe('Bah-goh, swah-beh.');
  });

  it('rules do not interfere — one output is never re-eaten by a later rule', () => {
    const sentence = 'Bago ka mag I-click, mukha lang itong swabe.';
    expect(normalizeTaglish(sentence)).toBe(
      'Bah-goh ka mag Ee-click, moo-khah lahng itong swah-beh.'
    );
    // Idempotence: running twice must equal running once (no respelled
    // output matches a map pattern).
    const once = normalizeTaglish(sentence);
    expect(normalizeTaglish(once)).toBe(once);
  });

  it('leaves plain English untouched', () => {
    const english = 'Click the button to get started today.';
    expect(normalizeTaglish(english)).toBe(english);
  });
});

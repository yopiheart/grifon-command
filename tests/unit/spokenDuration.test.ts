import { describe, it, expect } from 'vitest';
import { estimateSpokenSec, SPOKEN_TRIM_PAD_SEC } from '../../utils/spokenDuration.js';

// Encodes the intent: give the final-render trim a deterministic spoken-length
// cap (words / 2.5 + pad) so Veo's filler tail on talking scenes gets cut even
// though it is audible (silencedetect can't catch it).

describe('estimateSpokenSec', () => {
  it('estimates from word count at 2.5 words/sec plus the pad', () => {
    // 10 words → 10/2.5 = 4.0 + 1.0 pad = 5.0
    expect(estimateSpokenSec('one two three four five six seven eight nine ten'))
      .toBeCloseTo(5.0, 3);
  });

  it('applies the conservative pad so a real final word is never clipped', () => {
    // 5 words → 2.0 + pad
    expect(estimateSpokenSec('hindi ka madumi iritado lang')).toBeCloseTo(2.0 + SPOKEN_TRIM_PAD_SEC, 3);
  });

  it('returns 0 for an empty or whitespace-only line (caller treats as no cap)', () => {
    expect(estimateSpokenSec('')).toBe(0);
    expect(estimateSpokenSec('   ')).toBe(0);
  });

  it('collapses irregular whitespace when counting words', () => {
    expect(estimateSpokenSec('  one   two\tthree \n four ')).toBeCloseTo(4 / 2.5 + SPOKEN_TRIM_PAD_SEC, 3);
  });

  it('honors a custom pad', () => {
    expect(estimateSpokenSec('one two three four five', 0)).toBeCloseTo(2.0, 3);
  });
});

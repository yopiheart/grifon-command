import { describe, it, expect } from 'vitest';
import { parseUgcProClassifierResponse } from '../../api/gemini/text.js';

// The UGC Pro classifier returns ONE word (TRYON | TRANSFORMATION). The parser
// uppercase-matches the reply and defaults to 'transformation' on anything else
// (empty, garbage, or a partial). Encodes the wearable→tryon / else→transformation intent.
describe('parseUgcProClassifierResponse', () => {
  it("maps 'TRYON' → tryon", () => {
    expect(parseUgcProClassifierResponse('TRYON')).toBe('tryon');
  });

  it("maps 'TRANSFORMATION' → transformation", () => {
    expect(parseUgcProClassifierResponse('TRANSFORMATION')).toBe('transformation');
  });

  it('is case-insensitive and tolerates surrounding text', () => {
    expect(parseUgcProClassifierResponse('tryon')).toBe('tryon');
    expect(parseUgcProClassifierResponse('  The answer is Tryon.  ')).toBe('tryon');
    expect(parseUgcProClassifierResponse('I choose transformation')).toBe('transformation');
  });

  it("defaults garbage to 'transformation'", () => {
    expect(parseUgcProClassifierResponse('banana')).toBe('transformation');
  });

  it("defaults empty/whitespace to 'transformation'", () => {
    expect(parseUgcProClassifierResponse('')).toBe('transformation');
    expect(parseUgcProClassifierResponse('   ')).toBe('transformation');
  });
});

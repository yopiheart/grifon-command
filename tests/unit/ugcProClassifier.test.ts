import { describe, it, expect } from 'vitest';
import { parseUgcProClassifierResponse } from '../../api/gemini/text.js';
import { UGCPRO_CLASSIFIER_PROMPT } from '../../api/_lib/prompts.js';

// The UGC Pro classifier returns ONE word (TRYON | UNBOXING | DEMO | TRANSFORMATION |
// TUTORIAL). The parser uppercase-matches the reply and defaults to 'transformation' on
// anything else (empty, garbage, or a partial). None of the five keywords is a substring
// of another, so plain includes() checks can't collide.
describe('parseUgcProClassifierResponse', () => {
  it("maps 'TRYON' → tryon", () => {
    expect(parseUgcProClassifierResponse('TRYON')).toBe('tryon');
  });

  it("maps 'UNBOXING' → unboxing", () => {
    expect(parseUgcProClassifierResponse('UNBOXING')).toBe('unboxing');
  });

  it("maps 'DEMO' → demo", () => {
    expect(parseUgcProClassifierResponse('DEMO')).toBe('demo');
  });

  it("maps 'TUTORIAL' → tutorial", () => {
    expect(parseUgcProClassifierResponse('TUTORIAL')).toBe('tutorial');
  });

  it("maps 'TRANSFORMATION' → transformation", () => {
    expect(parseUgcProClassifierResponse('TRANSFORMATION')).toBe('transformation');
  });

  it('is case-insensitive and tolerates surrounding text for all 5 keywords', () => {
    expect(parseUgcProClassifierResponse('tryon')).toBe('tryon');
    expect(parseUgcProClassifierResponse('  The answer is Tryon.  ')).toBe('tryon');
    expect(parseUgcProClassifierResponse('I choose transformation')).toBe('transformation');
    expect(parseUgcProClassifierResponse('this is an Unboxing')).toBe('unboxing');
    expect(parseUgcProClassifierResponse('Demo, clearly')).toBe('demo');
    expect(parseUgcProClassifierResponse('a quick Tutorial')).toBe('tutorial');
  });

  it("defaults garbage to 'transformation'", () => {
    expect(parseUgcProClassifierResponse('banana')).toBe('transformation');
  });

  it("defaults empty/whitespace to 'transformation'", () => {
    expect(parseUgcProClassifierResponse('')).toBe('transformation');
    expect(parseUgcProClassifierResponse('   ')).toBe('transformation');
  });
});

describe('UGCPRO_CLASSIFIER_PROMPT — the 5-format instruction text', () => {
  const prompt = UGCPRO_CLASSIFIER_PROMPT('Aurora Activewear Set', 'squat-proof leggings');

  it('names all five formats and asks for one word', () => {
    for (const fmt of ['TRYON', 'UNBOXING', 'DEMO', 'TRANSFORMATION', 'TUTORIAL']) {
      expect(prompt).toContain(fmt);
    }
    expect(prompt).toContain('Output ONLY one word: TRYON, UNBOXING, DEMO, TRANSFORMATION, or TUTORIAL.');
  });

  it('carries the precedence rules that break format ties', () => {
    expect(prompt).toContain('Precedence rules');
  });
});

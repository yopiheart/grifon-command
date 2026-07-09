import { describe, it, expect, vi } from 'vitest';
import { parseUgcProClassifierResponse, resolveUgcProSubType } from '../../api/gemini/text.js';
import { UGCPRO_CLASSIFIER_PROMPT } from '../../api/_lib/prompts.js';
import type { BusinessInfo } from '../../types.js';

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

// Slice 4 (A4): resolveUgcProSubType clamps the classifier dispatch by businessType
// BEFORE any Gemini call. A spy `ai` lets us assert BOTH which classifier fires and
// whether it fires at all — realestate and honored-explicit picks must never call.
describe('resolveUgcProSubType — businessType classifier clamp', () => {
  const spyAi = (reply: string) => {
    const generateContent = vi.fn(async () => ({ text: reply }));
    return { ai: { models: { generateContent } } as any, generateContent };
  };

  const bi = (over: Partial<BusinessInfo> = {}): BusinessInfo => ({
    product: 'SofaFresh Deep Clean',
    audience: 'Metro Manila homeowners',
    benefit: 'A sofa that looks brand new',
    painPoint: 'Years of stains and dust',
    separator: 'Steam + deep-vacuum method',
    features: 'steam clean, deep vacuum, same-day',
    scriptType: 'UGCPro',
    ...over,
  });

  it("realestate → 'tutorial' and NEVER calls the classifier", async () => {
    const { ai, generateContent } = spyAi('TRANSFORMATION');
    const sub = await resolveUgcProSubType(bi({ businessType: 'realestate' }), ai);
    expect(sub).toBe('tutorial');
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("realestate ignores an (illegal) explicit product pick and still resolves 'tutorial' with no call", async () => {
    const { ai, generateContent } = spyAi('TRANSFORMATION');
    const sub = await resolveUgcProSubType(bi({ businessType: 'realestate', ugcProFormat: 'tryon' }), ai);
    expect(sub).toBe('tutorial');
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("service + explicit 'transformation' is honored with no classifier call", async () => {
    const { ai, generateContent } = spyAi('TUTORIAL');
    const sub = await resolveUgcProSubType(bi({ businessType: 'service', ugcProFormat: 'transformation' }), ai);
    expect(sub).toBe('transformation');
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("service + explicit 'tutorial' is honored with no classifier call", async () => {
    const { ai, generateContent } = spyAi('TRANSFORMATION');
    const sub = await resolveUgcProSubType(bi({ businessType: 'service', ugcProFormat: 'tutorial' }), ai);
    expect(sub).toBe('tutorial');
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('service + Auto (undefined) runs the 2-way SERVICE classifier prompt', async () => {
    const { ai, generateContent } = spyAi('TUTORIAL');
    const sub = await resolveUgcProSubType(bi({ businessType: 'service', ugcProFormat: undefined }), ai);
    expect(sub).toBe('tutorial');
    expect(generateContent).toHaveBeenCalledTimes(1);
    const sent = generateContent.mock.calls[0][0].contents as string;
    expect(sent).toContain('Output ONLY one word: TRANSFORMATION or TUTORIAL');
    // must NOT be the 5-way prompt
    expect(sent).not.toContain('TRYON, UNBOXING, DEMO');
  });

  it("service + illegal explicit 'tryon' falls to the 2-way SERVICE classifier", async () => {
    const { ai, generateContent } = spyAi('TRANSFORMATION');
    const sub = await resolveUgcProSubType(bi({ businessType: 'service', ugcProFormat: 'tryon' }), ai);
    expect(sub).toBe('transformation');
    expect(generateContent).toHaveBeenCalledTimes(1);
    const sent = generateContent.mock.calls[0][0].contents as string;
    expect(sent).toContain('Output ONLY one word: TRANSFORMATION or TUTORIAL');
  });

  it('product + explicit pick honors all 5 with no classifier call', async () => {
    for (const fmt of ['tryon', 'unboxing', 'demo', 'transformation', 'tutorial'] as const) {
      const { ai, generateContent } = spyAi('DEMO');
      const sub = await resolveUgcProSubType(bi({ businessType: 'product', ugcProFormat: fmt }), ai);
      expect(sub).toBe(fmt);
      expect(generateContent).not.toHaveBeenCalled();
    }
  });

  it('product + Auto (undefined) runs the 5-way classifier prompt (unchanged)', async () => {
    const { ai, generateContent } = spyAi('UNBOXING');
    const sub = await resolveUgcProSubType(bi({ businessType: 'product', ugcProFormat: undefined }), ai);
    expect(sub).toBe('unboxing');
    expect(generateContent).toHaveBeenCalledTimes(1);
    const sent = generateContent.mock.calls[0][0].contents as string;
    expect(sent).toContain('Output ONLY one word: TRYON, UNBOXING, DEMO, TRANSFORMATION, or TUTORIAL.');
  });

  it('undefined businessType behaves as product (5-way on Auto)', async () => {
    const { ai, generateContent } = spyAi('TRYON');
    const sub = await resolveUgcProSubType(bi({ businessType: undefined, ugcProFormat: undefined }), ai);
    expect(sub).toBe('tryon');
    expect(generateContent).toHaveBeenCalledTimes(1);
    const sent = generateContent.mock.calls[0][0].contents as string;
    expect(sent).toContain('Output ONLY one word: TRYON, UNBOXING, DEMO, TRANSFORMATION, or TUTORIAL.');
  });
});

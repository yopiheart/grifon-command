import { describe, it, expect, vi, beforeEach } from 'vitest';

// Server-side hook-starvation retry in api/gemini/text.ts FLOW_REGISTRY.adscript
// (issue #59). Gemini stochastically returns empty hook1/hook2 arrays
// (TESTIMONIAL-heavy). The handler regenerates ONCE inside the already-metered
// request (one workflow unit — no double-billing), and if the regeneration
// itself throws it returns the first parsed script rather than discarding it.
//
// The `ai` param is the seam: we pass a fake { models: { generateContent } }.
// buildAdScriptPrompt + parseAdScriptResponse run FOR REAL (real parser path),
// so the assertions ride the true server code, not a re-implementation.
// Testimonial scriptType avoids the Temu classifier branch.

import { FLOW_REGISTRY } from '../../api/gemini/text.js';

const input = {
  businessInfo: {
    product: 'Test Coffee',
    features: 'Premium beans',
    productImageDescription: 'bag',
    scriptType: 'Testimonial',
  },
  brandName: 'TestBrand',
  language: 'Taglish',
  offer: '',
  chosenAngleBrief: '',
  contrarianTruth: '',
} as any;

const healthy = { hook1: ['h1'], hook2: ['h2'], body: ['a', 'b', 'c', 'd', 'e'], strategicAudit: 's' };
const starved = { hook1: [], hook2: [], body: ['a', 'b', 'c', 'd', 'e'], strategicAudit: 's' };

const okText = (payload: unknown) => ({ text: JSON.stringify(payload) });

const makeAi = (generateContent: any) => ({ models: { generateContent } }) as any;

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('FLOW_REGISTRY.adscript hook-starvation retry', () => {
  it('starved first response -> regenerates once and returns the healthy second script', async () => {
    const generateContent = vi
      .fn()
      .mockResolvedValueOnce(okText(starved))
      .mockResolvedValueOnce(okText(healthy));

    const result: any = await FLOW_REGISTRY.adscript(input, makeAi(generateContent));

    expect(result.hook1).toEqual(['h1']);
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('healthy first response -> returned unchanged, single generate call', async () => {
    const generateContent = vi.fn().mockResolvedValueOnce(okText(healthy));

    const result: any = await FLOW_REGISTRY.adscript(input, makeAi(generateContent));

    expect(result.hook1).toEqual(['h1']);
    expect(result.hook2).toEqual(['h2']);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it('starved then regeneration REJECTS -> returns the first starved script, no throw', async () => {
    const generateContent = vi
      .fn()
      .mockResolvedValueOnce(okText(starved))
      .mockRejectedValueOnce(new Error('upstream 500'));

    const result: any = await FLOW_REGISTRY.adscript(input, makeAi(generateContent));

    expect(result.hook1).toEqual([]);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it('starved twice -> returns the second starved result, never a third call', async () => {
    const generateContent = vi
      .fn()
      .mockResolvedValueOnce(okText(starved))
      .mockResolvedValueOnce(okText(starved));

    const result: any = await FLOW_REGISTRY.adscript(input, makeAi(generateContent));

    expect(result.hook1).toEqual([]);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });
});

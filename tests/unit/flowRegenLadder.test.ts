import { describe, it, expect, vi, beforeEach } from 'vitest';

// P1 coerce→regen-once ladder in api/gemini/text.ts (runFlowWithSchema). On a
// schema miss the flow's EXACT request is resent ONCE (verbatim — no repair hint
// on the tuned prompt); a second miss returns { ok:false, issues } which the HTTP
// handler maps to a 422 flow_output_invalid. A first-pass schema pass returns the
// parsed result UNCHANGED (the schema is a gate, not a transformer).
//
// Seam: the flow handler's `ai` param — a fake { models: { generateContent } },
// exactly like geminiText.adscript.test.ts. offer-optimizer is used because it has
// NO internal regens, so call counts isolate the LADDER's single regen.

import { runFlowWithSchema } from '../../api/gemini/text.js';

const offerInput = {
  productName: 'Test', currentPrice: '₱499', targetAudience: 'SMBs',
  marketResearchText: 'ctx', language: 'English',
} as any;

const tier = { name: 'Core', pitch: 'p', actualPrice: '₱1,997' };
const validOffer = {
  analysis: 'a', tripwire: tier, coreOffer: tier, highTicket: tier,
  conversionAssets: { brandName: 'B' }, directorPayload: { offer: 'o' },
};
const unusableOffer = { analysis: 'a', tripwire: tier, coreOffer: tier }; // missing highTicket + directorPayload

const okText = (payload: unknown) => ({ text: JSON.stringify(payload) });
// Unparseable model text → JSON.parse throws a SyntaxError inside the flow parser
// (parseOfferOptimizerResponse). Independent of the schema — this is the parse-throw
// path the ladder must now absorb rather than 502.
const badText = () => ({ text: 'not json at all' });
const makeAi = (generateContent: any) => ({ models: { generateContent } }) as any;

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('runFlowWithSchema — coerce→regen-once ladder', () => {
  it('valid on first pass -> ok:true, single model call, result returned unchanged', async () => {
    const generateContent = vi.fn().mockResolvedValueOnce(okText(validOffer));
    const out = await runFlowWithSchema('offer-optimizer', offerInput, makeAi(generateContent));
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.result).toEqual(validOffer);
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it('unusable then valid -> regenerates once, returns the valid second result', async () => {
    const generateContent = vi
      .fn()
      .mockResolvedValueOnce(okText(unusableOffer))
      .mockResolvedValueOnce(okText(validOffer));
    const out = await runFlowWithSchema('offer-optimizer', offerInput, makeAi(generateContent));
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.result).toEqual(validOffer);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it('unusable twice -> ok:false with issues, never a third call', async () => {
    const generateContent = vi
      .fn()
      .mockResolvedValueOnce(okText(unusableOffer))
      .mockResolvedValueOnce(okText(unusableOffer));
    const out = await runFlowWithSchema('offer-optimizer', offerInput, makeAi(generateContent));
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(Array.isArray(out.issues)).toBe(true);
      expect(out.issues.length).toBeGreaterThan(0);
      // issues are trimmed to path + message only
      expect(out.issues[0]).toHaveProperty('path');
      expect(out.issues[0]).toHaveProperty('message');
    }
    expect(generateContent).toHaveBeenCalledTimes(2);
  });
});

describe('runFlowWithSchema — parse-throw absorbed by the same 2-invocation budget', () => {
  it('SyntaxError once then valid -> ok:true, exactly 2 handler calls', async () => {
    const generateContent = vi
      .fn()
      .mockResolvedValueOnce(badText())
      .mockResolvedValueOnce(okText(validOffer));
    const out = await runFlowWithSchema('offer-optimizer', offerInput, makeAi(generateContent));
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.result).toEqual(validOffer);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it('SyntaxError twice -> rejects, exactly 2 handler calls', async () => {
    const generateContent = vi
      .fn()
      .mockResolvedValueOnce(badText())
      .mockResolvedValueOnce(badText());
    await expect(
      runFlowWithSchema('offer-optimizer', offerInput, makeAi(generateContent))
    ).rejects.toThrow();
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it('SyntaxError then schema-invalid -> ok:false with issues, exactly 2 calls (no third)', async () => {
    const generateContent = vi
      .fn()
      .mockResolvedValueOnce(badText())
      .mockResolvedValueOnce(okText(unusableOffer));
    const out = await runFlowWithSchema('offer-optimizer', offerInput, makeAi(generateContent));
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(Array.isArray(out.issues)).toBe(true);
      expect(out.issues.length).toBeGreaterThan(0);
    }
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it('non-SyntaxError on the first call -> rejects immediately, exactly 1 call (no burn-doubling regen)', async () => {
    const generateContent = vi.fn().mockRejectedValueOnce(new Error('RESOURCE_EXHAUSTED'));
    await expect(
      runFlowWithSchema('offer-optimizer', offerInput, makeAi(generateContent))
    ).rejects.toThrow('RESOURCE_EXHAUSTED');
    expect(generateContent).toHaveBeenCalledTimes(1);
  });
});

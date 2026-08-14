import { describe, it, expect, vi } from 'vitest';
import { cleanJson } from '../../api/_lib/prompts.js';

// Regression net for the grounded-JSON extraction bug found 2026-08-15.
//
// googleSearch grounding is incompatible with responseMimeType:'application/json',
// so both grounded flows (`marketmind` in api/gemini/text.ts and `generatePremiseCheck`
// in services/geminiService.ts) ask for JSON *in the prompt* and extract it with
// cleanJson. Grounded replies routinely open with a citation marker — `Based on search
// results [1], ...` — and the old cleanJson chose object-vs-array by whichever
// delimiter appeared FIRST, so that leading `[` sent it down the array branch, which
// sliced from that `[` to the last `]` and produced unparseable garbage.
//
// Measured impact: premise check returned the empty shell
// {"impliedPremise":"","alternatives":[],"questions":[]} on 1 of 6 runs, on BOTH
// gemini-3.5-flash AND gemini-3.7-flash — which is how we know it was never a model
// defect. marketmind parses with NO try/catch (api/gemini/text.ts:204), so the same
// reply shape throws there instead of degrading.
//
// Expected values below are independent of the implementation: each is the JSON object
// a human can read out of the raw string by eye.

const PAYLOAD = {
  impliedPremise: 'OFW wives ship coffee to save money',
  alternatives: [{ targetRead: 'urban hobbyists', coreReason: 'ritual', rationale: 'grinders' }],
  questions: ['what would change your mind?'],
};
const JSON_TEXT = JSON.stringify(PAYLOAD);

describe('cleanJson — grounded replies with a citation before the JSON', () => {
  // These are the shapes that were BROKEN before the fix.
  const groundedShapes: Array<[string, string]> = [
    ['citation marker first', `Based on search results [1], here is the analysis:\n${JSON_TEXT}`],
    ['bracketed source list first', `Sources: [alpha, beta]\n${JSON_TEXT}`],
    ['multiple citations first', `Per [1] and [2][3], my read:\n\n${JSON_TEXT}`],
    ['citation first, fenced json', `Grounded in [1]:\n\`\`\`json\n${JSON_TEXT}\n\`\`\``],
  ];

  it.each(groundedShapes)('recovers the payload when %s', (_label, raw) => {
    expect(JSON.parse(cleanJson(raw))).toEqual(PAYLOAD);
  });
});

describe('cleanJson — strict widening (shapes that already worked must not change)', () => {
  // The guarantee that makes this change safe to ship into every flow: anything that
  // parsed before returns the byte-identical string now.
  const alreadyWorking: Array<[string, string]> = [
    ['bare object', JSON_TEXT],
    ['fenced object', `\`\`\`json\n${JSON_TEXT}\n\`\`\``],
    ['prose then object (no brackets)', `Here is the analysis:\n${JSON_TEXT}`],
    ['object then trailing citations', `${JSON_TEXT}\n\nSources: [1] example.com`],
  ];

  it.each(alreadyWorking)('%s still yields the same payload', (_label, raw) => {
    expect(JSON.parse(cleanJson(raw))).toEqual(PAYLOAD);
  });

  it('a genuine top-level ARRAY response is still returned as an array', () => {
    const arr = [{ a: 1 }, { b: 2 }];
    expect(JSON.parse(cleanJson(JSON.stringify(arr)))).toEqual(arr);
  });

  it('a genuine array wins over a later object, as before', () => {
    // Array delimiter comes first AND the array parses, so the historical branch is
    // kept — the fallback must not steal this case.
    const raw = '[{"pick":"array"}]';
    expect(JSON.parse(cleanJson(raw))).toEqual([{ pick: 'array' }]);
  });

  it('empty input still yields "{}"', () => {
    expect(cleanJson('')).toBe('{}');
  });

  it('unparseable input is returned rather than throwing', () => {
    expect(() => cleanJson('not json at all')).not.toThrow();
  });
});

// The client keeps its own mirrored copy of cleanJson (services/geminiService.ts).
// It is not exported, so reach it through the exported parser that consumes it —
// that is the real seam the premise-check flow runs through.
vi.mock('../../services/supabaseClient', () => ({
  getSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) },
  }),
}));

describe('parsePremiseCheckResponse — the client mirror of cleanJson', () => {
  it('no longer returns the empty shell for a grounded citation reply', async () => {
    const { parsePremiseCheckResponse } = await import('../../services/geminiService.js');
    const raw = `Based on search results [1], here is the analysis:\n${JSON_TEXT}`;
    const result = parsePremiseCheckResponse(raw);

    // The exact failure signature measured in production, now asserted absent.
    expect(result).not.toEqual({ impliedPremise: '', alternatives: [], questions: [] });
    expect(result.impliedPremise).toBe(PAYLOAD.impliedPremise);
    expect(result.alternatives).toHaveLength(1);
    expect(result.questions).toEqual(PAYLOAD.questions);
  });

  it('still degrades to the empty shell on genuinely unparseable input', async () => {
    const { parsePremiseCheckResponse } = await import('../../services/geminiService.js');
    expect(parsePremiseCheckResponse('the model refused')).toEqual({
      impliedPremise: '',
      alternatives: [],
      questions: [],
    });
  });
});

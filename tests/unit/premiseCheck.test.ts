import { describe, it, expect, vi, beforeEach } from 'vitest';

// What this file catches:
//   1. Parser intent — parsePremiseCheckResponse must defensively coerce a noisy
//      Gemini response into a well-formed PremiseCheckResult: strip markdown
//      fences, cap alternatives (3) and questions (2), drop malformed entries,
//      and never throw on garbage.
//   2. Request intent — generatePremiseCheck must ride the GENERIC legacy
//      passthrough (NOT a crown-jewel flow): no `flow` field, googleSearch
//      grounding ON, and (because grounding is incompatible with JSON mode)
//      NO responseMimeType:'application/json'.

vi.mock('../../services/supabaseClient', () => ({
  getSupabase: () => ({
    auth: {
      getSession: async () => ({ data: { session: { access_token: 'test-token' } } }),
    },
  }),
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

// Legacy passthrough mode: the proxy echoes Gemini's response as `{ text }`.
const okGemini = (text: string) => ({
  ok: true,
  status: 200,
  json: async () => ({ text }),
});

import { parsePremiseCheckResponse, generatePremiseCheck } from '../../services/geminiService.js';

beforeEach(() => {
  fetchMock.mockReset();
});

describe('parsePremiseCheckResponse', () => {
  it('parses a well-formed response', () => {
    const raw = JSON.stringify({
      impliedPremise: 'Assumes budget moms who only care about cheap price.',
      alternatives: [
        { targetRead: 'Busy working moms', coreReason: 'Fear of unsafe online food', rationale: 'Niche reviews cite trust over price' },
        { targetRead: 'OFW families', coreReason: 'Want a taste of home', rationale: 'Common in PH diaspora buying' },
      ],
      questions: ['Is price really the blocker, or is it trust?'],
    });
    const out = parsePremiseCheckResponse(raw);
    expect(out.impliedPremise).toContain('budget moms');
    expect(out.alternatives).toHaveLength(2);
    expect(out.alternatives[0].targetRead).toBe('Busy working moms');
    expect(out.questions).toEqual(['Is price really the blocker, or is it trust?']);
  });

  it('strips markdown code fences', () => {
    const raw = '```json\n{"impliedPremise":"x","alternatives":[],"questions":[]}\n```';
    const out = parsePremiseCheckResponse(raw);
    expect(out.impliedPremise).toBe('x');
  });

  it('caps alternatives at 3 and questions at 2', () => {
    const raw = JSON.stringify({
      impliedPremise: 'p',
      alternatives: Array.from({ length: 6 }, (_, i) => ({ targetRead: `t${i}`, coreReason: `c${i}`, rationale: '' })),
      questions: ['q1', 'q2', 'q3', 'q4'],
    });
    const out = parsePremiseCheckResponse(raw);
    expect(out.alternatives).toHaveLength(3);
    expect(out.questions).toHaveLength(2);
  });

  it('drops malformed alternatives (no targetRead or coreReason)', () => {
    const raw = JSON.stringify({
      impliedPremise: 'p',
      alternatives: [
        { targetRead: 'valid', coreReason: '', rationale: '' },
        { rationale: 'orphan rationale only' },
        { foo: 'bar' },
      ],
      questions: [1, '', 'real question'],
    });
    const out = parsePremiseCheckResponse(raw);
    expect(out.alternatives).toHaveLength(1);
    expect(out.alternatives[0].targetRead).toBe('valid');
    expect(out.questions).toEqual(['real question']);
  });

  it('returns safe defaults on garbage / non-JSON', () => {
    const out = parsePremiseCheckResponse('not json at all');
    expect(out).toEqual({ impliedPremise: '', alternatives: [], questions: [] });
  });
});

describe('generatePremiseCheck request shape', () => {
  it('uses the generic legacy passthrough with googleSearch grounding and no JSON mode', async () => {
    fetchMock.mockResolvedValueOnce(
      okGemini(JSON.stringify({ impliedPremise: 'ok', alternatives: [], questions: [] })),
    );

    const result = await generatePremiseCheck({
      productName: 'Frozen Ulam',
      productDescription: 'Home-cooked frozen viands delivered',
      priceOffer: '₱120',
    });

    expect(result.impliedPremise).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    // NOT a crown-jewel flow — must not leak a `flow` field.
    expect(body.flow).toBeUndefined();
    // Grounding ON.
    expect(body.config?.tools?.[0]?.googleSearch).toBeDefined();
    // Grounding is incompatible with JSON mode — must NOT force responseMimeType.
    expect(body.config?.responseMimeType).toBeUndefined();
  });
});

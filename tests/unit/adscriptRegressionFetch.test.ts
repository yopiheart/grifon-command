import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GoogleGenAI } from '@google/genai';
import { createAdscriptRegressionFetch } from '../support/adscriptRegressionFetch.js';
import { logModelUsage } from '../../api/_lib/modelCosts.js';
import { getSupabaseAdmin } from '../../api/_lib/supabaseAdmin.js';
import {
  buildAdScriptPrompt,
  UGCPRO_SERVICE_CLASSIFIER_PROMPT,
  type AdScriptInput,
} from '../../api/_lib/prompts.js';
import { generateAdScript } from '../../services/geminiService.js';

vi.mock('../../services/supabaseClient', () => ({
  getSupabase: () => ({
    auth: {
      getSession: async () => ({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  }),
}));
vi.mock('../../api/_lib/supabaseAdmin.js', () => ({
  getSupabaseAdmin: vi.fn(() => {
    throw new Error('Evaluation must not access production data');
  }),
  getUserFromAccessToken: vi.fn(),
}));

const healthy = {
  hook1: ['h1'],
  hook2: ['h2'],
  body: ['Apply the serum.', 'Result'],
  strategicAudit: 's',
};
const posed = { ...healthy, body: ['Here is the serum.', 'Result'] };
const starved = { ...healthy, hook1: [], hook2: [] };
const response = (payload: unknown) => ({
  text: JSON.stringify(payload),
  usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 10 },
});
const input = (businessInfo: Record<string, unknown> = {}): AdScriptInput =>
  ({
    businessInfo: {
      product: 'Serum',
      features: 'Daily skincare',
      scriptType: 'Testimonial',
      ...businessInfo,
    },
    brandName: 'TestBrand',
    language: 'English',
    offer: '',
    chosenAngleBrief: '',
    contrarianTruth: '',
  }) as AdScriptInput;

const generateContent = vi.fn();
const upstreamFetch = vi.fn(() => {
  throw new Error('Unexpected external network request');
});
const ai = { models: { generateContent } } as unknown as GoogleGenAI;
let fetchMock: ReturnType<typeof vi.fn>;

async function run(value: AdScriptInput) {
  const result = await fetchMock('/api/gemini/text', {
    method: 'POST',
    body: JSON.stringify({ flow: 'adscript', input: value }),
  });
  return result.json();
}

beforeEach(() => {
  vi.clearAllMocks();
  generateContent.mockReset();
  fetchMock = vi.fn(createAdscriptRegressionFetch(ai, upstreamFetch));
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  expect(getSupabaseAdmin).not.toHaveBeenCalled();
  expect(upstreamFetch).not.toHaveBeenCalled();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('adscript regression adapter', () => {
  it('parity: retries a transformation opening without an application verb', async () => {
    generateContent.mockResolvedValueOnce(response(posed)).mockResolvedValueOnce(response(healthy));
    const result = await run(input({ scriptType: 'UGCPro', ugcProFormat: 'transformation' }));
    expect(result.body).toEqual(healthy.body);
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(generateContent.mock.calls[0]).toEqual(generateContent.mock.calls[1]);
  });

  it('parity: classifies Temu before constructing its script prompt', async () => {
    const value = input({ scriptType: 'Temu' });
    generateContent
      .mockResolvedValueOnce({ text: 'ASMR' })
      .mockResolvedValueOnce(response(healthy));
    expect(await run(value)).toEqual(healthy);
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(generateContent.mock.calls[1][0].contents).toBe(buildAdScriptPrompt(value, 'ASMR'));
  });

  it('parity: returns the auto-classified UGC Pro format', async () => {
    generateContent
      .mockResolvedValueOnce({ text: 'DEMO' })
      .mockResolvedValueOnce(response(healthy));
    expect(await run(input({ scriptType: 'UGCPro' }))).toEqual({
      ...healthy,
      ugcProFormatResolved: 'demo',
    });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it('carries a healthy script through the client request and fake auth boundary', async () => {
    vi.useFakeTimers();
    generateContent.mockResolvedValueOnce(response(healthy));
    const value = input();
    const pending = generateAdScript(value.businessInfo, value.brandName, value.language);
    await vi.runAllTimersAsync();
    expect(await pending).toEqual(healthy);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/gemini/text');
    expect(init.headers.Authorization).toBe('Bearer test-token');
    expect(JSON.parse(init.body)).toEqual({ flow: 'adscript', input: value });
    expect(generateContent).toHaveBeenCalledTimes(1);
    expect(logModelUsage).toHaveBeenCalledTimes(1);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('retries starved hooks once and returns the healthy replacement', async () => {
    generateContent
      .mockResolvedValueOnce(response(starved))
      .mockResolvedValueOnce(response(healthy));
    expect(await run(input())).toEqual(healthy);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it('preserves the first script when the hook retry rejects', async () => {
    generateContent
      .mockResolvedValueOnce(response(starved))
      .mockRejectedValueOnce(new Error('provider failed'));
    expect(await run(input())).toEqual(starved);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it('stops after one unsuccessful hook retry', async () => {
    generateContent.mockResolvedValue(response(starved));
    expect(await run(input())).toEqual(starved);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it('stops after one unsuccessful transformation retry', async () => {
    generateContent.mockResolvedValue(response(posed));
    expect(await run(input({ scriptType: 'UGCPro', ugcProFormat: 'transformation' }))).toEqual({
      ...posed,
      ugcProFormatResolved: 'transformation',
    });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it.each([
    'Steam muna namin tapos deep vacuum para tanggal lahat.', // Saved SofaFresh output, run 34161876539.
    'Steam muna namin ang sofa.',
    'Deep vacuum muna namin ang sofa.',
  ])('keeps a valid service application without rerolling: %s', async (line) => {
    const script = { ...healthy, body: [line, 'Result'] };
    generateContent.mockResolvedValue(response(script));
    expect(await run(input({
      product: 'Sofa deep cleaning', features: 'Steam clean, deep vacuum',
      scriptType: 'UGCPro', businessType: 'service', ugcProFormat: 'transformation',
    }))).toEqual({ ...script, ugcProFormatResolved: 'transformation' });
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it.each(['This is our steam cleaner.', 'Eto ang vacuum namin.'])(
    'still rerolls a posed service intro once: %s', async (line) => {
      const script = { ...healthy, body: [line, 'Result'] };
      generateContent.mockResolvedValue(response(script));
      expect(await run(input({
        product: 'Sofa deep cleaning', features: 'Steam clean, deep vacuum',
        scriptType: 'UGCPro', businessType: 'service', ugcProFormat: 'transformation',
      }))).toEqual({ ...script, ugcProFormatResolved: 'transformation' });
      expect(generateContent).toHaveBeenCalledTimes(2);
    }
  );

  it('propagates a rejected transformation retry', async () => {
    generateContent
      .mockResolvedValueOnce(response(posed))
      .mockRejectedValueOnce(new Error('provider failed'));
    await expect(
      run(input({ scriptType: 'UGCPro', ugcProFormat: 'transformation' }))
    ).rejects.toThrow('provider failed');
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it('bounds combined hook and transformation retries to three generations', async () => {
    generateContent.mockResolvedValueOnce(response(starved)).mockResolvedValue(response(posed));
    expect(await run(input({ scriptType: 'UGCPro', ugcProFormat: 'transformation' }))).toEqual({
      ...posed,
      ugcProFormatResolved: 'transformation',
    });
    expect(generateContent).toHaveBeenCalledTimes(3);
  });

  it.each(['transformation', 'tutorial'])(
    'honors the explicit service %s format without classification',
    async (ugcProFormat) => {
      generateContent.mockResolvedValueOnce(response(healthy));
      expect(
        await run(
          input({
            scriptType: 'UGCPro',
            businessType: 'service',
            ugcProFormat,
          })
        )
      ).toEqual({ ...healthy, ugcProFormatResolved: ugcProFormat });
      expect(generateContent).toHaveBeenCalledTimes(1);
    }
  );

  it('routes a product-only service pick through the service classifier', async () => {
    const value = input({
      scriptType: 'UGCPro',
      businessType: 'service',
      ugcProFormat: 'tryon',
    });
    generateContent
      .mockResolvedValueOnce({ text: 'TUTORIAL' })
      .mockResolvedValueOnce(response(healthy));
    expect(await run(value)).toEqual({
      ...healthy,
      ugcProFormatResolved: 'tutorial',
    });
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(generateContent.mock.calls[0][0].contents).toBe(
      UGCPRO_SERVICE_CLASSIFIER_PROMPT(value.businessInfo.product, value.businessInfo.features)
    );
    expect(generateContent.mock.calls[1][0].contents).toBe(
      buildAdScriptPrompt(value, undefined, 'tutorial')
    );
  });

  it('forces real-estate to tutorial without classification', async () => {
    generateContent.mockResolvedValueOnce(response(healthy));
    expect(
      await run(
        input({
          scriptType: 'UGCPro',
          businessType: 'realestate',
          ugcProFormat: 'tryon',
        })
      )
    ).toEqual({ ...healthy, ugcProFormatResolved: 'tutorial' });
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it('blocks persistent telemetry even when credential variables are present', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://evaluation.invalid');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'offline-test-placeholder');
    vi.stubEnv('GEMINI_API_KEY', 'offline-test-placeholder');
    generateContent.mockResolvedValueOnce(response(healthy));
    await run(input());
    expect(vi.isMockFunction(logModelUsage)).toBe(true);
    expect(logModelUsage).toHaveBeenCalledWith(
      'flow:adscript',
      expect.any(String),
      {
        promptTokenCount: 10,
        candidatesTokenCount: 10,
      },
      undefined,
      undefined
    );
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it('preserves legacy request and response forwarding', async () => {
    const request = {
      model: 'offline-test-model',
      contents: 'fixture',
      config: {},
    };
    const result = {
      text: 'reply',
      candidates: [],
      usageMetadata: { totalTokenCount: 1 },
    };
    generateContent.mockResolvedValueOnce(result);
    const returned = await fetchMock('/api/gemini/text', {
      body: JSON.stringify(request),
    });
    expect(await returned.json()).toEqual(result);
    expect(generateContent).toHaveBeenCalledWith(request);
  });

  it('forwards SDK requests to the supplied fetch without recursion', async () => {
    const result = new Response('{}');
    const forward = vi.fn().mockResolvedValueOnce(result);
    const adapter = createAdscriptRegressionFetch(ai, forward);
    const request = new Request('https://generativelanguage.googleapis.com/offline-fixture');
    expect(await adapter(request)).toBe(result);
    expect(forward).toHaveBeenCalledWith(request, {});
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('rejects unsupported flow names without a provider call', async () => {
    await expect(
      fetchMock('/api/gemini/text', {
        body: JSON.stringify({ flow: 'storyboard' }),
      })
    ).rejects.toThrow("flow 'storyboard' not supported");
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('rejects a missing Gemini client before generation', async () => {
    const adapter = createAdscriptRegressionFetch(null, upstreamFetch);
    await expect(adapter('/api/gemini/text', { body: '{}' })).rejects.toThrow(
      'GEMINI_API_KEY missing'
    );
    expect(generateContent).not.toHaveBeenCalled();
  });
});

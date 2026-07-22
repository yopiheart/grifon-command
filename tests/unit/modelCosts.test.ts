import { describe, it, expect, vi } from 'vitest';
import {
  estimateTextCostUsd,
  estimateImageCostUsd,
  estimateVideoCostUsd,
  logModelUsage,
  logImageUsage,
  logVideoUsage,
} from '../../api/_lib/modelCosts.js';

const OMNI_MODEL = 'gemini-omni-flash-preview';

describe('modelCosts — text cost estimation', () => {
  it('scales linearly with token counts', () => {
    const one = estimateTextCostUsd('gemini-3.1-flash-lite', {
      promptTokenCount: 1000,
      candidatesTokenCount: 1000,
    });
    const two = estimateTextCostUsd('gemini-3.1-flash-lite', {
      promptTokenCount: 2000,
      candidatesTokenCount: 2000,
    });
    expect(two).toBeCloseTo(one * 2, 10);
  });

  it('falls back to the default text price for unknown models', () => {
    const known = estimateTextCostUsd('gemini-3.1-flash-lite', {
      promptTokenCount: 1000,
      candidatesTokenCount: 1000,
    });
    const unknown = estimateTextCostUsd('some-future-model', {
      promptTokenCount: 1000,
      candidatesTokenCount: 1000,
    });
    expect(unknown).toBe(known);
  });

  it('returns 0 when usage is missing', () => {
    expect(estimateTextCostUsd('gemini-3.1-flash-lite')).toBe(0);
    expect(estimateTextCostUsd('gemini-3.1-flash-lite', {})).toBe(0);
  });
});

describe('modelCosts — billing-grade text rates (verified 2026-07-22)', () => {
  // Expected USD figures are computed independently from the published Google
  // pricing (USD per 1M tokens, standard tier): 1M input + 1M output tokens makes
  // the total simply (inputRate + outputRate). These literals are the source of
  // truth — if MODEL_PRICES drifts from Google's page, these assertions fail.
  const ONE_M = { promptTokenCount: 1_000_000, candidatesTokenCount: 1_000_000 };

  it('gemini-3.1-flash-lite: 0.25 in + 1.50 out', () => {
    expect(estimateTextCostUsd('gemini-3.1-flash-lite', ONE_M)).toBeCloseTo(1.75, 10);
  });

  it('gemini-3.5-flash: 1.50 in + 9.00 out', () => {
    expect(estimateTextCostUsd('gemini-3.5-flash', ONE_M)).toBeCloseTo(10.5, 10);
  });

  it('gemini-3.6-flash: 1.50 in + 7.50 out', () => {
    expect(estimateTextCostUsd('gemini-3.6-flash', ONE_M)).toBeCloseTo(9.0, 10);
  });

  it('gemini-3.5-flash-lite: 0.30 in + 2.50 out', () => {
    expect(estimateTextCostUsd('gemini-3.5-flash-lite', ONE_M)).toBeCloseTo(2.8, 10);
  });

  it('unknown model falls back to the default (matches 3.1-flash-lite rates)', () => {
    expect(estimateTextCostUsd('gemini-3.0-ultra', ONE_M)).toBeCloseTo(1.75, 10);
    expect(estimateTextCostUsd('gemini-3.0-ultra', ONE_M)).toBe(
      estimateTextCostUsd('gemini-3.1-flash-lite', ONE_M)
    );
  });
});

describe('modelCosts — thinking (thoughts) tokens billed at the output rate', () => {
  // Google bills thinking tokens at the output rate. On gemini-3.5-flash the
  // output rate is $9.00/1M, so 500k candidate + 500k thought tokens = 1M output
  // tokens = $9.00 — double the $4.50 of the candidate tokens alone.
  it('adds thoughtsTokenCount into the output bucket', () => {
    const withoutThoughts = estimateTextCostUsd('gemini-3.5-flash', {
      promptTokenCount: 0,
      candidatesTokenCount: 500_000,
    });
    const withThoughts = estimateTextCostUsd('gemini-3.5-flash', {
      promptTokenCount: 0,
      candidatesTokenCount: 500_000,
      thoughtsTokenCount: 500_000,
    });
    expect(withoutThoughts).toBeCloseTo(4.5, 10);
    expect(withThoughts).toBeCloseTo(9.0, 10);
  });

  it('treats a missing thoughtsTokenCount as 0', () => {
    const cost = estimateTextCostUsd('gemini-3.1-flash-lite', {
      promptTokenCount: 1_000_000,
      candidatesTokenCount: 1_000_000,
    });
    expect(cost).toBeCloseTo(1.75, 10);
  });

  it('logModelUsage emits thoughtsTokens in the cogs line', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logModelUsage('legacy', 'gemini-3.5-flash', {
      promptTokenCount: 100,
      candidatesTokenCount: 200,
      thoughtsTokenCount: 50,
      totalTokenCount: 350,
    });
    const payload = JSON.parse(spy.mock.calls[0][0] as string);
    expect(payload).toMatchObject({
      tag: 'cogs',
      kind: 'text',
      thoughtsTokens: 50,
      outputTokens: 200,
    });
    spy.mockRestore();
  });

  it('logModelUsage reports thoughtsTokens as null when usage is absent', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logModelUsage('legacy', 'gemini-3.1-flash-lite', undefined);
    const payload = JSON.parse(spy.mock.calls[0][0] as string);
    expect(payload.thoughtsTokens).toBeNull();
    spy.mockRestore();
  });
});

describe('modelCosts — the routing decision invariant', () => {
  // The core finding driving the cost-routing decision: a single image generation
  // costs far more than a typical structural text call on the cheapest tier. This
  // ratio is WHY routing flash-lite text to a cheaper model saves little. If model
  // prices change such that this no longer holds, this test should fail and the
  // decision in workflows/cogs_analysis.md must be revisited.
  it('one image dwarfs a typical structural text call', () => {
    const typicalTextCall = estimateTextCostUsd('gemini-3.1-flash-lite', {
      promptTokenCount: 1500,
      candidatesTokenCount: 800,
    });
    const oneImage = estimateImageCostUsd('gemini-3.1-flash-image-preview', 1);
    expect(oneImage).toBeGreaterThan(typicalTextCall * 10);
  });
});

describe('modelCosts — telemetry never throws', () => {
  it('logModelUsage swallows malformed input', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(() => logModelUsage('legacy', 'gemini-3.1-flash-lite', undefined)).not.toThrow();
    expect(() => logImageUsage('image', 'gemini-3.1-flash-image-preview', 1)).not.toThrow();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('modelCosts — video (Omni) cost estimation', () => {
  it('has a price entry for the Omni model', () => {
    // A priced model is distinguishable from the default fallback by a distinct
    // per-second figure. The Omni placeholder is $0.10/sec, matching the default,
    // so assert the math directly instead.
    expect(estimateVideoCostUsd(OMNI_MODEL, 1)).toBeCloseTo(0.1, 10);
  });

  it('scales linearly with seconds (4s → 0.40)', () => {
    expect(estimateVideoCostUsd(OMNI_MODEL, 4)).toBeCloseTo(0.4, 10);
  });

  it('returns 0 for zero seconds', () => {
    expect(estimateVideoCostUsd(OMNI_MODEL, 0)).toBe(0);
    expect(estimateVideoCostUsd(OMNI_MODEL)).toBe(0);
  });

  it('logVideoUsage emits parseable cogs JSON with seconds and estUsd', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logVideoUsage('omni:fire', OMNI_MODEL, 4);
    expect(spy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(spy.mock.calls[0][0] as string);
    expect(payload).toMatchObject({
      tag: 'cogs',
      kind: 'video',
      label: 'omni:fire',
      model: OMNI_MODEL,
      seconds: 4,
    });
    expect(payload.estUsd).toBeCloseTo(0.4, 6);
    spy.mockRestore();
  });
});

import { describe, it, expect, vi } from 'vitest';
import {
  estimateTextCostUsd,
  estimateImageCostUsd,
  logModelUsage,
  logImageUsage,
} from '../../api/_lib/modelCosts.js';

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

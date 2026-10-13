import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { consolidateVoices } from '../../services/voiceConsolidationService.js';
import { renderFinalVideo, startFinalRender } from '../../services/finalRenderService.js';
import type { FinalRenderRequest } from '../../types.js';

vi.mock('../../services/supabaseClient.js', () => ({ getSupabase: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'fixture-token' } } }) } }) }));
const fetchMock = vi.fn();
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('paid production transport uncertainty', () => {
  it('does not silently drop missing voice results from a successful POST', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    await expect(consolidateVoices([{ sceneIdx: 0, type: 'b-roll', scriptLine: 'Fixture line' }], 'fixture')).rejects.toMatchObject({ generationOutcomeUnknown: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('accepts explicit voice skips and per-scene errors without inventing an uncertain dispatch', async () => {
    const results = [{ sceneIdx: 0, audioUrl: null, skipped: true }, { sceneIdx: 1, audioUrl: null, error: 'daily_quota_reached' }];
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ results }) });
    await expect(consolidateVoices([{ sceneIdx: 0, type: 'b-roll', scriptLine: '' }, { sceneIdx: 1, type: 'b-roll', scriptLine: 'Fixture' }], 'fixture')).resolves.toEqual(results);
  });
  it('keeps a successful final-render poll without its output unresolved', async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ jobId: 'fixture-job' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ done: true, status: 'done' }) });
    const result = renderFinalVideo({} as FinalRenderRequest).catch(error => error);
    await vi.runAllTimersAsync();
    expect(await result).toMatchObject({ generationOutcomeUnknown: true });
    expect(fetchMock.mock.calls.map(call => call[1]?.method ?? 'GET')).toEqual(['POST', 'GET']);
  });
  it('classifies lost voice POST responses so the outer stage cannot replay them', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(consolidateVoices([], 'fixture')).rejects.toMatchObject({ generationOutcomeUnknown: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('classifies ambiguous final-render startup errors', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503, text: async () => 'unknown worker outcome' });
    await expect(startFinalRender({} as FinalRenderRequest)).rejects.toMatchObject({ generationOutcomeUnknown: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('does not allow an outer stage to restart a render because its GET poll failed', async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ jobId: 'fixture-job' }) }).mockRejectedValueOnce(new TypeError('Lost poll response'));
    const result = renderFinalVideo({} as FinalRenderRequest).catch(error => error);
    await vi.runAllTimersAsync();
    expect(await result).toMatchObject({ generationOutcomeUnknown: true });
    expect(fetchMock.mock.calls.map(call => call[1]?.method ?? 'GET')).toEqual(['POST', 'GET']);
  });
});

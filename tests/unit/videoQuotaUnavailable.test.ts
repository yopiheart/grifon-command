import { beforeEach, describe, expect, it, vi } from 'vitest';
const { unavailable, upstream } = vi.hoisted(() => ({ unavailable: { value: true }, upstream: vi.fn() }));
vi.mock('../../api/_lib/supabaseAdmin.js', () => ({ getUserFromAccessToken: async () => ({ id: 'u1' }) }));
vi.mock('../../api/_lib/rateLimit.js', () => ({ rateLimitCheck: async () => true }));
vi.mock('../../api/_lib/userPlan.js', () => ({ getUserPlan: async () => 'business' }));
vi.mock('../../api/_lib/quota.js', () => ({
  meterVideoRequest: async () => ({ ok: false, used: 15, limit: 15, unavailable: unavailable.value }),
  consumeOmniAd: async () => ({ allowed: false, used: 5, limit: 5, unavailable: unavailable.value }),
}));
vi.mock('../../api/_lib/klingAuth.js', () => ({ getKlingAccessToken: () => 'fixture-token', invalidateKlingAccessToken: vi.fn(), KLING_API_BASE: 'https://fixture.invalid' }));
vi.mock('@google/genai', () => ({ GoogleGenAI: class { models = { generateVideos: upstream }; } }));
import veo from '../../api/gemini/video.js';
import kling from '../../api/kling/video.js';
import klingOmni from '../../api/kling/omni-video.js';
import consumeOmni from '../../api/gemini/omni-video/consume.js';

beforeEach(() => { upstream.mockClear(); unavailable.value = true; vi.stubGlobal('fetch', upstream); });
describe.each([
  ['veo', veo, { model: 'fixture-model', prompt: 'fixture', finishedAdId: 'ad-1' }],
  ['kling', kling, { model_name: 'fixture', image: 'fixture', prompt: 'fixture', duration: '5', aspect_ratio: '9:16', finishedAdId: 'ad-1' }],
  ['kling omni', klingOmni, { model_name: 'fixture', image_list: [{ image_url: 'fixture' }], prompt: 'fixture', duration: '5', finishedAdId: 'ad-1' }],
  ['omni consume', consumeOmni, { finishedAdId: 'ad-1', outcomes: [{ sceneIdx: 0, outcome: 'styled' }] }],
] as const)('%s unavailable allowance', (_, handler, body) => {
  it('responds retryable 503 without provider submission or an upgrade wall', async () => {
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() };
    await handler({ method: 'POST', headers: { authorization: 'Bearer fixture' }, body } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'quota_unavailable', detail: 'Allowance is temporarily unavailable. Retry shortly.' });
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '30');
    expect(upstream).not.toHaveBeenCalled();
  });

  it('keeps exhausted allowance as 402', async () => {
    unavailable.value = false;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() };
    await handler({ method: 'POST', headers: { authorization: 'Bearer fixture' }, body } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(402);
    expect(upstream).not.toHaveBeenCalled();
  });
});

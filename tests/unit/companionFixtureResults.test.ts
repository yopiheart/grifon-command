import { describe, expect, it, vi } from 'vitest';
import { createReferenceDraft } from '../../services/companionReferenceDraft.js';
import { confirmSampleReview, createSampleReview } from '../../services/companionReferenceReview.js';
import { createFixtureJobIntent } from '../../services/companionFixtureJobs.js';
import { createCloudFixtureResultClient, fixtureResultMediaPath, validateCloudFixtureResultReceipt } from '../../services/companionFixtureResults.js';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
async function fixture(chat = 'original-chat', linked = true) {
  const inputHash = 'a'.repeat(64), saveId = 'b'.repeat(64);
  const plan = confirmSampleReview(createSampleReview(createReferenceDraft(), inputHash, 0), inputHash, 0);
  const intent = await createFixtureJobIntent(owner, chat, plan, 'normal', linked ? { version: 1, saveId, inputHash } : undefined);
  const receipt = {
    version: 1, fixture: true, runtime: 'supabase-cloud-fixture-result-v1', fixtureVersion: 'v1', manifestId: 'grifon-companion-fixture-video-v1',
    ownerId: owner, ownerChatId: chat, requestId: intent.requestId, jobId: '33333333-3333-4333-8333-333333333333',
    sourceSaveId: saveId, inputHash, intentText: JSON.stringify(intent), status: 'READY', actualCents: 0, createdAt: 10, readyAt: 20,
  };
  return { intent, receipt };
}
const response = (data: unknown) => ({ data, error: null });

describe('durable fixture result client', () => {
  it('reads one shared frozen result with native RPC and derives only the canonical relative media endpoint', async () => {
    const { intent, receipt } = await fixture();
    const rpc = vi.fn().mockResolvedValueOnce(response(receipt)).mockResolvedValueOnce(response([receipt]));
    const client = createCloudFixtureResultClient(owner, rpc);
    expect(client.runtime).toBe('supabase-cloud-fixture-result-v1');
    expect(await client.get(intent)).toEqual(receipt);
    expect(await client.list()).toEqual([receipt]);
    expect(rpc.mock.calls).toEqual([['grifon_fixture_result_get', { p_request_id: intent.requestId }], ['grifon_fixture_result_list', undefined]]);
    expect(fixtureResultMediaPath(await validateCloudFixtureResultReceipt(receipt, owner, intent))).toBe(`/api/fixtures/video?requestId=${intent.requestId}`);
    expect(JSON.stringify(receipt)).not.toMatch(/https?:|blob:|videoUrl|downloadUrl/);
  });

  it('accepts no entitlement yet or a pending entitlement without pretending it is a video', async () => {
    const { intent, receipt } = await fixture();
    const pending = { ...receipt, status: 'PENDING', readyAt: null };
    const client = createCloudFixtureResultClient(owner, vi.fn().mockResolvedValueOnce(response(null)).mockResolvedValueOnce(response(pending)).mockResolvedValueOnce(response(receipt)));
    expect(await client.get(intent)).toBeNull();
    expect(await client.get(intent)).toEqual(pending);
    expect(() => fixtureResultMediaPath(pending as never)).toThrow(/ready|invalid/i);
    expect(await client.get(intent)).toEqual(receipt);
  });

  it('rejects unlinked jobs, other owners and changed reviewed identities before dispatch', async () => {
    const { intent } = await fixture(), unlinked = await fixture('legacy', false), rpc = vi.fn();
    const client = createCloudFixtureResultClient(owner, rpc);
    await expect(client.get({ ...intent, ownerId: other })).rejects.toThrow(/owner|account/i);
    await expect(client.get({ ...intent, ownerChatId: 'changed' })).rejects.toThrow(/identity|review/i);
    await expect(client.get(unlinked.intent)).rejects.toThrow(/linked|saved|cloud/i);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('requires exact receipt keys, frozen links, manifest version and zero spending', async () => {
    const { intent, receipt } = await fixture();
    const missing = { ...receipt } as Record<string, unknown>; delete missing.actualCents;
    const invalids = [missing, { ...receipt, mediaUrl: 'https://unsafe.example/video.mp4' }, { ...receipt, runtime: 'local' },
      { ...receipt, version: 2 }, { ...receipt, fixture: false }, { ...receipt, fixtureVersion: 'v2' }, { ...receipt, manifestId: 'different-manifest' },
      { ...receipt, ownerId: other }, { ...receipt, ownerChatId: 'another-chat' }, { ...receipt, requestId: 'c'.repeat(64) },
      { ...receipt, jobId: '../job' }, { ...receipt, sourceSaveId: 'd'.repeat(64) }, { ...receipt, inputHash: 'e'.repeat(64) },
      { ...receipt, actualCents: 1 }, { ...receipt, status: 'COMPLETE' }, { ...receipt, readyAt: null }, { ...receipt, createdAt: -1 },
      { ...receipt, readyAt: 9 }, { ...receipt, readyAt: 20.5 }, { ...receipt, status: 'PENDING', readyAt: 20 },
      { ...receipt, intentText: '{}' }, { ...receipt, intentText: JSON.stringify({ ...intent, ownerChatId: 'forged' }) },
      { ...receipt, intentText: 'x'.repeat(262145) }];
    for (const value of invalids) await expect(validateCloudFixtureResultReceipt(value, owner, intent)).rejects.toThrow(/invalid|mismatch|owner|account|identity|manifest/i);
    expect(() => fixtureResultMediaPath({ ...receipt, requestId: `${intent.requestId}&ownerId=${other}` } as never)).toThrow(/valid/i);
  });

  it('requires the exact expected reviewed job even when another receipt is otherwise valid', async () => {
    const first = await fixture(), second = await fixture('second-chat');
    await expect(validateCloudFixtureResultReceipt(second.receipt, owner, first.intent)).rejects.toThrow(/identity|mismatch/i);
    expect(await validateCloudFixtureResultReceipt(second.receipt, owner)).toEqual(second.receipt);
  });

  it('preserves monotonic pending/ready identity across get and list', async () => {
    const { intent, receipt } = await fixture(), pending = { ...receipt, status: 'PENDING', readyAt: null };
    const rpc = vi.fn().mockResolvedValueOnce(response(pending)).mockResolvedValueOnce(response([receipt]))
      .mockResolvedValueOnce(response(pending)).mockResolvedValueOnce(response({ ...receipt, readyAt: 21 }))
      .mockResolvedValueOnce(response({ ...receipt, jobId: '44444444-4444-4444-8444-444444444444' }))
      .mockResolvedValueOnce(response(null)).mockResolvedValueOnce(response([])).mockResolvedValueOnce(response(receipt));
    const client = createCloudFixtureResultClient(owner, rpc);
    await client.get(intent); await client.list();
    for (let index = 0; index < 4; index++) await expect(client.get(intent)).rejects.toThrow(/older|conflict|previously|unavailable/i);
    await expect(client.list()).rejects.toThrow(/previously|unavailable|missing/i);
    expect(await client.get(intent)).toEqual(receipt);
  });

  it('keeps an internal immutable observation when callers mutate a returned receipt', async () => {
    const { intent, receipt } = await fixture();
    const rpc = vi.fn().mockImplementation(async () => response(structuredClone(receipt)));
    const client = createCloudFixtureResultClient(owner, rpc), observed = await client.get(intent);
    (observed as unknown as Record<string, unknown>).readyAt = 21;
    expect(await client.get(intent)).toEqual(receipt);
  });

  it('bounds lists and rejects pending/duplicate receipts atomically without poisoning known observations', async () => {
    const { intent, receipt } = await fixture(), second = await fixture('second');
    const invalidLists = [null, Array(101).fill(receipt), [receipt, receipt], [{ ...receipt, status: 'PENDING', readyAt: null }]];
    for (const values of invalidLists) {
      const client = createCloudFixtureResultClient(owner, vi.fn().mockResolvedValue(response(values)));
      await expect(client.list()).rejects.toThrow(/invalid|duplicate|ready|limit/i);
    }
    const rpc = vi.fn().mockResolvedValueOnce(response(receipt))
      .mockResolvedValueOnce(response([second.receipt, { ...receipt, readyAt: 21 }]))
      .mockResolvedValueOnce(response(null)).mockResolvedValueOnce(response(receipt));
    const client = createCloudFixtureResultClient(owner, rpc);
    await client.get(intent);
    await expect(client.list()).rejects.toThrow(/conflict/i);
    expect(await client.get(second.intent)).toBeNull();
    expect(await client.get(intent)).toEqual(receipt);
  });

  it('sanitizes offline and activation errors without leaking remote details', async () => {
    const { intent } = await fixture();
    for (const code of ['PGRST202', '42883', '42501']) {
      const client = createCloudFixtureResultClient(owner, vi.fn().mockResolvedValue({ data: null, error: { code, message: 'private database details' } }));
      await expect(client.get(intent)).rejects.toThrow(/activation/i);
    }
    const offline = createCloudFixtureResultClient(owner, vi.fn().mockRejectedValue(new Error('private network details')));
    await expect(offline.list()).rejects.toThrow(/offline|unreachable/i);
    const error = createCloudFixtureResultClient(owner, vi.fn().mockResolvedValue({ data: null, error: { code: 'other', message: 'private database details' } }));
    await expect(error.list()).rejects.toThrow(/could not confirm/i);
  });
});

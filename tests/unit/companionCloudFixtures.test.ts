import { describe, expect, it, vi } from 'vitest';
import { createReferenceDraft } from '../../services/companionReferenceDraft.js';
import { confirmSampleReview, createSampleReview } from '../../services/companionReferenceReview.js';
import { createReferenceQueue, transitionReferenceQueue } from '../../services/companionReferenceQueue.js';
import { createFixtureJobIntent } from '../../services/companionFixtureJobs.js';
import { createCloudFixtureClient } from '../../services/companionCloudFixtures.js';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
async function fixture() {
  const hash = 'a'.repeat(64);
  const plan = confirmSampleReview(createSampleReview(createReferenceDraft(), hash, 0), hash, 0);
  const intent = await createFixtureJobIntent(owner, 'original-chat', plan);
  const { plan: _, ...queue } = createReferenceQueue(plan, 0, 'normal');
  return { intent, wire: { runtime: 'supabase-cloud-fixture-v1', intentText: JSON.stringify(intent), queue, updatedAt: 1, nextDueAt: null } };
}

describe('cloud fixtures are authenticated, separate, recoverable jobs', () => {
  it('rehydrates frozen plan text and sends only native RPC arguments', async () => {
    const { intent, wire } = await fixture();
    const rpc = vi.fn().mockResolvedValue({ data: wire, error: null });
    const client = createCloudFixtureClient(owner, rpc);
    const job = await client.start(intent);
    expect(job.runtime).toBe('supabase-cloud-fixture-v1');
    expect(job.queue.plan).toEqual(intent.plan);
    expect(rpc).toHaveBeenCalledWith('grifon_fixture_start', { p_intent_text: JSON.stringify(intent), p_identity_text: JSON.stringify([owner, 'original-chat', intent.plan.confirmation!.planSnapshot]) });
    expect(JSON.stringify(rpc.mock.calls)).not.toContain('x-grifon-fixture-user');
  });
  it('reopens server jobs without a browser draft and never starts from reads', async () => {
    const { intent, wire } = await fixture();
    const rpc = vi.fn().mockResolvedValueOnce({ data: [wire], error: null }).mockResolvedValueOnce({ data: wire, error: null });
    const client = createCloudFixtureClient(owner, rpc);
    const jobs = await client.list();
    expect(jobs[0].intent.ownerChatId).toBe('original-chat');
    expect(await client.get(intent)).toEqual(jobs[0]);
    expect(rpc.mock.calls.map(call => call[0])).toEqual(['grifon_fixture_list', 'grifon_fixture_get']);
  });
  it('rejects another owner, local runtime, changed identity and nonzero spend', async () => {
    const { intent, wire } = await fixture();
    const rpc = vi.fn().mockResolvedValue({ data: wire, error: null });
    const client = createCloudFixtureClient(other, rpc);
    await expect(client.start(intent)).rejects.toThrow(/account|owner/i);
    expect(rpc).not.toHaveBeenCalled();
    for (const invalid of [{ ...wire, runtime: 'local' }, { ...wire, intentText: JSON.stringify({ ...intent, ownerChatId: 'changed' }) }, { ...wire, queue: { ...wire.queue, actualCents: 1 } }]) {
      const badClient = createCloudFixtureClient(owner, vi.fn().mockResolvedValue({ data: [invalid], error: null }));
      await expect(badClient.list()).rejects.toThrow(/invalid|mismatch/i);
    }
  });
  it('keeps known status on missing, older and conflicting responses', async () => {
    const { intent, wire } = await fixture();
    const running = transitionReferenceQueue({ ...wire.queue, plan: intent.plan }, 'start', intent.plan, 0);
    const { plan: _, ...runningWire } = running;
    const rpc = vi.fn().mockResolvedValueOnce({ data: { ...wire, queue: runningWire }, error: null })
      .mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: wire, error: null })
      .mockResolvedValueOnce({ data: { ...wire, queue: { ...runningWire, status: 'paused' } }, error: null });
    const client = createCloudFixtureClient(owner, rpc);
    await client.get(intent);
    await expect(client.get(intent)).rejects.toThrow(/previously|unavailable/i);
    await expect(client.get(intent)).rejects.toThrow(/older|conflicting/i);
    await expect(client.get(intent)).rejects.toThrow(/older|conflicting/i);
  });
  it('bounds reads, labels activation errors, and validates commands before dispatch', async () => {
    const { intent, wire } = await fixture();
    const rpc = vi.fn().mockResolvedValueOnce({ data: null, error: { code: 'PGRST202', message: 'secret remote details' } });
    const client = createCloudFixtureClient(owner, rpc);
    await expect(client.list()).rejects.toThrow(/activation/i);
    await expect(client.control(intent, 'retry', null, 'command')).rejects.toThrow(/revision/i);
    expect(rpc).toHaveBeenCalledTimes(1);
    const tooMany = createCloudFixtureClient(owner, vi.fn().mockResolvedValue({ data: Array(101).fill(wire), error: null }));
    await expect(tooMany.list()).rejects.toThrow(/invalid|limit/i);
  });
});

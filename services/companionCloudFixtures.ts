import { getSupabase } from './supabaseClient';
import { fixtureJobIdentityText, isFixtureJobSnapshot, verifyFixtureJobIntent, type FixtureJobAction, type FixtureJobIntent, type FixtureJobSnapshot } from './companionFixtureJobs';

export interface CloudFixtureSnapshot extends FixtureJobSnapshot { runtime: 'supabase-cloud-fixture-v1' }
export interface CloudFixtureClient {
  runtime: 'supabase-cloud-fixture-v1';
  simulation?: boolean;
  start: (intent: FixtureJobIntent) => Promise<CloudFixtureSnapshot>;
  get: (intent: FixtureJobIntent) => Promise<CloudFixtureSnapshot | null>;
  list: () => Promise<CloudFixtureSnapshot[]>;
  control: (intent: FixtureJobIntent, action: FixtureJobAction, expectedRevision: number | null, commandId: string) => Promise<CloudFixtureSnapshot>;
}
export type CloudFixtureRpc = (name: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

// Native Supabase RPC supplies the current session. Owner authorization is enforced by auth.uid() on the server.
export function createCloudFixtureClient(ownerId: string, rpc: CloudFixtureRpc = async (name, args) => getSupabase().rpc(name, args)): CloudFixtureClient {
  const observed = new Map<string, CloudFixtureSnapshot>();
  const ownerIntent = async (intent: FixtureJobIntent) => {
    if (!intent || intent.ownerId !== ownerId) throw new Error('This cloud fixture job has an invalid account or owner.');
    if (!await verifyFixtureJobIntent(intent)) throw new Error('The cloud fixture job has an invalid reviewed-plan identity.');
  };
  const call = async (name: string, args?: Record<string, unknown>) => {
    let result;
    try { result = await rpc(name, args); }
    catch { throw new Error('The cloud fixture service is offline or unreachable. Keep the last confirmed status and refresh when connected.'); }
    if (result.error) {
      if (['PGRST202', '42883', '42501'].includes(result.error.code ?? '')) throw new Error('Cloud fixture activation is required for this signed-in account. No job or spending was authorized.');
      throw new Error('The cloud fixture service could not confirm this request. Refresh status before trying again.');
    }
    return result.data;
  };
  const decode = async (value: unknown, expected?: FixtureJobIntent): Promise<CloudFixtureSnapshot> => {
    if (!record(value) || value.runtime !== 'supabase-cloud-fixture-v1' || typeof value.intentText !== 'string' || value.intentText.length > 262144 || !record(value.queue) || 'plan' in value.queue) throw new Error('The cloud fixture service returned an invalid runtime snapshot.');
    let intent: FixtureJobIntent;
    try { intent = JSON.parse(value.intentText); } catch { throw new Error('The cloud fixture service returned invalid frozen plan text.'); }
    await ownerIntent(intent);
    if (expected && !same(intent, expected)) throw new Error('The cloud fixture service returned a mismatched job identity.');
    const snapshot: unknown = { version: 1, fixture: true, runtime: value.runtime, intent, queue: { ...value.queue, plan: intent.plan }, updatedAt: value.updatedAt, nextDueAt: value.nextDueAt };
    if (!isFixtureJobSnapshot(snapshot, intent)) throw new Error('The cloud fixture service returned an invalid reviewed job snapshot.');
    return snapshot as CloudFixtureSnapshot;
  };
  const accept = (job: CloudFixtureSnapshot) => {
    const previous = observed.get(job.intent.requestId);
    if (previous && (!same(previous.intent, job.intent) || job.queue.id !== previous.queue.id || job.queue.revision < previous.queue.revision || (job.queue.revision === previous.queue.revision && !same(job.queue, previous.queue)))) throw new Error('The cloud fixture service returned an older or conflicting revision.');
    if (previous && ((previous.queue.invalidated && !job.queue.invalidated)
      || (['complete', 'cancelled'].includes(previous.queue.status) && job.queue.status !== previous.queue.status)
      || previous.queue.steps.some((step, index) => job.queue.steps[index].attempts < step.attempts || (step.status === 'succeeded' && job.queue.steps[index].status !== 'succeeded')))) throw new Error('The cloud fixture service returned an older or conflicting progress state.');
    observed.set(job.intent.requestId, job);
    return job;
  };
  return {
    runtime: 'supabase-cloud-fixture-v1',
    start: async intent => {
      await ownerIntent(intent);
      return accept(await decode(await call('grifon_fixture_start', { p_intent_text: JSON.stringify(intent), p_identity_text: fixtureJobIdentityText(intent) }), intent));
    },
    get: async intent => {
      await ownerIntent(intent);
      const value = await call('grifon_fixture_get', { p_request_id: intent.requestId });
      if (value === null) {
        if (observed.has(intent.requestId)) throw new Error('The previously confirmed cloud fixture job is unavailable. Its last confirmed status is kept.');
        return null;
      }
      return accept(await decode(value, intent));
    },
    list: async () => {
      const value = await call('grifon_fixture_list');
      if (!Array.isArray(value) || value.length > 100) throw new Error('The cloud fixture service returned an invalid job list or exceeded its limit.');
      const jobs = await Promise.all(value.map(item => decode(item)));
      if (new Set(jobs.map(job => job.intent.requestId)).size !== jobs.length) throw new Error('The cloud fixture service returned an invalid duplicate job list.');
      return jobs.map(accept);
    },
    control: async (intent, action, expectedRevision, commandId) => {
      await ownerIntent(intent);
      if (!['retry', 'cancel', 'invalidate'].includes(action) || !commandId || commandId.length > 200 || /[\u0000-\u001f]/.test(commandId)) throw new Error('The cloud fixture command is invalid.');
      if (action === 'retry' && (!Number.isSafeInteger(expectedRevision) || (expectedRevision ?? 0) < 1)) throw new Error('Retry requires the last confirmed cloud fixture revision.');
      return accept(await decode(await call('grifon_fixture_command', { p_request_id: intent.requestId, p_action: action, p_command_id: commandId, p_expected_revision: action === 'retry' ? expectedRevision : null }), intent));
    },
  };
}

import { getSupabase } from './supabaseClient.js';
import type { CloudFixtureRpc } from './companionCloudFixtures';
import { FIXTURE_EXECUTION_RUNTIME, validateFixtureExecutionReceipt, type FixtureExecutionCommand, type FixtureExecutionReceipt, type FixtureExecutionStage, type FixtureExecutionState } from './companionExecutionSafety.js';

export interface FixtureExecutionSafetyClient {
  runtime: typeof FIXTURE_EXECUTION_RUNTIME;
  simulation?: boolean;
  find: (runKey: string, inputHash: string) => Promise<FixtureExecutionReceipt | null>;
  get: (receipt: FixtureExecutionReceipt) => Promise<FixtureExecutionReceipt | null>;
  quote: (runKey: string, inputHash: string) => Promise<FixtureExecutionReceipt>;
  reserve: (receipt: FixtureExecutionReceipt, stage: FixtureExecutionStage, submissionKey: string) => Promise<FixtureExecutionReceipt>;
  command: (receipt: FixtureExecutionReceipt, command: Exclude<FixtureExecutionCommand, { action: 'reserve' }>) => Promise<FixtureExecutionReceipt>;
}
const hash = (value: string) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const key = (value: string) => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(value);
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const reachable: Record<FixtureExecutionState, readonly FixtureExecutionState[]> = {
  reserved: ['reserved', 'submitting', 'submitted', 'reconciliation_required', 'succeeded', 'rejected', 'cancelled'],
  submitting: ['submitting', 'submitted', 'reconciliation_required', 'succeeded', 'rejected'],
  submitted: ['submitted', 'reconciliation_required', 'succeeded', 'rejected'],
  reconciliation_required: ['submitted', 'reconciliation_required', 'succeeded', 'rejected'],
  succeeded: ['succeeded'], rejected: ['rejected'], cancelled: ['cancelled'],
};
const sessionOwner = async () => { const { data: { session }, error } = await getSupabase().auth.getSession(); return error ? null : session?.user.id ?? null; };

// Session checks guard the browser view; RPC authorization and accounting remain server-owned.
export function createFixtureExecutionSafetyClient(ownerId: string, rpc: CloudFixtureRpc = async (name, args) => getSupabase().rpc(name, args), currentOwner: () => Promise<string | null> = sessionOwner): FixtureExecutionSafetyClient {
  const observed = new Map<string, FixtureExecutionReceipt>();
  const guard = async () => {
    let active: string | null;
    try { active = await currentOwner(); } catch { throw new Error('Sign in to the account that owns this test budget check.'); }
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(ownerId) || active !== ownerId) throw new Error('Sign in to the account that owns this test budget check.');
  };
  const identity = (runKey: string, inputHash: string) => { if (!hash(runKey) || !hash(inputHash)) throw new Error('The test budget check has an invalid linked job identity.'); };
  const pinned = (receipt: FixtureExecutionReceipt) => { try { validateFixtureExecutionReceipt(receipt, ownerId); } catch { throw new Error('The test budget receipt is invalid. No action can continue.'); } identity(receipt.runKey, receipt.inputHash); return receipt; };
  const call = async (name: string, args: Record<string, unknown>) => {
    await guard();
    let result;
    try { result = await rpc(name, args); }
    catch { throw new Error('The test budget service is unreachable. Refresh its saved state before trying another action.'); }
    await guard();
    if (result.error) {
      if (['PGRST202', '42883', '42501'].includes(result.error.code ?? '')) throw new Error('Test budget activation is unavailable for this signed-in account. No spending was authorized.');
      throw new Error('The test budget action was not confirmed. Refresh its saved state before trying another action.');
    }
    return result.data;
  };
  const decode = (value: unknown, runKey: string, inputHash: string, runId?: string) => {
    let receipt: FixtureExecutionReceipt;
    try { receipt = validateFixtureExecutionReceipt(value, ownerId, runId); } catch { throw new Error('The test budget service returned an invalid receipt. No action can continue.'); }
    if (receipt.runKey !== runKey || receipt.inputHash !== inputHash) throw new Error('The test budget service returned a mismatched linked job identity.');
    const previous = observed.get(runKey);
    if (previous && (receipt.runId !== previous.runId || receipt.inputHash !== previous.inputHash || receipt.issuedAt !== previous.issuedAt || receipt.expiresAt !== previous.expiresAt
      || (previous.cancelled && !receipt.cancelled) || receipt.budget.settledUnits < previous.budget.settledUnits
      || previous.attempts.some(before => { const after = receipt.attempts.find(item => item.submissionKey === before.submissionKey); return !after
        || ['intentText', 'stage', 'ordinal', 'units'].some(field => before[field as keyof typeof before] !== after[field as keyof typeof after])
        || (before.fakeHandle !== null && after.fakeHandle !== before.fakeHandle)
        || !reachable[before.state].includes(after.state)
        || (['succeeded', 'rejected', 'cancelled'].includes(before.state) && !same(before, after)); }))) throw new Error('The test budget service returned an older or conflicting receipt.');
    observed.set(runKey, structuredClone(receipt));
    return structuredClone(receipt);
  };
  const read = async (name: string, args: Record<string, unknown>, runKey: string, inputHash: string, runId?: string) => {
    const value = await call(name, args);
    if (value === null) { if (observed.has(runKey)) throw new Error('The previously confirmed test budget check is unavailable. Keep its last confirmed state.'); return null; }
    return decode(value, runKey, inputHash, runId);
  };
  return {
    runtime: FIXTURE_EXECUTION_RUNTIME,
    find: async (runKey, inputHash) => { identity(runKey, inputHash); return read('grifon_fixture_execution_find', { p_run_key: runKey }, runKey, inputHash); },
    get: async receipt => { pinned(receipt); return read('grifon_fixture_execution_get', { p_run_id: receipt.runId }, receipt.runKey, receipt.inputHash, receipt.runId); },
    quote: async (runKey, inputHash) => { identity(runKey, inputHash); return decode(await call('grifon_fixture_execution_quote', { p_run_key: runKey, p_input_hash: inputHash }), runKey, inputHash); },
    reserve: async (receipt, stage, submissionKey) => {
      pinned(receipt);
      if (!['clip', 'voice', 'assemble'].includes(stage) || !key(submissionKey)) throw new Error('The test budget reservation is invalid.');
      return decode(await call('grifon_fixture_execution_reserve', { p_run_id: receipt.runId, p_stage: stage, p_submission_key: submissionKey }), receipt.runKey, receipt.inputHash, receipt.runId);
    },
    command: async (receipt, command) => {
      pinned(receipt);
      if (!command || typeof command !== 'object') throw new Error('The test budget command is invalid.');
      if (command.action === 'cancel') {
        if (Object.keys(command).length !== 1) throw new Error('The test budget command is invalid.');
        return decode(await call('grifon_fixture_execution_cancel', { p_run_id: receipt.runId }), receipt.runKey, receipt.inputHash, receipt.runId);
      }
      if (!['begin', 'accept', 'unknown', 'stale', 'recover', 'succeed', 'reject'].includes(command.action) || !key(command.submissionKey)
        || Object.keys(command).some(field => !['action', 'submissionKey', 'fakeHandle', 'evidenceKey'].includes(field))) throw new Error('The test budget command is invalid.');
      const handle = command.fakeHandle ?? null, evidence = command.evidenceKey ?? null;
      if ((['accept', 'recover', 'succeed'].includes(command.action) ? handle !== `fixture:${command.submissionKey}` : handle !== null)
        || (command.action === 'succeed' ? evidence !== `fake-success:${command.submissionKey}` : command.action === 'reject' ? evidence !== `fake-reject:${command.submissionKey}` : evidence !== null)) throw new Error('The test budget evidence is invalid.');
      return decode(await call('grifon_fixture_execution_command', { p_run_id: receipt.runId, p_submission_key: command.submissionKey, p_action: command.action, p_fake_handle: handle, p_evidence_key: evidence }), receipt.runKey, receipt.inputHash, receipt.runId);
    },
  };
}

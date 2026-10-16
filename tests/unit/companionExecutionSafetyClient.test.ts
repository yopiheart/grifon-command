import { describe, expect, it, vi } from 'vitest';
import { createFixtureExecutionSafetyClient } from '../../services/companionExecutionSafetyClient.js';
import { FIXTURE_EXECUTION_POLICY, FIXTURE_EXECUTION_RUNTIME, reduceFixtureExecution, type FixtureExecutionReceipt } from '../../services/companionExecutionSafety.js';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '33333333-3333-4333-8333-333333333333';
const runId = '22222222-2222-4222-8222-222222222222';
const runKey = 'b'.repeat(64), inputHash = 'a'.repeat(64);
const receipt = (): FixtureExecutionReceipt => ({ version: 1, runtime: FIXTURE_EXECUTION_RUNTIME, fixture: true, actualCents: 0, currency: 'TEST_UNIT', ownerId: owner, runId, runKey, inputHash, cancelled: false, issuedAt: 10_000, expiresAt: 610_000, budget: { capUnits: 120, heldUnits: 0, settledUnits: 0 }, stages: structuredClone(FIXTURE_EXECUTION_POLICY.stages), attempts: [] });

describe('signed-in fixture execution safety client', () => {
  it('finds and reopens an existing run read-only, including absence without creating a quote', async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: null, error: null }).mockResolvedValue({ data: receipt(), error: null });
    const client = createFixtureExecutionSafetyClient(owner, rpc, async () => owner);
    expect(await client.find(runKey, inputHash)).toBeNull();
    const found = await client.find(runKey, inputHash);
    expect(await client.get(found!)).toEqual(receipt());
    expect(rpc.mock.calls.map(call => call[0])).toEqual(['grifon_fixture_execution_find', 'grifon_fixture_execution_find', 'grifon_fixture_execution_get']);
  });

  it('blocks absent/wrong sessions before RPC and discards account changes while a read is pending', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: receipt(), error: null });
    for (const current of [null, other]) {
      const client = createFixtureExecutionSafetyClient(owner, rpc, async () => current);
      await expect(client.quote(runKey, inputHash)).rejects.toThrow(/account|sign in/i);
    }
    expect(rpc).not.toHaveBeenCalled();
    let current: string | null = owner;
    rpc.mockImplementation(async () => { current = other; return { data: receipt(), error: null }; });
    await expect(createFixtureExecutionSafetyClient(owner, rpc, async () => current).find(runKey, inputHash)).rejects.toThrow(/account|sign in/i);
  });

  it('rejects mismatched owner/run/hash, malformed policy and paid extensions', async () => {
    for (const changed of [{ ownerId: other }, { runKey: 'c'.repeat(64) }, { inputHash: 'd'.repeat(64) }, { actualCents: 1 }, { currency: 'PHP' }, { provider: 'live' }, { budget: { capUnits: 121, heldUnits: 0, settledUnits: 0 } }]) {
      const rpc = vi.fn().mockResolvedValue({ data: { ...receipt(), ...changed }, error: null });
      await expect(createFixtureExecutionSafetyClient(owner, rpc, async () => owner).find(runKey, inputHash)).rejects.toThrow(/invalid|mismatch/i);
    }
    const rpc = vi.fn().mockResolvedValue({ data: { ...receipt(), runId: other }, error: null });
    await expect(createFixtureExecutionSafetyClient(owner, rpc, async () => owner).get(receipt())).rejects.toThrow(/invalid|mismatch/i);
  });

  it('holds unknown work through cancellation, reconciles fixed fake evidence and settles only once', async () => {
    let wire = receipt();
    const rpc = vi.fn(async (name: string, args?: Record<string, unknown>) => {
      if (name.endsWith('_reserve')) wire = reduceFixtureExecution(wire, { action: 'reserve', stage: args!.p_stage as 'clip', submissionKey: args!.p_submission_key as string }, 10_000);
      if (name.endsWith('_cancel')) wire = reduceFixtureExecution(wire, { action: 'cancel' }, 10_000);
      if (name.endsWith('_command')) wire = reduceFixtureExecution(wire, { action: args!.p_action as 'begin', submissionKey: args!.p_submission_key as string, fakeHandle: args!.p_fake_handle as string | null, evidenceKey: args!.p_evidence_key as string | null }, 10_000);
      return { data: structuredClone(wire), error: null };
    });
    const client = createFixtureExecutionSafetyClient(owner, rpc, async () => owner);
    let run = await client.quote(runKey, inputHash);
    run = await client.reserve(run, 'clip', 'stable-clip');
    run = await client.command(run, { action: 'begin', submissionKey: 'stable-clip' });
    run = await client.command(run, { action: 'unknown', submissionKey: 'stable-clip' });
    run = await client.command(run, { action: 'cancel' });
    expect(run.budget.heldUnits).toBe(12);
    run = await client.command(run, { action: 'recover', submissionKey: 'stable-clip', fakeHandle: 'fixture:stable-clip' });
    run = await client.command(run, { action: 'succeed', submissionKey: 'stable-clip', fakeHandle: 'fixture:stable-clip', evidenceKey: 'fake-success:stable-clip' });
    run = await client.command(run, { action: 'succeed', submissionKey: 'stable-clip', fakeHandle: 'fixture:stable-clip', evidenceKey: 'fake-success:stable-clip' });
    expect(run.budget).toEqual({ capUnits: 120, heldUnits: 0, settledUnits: 12 });
    expect(rpc.mock.calls.every(call => !Object.keys(call[1] ?? {}).includes('ownerId'))).toBe(true);
    const before = rpc.mock.calls.length;
    await expect(client.command(run, { action: 'accept', submissionKey: 'stable-clip', fakeHandle: 'https://provider/job' })).rejects.toThrow(/invalid/i);
    expect(rpc).toHaveBeenCalledTimes(before);
  });

  it('rejects missing previously observed runs, rolled-back terminals and sanitized RPC failures', async () => {
    let run = receipt();
    for (const command of [{ action: 'reserve', stage: 'clip', submissionKey: 'clip' }, { action: 'begin', submissionKey: 'clip' }, { action: 'accept', submissionKey: 'clip', fakeHandle: 'fixture:clip' }, { action: 'succeed', submissionKey: 'clip', fakeHandle: 'fixture:clip', evidenceKey: 'fake-success:clip' }] as const) run = reduceFixtureExecution(run, command, 10_000);
    const rpc = vi.fn().mockResolvedValueOnce({ data: run, error: null }).mockResolvedValueOnce({ data: receipt(), error: null }).mockResolvedValueOnce({ data: null, error: null });
    const client = createFixtureExecutionSafetyClient(owner, rpc, async () => owner);
    await client.find(runKey, inputHash);
    await expect(client.find(runKey, inputHash)).rejects.toThrow(/older|conflict/i);
    await expect(client.find(runKey, inputHash)).rejects.toThrow(/unavailable/i);
    for (const response of [{ data: null, error: { code: '42501', message: 'sensitive internal detail' } }, { data: null, error: { code: '55000', message: 'sensitive internal detail' } }]) {
      const bad = createFixtureExecutionSafetyClient(owner, vi.fn().mockResolvedValue(response), async () => owner);
      await expect(bad.find(runKey, inputHash)).rejects.not.toThrow('sensitive internal detail');
    }
  });

  it('preserves known submission handles and refuses progress rollback while allowing reconciliation recovery', async () => {
    const reserved = reduceFixtureExecution(receipt(), { action: 'reserve', stage: 'clip', submissionKey: 'clip' }, 10_000);
    const submitting = reduceFixtureExecution(reserved, { action: 'begin', submissionKey: 'clip' }, 10_000);
    const submitted = reduceFixtureExecution(submitting, { action: 'accept', submissionKey: 'clip', fakeHandle: 'fixture:clip' }, 10_000);
    const unknownBeforeAccept = reduceFixtureExecution(submitting, { action: 'unknown', submissionKey: 'clip' }, 10_000);
    for (const stale of [reserved, submitting, unknownBeforeAccept]) {
      const rpc = vi.fn().mockResolvedValueOnce({ data: submitted, error: null }).mockResolvedValueOnce({ data: stale, error: null });
      const client = createFixtureExecutionSafetyClient(owner, rpc, async () => owner);
      await client.find(runKey, inputHash);
      await expect(client.find(runKey, inputHash)).rejects.toThrow(/older|conflict/i);
    }
    const cancelledReservation = reduceFixtureExecution(reserved, { action: 'cancel' }, 10_000);
    for (const before of [submitting, unknownBeforeAccept]) {
      const rpc = vi.fn().mockResolvedValueOnce({ data: before, error: null }).mockResolvedValueOnce({ data: cancelledReservation, error: null });
      const client = createFixtureExecutionSafetyClient(owner, rpc, async () => owner);
      await client.find(runKey, inputHash);
      await expect(client.find(runKey, inputHash)).rejects.toThrow(/older|conflict/i);
    }
    const unknown = reduceFixtureExecution(submitted, { action: 'unknown', submissionKey: 'clip' }, 10_000);
    const recovered = reduceFixtureExecution(unknown, { action: 'recover', submissionKey: 'clip', fakeHandle: 'fixture:clip' }, 10_000);
    const rpc = vi.fn().mockResolvedValueOnce({ data: submitted, error: null }).mockResolvedValueOnce({ data: unknown, error: null }).mockResolvedValueOnce({ data: recovered, error: null });
    const client = createFixtureExecutionSafetyClient(owner, rpc, async () => owner);
    await client.find(runKey, inputHash); await client.find(runKey, inputHash);
    expect(await client.find(runKey, inputHash)).toEqual(recovered);
  });
});

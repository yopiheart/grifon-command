import { describe, expect, it } from 'vitest';
import { FIXTURE_EXECUTION_POLICY, FIXTURE_EXECUTION_RUNTIME, reduceFixtureExecution, validateFixtureExecutionReceipt, type FixtureExecutionReceipt } from '../../services/companionExecutionSafety.js';

const owner = '11111111-1111-4111-8111-111111111111';
const runId = '22222222-2222-4222-8222-222222222222';
const now = 10_000;
const receipt = (): FixtureExecutionReceipt => ({ version: 1, runtime: FIXTURE_EXECUTION_RUNTIME, fixture: true, actualCents: 0, currency: 'TEST_UNIT', ownerId: owner, runId, runKey: 'fixture-run', inputHash: 'a'.repeat(64), cancelled: false, issuedAt: now, expiresAt: now + FIXTURE_EXECUTION_POLICY.quoteLifetimeMs, budget: { capUnits: 120, heldUnits: 0, settledUnits: 0 }, stages: structuredClone(FIXTURE_EXECUTION_POLICY.stages), attempts: [] });
const reserved = () => reduceFixtureExecution(receipt(), { action: 'reserve', submissionKey: 'clip', stage: 'clip' }, now);

describe('fixture execution safety protocol', () => {
  it('requires a pinned owner/run, fixed policy, zero paid amount and no unknown live extensions', () => {
    const run = receipt(); expect(validateFixtureExecutionReceipt(run, owner, runId)).toBe(run);
    expect(() => validateFixtureExecutionReceipt(run, runId)).toThrow('INVALID_FIXTURE_EXECUTION_RECEIPT');
    expect(() => validateFixtureExecutionReceipt(run, owner, owner)).toThrow('INVALID_FIXTURE_EXECUTION_RECEIPT');
    for (const changes of [{ runtime: 'paid-v1' }, { fixture: false }, { actualCents: 1 }, { currency: 'PHP' }, { provider: 'live' }, { runKey: '../unsafe' }, { expiresAt: run.expiresAt + 1 }, { issuedAt: NaN }, { expiresAt: Infinity }, { inputHash: 'b'.repeat(63) }]) expect(() => validateFixtureExecutionReceipt({ ...run, ...changes }, owner)).toThrow('INVALID_FIXTURE_EXECUTION_RECEIPT');
  });

  it('rejects fabricated allocations, over-cap budgets, negative amounts and local holds omitted from shared accounting', () => {
    const run = reserved();
    for (const budget of [{ capUnits: 121, heldUnits: 12, settledUnits: 0 }, { capUnits: 120, heldUnits: 120, settledUnits: 1 }, { capUnits: 120, heldUnits: -1, settledUnits: 0 }, { capUnits: 120, heldUnits: 0, settledUnits: 0 }, { capUnits: 120, heldUnits: 12, settledUnits: 0, credit: 999 }]) expect(() => validateFixtureExecutionReceipt({ ...run, budget }, owner)).toThrow('INVALID_FIXTURE_EXECUTION_RECEIPT');
    expect(() => validateFixtureExecutionReceipt({ ...run, stages: { ...run.stages, clip: { unitsPerAttempt: 0, maxAttempts: 100 } } }, owner)).toThrow('INVALID_FIXTURE_EXECUTION_RECEIPT');
  });

  it('pins the exact frozen intent, ordinal, fake handle and terminal evidence', () => {
    const run = reserved(), attempt = run.attempts[0];
    for (const changes of [{ intentText: '[]' }, { ordinal: 0 }, { ordinal: 2 }, { units: 0 }, { fakeHandle: 'https://provider/job' }, { fakeHandle: 'fixture:clip' }, { evidenceKey: 'fake-success:clip' }, { state: 'succeeded', fakeHandle: 'fixture:clip', evidenceKey: null }, { state: 'rejected', evidenceKey: null }, { state: 'submitted', fakeHandle: null }, { state: 'cancelled' }, { stage: '__proto__' }, { state: 'refunded' }]) expect(() => validateFixtureExecutionReceipt({ ...run, attempts: [{ ...attempt, ...changes }] }, owner)).toThrow('INVALID_FIXTURE_EXECUTION_RECEIPT');
    expect(() => validateFixtureExecutionReceipt({ ...run, attempts: [attempt, attempt] }, owner)).toThrow('INVALID_FIXTURE_EXECUTION_RECEIPT');
    expect(() => validateFixtureExecutionReceipt({ ...run, cancelled: true }, owner)).toThrow('INVALID_FIXTURE_EXECUTION_RECEIPT');
  });

  it('makes unknown submissions hold their allowance and prohibits stale timer resubmission', () => {
    const run = reserved(), submitting = reduceFixtureExecution(run, { action: 'begin', submissionKey: 'clip' }, now);
    const unknown = reduceFixtureExecution(submitting, { action: 'unknown', submissionKey: 'clip' }, now);
    expect(unknown.budget).toEqual(run.budget);
    expect(reduceFixtureExecution(unknown, { action: 'stale', submissionKey: 'clip' }, now)).toEqual(unknown);
    expect(() => reduceFixtureExecution(unknown, { action: 'begin', submissionKey: 'clip' }, now)).toThrow('EXECUTION_TRANSITION_REJECTED');
    expect(() => reduceFixtureExecution(unknown, { action: 'reserve', submissionKey: 'repair', stage: 'clip' }, now)).toThrow('EXECUTION_STAGE_UNRESOLVED');
    expect(() => reduceFixtureExecution(unknown, { action: 'succeed', submissionKey: 'clip', fakeHandle: 'fixture:clip', evidenceKey: 'fake-success:clip' }, now)).toThrow('EXECUTION_TRANSITION_REJECTED');
  });

  it('does not mutate the caller receipt and settles recovered fake work once', () => {
    const original = reserved(), snapshot = structuredClone(original);
    let run = reduceFixtureExecution(original, { action: 'begin', submissionKey: 'clip' }, now);
    run = reduceFixtureExecution(run, { action: 'unknown', submissionKey: 'clip' }, now);
    run = reduceFixtureExecution(run, { action: 'recover', submissionKey: 'clip', fakeHandle: 'fixture:clip' }, now);
    run = reduceFixtureExecution(run, { action: 'succeed', submissionKey: 'clip', fakeHandle: 'fixture:clip', evidenceKey: 'fake-success:clip' }, now);
    expect(original).toEqual(snapshot); expect(run.budget).toEqual({ capUnits: 120, heldUnits: 0, settledUnits: 12 });
    expect(reduceFixtureExecution(run, { action: 'succeed', submissionKey: 'clip', fakeHandle: 'fixture:clip', evidenceKey: 'fake-success:clip' }, now)).toEqual(run);
    expect(validateFixtureExecutionReceipt(run, owner)).toEqual(run);
  });

  it('cancellation releases only undispatched reservations and still accepts known terminal evidence', () => {
    let run = reserved(); run = reduceFixtureExecution(run, { action: 'reserve', submissionKey: 'voice', stage: 'voice' }, now);
    run = reduceFixtureExecution(run, { action: 'begin', submissionKey: 'clip' }, now);
    run = reduceFixtureExecution(run, { action: 'cancel' }, now);
    expect(run.cancelled).toBe(true); expect(run.budget.heldUnits).toBe(12);
    expect(() => reduceFixtureExecution(run, { action: 'begin', submissionKey: 'voice' }, now)).toThrow('EXECUTION_CANCELLED');
    run = reduceFixtureExecution(run, { action: 'reject', submissionKey: 'clip', evidenceKey: 'fake-reject:clip' }, now);
    expect(run.budget.heldUnits).toBe(0); expect(validateFixtureExecutionReceipt(run, owner)).toEqual(run);
    expect(() => reduceFixtureExecution(run, { action: 'reserve', submissionKey: 'repair', stage: 'clip' }, now)).toThrow('EXECUTION_CANCELLED');
  });

  it('blocks expired reservations, exhausted shared caps and more than one known-terminal repair', () => {
    expect(() => reduceFixtureExecution(receipt(), { action: 'reserve', submissionKey: 'clip', stage: 'clip' }, receipt().expiresAt)).toThrow('EXECUTION_QUOTE_EXPIRED');
    const exhausted = receipt(); exhausted.budget.settledUnits = 120;
    expect(() => reduceFixtureExecution(exhausted, { action: 'reserve', submissionKey: 'clip', stage: 'clip' }, now)).toThrow('EXECUTION_BUDGET_EXHAUSTED');
    let run = reserved();
    for (const key of ['clip', 'repair']) {
      if (key === 'repair') run = reduceFixtureExecution(run, { action: 'reserve', submissionKey: key, stage: 'clip' }, now);
      run = reduceFixtureExecution(run, { action: 'begin', submissionKey: key }, now);
      run = reduceFixtureExecution(run, { action: 'reject', submissionKey: key, evidenceKey: `fake-reject:${key}` }, now);
    }
    expect(() => reduceFixtureExecution(run, { action: 'reserve', submissionKey: 'third', stage: 'clip' }, now)).toThrow('EXECUTION_ATTEMPT_LIMIT');
  });

  it('rejects unrecognized commands and real provider URLs rather than treating them as fake completion', () => {
    const run = reserved();
    expect(() => reduceFixtureExecution(run, { action: 'begin', submissionKey: 'clip', fakeHandle: 'https://provider/job' }, now)).toThrow('INVALID_FAKE_EVIDENCE');
    expect(() => reduceFixtureExecution(run, { action: 'accept', submissionKey: 'clip' }, now)).toThrow('INVALID_FAKE_EVIDENCE');
    expect(() => reduceFixtureExecution(run, { action: 'reserve', submissionKey: 'clip', stage: 'voice' }, now)).toThrow('EXECUTION_IDEMPOTENCY_CONFLICT');
    expect(() => reduceFixtureExecution(run, { action: 'cancel', provider: 'live' } as never, now)).toThrow('INVALID_EXECUTION_COMMAND');
    expect(() => reduceFixtureExecution(run, { action: 'dispatch', submissionKey: 'clip' } as never, now)).toThrow('INVALID_EXECUTION_COMMAND');
    expect(() => reduceFixtureExecution(run, { action: 'reserve', stage: 'voice', submissionKey: undefined } as never, now)).toThrow('INVALID_EXECUTION_INPUT');
  });
});

// Synthetic ledger protocol only. No dispatch, provider, money or sample-worker authority.
export const FIXTURE_EXECUTION_RUNTIME = 'fixture-execution-safety-v1' as const;
export const FIXTURE_EXECUTION_POLICY = {
  capUnits: 120,
  quoteLifetimeMs: 600_000,
  stages: {
    clip: { unitsPerAttempt: 12, maxAttempts: 2 },
    voice: { unitsPerAttempt: 8, maxAttempts: 2 },
    assemble: { unitsPerAttempt: 4, maxAttempts: 2 },
  },
} as const;
export type FixtureExecutionStage = keyof typeof FIXTURE_EXECUTION_POLICY.stages;
export type FixtureExecutionState = 'reserved' | 'submitting' | 'submitted' | 'succeeded' | 'rejected' | 'reconciliation_required' | 'cancelled';
export interface FixtureExecutionAttempt {
  submissionKey: string;
  intentText: string;
  stage: FixtureExecutionStage;
  ordinal: number;
  state: FixtureExecutionState;
  units: number;
  fakeHandle: string | null;
  evidenceKey: string | null;
}
export interface FixtureExecutionReceipt {
  version: 1;
  runtime: typeof FIXTURE_EXECUTION_RUNTIME;
  fixture: true;
  actualCents: 0;
  currency: 'TEST_UNIT';
  runId: string;
  runKey: string;
  inputHash: string;
  ownerId: string;
  cancelled: boolean;
  issuedAt: number;
  expiresAt: number;
  budget: { capUnits: number; heldUnits: number; settledUnits: number };
  stages: typeof FIXTURE_EXECUTION_POLICY.stages;
  attempts: FixtureExecutionAttempt[];
}
export type FixtureExecutionAction = 'begin' | 'accept' | 'unknown' | 'stale' | 'recover' | 'succeed' | 'reject';
export type FixtureExecutionCommand =
  | { action: 'reserve'; stage: FixtureExecutionStage; submissionKey: string }
  | { action: 'cancel' }
  | { action: FixtureExecutionAction; submissionKey: string; fakeHandle?: string | null; evidenceKey?: string | null };

const keyPattern = /^[a-zA-Z0-9_-]{1,64}$/;
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const states: FixtureExecutionState[] = ['reserved', 'submitting', 'submitted', 'succeeded', 'rejected', 'reconciliation_required', 'cancelled'];
const heldStates: FixtureExecutionState[] = ['reserved', 'submitting', 'submitted', 'reconciliation_required'];
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const exactKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(value, key));
const stageKey = (value: unknown): value is FixtureExecutionStage => typeof value === 'string' && Object.prototype.hasOwnProperty.call(FIXTURE_EXECUTION_POLICY.stages, value);
function fail(code: string): never { throw new Error(code); }

export function fixtureExecutionIntentText(ownerId: string, runId: string, stage: FixtureExecutionStage, submissionKey: string, inputHash: string): string {
  return JSON.stringify([ownerId, runId, stage, submissionKey, inputHash]);
}

export function validateFixtureExecutionReceipt(value: unknown, expectedOwnerId: string, expectedRunId?: string): FixtureExecutionReceipt {
  if (!object(value) || !exactKeys(value, ['version', 'runtime', 'fixture', 'actualCents', 'currency', 'runId', 'runKey', 'inputHash', 'ownerId', 'cancelled', 'issuedAt', 'expiresAt', 'budget', 'stages', 'attempts'])
    || value.version !== 1 || value.runtime !== FIXTURE_EXECUTION_RUNTIME || value.fixture !== true || value.actualCents !== 0 || value.currency !== 'TEST_UNIT'
    || value.ownerId !== expectedOwnerId || typeof value.ownerId !== 'string' || !uuidPattern.test(value.ownerId)
    || typeof value.runId !== 'string' || !uuidPattern.test(value.runId) || (expectedRunId !== undefined && value.runId !== expectedRunId)
    || typeof value.runKey !== 'string' || !keyPattern.test(value.runKey) || typeof value.inputHash !== 'string' || !/^[a-f0-9]{64}$/.test(value.inputHash)
    || typeof value.cancelled !== 'boolean' || !integer(value.issuedAt) || !integer(value.expiresAt) || value.expiresAt - value.issuedAt !== FIXTURE_EXECUTION_POLICY.quoteLifetimeMs
    || !object(value.budget) || !exactKeys(value.budget, ['capUnits', 'heldUnits', 'settledUnits']) || value.budget.capUnits !== FIXTURE_EXECUTION_POLICY.capUnits
    || !integer(value.budget.heldUnits) || !integer(value.budget.settledUnits) || value.budget.heldUnits + value.budget.settledUnits > value.budget.capUnits
    || !object(value.stages) || !exactKeys(value.stages, ['clip', 'voice', 'assemble']) || !Array.isArray(value.attempts) || value.attempts.length > 6) fail('INVALID_FIXTURE_EXECUTION_RECEIPT');
  for (const stage of Object.keys(FIXTURE_EXECUTION_POLICY.stages) as FixtureExecutionStage[]) {
    const allocation = value.stages[stage], policy = FIXTURE_EXECUTION_POLICY.stages[stage];
    if (!object(allocation) || !exactKeys(allocation, ['unitsPerAttempt', 'maxAttempts']) || allocation.unitsPerAttempt !== policy.unitsPerAttempt || allocation.maxAttempts !== policy.maxAttempts) fail('INVALID_FIXTURE_EXECUTION_RECEIPT');
  }
  const keys = new Set<string>(), byStage = new Map<FixtureExecutionStage, FixtureExecutionAttempt[]>();
  let held = 0, settled = 0;
  for (const attempt of value.attempts) {
    if (!object(attempt) || !exactKeys(attempt, ['submissionKey', 'intentText', 'stage', 'ordinal', 'state', 'units', 'fakeHandle', 'evidenceKey'])
      || typeof attempt.submissionKey !== 'string' || !keyPattern.test(attempt.submissionKey) || keys.has(attempt.submissionKey)
      || !stageKey(attempt.stage) || !integer(attempt.ordinal) || attempt.ordinal < 1 || attempt.ordinal > 2
      || typeof attempt.state !== 'string' || !states.includes(attempt.state as FixtureExecutionState) || attempt.units !== FIXTURE_EXECUTION_POLICY.stages[attempt.stage].unitsPerAttempt
      || attempt.intentText !== fixtureExecutionIntentText(value.ownerId, value.runId, attempt.stage, attempt.submissionKey, value.inputHash)
      || (attempt.fakeHandle !== null && attempt.fakeHandle !== `fixture:${attempt.submissionKey}`)
      || (['reserved', 'submitting', 'cancelled'].includes(attempt.state) && attempt.fakeHandle !== null)
      || (['submitted', 'succeeded'].includes(attempt.state) && attempt.fakeHandle === null)
      || (attempt.state === 'succeeded' ? attempt.evidenceKey !== `fake-success:${attempt.submissionKey}` : attempt.state === 'rejected' ? attempt.evidenceKey !== `fake-reject:${attempt.submissionKey}` : attempt.evidenceKey !== null)
      || (value.cancelled && attempt.state === 'reserved') || (!value.cancelled && attempt.state === 'cancelled')) fail('INVALID_FIXTURE_EXECUTION_RECEIPT');
    const typed = attempt as unknown as FixtureExecutionAttempt;
    keys.add(typed.submissionKey);
    byStage.set(typed.stage, [...(byStage.get(typed.stage) ?? []), typed]);
    if (heldStates.includes(typed.state)) held += typed.units;
    if (typed.state === 'succeeded') settled += typed.units;
  }
  for (const attempts of byStage.values()) {
    const ordered = [...attempts].sort((a, b) => a.ordinal - b.ordinal);
    if (ordered.length > 2 || ordered.some((attempt, index) => attempt.ordinal !== index + 1 || (index < ordered.length - 1 && attempt.state !== 'rejected'))) fail('INVALID_FIXTURE_EXECUTION_RECEIPT');
  }
  // The owner budget also includes other runs. This receipt cannot claim more local units than that shared ledger.
  if (held > value.budget.heldUnits || settled > value.budget.settledUnits) fail('INVALID_FIXTURE_EXECUTION_RECEIPT');
  return value as unknown as FixtureExecutionReceipt;
}

export function reduceFixtureExecution(receipt: FixtureExecutionReceipt, command: FixtureExecutionCommand, now: number): FixtureExecutionReceipt {
  validateFixtureExecutionReceipt(receipt, receipt.ownerId, receipt.runId);
  if (!integer(now) || !object(command)) fail('INVALID_EXECUTION_COMMAND');
  const next = structuredClone(receipt);
  if (command.action === 'cancel') {
    if (!exactKeys(command, ['action'])) fail('INVALID_EXECUTION_COMMAND');
    next.cancelled = true;
    for (const attempt of next.attempts) if (attempt.state === 'reserved') { attempt.state = 'cancelled'; next.budget.heldUnits -= attempt.units; }
    return next;
  }
  if (typeof command.submissionKey !== 'string' || !keyPattern.test(command.submissionKey)) fail('INVALID_EXECUTION_INPUT');
  const attempt = next.attempts.find(item => item.submissionKey === command.submissionKey);
  if (command.action === 'reserve') {
    if (!exactKeys(command, ['action', 'stage', 'submissionKey']) || !stageKey(command.stage)) fail('INVALID_EXECUTION_INPUT');
    if (attempt) { if (attempt.stage !== command.stage) fail('EXECUTION_IDEMPOTENCY_CONFLICT'); return next; }
    if (next.cancelled) fail('EXECUTION_CANCELLED');
    if (now >= next.expiresAt) fail('EXECUTION_QUOTE_EXPIRED');
    const previous = next.attempts.filter(item => item.stage === command.stage).sort((a, b) => a.ordinal - b.ordinal);
    if (previous.length >= 2) fail('EXECUTION_ATTEMPT_LIMIT');
    if (previous.length && previous[previous.length - 1].state !== 'rejected') fail('EXECUTION_STAGE_UNRESOLVED');
    const units = FIXTURE_EXECUTION_POLICY.stages[command.stage].unitsPerAttempt;
    if (next.budget.heldUnits + next.budget.settledUnits + units > next.budget.capUnits) fail('EXECUTION_BUDGET_EXHAUSTED');
    next.budget.heldUnits += units;
    next.attempts.push({ submissionKey: command.submissionKey, intentText: fixtureExecutionIntentText(next.ownerId, next.runId, command.stage, command.submissionKey, next.inputHash), stage: command.stage, ordinal: previous.length + 1, state: 'reserved', units, fakeHandle: null, evidenceKey: null });
    next.attempts.sort((a, b) => a.stage.localeCompare(b.stage) || a.ordinal - b.ordinal);
    return next;
  }
  if (!['begin', 'accept', 'unknown', 'stale', 'recover', 'succeed', 'reject'].includes(command.action)
    || Object.keys(command).some(key => !['action', 'submissionKey', 'fakeHandle', 'evidenceKey'].includes(key))) fail('INVALID_EXECUTION_COMMAND');
  const handle = command.fakeHandle ?? null, evidence = command.evidenceKey ?? null;
  if ((['accept', 'recover', 'succeed'].includes(command.action) ? handle !== `fixture:${command.submissionKey}` : handle !== null)
    || (command.action === 'succeed' ? evidence !== `fake-success:${command.submissionKey}` : command.action === 'reject' ? evidence !== `fake-reject:${command.submissionKey}` : evidence !== null)) fail('INVALID_FAKE_EVIDENCE');
  if (!attempt) fail('EXECUTION_NOT_FOUND');
  if ((command.action === 'succeed' && attempt.state === 'succeeded') || (command.action === 'reject' && attempt.state === 'rejected')
    || (command.action === 'begin' && attempt.state === 'submitting') || (['accept', 'recover'].includes(command.action) && attempt.state === 'submitted')
    || (['unknown', 'stale'].includes(command.action) && attempt.state === 'reconciliation_required')) return next;
  let target: FixtureExecutionState;
  if (command.action === 'begin') {
    if (next.cancelled) fail('EXECUTION_CANCELLED');
    if (now >= next.expiresAt) fail('EXECUTION_QUOTE_EXPIRED');
    if (attempt.state !== 'reserved') fail('EXECUTION_TRANSITION_REJECTED');
    target = 'submitting';
  } else if (command.action === 'accept') {
    if (attempt.state !== 'submitting') fail('EXECUTION_TRANSITION_REJECTED');
    target = 'submitted';
  } else if (command.action === 'recover') {
    if (attempt.state !== 'reconciliation_required') fail('EXECUTION_TRANSITION_REJECTED');
    target = 'submitted';
  } else if (command.action === 'unknown' || command.action === 'stale') {
    if (attempt.state !== 'submitting' && attempt.state !== 'submitted') fail('EXECUTION_TRANSITION_REJECTED');
    target = 'reconciliation_required';
  } else if (command.action === 'succeed') {
    if (!['submitted', 'reconciliation_required'].includes(attempt.state) || attempt.fakeHandle === null) fail('EXECUTION_TRANSITION_REJECTED');
    target = 'succeeded';
  } else {
    if (!['submitting', 'submitted', 'reconciliation_required'].includes(attempt.state)) fail('EXECUTION_TRANSITION_REJECTED');
    target = 'rejected';
  }
  attempt.state = target;
  attempt.fakeHandle = handle ?? attempt.fakeHandle;
  attempt.evidenceKey = evidence;
  if (target === 'succeeded' || target === 'rejected') {
    next.budget.heldUnits -= attempt.units;
    if (target === 'succeeded') next.budget.settledUnits += attempt.units;
  }
  return next;
}

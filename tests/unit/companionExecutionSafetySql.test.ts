import { existsSync, readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { reduceFixtureExecution, validateFixtureExecutionReceipt, type FixtureExecutionReceipt, type FixtureExecutionCommand } from '../../services/companionExecutionSafety.js';

const ownerA = '11111111-1111-4111-8111-111111111111';
const ownerB = '22222222-2222-4222-8222-222222222222';
const unenrolled = '33333333-3333-4333-8333-333333333333';
const schemaPath = 'supabase/companion_fixture_execution_safety.sql';
interface Attempt { submissionKey: string; intentText: string; stage: string; ordinal: number; state: string; units: number; fakeHandle: string | null; evidenceKey: string | null }
interface Receipt { version: number; runtime: string; fixture: boolean; actualCents: number; currency: string; runId: string; runKey: string; inputHash: string; ownerId: string; cancelled: boolean; issuedAt: number; expiresAt: number; budget: { capUnits: number; heldUnits: number; settledUnits: number }; stages: Record<string, { unitsPerAttempt: number; maxAttempts: number }>; attempts: Attempt[] }
let db: PGlite;
let baseline: unknown[];
const definitions = () => db.query(`select nspname, proname, pg_get_functiondef(pg_proc.oid) as definition, proacl::text as acl from pg_proc join pg_namespace on pg_namespace.oid=pronamespace where nspname='grifon_fixture' or (nspname='public' and proname like 'grifon_%') order by nspname,proname`);
async function asRole<T>(owner: string, action: () => Promise<T>, role = 'authenticated'): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]); await db.exec(`set role ${role}`);
  try { return await action(); } finally { await db.exec('reset role'); }
}
async function rpc<T = Receipt>(name: string, args: unknown[], owner = ownerA): Promise<T> {
  return asRole(owner, async () => (await db.query<{ value: T }>(`select public.grifon_fixture_execution_${name}(${args.map((_, index) => `$${index + 1}`).join(',')}) as value`, args)).rows[0].value);
}
const quote = (key = 'run-a', owner = ownerA, hash = 'a'.repeat(64)) => rpc('quote', [key, hash], owner);
const reserve = (run: Receipt, key = 'submit-a', stage = 'clip') => rpc('reserve', [run.runId, stage, key], run.ownerId);
const command = (run: Receipt, key: string, action: string, handle: string | null = null, evidence: string | null = null) => rpc('command', [run.runId, key, action, handle, evidence], run.ownerId);
const get = (run: Receipt, owner = run.ownerId) => rpc<Receipt | null>('get', [run.runId], owner);
async function submitted(run: Receipt, key = 'submit-a', stage = 'clip'): Promise<Receipt> {
  await reserve(run, key, stage); await command(run, key, 'begin');
  return command(run, key, 'accept', `fixture:${key}`);
}

describe('synthetic execution safety PostgreSQL behavior (PGlite is a single connection, not a concurrency proof)', { timeout: 30_000 }, () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;
      grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
    await db.exec(readFileSync('supabase/companion_cloud_fixtures.sql', 'utf8'));
    await db.query('insert into grifon_fixture.allowed_owners values ($1),($2)', [ownerA, ownerB]);
    baseline = (await definitions()).rows;
    // Keep the real baseline runnable: the first test fails on the missing RPC before implementation.
    if (existsSync(schemaPath)) { await db.exec(readFileSync(schemaPath, 'utf8')); await db.exec(readFileSync(schemaPath, 'utf8')); }
  }, 30_000);
  beforeEach(async () => { await db.exec('reset role'); if (existsSync(schemaPath)) await db.exec('truncate grifon_fixture.execution_attempts,grifon_fixture.execution_runs,grifon_fixture.execution_budgets'); });
  afterAll(async () => { await db?.close(); });

  it('issues a fixed expiring TEST_UNIT quote and atomically reserves a stable submission intent at PHP0', async () => {
    const run = await quote();
    expect(run).toMatchObject({ version: 1, runtime: 'fixture-execution-safety-v1', fixture: true, actualCents: 0, currency: 'TEST_UNIT', ownerId: ownerA, runKey: 'run-a', inputHash: 'a'.repeat(64), cancelled: false, attempts: [], budget: { capUnits: 120, heldUnits: 0, settledUnits: 0 }, stages: { clip: { unitsPerAttempt: 12, maxAttempts: 2 }, voice: { unitsPerAttempt: 8, maxAttempts: 2 }, assemble: { unitsPerAttempt: 4, maxAttempts: 2 } } });
    expect(run.expiresAt - run.issuedAt).toBe(600_000);
    const held = await reserve(run);
    expect(held.budget.heldUnits).toBe(12);
    expect(held.attempts).toEqual([{ submissionKey: 'submit-a', intentText: JSON.stringify([ownerA, run.runId, 'clip', 'submit-a', run.inputHash]), stage: 'clip', ordinal: 1, state: 'reserved', units: 12, fakeHandle: null, evidenceKey: null }]);
    expect(await reserve(run)).toEqual(held);
    expect(await quote()).toEqual(held);
  });

  it('finds an existing owned run by key without implicitly issuing a quote or reserving allowance', async () => {
    expect(await rpc('find', ['missing'])).toBeNull();
    expect((await db.query('select count(*)::int as n from grifon_fixture.execution_budgets')).rows[0]).toEqual({ n: 0 });
    const run = await quote(); const held = await reserve(run);
    expect(await rpc('find', ['run-a'])).toEqual(held); expect(await rpc('find', ['run-a'], ownerB)).toBeNull();
    await expect(rpc('find', ['run-a'], unenrolled)).rejects.toThrow('FIXTURE_OWNER_REQUIRED');
    await expect(rpc('find', ['../escape'])).rejects.toThrow('INVALID_EXECUTION_INPUT');
    expect((await db.query('select count(*)::int as n from grifon_fixture.execution_runs')).rows[0]).toEqual({ n: 1 });
  });

  it('settles accepted fake work once, including duplicate completions after quote expiry', async () => {
    const run = await quote(); await submitted(run);
    const done = await command(run, 'submit-a', 'succeed', 'fixture:submit-a', 'fake-success:submit-a');
    expect(done.budget).toEqual({ capUnits: 120, heldUnits: 0, settledUnits: 12 });
    expect(done.attempts[0]).toMatchObject({ state: 'succeeded', fakeHandle: 'fixture:submit-a', evidenceKey: 'fake-success:submit-a' });
    await db.query('update grifon_fixture.execution_runs set issued_at=issued_at-700000,expires_at=expires_at-700000 where id=$1', [run.runId]);
    expect((await command(run, 'submit-a', 'succeed', 'fixture:submit-a', 'fake-success:submit-a')).budget).toEqual(done.budget);
    await expect(command(run, 'submit-a', 'reject', null, 'fake-reject:submit-a')).rejects.toThrow('EXECUTION_TRANSITION_REJECTED');
    expect((await db.query('select count(*)::int as n from grifon_fixture.execution_attempts')).rows[0]).toEqual({ n: 1 });
  });

  it('holds ambiguous submissions through stale timers, cancellation and restart reads until recovered terminal evidence', async () => {
    const run = await quote(); await reserve(run); await command(run, 'submit-a', 'begin');
    const unknown = await command(run, 'submit-a', 'unknown');
    expect(unknown.attempts[0]).toMatchObject({ state: 'reconciliation_required', fakeHandle: null });
    expect(await command(run, 'submit-a', 'stale')).toEqual(unknown);
    await expect(reserve(run, 'submit-b')).rejects.toThrow('EXECUTION_STAGE_UNRESOLVED');
    await expect(command(run, 'submit-a', 'begin')).rejects.toThrow('EXECUTION_TRANSITION_REJECTED');
    const cancelled = await rpc('cancel', [run.runId]);
    expect(cancelled.budget.heldUnits).toBe(12); expect(cancelled.cancelled).toBe(true);
    for (let read = 0; read < 3; read++) expect(await get(run)).toEqual(cancelled);
    await expect(command(run, 'submit-a', 'begin')).rejects.toThrow('EXECUTION_CANCELLED');
    await expect(reserve(run, 'voice-after-cancel', 'voice')).rejects.toThrow('EXECUTION_CANCELLED');
    await expect(command(run, 'submit-a', 'succeed', 'fixture:submit-a', 'fake-success:submit-a')).rejects.toThrow('EXECUTION_TRANSITION_REJECTED');
    await command(run, 'submit-a', 'recover', 'fixture:submit-a');
    const done = await command(run, 'submit-a', 'succeed', 'fixture:submit-a', 'fake-success:submit-a');
    expect(done.cancelled).toBe(true); expect(done.budget).toEqual({ capUnits: 120, heldUnits: 0, settledUnits: 12 });
  });

  it('cancels never-submitted reservations immediately while holding submitting and submitted attempts', async () => {
    const run = await quote(); await reserve(run, 'clip-key', 'clip'); await reserve(run, 'voice-key', 'voice'); await submitted(run, 'assemble-key', 'assemble');
    await command(run, 'voice-key', 'begin');
    const cancelled = await rpc('cancel', [run.runId]);
    expect(cancelled.attempts.map(attempt => [attempt.stage, attempt.state])).toEqual([['assemble', 'submitted'], ['clip', 'cancelled'], ['voice', 'submitting']]);
    expect(cancelled.budget.heldUnits).toBe(12);
    expect(await rpc('cancel', [run.runId])).toEqual(cancelled);
    await command(run, 'voice-key', 'reject', null, 'fake-reject:voice-key');
    const done = await command(run, 'assemble-key', 'succeed', 'fixture:assemble-key', 'fake-success:assemble-key');
    expect(done.budget).toEqual({ capUnits: 120, heldUnits: 0, settledUnits: 4 });
  });

  it('reserves a repair only after known rejection and consumes its bounded ordinal before begin', async () => {
    const run = await quote(); await reserve(run);
    await expect(reserve(run, 'repair')).rejects.toThrow('EXECUTION_STAGE_UNRESOLVED');
    await command(run, 'submit-a', 'begin'); await command(run, 'submit-a', 'reject', null, 'fake-reject:submit-a');
    const repaired = await reserve(run, 'repair');
    expect(repaired.attempts[1]).toMatchObject({ ordinal: 2, state: 'reserved', units: 12 });
    await command(run, 'repair', 'begin'); await command(run, 'repair', 'reject', null, 'fake-reject:repair');
    await expect(reserve(run, 'third')).rejects.toThrow('EXECUTION_ATTEMPT_LIMIT');
    expect((await get(run))!.budget.heldUnits).toBe(0);
    expect((await get(run))!.attempts).toHaveLength(2);
  });

  it('blocks stage retries after success and rejects arbitrary or conflicting fake evidence', async () => {
    const run = await quote(); await submitted(run);
    await expect(command(run, 'submit-a', 'succeed', 'https://provider/job', 'fake-success:submit-a')).rejects.toThrow('INVALID_FAKE_EVIDENCE');
    await expect(command(run, 'submit-a', 'reject', null, 'fake-reject:different')).rejects.toThrow('INVALID_FAKE_EVIDENCE');
    await expect(command(run, 'submit-a', 'unknown', 'fixture:submit-a')).rejects.toThrow('INVALID_FAKE_EVIDENCE');
    await command(run, 'submit-a', 'succeed', 'fixture:submit-a', 'fake-success:submit-a');
    await expect(reserve(run, 'repeated-success')).rejects.toThrow('EXECUTION_STAGE_UNRESOLVED');
    await expect(command(run, 'submit-a', 'recover', 'fixture:submit-a')).rejects.toThrow('EXECUTION_TRANSITION_REJECTED');
  });

  it('retains accepted handles through stale reconciliation without blindly resubmitting', async () => {
    const run = await quote(); await submitted(run); const stale = await command(run, 'submit-a', 'stale');
    expect(stale.attempts[0]).toMatchObject({ state: 'reconciliation_required', fakeHandle: 'fixture:submit-a' });
    await expect(command(run, 'submit-a', 'begin')).rejects.toThrow('EXECUTION_TRANSITION_REJECTED');
    const recovered = await command(run, 'submit-a', 'recover', 'fixture:submit-a');
    expect(await command(run, 'submit-a', 'recover', 'fixture:submit-a')).toEqual(recovered);
    const done = await command(run, 'submit-a', 'succeed', 'fixture:submit-a', 'fake-success:submit-a');
    expect(done.budget.settledUnits).toBe(12);
  });

  it('shares the cap across distinct runs and keeps ambiguous holds after cancellation', async () => {
    const runs: Receipt[] = [];
    for (let index = 0; index < 10; index++) {
      const run = await quote(`run-${index}`); runs.push(run); await reserve(run, `key-${index}`);
      await command(run, `key-${index}`, 'begin'); await command(run, `key-${index}`, 'unknown'); await rpc('cancel', [run.runId]);
    }
    const blocked = await quote('blocked');
    expect(blocked.budget).toEqual({ capUnits: 120, heldUnits: 120, settledUnits: 0 });
    await expect(reserve(blocked, 'blocked-key')).rejects.toThrow('EXECUTION_BUDGET_EXHAUSTED');
    expect((await db.query('select count(*)::int as n from grifon_fixture.execution_attempts')).rows[0]).toEqual({ n: 10 });
    await command(runs[0], 'key-0', 'reject', null, 'fake-reject:key-0');
    expect((await reserve(blocked, 'blocked-key')).budget.heldUnits).toBe(120);
    expect((await quote('owner-b', ownerB)).budget).toEqual({ capUnits: 120, heldUnits: 0, settledUnits: 0 });
  });

  it('includes settled units in the lifetime owner cap rather than resetting each quote', async () => {
    for (let index = 0; index < 10; index++) {
      const run = await quote(`settled-${index}`), key = `settled-key-${index}`; await submitted(run, key);
      await command(run, key, 'succeed', `fixture:${key}`, `fake-success:${key}`);
    }
    const run = await quote('new-quote'); expect(run.budget).toEqual({ capUnits: 120, heldUnits: 0, settledUnits: 120 });
    await expect(reserve(run, 'no-reset')).rejects.toThrow('EXECUTION_BUDGET_EXHAUSTED');
  });

  it('rejects expired new reservations and begins but retains frozen quote identity and existing holds', async () => {
    const run = await quote(); await reserve(run);
    await db.query('update grifon_fixture.execution_runs set issued_at=issued_at-700000,expires_at=expires_at-700000 where id=$1', [run.runId]);
    const expired = (await get(run))!;
    await expect(reserve(run, 'new-stage', 'voice')).rejects.toThrow('EXECUTION_QUOTE_EXPIRED');
    await expect(command(run, 'submit-a', 'begin')).rejects.toThrow('EXECUTION_QUOTE_EXPIRED');
    expect(await reserve(run)).toEqual(expired); expect(await quote()).toEqual(expired);
    expect((await rpc('cancel', [run.runId])).budget.heldUnits).toBe(0);
  });

  it('rolls back reservation, consumed attempt, intent and held units as one transaction', async () => {
    const run = await quote(); await db.exec('begin'); const held = await reserve(run); expect(held.attempts).toHaveLength(1); await db.exec('rollback');
    expect(await get(run)).toEqual(run);
    expect((await db.query('select count(*)::int as n from grifon_fixture.execution_attempts')).rows[0]).toEqual({ n: 0 });
    expect((await reserve(run)).attempts[0].ordinal).toBe(1);
  });

  it('rolls back settlement and replays a later completion exactly once', async () => {
    const run = await quote(); const accepted = await submitted(run);
    await db.exec('begin'); await command(run, 'submit-a', 'succeed', 'fixture:submit-a', 'fake-success:submit-a'); await db.exec('rollback');
    expect(await get(run)).toEqual(accepted);
    const done = await command(run, 'submit-a', 'succeed', 'fixture:submit-a', 'fake-success:submit-a');
    expect(await command(run, 'submit-a', 'succeed', 'fixture:submit-a', 'fake-success:submit-a')).toEqual(done);
  });

  it('binds owner-wide idempotency keys to the exact run, stage and frozen input hash', async () => {
    const first = await quote(), second = await quote('run-b'); const original = await reserve(first);
    await expect(quote('run-a', ownerA, 'b'.repeat(64))).rejects.toThrow('EXECUTION_IDEMPOTENCY_CONFLICT');
    await expect(reserve(first, 'submit-a', 'voice')).rejects.toThrow('EXECUTION_IDEMPOTENCY_CONFLICT');
    await expect(reserve(second)).rejects.toThrow('EXECUTION_IDEMPOTENCY_CONFLICT');
    expect(await get(first)).toEqual(original); expect((await get(second))!.attempts).toEqual([]);
  });

  it('checks enrollment and ownership on every write/read and denies anonymous or direct table/helper access', async () => {
    const run = await quote(); await reserve(run);
    expect(await get(run, ownerB)).toBeNull();
    for (const [name, args] of [['reserve', [run.runId, 'voice', 'foreign']], ['command', [run.runId, 'submit-a', 'begin', null, null]], ['cancel', [run.runId]]] as const) {
      await expect(rpc(name, [...args], ownerB)).rejects.toThrow('EXECUTION_NOT_FOUND');
    }
    for (const owner of [unenrolled, '']) for (const [name, args] of [['quote', ['new', 'a'.repeat(64)]], ['reserve', [run.runId, 'voice', 'x']], ['command', [run.runId, 'submit-a', 'begin', null, null]], ['cancel', [run.runId]], ['get', [run.runId]]] as const) await expect(rpc(name, [...args], owner)).rejects.toThrow('FIXTURE_OWNER_REQUIRED');
    for (const role of ['anon', 'authenticated']) {
      for (const table of ['execution_budgets', 'execution_runs', 'execution_attempts']) await expect(asRole(ownerA, () => db.query(`select * from grifon_fixture.${table}`), role)).rejects.toThrow('permission denied');
      await expect(asRole(ownerA, () => db.query('select grifon_fixture.execution_wire($1,$2)', [run.runId, ownerA]), role)).rejects.toThrow('permission denied');
    }
    await expect(asRole(ownerA, () => db.query('select public.grifon_fixture_execution_get($1)', [run.runId]), 'anon')).rejects.toThrow('permission denied');
  });

  it('does not prevent existing enrollment revocation and denies every later access while retaining held units', async () => {
    const run = await quote(); await reserve(run); await command(run, 'submit-a', 'begin');
    await db.query('delete from grifon_fixture.allowed_owners where user_id=$1', [ownerA]);
    try {
      await expect(get(run)).rejects.toThrow('FIXTURE_OWNER_REQUIRED');
      await expect(rpc('cancel', [run.runId])).rejects.toThrow('FIXTURE_OWNER_REQUIRED');
      expect((await db.query('select held_units from grifon_fixture.execution_budgets where owner_id=$1', [ownerA])).rows[0]).toEqual({ held_units: 12 });
    } finally { await db.query('insert into grifon_fixture.allowed_owners values ($1)', [ownerA]); }
  });

  it('bounds records and rejects malformed keys, hashes, stages and null commands', async () => {
    for (const key of ['', 'x'.repeat(65), '../escape', 'space key']) await expect(quote(key)).rejects.toThrow('INVALID_EXECUTION_INPUT');
    await expect(quote('hash', ownerA, 'A'.repeat(64))).rejects.toThrow('INVALID_EXECUTION_INPUT');
    const run = await quote(); await expect(reserve(run, 'key', '__proto__')).rejects.toThrow('INVALID_EXECUTION_INPUT');
    await expect(rpc('command', [run.runId, 'key', null, null, null])).rejects.toThrow('INVALID_EXECUTION_COMMAND');
    for (let index = 1; index < 50; index++) await quote(`bounded-${index}`);
    await expect(quote('overflow')).rejects.toThrow('EXECUTION_RUN_LIMIT');
    expect((await db.query('select count(*)::int as n from grifon_fixture.execution_runs')).rows[0]).toEqual({ n: 50 });
  });

  it('rejects corrupt budget, paid amounts, policy allocations and terminal evidence at database constraints', async () => {
    const run = await quote(); await submitted(run);
    await expect(db.exec('update grifon_fixture.execution_budgets set held_units=121')).rejects.toThrow('check constraint');
    await expect(db.exec('update grifon_fixture.execution_budgets set actual_cents=1')).rejects.toThrow('check constraint');
    await expect(db.exec('update grifon_fixture.execution_attempts set units=99')).rejects.toThrow('check constraint');
    await expect(db.exec("update grifon_fixture.execution_attempts set state='succeeded',evidence_key=null")).rejects.toThrow('check constraint');
    await expect(db.exec("update grifon_fixture.execution_attempts set state='rejected',evidence_key=null")).rejects.toThrow('check constraint');
    expect((await get(run))!.budget).toEqual({ capUnits: 120, heldUnits: 12, settledUnits: 0 });
  });

  it('matches the pure protocol guards through reservation, uncertainty, recovery, settlement and cancellation', async () => {
    let actual = await quote(); let mirror = validateFixtureExecutionReceipt(actual, ownerA);
    const commands: FixtureExecutionCommand[] = [
      { action: 'reserve', stage: 'clip', submissionKey: 'clip' }, { action: 'reserve', stage: 'voice', submissionKey: 'voice' },
      { action: 'begin', submissionKey: 'clip' }, { action: 'unknown', submissionKey: 'clip' }, { action: 'stale', submissionKey: 'clip' },
      { action: 'recover', submissionKey: 'clip', fakeHandle: 'fixture:clip' },
      { action: 'succeed', submissionKey: 'clip', fakeHandle: 'fixture:clip', evidenceKey: 'fake-success:clip' }, { action: 'cancel' },
    ];
    for (const action of commands) {
      mirror = reduceFixtureExecution(mirror, action, actual.issuedAt + 1);
      actual = action.action === 'reserve' ? await reserve(actual, action.submissionKey, action.stage) : action.action === 'cancel' ? await rpc('cancel', [actual.runId]) : await command(actual, action.submissionKey, action.action, action.fakeHandle ?? null, action.evidenceKey ?? null);
      expect(validateFixtureExecutionReceipt(actual, ownerA)).toEqual(mirror);
    }
  });

  it('preserves all existing definitions and grants and exposes only owner-authenticated new wrappers', async () => {
    const after = (await definitions()).rows;
    for (const original of baseline as { nspname: string; proname: string }[]) expect(after.find(item => item.nspname === original.nspname && item.proname === original.proname)).toEqual(original);
    const wrappers = (await db.query<{ prosecdef: boolean; proconfig: string[] }>("select prosecdef,proconfig from pg_proc join pg_namespace on pg_namespace.oid=pronamespace where nspname='public' and proname like 'grifon_fixture_execution_%'")).rows;
    expect(wrappers).toHaveLength(6); expect(wrappers.every(item => !item.prosecdef && item.proconfig.includes('search_path=""'))).toBe(true);
    const tables = (await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class join pg_namespace on pg_namespace.oid=relnamespace where nspname='grifon_fixture' and relname like 'execution_%' and relkind='r'")).rows;
    expect(tables).toHaveLength(3); expect(tables.every(item => item.relrowsecurity)).toBe(true);
    const sql = readFileSync(schemaPath, 'utf8');
    expect(sql).not.toMatch(/cron\.|storage\.|auth\.users|service_role|create schema|alter table grifon_fixture\.(jobs|results)|grant .* on all|http|net\./i);
    expect((sql.match(/for update/g) ?? []).length).toBeGreaterThanOrEqual(8);
    expect((await db.query('select count(*)::int as n from grifon_fixture.jobs')).rows[0]).toEqual({ n: 0 });
  });
});

import { existsSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createReferenceDraft } from '../../services/companionReferenceDraft.js';
import { confirmSampleReview, createSampleReview } from '../../services/companionReferenceReview.js';
import { createFixtureJobIntent, fixtureJobIdentityText, type FixtureJobIntent } from '../../services/companionFixtureJobs.js';
import type { ReferenceQueue } from '../../services/companionReferenceQueue.js';

const ownerA = '11111111-1111-4111-8111-111111111111';
const ownerB = '22222222-2222-4222-8222-222222222222';
const unenrolled = '33333333-3333-4333-8333-333333333333';
const schemaPath = 'supabase/companion_cloud_fixture_results.sql';
interface Wire { intentText: string; queue: Omit<ReferenceQueue, 'plan'>; updatedAt: number }
interface Receipt { requestId: string; fixtureVersion: string; manifestId: string; ownerId: string; ownerChatId: string; jobId: string; sourceSaveId: string; inputHash: string; intentText: string; status: 'PENDING' | 'READY'; actualCents: number; createdAt: number; readyAt: number | null }
interface Definition { schema: string; name: string; definition: string; privileges: string[] | null }
let db: PGlite;
let originalFunctions: Definition[];
const definitions = (database: PGlite) => database.query<Definition>(`select nspname as schema, proname as name, pg_get_functiondef(pg_proc.oid) as definition, proacl as privileges
  from pg_proc join pg_namespace on pg_namespace.oid = pronamespace
  where nspname = 'grifon_fixture' or (nspname = 'public' and proname like 'grifon_%') order by nspname, proname`);

async function setup(): Promise<PGlite> {
  const database = new PGlite();
  await database.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid; $$;
    create function storage.operation() returns text language sql stable as $$ select current_setting('storage.operation', true); $$;
    create function storage.allow_only_operation(expected text) returns boolean language sql stable as $$ select storage.operation() = expected; $$;
    grant usage on schema auth, storage to authenticated, anon; grant execute on function auth.uid() to authenticated, anon;
    create table storage.buckets(id text primary key, name text not null, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text not null, owner uuid, owner_id text, metadata jsonb, unique(bucket_id, name));
    alter table storage.objects enable row level security; grant select, insert, update, delete on storage.objects to authenticated, anon;`);
  for (const path of ['supabase/companion_cloud_fixtures.sql', 'supabase/companion_cloud_references.sql', 'supabase/companion_cloud_fixture_references.sql']) await database.exec(readFileSync(path, 'utf8'));
  await database.query('insert into grifon_fixture.allowed_owners values ($1), ($2)', [ownerA, ownerB]);
  return database;
}
async function asRole<T>(role: 'authenticated' | 'anon', owner: string, action: () => Promise<T>, database = db): Promise<T> {
  await database.query("select set_config('request.jwt.claim.sub', $1, false)", [owner]);
  await database.exec(`set role ${role}`);
  try { return await action(); } finally { await database.exec('reset role'); }
}
async function rpc<T = Wire>(name: string, args: unknown[] = [], owner = ownerA, database = db): Promise<T> {
  return asRole('authenticated', owner, async () => (await database.query<{ value: T }>(`select public.grifon_${name}(${args.map((_, index) => `$${index + 1}`).join(',')}) as value`, args)).rows[0].value, database);
}
async function intent(chat = 'chat', owner = ownerA, linked = true, scenario: FixtureJobIntent['scenario'] = 'normal', database = db): Promise<FixtureJobIntent> {
  const inputHash = 'a'.repeat(64), draft = createReferenceDraft(), manifestText = JSON.stringify({ version: 1, draft, media: [], inputHash });
  const identityText = JSON.stringify([owner, `${chat}-source`, manifestText]);
  const saveId = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identityText))), byte => byte.toString(16).padStart(2, '0')).join('');
  if (linked) {
    await rpc('reference_reserve', [saveId, `${chat}-source`, manifestText, identityText], owner, database);
    await rpc('reference_commit', [saveId], owner, database);
  }
  const review = confirmSampleReview(createSampleReview(draft, inputHash, 0), inputHash, 0);
  return createFixtureJobIntent(owner, chat, review, scenario, linked ? { version: 1, saveId, inputHash } : undefined);
}
const start = (value: FixtureJobIntent, database = db) => rpc('fixture_start', [JSON.stringify(value), fixtureJobIdentityText(value)], value.ownerId, database);
const get = (value: FixtureJobIntent, owner = value.ownerId, database = db) => rpc<Receipt | null>('fixture_result_get', [value.requestId], owner, database);
const list = (owner = ownerA, database = db) => rpc<Receipt[]>('fixture_result_list', [], owner, database);
const command = (value: FixtureJobIntent, action: string, revision: number | null = null, id = randomUUID()) => rpc('fixture_command', [value.requestId, action, id, revision], value.ownerId);
async function tick(database = db): Promise<number> {
  await database.exec('update grifon_fixture.jobs set next_due_at = 0 where next_due_at is not null');
  return (await database.query<{ value: number }>('select grifon_fixture.tick() as value')).rows[0].value;
}
async function finish(value: FixtureJobIntent, database = db): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt++) {
    if ((await rpc<Wire>('fixture_get', [value.requestId], value.ownerId, database)).queue.status !== 'running') return;
    await tick(database);
  }
  throw new Error('Fixture did not finish within its bounded step count.');
}
const rows = () => db.query('select * from grifon_fixture.results order by request_id');

describe('fixture delivery PostgreSQL execution', { timeout: 30_000 }, () => {
  beforeAll(async () => {
    db = await setup(); originalFunctions = (await definitions(db)).rows;
    // The baseline still runs when the new migration is absent, so the first behavior fails on the original defect.
    if (existsSync(schemaPath)) { await db.exec(readFileSync(schemaPath, 'utf8')); await db.exec(readFileSync(schemaPath, 'utf8')); }
  }, 30_000);
  beforeEach(async () => {
    await db.exec('reset role');
    await db.exec(`truncate ${existsSync(schemaPath) ? 'grifon_fixture.results, ' : ''}grifon_fixture.command_receipts, grifon_fixture.events, grifon_fixture.jobs, storage.objects, grifon_fixture.reference_snapshots`);
  });
  afterAll(async () => { await db?.close(); });

  it('creates one result without a browser and marks it READY atomically when the unchanged worker completes', async () => {
    const job = await intent(), accepted = await start(job);
    const pending = await get(job);
    expect(pending).toMatchObject({ requestId: job.requestId, fixtureVersion: 'v1', manifestId: 'grifon-companion-fixture-video-v1', ownerId: ownerA,
      ownerChatId: job.ownerChatId, jobId: accepted.queue.id, sourceSaveId: job.cloudReference!.saveId, inputHash: job.plan.inputHash,
      intentText: JSON.stringify(job), status: 'PENDING', actualCents: 0, readyAt: null });
    expect(pending!.createdAt).toBeGreaterThan(0);
    expect(await list()).toEqual([]);
    await finish(job);
    const ready = await get(job), complete = await rpc<Wire>('fixture_get', [job.requestId]);
    expect(ready).toMatchObject({ ...pending, status: 'READY', readyAt: complete.updatedAt });
    expect(complete.queue).toMatchObject({ status: 'complete', actualCents: 0 });
    expect(ready!.readyAt).toBeGreaterThanOrEqual(ready!.createdAt);
    expect(await list()).toEqual([ready]);
    expect((await rows()).rows).toHaveLength(1);
    expect(JSON.stringify(ready)).not.toMatch(/https?:|blob:|videoUrl|downloadUrl/);
  });

  it('replays starts, ticks, commands, reopening and lists without another asset or metadata write', async () => {
    const job = await intent();
    const [first, duplicate] = await Promise.all([start(job), start(job)]);
    expect(duplicate).toEqual(first);
    await finish(job);
    const receipt = await get(job), before = (await db.query('select xmin::text, * from grifon_fixture.results')).rows;
    for (let index = 0; index < 3; index++) { expect(await tick()).toBe(0); expect(await get(job)).toEqual(receipt); expect(await list()).toEqual([receipt]); await start(job); }
    const commandId = randomUUID(), cancelled = await command(job, 'cancel', null, commandId);
    expect(await command(job, 'cancel', null, commandId)).toEqual(cancelled);
    expect((await db.query('select xmin::text, * from grifon_fixture.results')).rows).toEqual(before);
    expect((await rows()).rows).toHaveLength(1);
  });

  it('keeps ownership and enrollment checks on pending, ready and anonymous reads', async () => {
    const first = await intent(), second = await intent('other-chat', ownerB); await start(first); await start(second);
    expect(await get(first, ownerB)).toBeNull(); expect(await list(ownerB)).toEqual([]);
    await finish(first);
    expect((await list(ownerA)).map(item => item.requestId)).toEqual([first.requestId]);
    expect((await list(ownerB)).map(item => item.requestId)).toEqual([second.requestId]);
    expect(await get(first, ownerB)).toBeNull();
    for (const owner of [unenrolled, '']) await expect(list(owner)).rejects.toThrow('FIXTURE_OWNER_REQUIRED');
    await expect(asRole('anon', ownerA, () => db.query('select public.grifon_fixture_result_list()'))).rejects.toThrow('permission denied');
  });

  it.each(['cancel', 'invalidate'] as const)('does not publish a result when %s wins before the last worker step', async action => {
    const job = await intent(); await start(job); await tick();
    const pending = await get(job); await command(job, action); await finish(job);
    expect(await tick()).toBe(0); expect(await get(job)).toEqual(pending); expect(await list()).toEqual([]);
    expect((await rows()).rows).toHaveLength(1);
  });

  it('keeps a failed result pending and publishes once after guarded retry, including command replay', async () => {
    const job = await intent('retry-chat', ownerA, true, 'second-clip-fails-once'); await start(job); await tick(); await tick();
    const failed = await rpc<Wire>('fixture_get', [job.requestId]);
    expect(failed.queue.status).toBe('failed'); expect((await get(job))!.status).toBe('PENDING'); expect(await list()).toEqual([]);
    await expect(command(job, 'retry', failed.queue.revision - 1)).rejects.toThrow('REVISION_CONFLICT');
    const id = randomUUID(), retried = await command(job, 'retry', failed.queue.revision, id);
    expect(await command(job, 'retry', failed.queue.revision, id)).toEqual(retried);
    await finish(job); expect((await get(job))!.status).toBe('READY'); expect((await rows()).rows).toHaveLength(1);
  });

  it('preserves the historical READY result after later invalidation of its old reviewed inputs', async () => {
    const job = await intent(); await start(job); await finish(job); const ready = await get(job);
    await command(job, 'invalidate');
    expect(await get(job)).toEqual(ready); expect(await list()).toEqual([ready]);
  });

  it('rolls back completion and READY together, and a later tick can complete once', async () => {
    const job = await intent(); await start(job);
    const accepted = await rpc<Wire>('fixture_get', [job.requestId]);
    for (let index = 1; index < accepted.queue.steps.length; index++) await tick();
    const pending = await get(job);
    await db.exec('begin'); await tick(); expect((await get(job))!.status).toBe('READY'); await db.exec('rollback');
    expect(await get(job)).toEqual(pending); expect((await rpc<Wire>('fixture_get', [job.requestId])).queue.status).toBe('running');
    await tick(); expect((await get(job))!.status).toBe('READY'); expect((await rows()).rows).toHaveLength(1);
  });

  it('does not backfill pre-migration linked jobs, replayed historical starts or any legacy job', async () => {
    const historical = await setup();
    try {
      const complete = await intent('old-complete', ownerA, true, 'normal', historical), running = await intent('old-running', ownerA, true, 'normal', historical);
      await start(complete, historical); await finish(complete, historical); await start(running, historical);
      await historical.exec(readFileSync(schemaPath, 'utf8'));
      await start(complete, historical); await start(running, historical); await finish(running, historical);
      expect(await get(complete, ownerA, historical)).toBeNull(); expect(await get(running, ownerA, historical)).toBeNull(); expect(await list(ownerA, historical)).toEqual([]);
      const legacy = await intent('new-legacy', ownerA, false, 'normal', historical); await start(legacy, historical); await finish(legacy, historical);
      expect(await get(legacy, ownerA, historical)).toBeNull(); expect(await list(ownerA, historical)).toEqual([]);
    } finally { await historical.close(); }
  });

  it('rejects pending identity tampering, different fixture versions and all READY metadata edits', async () => {
    const job = await intent(); await start(job);
    await expect(db.query("update grifon_fixture.results set manifest_id = 'different' where request_id = $1", [job.requestId])).rejects.toThrow(/IMMUTABLE|check constraint/);
    await expect(db.query("update grifon_fixture.results set fixture_version = 'v2' where request_id = $1", [job.requestId])).rejects.toThrow(/IMMUTABLE|check constraint/);
    await finish(job); const ready = await get(job);
    await expect(db.query('update grifon_fixture.results set ready_at = ready_at + 1 where request_id = $1', [job.requestId])).rejects.toThrow('FIXTURE_RESULT_IMMUTABLE');
    expect(await get(job)).toEqual(ready);
  });

  it('adds only scoped read grants and triggers while preserving existing functions, grants, worker and job columns', async () => {
    const after = (await definitions(db)).rows;
    for (const definition of originalFunctions) expect(after.find(item => item.schema === definition.schema && item.name === definition.name)).toEqual(definition);
    const columns = (await db.query<{ column_name: string }>("select column_name from information_schema.columns where table_schema = 'grifon_fixture' and table_name = 'jobs' order by ordinal_position")).rows.map(item => item.column_name);
    expect(columns).toEqual(['request_id', 'owner_id', 'owner_chat_id', 'intent_text', 'queue', 'updated_at', 'next_due_at']);
    expect((await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where oid = 'grifon_fixture.results'::regclass")).rows[0].relrowsecurity).toBe(true);
    for (const role of ['authenticated', 'anon'] as const) {
      await expect(asRole(role, ownerA, () => db.query('select * from grifon_fixture.results'))).rejects.toThrow('permission denied');
      await expect(asRole(role, ownerA, () => db.query('select grifon_fixture.result_accept_job()'))).rejects.toThrow('permission denied');
    }
    const wrappers = (await db.query<{ prosecdef: boolean }>("select prosecdef from pg_proc join pg_namespace on pg_namespace.oid = pronamespace where nspname = 'public' and proname in ('grifon_fixture_result_get','grifon_fixture_result_list')")).rows;
    expect(wrappers).toHaveLength(2); expect(wrappers.every(item => !item.prosecdef)).toBe(true);
    const sql = readFileSync(schemaPath, 'utf8');
    expect(sql).not.toMatch(/cron\.|storage\.|public\.videos|production|create schema|alter table grifon_fixture\.jobs|grant .* on all/);
  });
});

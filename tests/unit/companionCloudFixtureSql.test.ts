import { readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createReferenceDraft } from '../../services/companionReferenceDraft.js';
import { confirmSampleReview, createSampleReview } from '../../services/companionReferenceReview.js';
import { createFixtureJobIntent, type FixtureJobIntent } from '../../services/companionFixtureJobs.js';
import { createReferenceQueue, isReferenceQueue, transitionReferenceQueue, invalidateReferenceQueue, type ReferenceQueue } from '../../services/companionReferenceQueue.js';

const ownerA = '11111111-1111-4111-8111-111111111111';
const ownerB = '22222222-2222-4222-8222-222222222222';
const unenrolled = '33333333-3333-4333-8333-333333333333';
const schemaPath = 'supabase/companion_cloud_fixtures.sql';
interface Wire { runtime: string; intentText: string; queue: Omit<ReferenceQueue, 'plan'>; updatedAt: number; nextDueAt: number | null }
let db: PGlite;

async function rpc<T = Wire>(name: string, parameters: unknown[] = [], owner = ownerA): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [owner]);
  await db.exec('set role authenticated');
  try {
    const { rows } = await db.query<{ value: T }>(`select public.grifon_fixture_${name}(${parameters.map((_, index) => `$${index + 1}`).join(',')}) as value`, parameters);
    return rows[0].value;
  } finally { await db.exec('reset role'); }
}
async function intent(chat = 'chat-a', scenario: FixtureJobIntent['scenario'] = 'normal', owner = ownerA, silent = false) {
  const hash = 'a'.repeat(64), draft = createReferenceDraft();
  if (silent) draft.speechMode = 'silent';
  const plan = confirmSampleReview(createSampleReview(draft, hash, 0), hash, 0);
  return createFixtureJobIntent(owner, chat, plan, scenario);
}
const identity = (value: FixtureJobIntent) => JSON.stringify([value.ownerId, value.ownerChatId, value.plan.confirmation!.planSnapshot]);
const start = (value: FixtureJobIntent, owner = value.ownerId) => rpc('start', [JSON.stringify(value), identity(value)], owner);
const queue = (wire: Wire): ReferenceQueue => ({ ...wire.queue, plan: (JSON.parse(wire.intentText) as FixtureJobIntent).plan });
async function tick() {
  await db.exec('update grifon_fixture.jobs set next_due_at = 0 where next_due_at is not null');
  return (await db.query<{ value: number }>('select grifon_fixture.tick() as value')).rows[0].value;
}
async function eventRevisions(requestId: string) {
  return (await db.query<{ revision: number }>('select revision from grifon_fixture.events where request_id = $1 order by revision', [requestId])).rows.map(row => row.revision);
}

describe('cloud fixture SQL contract', () => {
  it('keeps fixture storage and activation in separate reviewable migrations', () => {
    const schema = readFileSync('supabase/companion_cloud_fixtures.sql', 'utf8');
    const activation = readFileSync('supabase/companion_cloud_fixtures_schedule.sql', 'utf8');
    expect(schema).toContain('create schema if not exists grifon_fixture');
    expect(schema).not.toContain('cron.schedule');
    expect(activation).toContain('grifon-cloud-fixture-tick');
  });
});

describe('cloud fixture PostgreSQL execution', { timeout: 30_000 }, () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid; $$;
      grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
    await db.exec(readFileSync(schemaPath, 'utf8'));
    await db.exec(readFileSync(schemaPath, 'utf8'));
  }, 30_000);
  beforeEach(async () => {
    await db.exec('reset role; truncate grifon_fixture.command_receipts, grifon_fixture.events, grifon_fixture.jobs, grifon_fixture.allowed_owners');
    await db.query('insert into grifon_fixture.allowed_owners values ($1), ($2)', [ownerA, ownerB]);
  });
  afterAll(async () => { await db?.close(); });

  it('starts once with immutable original text and never ticks on a read', async () => {
    const job = await intent(), accepted = await start(job);
    expect(accepted.runtime).toBe('supabase-cloud-fixture-v1');
    expect(accepted.intentText).toBe(JSON.stringify(job));
    expect(accepted.queue).toMatchObject({ status: 'running', revision: 2, actualCents: 0 });
    expect(accepted.queue).not.toHaveProperty('plan');
    expect(isReferenceQueue(queue(accepted))).toBe(true);
    expect(await start(job)).toEqual(accepted);
    await db.exec('update grifon_fixture.jobs set next_due_at = 0');
    const read = await rpc('get', [job.requestId]);
    expect(read.queue).toEqual(accepted.queue);
    expect((await rpc<Wire[]>('list')).map(value => value.intentText)).toEqual([accepted.intentText]);
    expect(await eventRevisions(job.requestId)).toEqual([2]);
    await expect(start({ ...job, scenario: 'second-clip-fails-once' })).rejects.toThrow('INTENT_CONFLICT');
    expect(await eventRevisions(job.requestId)).toEqual([2]);
  });

  it('rejects alternate identity encodings for the same cancelled plan', async () => {
    const job = await intent();
    await start(job);
    await rpc('command', [job.requestId, 'cancel', randomUUID(), null]);
    const alternate = JSON.stringify(JSON.parse(identity(job)), null, 2);
    const forged = { ...job, requestId: createHash('sha256').update(alternate).digest('hex') };
    await expect(rpc('start', [JSON.stringify(forged), alternate])).rejects.toThrow('INVALID_IDENTITY_OR_CONFIRMATION');
    expect((await rpc<Wire[]>('list')).map(value => JSON.parse(value.intentText).requestId)).toEqual([job.requestId]);
  });

  it('shares canonical identity bytes for Unicode, quotes and escaped text', async () => {
    const hash = 'a'.repeat(64), draft = createReferenceDraft();
    draft.productName = 'Coffee ☕ “brand” \\ label\nnext line';
    const review = createSampleReview(draft, hash, 0);
    review.direction += ' Unicode café 漢字 😀 / "quoted" \\ path\nline\tend';
    const plan = confirmSampleReview(review, hash, 0);
    const job = await createFixtureJobIntent(ownerA, 'chat-漢字-"quoted"-\\', plan);
    expect((await start(job)).intentText).toBe(JSON.stringify(job));
    expect((await start(job)).queue.id).toBe((await rpc('get', [job.requestId])).queue.id);
  });

  it.each(['pretty', 'reordered'] as const)('rejects a re-signed %s plan snapshot without forking the cancelled job', async encoding => {
    const job = await intent();
    await start(job);
    await rpc('command', [job.requestId, 'cancel', randomUUID(), null]);
    const forged = structuredClone(job), snapshot = JSON.parse(forged.plan.confirmation!.planSnapshot);
    forged.plan.confirmation!.planSnapshot = encoding === 'pretty' ? JSON.stringify(snapshot, null, 2)
      : JSON.stringify(Object.fromEntries(Object.entries(snapshot).reverse()));
    forged.requestId = createHash('sha256').update(identity(forged)).digest('hex');
    await expect(start(forged)).rejects.toThrow('INVALID_IDENTITY_OR_CONFIRMATION');
    expect((await rpc<Wire[]>('list')).map(value => JSON.parse(value.intentText).requestId)).toEqual([job.requestId]);
  });

  it('rejects duplicate object keys in a re-signed raw plan and snapshot', async () => {
    const job = await intent();
    await start(job);
    await rpc('command', [job.requestId, 'cancel', randomUUID(), null]);
    const forged = structuredClone(job);
    forged.plan.confirmation!.planSnapshot = forged.plan.confirmation!.planSnapshot.replace('{', '{"direction":"duplicate",');
    forged.requestId = createHash('sha256').update(identity(forged)).digest('hex');
    const rawIntent = JSON.stringify(forged).replace('"plan":{', '"plan":{"direction":"duplicate",');
    await expect(rpc('start', [rawIntent, identity(forged)])).rejects.toThrow('INVALID_PLAN_OBJECT');
    expect((await rpc<Wire[]>('list')).map(value => JSON.parse(value.intentText).requestId)).toEqual([job.requestId]);
  });

  it.each(['pretty envelope', 'integer decimal spelling'])('accepts %s while preserving the canonical confirmed plan', async encoding => {
    const job = await intent();
    const rawIntent = encoding === 'pretty envelope' ? JSON.stringify(job, null, 2)
      : JSON.stringify(job).replaceAll('"version":1', '"version":1.0').replaceAll('"revision":1', '"revision":1e0');
    const accepted = await rpc('start', [rawIntent, identity(job)]);
    expect(accepted.intentText).toBe(rawIntent);
    expect(isReferenceQueue(queue(accepted))).toBe(true);
    expect((await start(job)).queue.id).toBe(accepted.queue.id);
  });

  it('rejects unsupported fractional or integer-index plan extensions', async () => {
    for (const [extension, error] of [[{ fractionalExtension: 1.5 }, 'INVALID_PLAN_NUMBER'], [{ '1': 'integer-index extension' }, 'INVALID_PLAN_OBJECT']] as const) {
      const original = await intent(), extended = Object.assign(structuredClone(original.plan), extension);
      extended.confirmation = null;
      const job = await createFixtureJobIntent(ownerA, 'extensions', confirmSampleReview(extended, extended.inputHash, 0));
      await expect(start(job)).rejects.toThrow(error);
    }
    expect(await rpc<Wire[]>('list')).toEqual([]);
  });

  it('rejects UTF-16 over-limit and JavaScript-whitespace-only confirmed text', async () => {
    const mutations: ((plan: FixtureJobIntent['plan']) => void)[] = [
      plan => { plan.direction = '😀'.repeat(3000); },
      plan => { plan.direction = '\u00a0'; },
      plan => { plan.scenes[0].visual = '\ufeff\u2003'; },
      plan => { plan.scenes[0].script = '\u202f\u3000'; },
    ];
    for (const mutate of mutations) {
      const job = await intent(); mutate(job.plan);
      const { confirmation, ...unconfirmed } = job.plan;
      confirmation!.planSnapshot = JSON.stringify(unconfirmed);
      job.requestId = createHash('sha256').update(identity(job)).digest('hex');
      await expect(start(job)).rejects.toThrow(/INVALID_INTENT|INVALID_SCENE/);
    }
    expect(await rpc<Wire[]>('list')).toEqual([]);
  });

  it('accepts legal supplementary characters and preserves non-blank whitespace-wrapped text', async () => {
    const original = await intent(), plan = structuredClone(original.plan);
    plan.direction = '😀'.repeat(2000);
    plan.scenes[0].visual = '\u00a0\ufeffVisible detail\u2003';
    plan.scenes[0].script = '\u202fSpoken line\u3000';
    plan.confirmation = null;
    const job = await createFixtureJobIntent(ownerA, 'unicode-limits', confirmSampleReview(plan, plan.inputHash, 0));
    const accepted = await start(job);
    expect(isReferenceQueue(queue(accepted))).toBe(true);
    expect(JSON.parse(accepted.intentText).plan.direction).toBe(plan.direction);
  });

  it.each([false, true])('matches the pure domain through completion (silent=%s)', async silent => {
    const job = await intent('complete', 'normal', ownerA, silent), accepted = await start(job);
    let expected = transitionReferenceQueue(createReferenceQueue(job.plan, 0, 'normal'), 'start', job.plan, 0);
    expected.id = accepted.queue.id;
    expect(queue(accepted)).toEqual(expected);
    for (let index = 0; index < expected.steps.length; index++) {
      expect(await tick()).toBe(1);
      expected = transitionReferenceQueue(expected, 'tick', job.plan, 0);
      const actual = await rpc('get', [job.requestId]);
      expect(queue(actual)).toEqual(expected);
      expect(isReferenceQueue(queue(actual))).toBe(true);
      if (expected.status === 'running') expect(actual.nextDueAt! - actual.updatedAt).toBe(1200);
    }
    const complete = await rpc('get', [job.requestId]);
    expect(complete.nextDueAt).toBeNull();
    expect(await tick()).toBe(0);
    expect(await start(job)).toEqual(complete);
    expect(await eventRevisions(job.requestId)).toEqual(Array.from({ length: expected.steps.length + 1 }, (_, index) => index + 2));
  });

  it('advances one due step only, never catches up, and batches at most twenty', async () => {
    const job = await intent();
    await start(job);
    expect(await tick()).toBe(1);
    expect((await db.query<{ value: number }>('select grifon_fixture.tick() as value')).rows[0].value).toBe(0);
    expect((await rpc('get', [job.requestId])).queue.revision).toBe(3);
    // Administrator-created copies exercise the worker batch bound, not the RPC owner quota.
    await db.exec(`insert into grifon_fixture.jobs select lpad(n::text, 64, '0'), owner_id, owner_chat_id || n,
      intent_text, queue, updated_at, 0 from grifon_fixture.jobs cross join generate_series(1, 25) n`);
    expect(await tick()).toBe(20);
    expect((await db.query<{ value: number }>('select count(*)::integer as value from grifon_fixture.jobs where next_due_at = 0')).rows[0].value).toBe(6);
  });

  it('fails only clip two, retries once with a revision guard, and persists command receipts', async () => {
    const job = await intent('retry', 'second-clip-fails-once');
    let expected = queue(await start(job));
    await tick(); expected = transitionReferenceQueue(expected, 'tick', job.plan, 0);
    await tick(); expected = transitionReferenceQueue(expected, 'tick', job.plan, 0);
    expect((await rpc('get', [job.requestId])).queue.status).toBe('failed');
    const commandId = randomUUID(), args = [job.requestId, 'retry', commandId, expected.revision];
    const accepted = await rpc('command', args);
    expected = transitionReferenceQueue(expected, 'retry', job.plan, 0);
    expect(queue(accepted)).toEqual(expected);
    expect(await rpc('command', args)).toEqual(accepted);
    await expect(rpc('command', [job.requestId, 'cancel', commandId, null])).rejects.toThrow('COMMAND_CONFLICT');
    await expect(rpc('command', [job.requestId, 'retry', randomUUID(), expected.revision - 1])).rejects.toThrow('REVISION_CONFLICT');
    await expect(rpc('command', [job.requestId, 'retry', randomUUID(), null])).rejects.toThrow('INVALID_COMMAND');
    while (expected.status === 'running') {
      await tick(); expected = transitionReferenceQueue(expected, 'tick', job.plan, 0);
    }
    expect(queue(await rpc('get', [job.requestId]))).toEqual(expected);
    expect(expected.steps.map(step => step.attempts)).toEqual([1, 2, 1, 1, 1, 1, 1, 1]);
    await expect(rpc('command', [job.requestId, 'retry', randomUUID(), expected.revision])).rejects.toThrow('RETRY_NOT_AVAILABLE');
  });

  it.each(['cancel', 'invalidate'] as const)('serializes %s across a tick without reviving a stopped job', async action => {
    const job = await intent(), accepted = await start(job);
    await tick();
    const progressed = await rpc('get', [job.requestId]);
    await expect(rpc('command', [job.requestId, action, randomUUID(), accepted.queue.revision])).rejects.toThrow('REVISION_CONFLICT');
    const commandId = randomUUID(), stopped = await rpc('command', [job.requestId, action, commandId, null]);
    let expected = transitionReferenceQueue(queue(progressed), 'cancel', job.plan, 0);
    if (action === 'invalidate') expected = invalidateReferenceQueue(expected);
    expect(queue(stopped)).toEqual(expected);
    expect(stopped.nextDueAt).toBeNull();
    expect(await tick()).toBe(0);
    expect(await start(job)).toEqual(stopped);
    expect(await rpc('command', [job.requestId, action, commandId, null])).toEqual(stopped);
    const count = (await eventRevisions(job.requestId)).length;
    await rpc('command', [job.requestId, action, randomUUID(), null]);
    expect(await eventRevisions(job.requestId)).toHaveLength(count);
  });

  it('denies foreign, anonymous and unenrolled identities and all direct storage/worker access', async () => {
    const job = await intent(); await start(job);
    expect(await rpc('get', [job.requestId], ownerB)).toBeNull();
    expect(await rpc<Wire[]>('list', [], ownerB)).toEqual([]);
    await expect(start(job, ownerB)).rejects.toThrow('INVALID_INTENT');
    await expect(rpc('command', [job.requestId, 'cancel', randomUUID(), null], ownerB)).rejects.toThrow('JOB_NOT_FOUND');
    await expect(start(await intent('not-enrolled', 'normal', unenrolled))).rejects.toThrow('FIXTURE_OWNER_REQUIRED');
    await expect(rpc('list', [], '')).rejects.toThrow('FIXTURE_OWNER_REQUIRED');
    for (const role of ['authenticated', 'anon']) {
      await db.exec(`set role ${role}`);
      try {
        for (const table of ['allowed_owners', 'jobs', 'events', 'command_receipts']) {
          await expect(db.query(`select * from grifon_fixture.${table}`)).rejects.toThrow(/permission denied/);
        }
        await expect(db.query('select grifon_fixture.tick()')).rejects.toThrow(/permission denied/);
        if (role === 'anon') await expect(db.query('select public.grifon_fixture_list()')).rejects.toThrow(/permission denied/);
      } finally { await db.exec('reset role'); }
    }
    const security = await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where relnamespace = 'grifon_fixture'::regnamespace and relkind = 'r'");
    expect(security.rows).toHaveLength(4);
    expect(security.rows.every(row => row.relrowsecurity)).toBe(true);
  });

  it('rejects malformed identity, stale or mismatched confirmation, unsafe scenes and quotes atomically', async () => {
    const valid = await intent();
    const mutations: ((value: FixtureJobIntent) => void)[] = [
      value => { value.requestId = 'f'.repeat(64); },
      value => { value.inputRevision = 4; },
      value => { value.plan.stale = true; },
      value => { value.plan.confirmation!.revision = 99; },
      value => { value.plan.confirmation!.highCents = 1; },
      value => { value.plan.confirmation!.planSnapshot = '{}'; },
      value => { value.plan.scenes[0].end = '61'; },
      value => { value.plan.scenes[1].start = '4'; },
      value => { value.plan.scenes[0].script = ''; },
      value => { value.plan.scenes[0].id = value.plan.scenes[1].id; },
      value => { value.plan.quote.items[0].lowPesos = '-1'; },
      value => { value.plan.quote.maxDemoCapPesos = '0'; },
    ];
    for (const mutate of mutations) {
      const value = structuredClone(valid); mutate(value);
      await expect(start(value)).rejects.toThrow();
    }
    // Re-sign malformed scene/quote plans so their own validation is reached,
    // rather than being rejected only by the immutable confirmation snapshot.
    for (const mutate of mutations.slice(6)) {
      const value = structuredClone(valid); mutate(value);
      const { confirmation, ...unconfirmed } = value.plan;
      confirmation!.planSnapshot = JSON.stringify(unconfirmed);
      value.requestId = createHash('sha256').update(identity(value)).digest('hex');
      await expect(start(value)).rejects.toThrow(/INVALID_SCENE|INVALID_QUOTE|INVALID_CONFIRMED_QUOTE/);
    }
    await expect(rpc('start', [JSON.stringify(valid), JSON.stringify(['foreign', 'chat', 'snapshot'])])).rejects.toThrow('INVALID_IDENTITY_OR_CONFIRMATION');
    await expect(rpc('start', ['{broken', identity(valid)])).rejects.toThrow();
    expect(await rpc<Wire[]>('list')).toEqual([]);
    expect(await eventRevisions(valid.requestId)).toEqual([]);
  });

  it('enforces owner caps and active-chat exclusion, retaining failed jobs until explicitly stopped', async () => {
    const failed = await intent('same-chat', 'second-clip-fails-once'); await start(failed);
    await tick(); await tick();
    await expect(start(await intent('same-chat'))).rejects.toThrow('INTENT_CONFLICT');
    const changedPlan = structuredClone(failed.plan);
    changedPlan.direction = 'A different plan while the failed job retains retry authority.';
    changedPlan.confirmation = null;
    const changedIntent = await createFixtureJobIntent(ownerA, 'same-chat', confirmSampleReview(changedPlan, changedPlan.inputHash, 0));
    await expect(start(changedIntent)).rejects.toThrow('ACTIVE_JOB_CONFLICT');
    await start(await intent('second')); await start(await intent('third'));
    await expect(start(await intent('fourth'))).rejects.toThrow('FIXTURE_OWNER_LIMIT');
    await rpc('command', [failed.requestId, 'invalidate', randomUUID(), null]);
    const replacement = await intent('same-chat');
    replacement.plan.direction = 'Replacement';
    replacement.plan.confirmation = null;
    replacement.plan = confirmSampleReview(replacement.plan, replacement.plan.inputHash, 0);
    const changed = await createFixtureJobIntent(ownerA, 'same-chat', replacement.plan);
    await start(changed);
    await db.exec(`update grifon_fixture.jobs set queue = queue || '{"status":"cancelled"}'::jsonb, next_due_at = null;
      insert into grifon_fixture.jobs select lpad((1000+n)::text, 64, '0'), owner_id, 'archived-' || n,
      intent_text, queue, updated_at, null from grifon_fixture.jobs cross join generate_series(1, 96) n where request_id = '${changed.requestId}'`);
    await expect(start(await intent('over-total-cap'))).rejects.toThrow('FIXTURE_OWNER_LIMIT');
    expect(await rpc<Wire[]>('list')).toHaveLength(100);
  });

  it('rolls back a transition and its event together when the transaction fails', async () => {
    const job = await intent(); const accepted = await start(job);
    await db.exec('begin');
    await tick();
    expect((await db.query<{ value: number }>('select (queue->>\'revision\')::integer as value from grifon_fixture.jobs')).rows[0].value).toBe(3);
    await db.exec('rollback');
    expect(await rpc('get', [job.requestId])).toEqual(accepted);
    expect(await eventRevisions(job.requestId)).toEqual([2]);
  });
});

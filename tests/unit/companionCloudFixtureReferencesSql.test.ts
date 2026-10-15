import { readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createReferenceDraft, type CompanionReferenceDraft } from '../../services/companionReferenceDraft.js';
import { confirmSampleReview, createSampleReview, type ReferenceReview } from '../../services/companionReferenceReview.js';
import type { FixtureJobIntent } from '../../services/companionFixtureJobs.js';
import type { ReferenceQueue } from '../../services/companionReferenceQueue.js';

const ownerA = '11111111-1111-4111-8111-111111111111';
const ownerB = '22222222-2222-4222-8222-222222222222';
const unenrolled = '33333333-3333-4333-8333-333333333333';
const bucket = 'grifon-fixture-reference-media';
const schemaPath = 'supabase/companion_cloud_fixture_references.sql';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
interface CloudLink { version: 1; saveId: string; inputHash: string }
type Intent = FixtureJobIntent & { cloudReference?: CloudLink };
interface Wire { runtime: string; intentText: string; queue: Omit<ReferenceQueue, 'plan'>; updatedAt: number; nextDueAt: number | null }
interface Metadata { id: string; name: string; width: number; height: number; duration?: number; role?: 'product' | 'character' | 'clothing' }
interface Manifest { version: 1; draft: Omit<CompanionReferenceDraft, 'referenceVideo' | 'photos'> & { referenceVideo: Metadata | null; photos: Metadata[] }; media: (Metadata & { slot: string; size: number; type: string; sha256: string })[]; inputHash: string }
interface Saved { owner: string; saveId: string; sourceChatId: string; manifestText: string; identityText: string; manifest: Manifest }
let db: PGlite;

function manifest(): Manifest {
  const video = { id: 'reference-id', name: 'fixture-reference.webm', width: 320, height: 240, duration: 2.5 };
  const photos = Array.from({ length: 5 }, (_, index) => ({ id: `photo-${index}`, name: `fixture-${index}.png`, width: 32, height: 24, role: (['character', 'product', 'clothing', 'product', 'character'] as const)[index] }));
  return {
    version: 1,
    draft: { ...createReferenceDraft(), brief: 'Show the coffee ritual.', brandName: 'Fixture brand', productName: 'Fixture coffee', audience: 'Busy creators', offer: 'Sample bundle', callToAction: 'View the details', instructions: 'Keep the label clear.', referenceLanguage: 'English', referenceVideo: video, photos, voice: { id: 'voice-1', name: 'Saved private voice', source: 'private' } },
    media: [{ slot: 'reference', ...video, type: 'video/webm', size: 321, sha256: 'a'.repeat(64) }, ...photos.map((photo, index) => ({ slot: `photo-${index}`, ...photo, type: 'image/png', size: 123 + index, sha256: 'b'.repeat(64) }))],
    inputHash: 'c'.repeat(64),
  };
}
function saved(value = manifest(), sourceChatId = 'saved-source-chat', owner = ownerA): Saved {
  const manifestText = JSON.stringify(value), identityText = JSON.stringify([owner, sourceChatId, manifestText]);
  return { owner, saveId: hash(identityText), sourceChatId, manifestText, identityText, manifest: value };
}
function review(value: Manifest): ReferenceReview {
  const draft: CompanionReferenceDraft = {
    ...value.draft,
    referenceVideo: value.draft.referenceVideo ? { ...value.draft.referenceVideo, blob: new Blob(['video'], { type: 'video/webm' }) } : null,
    photos: value.draft.photos.map(photo => ({ ...photo, role: photo.role!, blob: new Blob(['photo'], { type: 'image/png' }) })),
  };
  return confirmSampleReview(createSampleReview(draft, value.inputHash, 0), value.inputHash, 0);
}
function identity(value: Intent): string {
  const items = [value.ownerId, value.ownerChatId, value.plan.confirmation!.planSnapshot];
  if (value.cloudReference) items.push(value.cloudReference.saveId);
  return JSON.stringify(items);
}
function resign(value: Intent): Intent {
  const { confirmation, ...plan } = value.plan;
  value.plan.confirmation = { ...confirmation!, planSnapshot: JSON.stringify(plan) };
  value.requestId = hash(identity(value));
  return value;
}
function intent(item?: Saved, chat = 'reopened-chat', owner = item?.owner ?? ownerA, scenario: Intent['scenario'] = 'normal'): Intent {
  const plan = review(item?.manifest ?? manifest());
  const result: Intent = { version: 1, fixture: true, requestId: '', ownerId: owner, ownerChatId: chat, inputRevision: 0, plan, scenario };
  if (item) result.cloudReference = { version: 1, saveId: item.saveId, inputHash: item.manifest.inputHash };
  return resign(result);
}
async function asRole<T>(role: 'authenticated' | 'anon', owner: string, action: () => Promise<T>, operation = ''): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false), set_config('storage.operation', $2, false)", [owner, operation]);
  await db.exec(`set role ${role}`);
  try { return await action(); } finally { await db.exec('reset role'); }
}
async function rpc<T = Wire>(name: string, parameters: unknown[] = [], owner = ownerA): Promise<T> {
  return asRole('authenticated', owner, async () => (await db.query<{ value: T }>(`select public.grifon_${name}(${parameters.map((_, index) => `$${index + 1}`).join(',')}) as value`, parameters)).rows[0].value);
}
const start = (value: Intent, owner = value.ownerId, identityText = identity(value)) => rpc('fixture_start', [JSON.stringify(value), identityText], owner);
const get = (value: Intent, owner = value.ownerId) => rpc<Wire | null>('fixture_get', [value.requestId], owner);
const command = (value: Intent, action: string, revision: number | null = null, owner = value.ownerId, commandId = randomUUID()) => rpc('fixture_command', [value.requestId, action, commandId, revision], owner);
const reserve = (item: Saved) => rpc('reference_reserve', [item.saveId, item.sourceChatId, item.manifestText, item.identityText], item.owner);
async function complete(item: Saved): Promise<void> {
  await reserve(item);
  for (const media of item.manifest.media) {
    await asRole('authenticated', item.owner, () => db.query('insert into storage.objects(bucket_id, name, owner, owner_id, metadata) values ($1, $2, $3, $4, $5::jsonb)',
      [bucket, `${item.owner}/${item.saveId}/${media.slot}`, item.owner, item.owner, JSON.stringify({ size: media.size, mimetype: media.type, eTag: `etag-${media.slot}` })]), 'storage.object.upload');
  }
  await rpc('reference_commit', [item.saveId], item.owner);
}
async function tick(): Promise<number> {
  await db.exec('update grifon_fixture.jobs set next_due_at = 0 where next_due_at is not null');
  return (await db.query<{ value: number }>('select grifon_fixture.tick() as value')).rows[0].value;
}
async function jobCount(): Promise<number> {
  return (await db.query<{ count: number }>('select count(*)::integer as count from grifon_fixture.jobs')).rows[0].count;
}

describe('linked cloud fixture PostgreSQL execution', { timeout: 30_000 }, () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid; $$;
      create function storage.operation() returns text language sql stable as $$ select current_setting('storage.operation', true); $$;
      create function storage.allow_only_operation(expected text) returns boolean language sql stable as $$
        select coalesce(replace(storage.operation(), 'storage.', '') = replace(expected, 'storage.', ''), false); $$;
      grant usage on schema auth, storage to authenticated, anon; grant execute on function auth.uid() to authenticated, anon;
      create table storage.buckets(id text primary key, name text not null, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text not null, owner uuid, owner_id text, metadata jsonb, unique(bucket_id, name));
      alter table storage.objects enable row level security;
      grant select, insert, update, delete on storage.objects to authenticated, anon;`);
    await db.exec(readFileSync('supabase/companion_cloud_fixtures.sql', 'utf8'));
    await db.exec(readFileSync('supabase/companion_cloud_references.sql', 'utf8'));
    await db.exec(readFileSync(schemaPath, 'utf8'));
    await db.exec(readFileSync(schemaPath, 'utf8'));
  }, 30_000);
  beforeEach(async () => {
    await db.exec('reset role; truncate grifon_fixture.command_receipts, grifon_fixture.events, grifon_fixture.jobs, storage.objects, grifon_fixture.reference_snapshots, grifon_fixture.allowed_owners');
    await db.query('insert into grifon_fixture.allowed_owners values ($1), ($2)', [ownerA, ownerB]);
  });
  afterAll(async () => { await db?.close(); });

  it('starts once with the fourth identity item and freezes the exact original cloud association', async () => {
    const item = saved(); await complete(item);
    const job = intent(item), accepted = await start(job);
    expect(job.requestId).toBe(hash(JSON.stringify([ownerA, 'reopened-chat', job.plan.confirmation!.planSnapshot, item.saveId])));
    expect(accepted.intentText).toBe(JSON.stringify(job));
    expect(accepted.queue).toMatchObject({ revision: 2, status: 'running', actualCents: 0 });
    expect(accepted.queue).not.toHaveProperty('plan');
    expect(await start(job)).toEqual(accepted);
    expect(await jobCount()).toBe(1);
    expect((await db.query('select * from grifon_fixture.events')).rows).toHaveLength(1);
    expect(JSON.parse((await get(job))!.intentText).cloudReference).toEqual({ version: 1, saveId: item.saveId, inputHash: 'c'.repeat(64) });
    const metadata = (await db.query<{ owner: string; owner_id: string }>('select owner, owner_id from storage.objects')).rows;
    expect(metadata).toHaveLength(6);
    expect(metadata.every(row => row.owner === ownerA && row.owner_id === ownerA)).toBe(true);
  });

  it('rejects a legacy-signed cloud association instead of silently treating it as an unlinked job', async () => {
    const job = intent(saved()), legacyIdentity = JSON.stringify([job.ownerId, job.ownerChatId, job.plan.confirmation!.planSnapshot]);
    job.requestId = hash(legacyIdentity);
    await expect(start(job, ownerA, legacyIdentity)).rejects.toThrow(/INVALID_IDENTITY_OR_CONFIRMATION|CLOUD_REFERENCE_NOT_FOUND/);
    expect(await jobCount()).toBe(0);
  });

  it('preserves exact legacy identity and old read, retry, cancel and zero-spend behavior', async () => {
    const job = intent(undefined, 'legacy-chat', ownerA, 'second-clip-fails-once'), accepted = await start(job);
    expect(job.requestId).toBe(hash(JSON.stringify([ownerA, 'legacy-chat', job.plan.confirmation!.planSnapshot])));
    expect(accepted.intentText).not.toContain('cloudReference');
    await tick(); await tick();
    const failed = (await get(job))!;
    expect(failed.queue.status).toBe('failed');
    const retry = await command(job, 'retry', failed.queue.revision);
    expect(retry.queue.steps[1]).toMatchObject({ attempts: 2, status: 'running' });
    const cancelled = await command(job, 'cancel');
    expect(cancelled.queue.status).toBe('cancelled');
    expect(await tick()).toBe(0);
    expect(await start(job)).toEqual(cancelled);
    expect((await get(job))!.queue.actualCents).toBe(0);
    expect(await get(job, ownerB)).toBeNull();
    await expect(command(job, 'cancel', null, ownerB)).rejects.toThrow('JOB_NOT_FOUND');
  });

  it('does not require Storage rows or snapshots for legacy jobs', async () => {
    expect((await start(intent())).queue.status).toBe('running');
    expect((await db.query('select * from storage.objects')).rows).toEqual([]);
    expect((await db.query('select * from grifon_fixture.reference_snapshots')).rows).toEqual([]);
  });

  it.each(['missing', 'pending', 'other owner'] as const)('rejects a %s snapshot atomically', async state => {
    const item = saved(manifest(), 'source', state === 'other owner' ? ownerB : ownerA);
    if (state === 'pending') await reserve(item);
    if (state === 'other owner') await complete(item);
    const job = intent(item, 'reopened-chat', ownerA);
    await expect(start(job)).rejects.toThrow('CLOUD_REFERENCE_NOT_FOUND');
    expect(await jobCount()).toBe(0);
    expect((await db.query('select * from grifon_fixture.events')).rows).toEqual([]);
  });

  it.each([null, [], 'invalid', {}, { version: 2, saveId: 'd'.repeat(64), inputHash: 'c'.repeat(64) },
    { version: 1, saveId: 'D'.repeat(64), inputHash: 'c'.repeat(64) }, { version: 1, saveId: 'd'.repeat(64), inputHash: null },
    { version: 1, saveId: 'd'.repeat(64), inputHash: 'c'.repeat(64), authority: 'paid' }])('rejects malformed cloudReference %j', async link => {
    const job = intent();
    const raw = JSON.stringify({ ...job, cloudReference: link });
    await expect(rpc('fixture_start', [raw, identity(job)])).rejects.toThrow('INVALID_CLOUD_REFERENCE');
    expect(await jobCount()).toBe(0);
  });

  it.each(['link keys', 'envelope keys'] as const)('rejects duplicated cloud %s', async duplicated => {
    const item = saved(); await complete(item);
    const job = intent(item);
    const raw = duplicated === 'link keys' ? JSON.stringify(job).replace('"cloudReference":{', '"cloudReference":{"version":1,')
      : JSON.stringify(job).replace('"cloudReference":', '"cloudReference":null,"cloudReference":');
    await expect(rpc('fixture_start', [raw, identity(job)])).rejects.toThrow('INVALID_CLOUD_REFERENCE');
    expect(await jobCount()).toBe(0);
  });

  it.each(['link hash', 'plan hash', 'voice id', 'voice name', 'voice source', 'null voice', 'extra voice key', 'output language', 'adaptation mode', 'speech mode'] as const)
  ('rejects a re-signed %s mismatch', async field => {
    const item = saved(); await complete(item);
    const job = intent(item);
    if (field === 'link hash') job.cloudReference!.inputHash = 'e'.repeat(64);
    if (field === 'plan hash') { job.plan.inputHash = 'e'.repeat(64); job.plan.confirmation!.inputHash = job.plan.inputHash; }
    if (field === 'voice id') job.plan.voice!.id = 'different-id';
    if (field === 'voice name') job.plan.voice!.name = 'Different voice';
    if (field === 'voice source') job.plan.voice!.source = 'curated';
    if (field === 'null voice') job.plan.voice = null;
    if (field === 'extra voice key') Object.assign(job.plan.voice!, { extra: true });
    if (field === 'output language') job.plan.outputLanguage = 'English';
    if (field === 'adaptation mode') job.plan.adaptationMode = 'close';
    if (field === 'speech mode') { job.plan.speechMode = 'silent'; job.plan.scenes.forEach(scene => { scene.script = ''; }); }
    resign(job);
    await expect(start(job)).rejects.toThrow('CLOUD_REFERENCE_MISMATCH');
    expect(await jobCount()).toBe(0);
  });

  it.each(['Brief', 'Brand', 'Product or service', 'Audience', 'Offer', 'Call to action', 'Instructions', 'reordered', 'missing', 'extra', 'extra key'] as const)
  ('rejects altered ordered facts: %s', async changed => {
    const item = saved(); await complete(item);
    const job = intent(item);
    if (changed === 'reordered') job.plan.facts.reverse();
    else if (changed === 'missing') job.plan.facts.pop();
    else if (changed === 'extra') job.plan.facts.push({ label: 'Other', value: 'Other' });
    else if (changed === 'extra key') Object.assign(job.plan.facts[0], { extra: true });
    else job.plan.facts.find(fact => fact.label === changed)!.value += ' changed';
    resign(job);
    await expect(start(job)).rejects.toThrow('CLOUD_REFERENCE_MISMATCH');
    expect(await jobCount()).toBe(0);
  });

  it.each(['defaults', 'explicit close and silent', 'null voice', 'link-only'] as const)('accepts matching %s without inventing missing media or voice', async variant => {
    const value = manifest();
    if (variant === 'explicit close and silent') { value.draft.adaptationMode = 'close'; value.draft.speechMode = 'silent'; }
    if (variant === 'null voice') value.draft.voice = null;
    if (variant === 'link-only') { value.draft.referenceVideo = null; value.draft.photos = []; value.draft.referenceLink = 'https://example.com/reference'; value.media = []; }
    const item = saved(value); await complete(item);
    const job = intent(item), accepted = await start(job);
    expect(accepted.queue.status).toBe('running');
    expect(accepted.queue.steps.some(step => step.kind === 'voice')).toBe(variant !== 'explicit close and silent');
  });

  it.each(['reference', 'photo-0', 'photo-4'] as const)('rechecks a deleted required %s object before start', async slot => {
    const item = saved(); await complete(item);
    await db.query('delete from storage.objects where name = $1', [`${ownerA}/${item.saveId}/${slot}`]);
    await expect(start(intent(item))).rejects.toThrow('REFERENCE_MEDIA_INCOMPLETE');
    expect(await jobCount()).toBe(0);
  });

  it.each([{ size: 124, mimetype: 'image/png' }, { size: '123', mimetype: 'image/png' }, { size: 123, mimetype: 'image/jpeg' }, { size: null, mimetype: 'image/png' }, {}])
  ('rechecks native object size and MIME against the committed manifest: %j', async metadata => {
    const item = saved(); await complete(item);
    await db.query('update storage.objects set metadata = $1::jsonb where name = $2', [JSON.stringify(metadata), `${ownerA}/${item.saveId}/photo-0`]);
    await expect(start(intent(item))).rejects.toThrow('REFERENCE_MEDIA_MISMATCH');
    expect(await jobCount()).toBe(0);
  });

  it('fails closed on an administrator-corrupted committed manifest', async () => {
    const item = saved(); await complete(item);
    await db.query("update grifon_fixture.reference_snapshots set manifest_text = '{}' where save_id = $1", [item.saveId]);
    await expect(start(intent(item))).rejects.toThrow('INVALID_REFERENCE_MANIFEST');
    expect(await jobCount()).toBe(0);
  });

  it('freezes the first association when another snapshot with identical inputs is later saved', async () => {
    const first = saved(), second = saved(manifest(), 'another-source-chat'); await complete(first); await complete(second);
    const job = intent(first), accepted = await start(job), rebound = intent(second);
    expect(rebound.requestId).not.toBe(job.requestId);
    await expect(start(rebound)).rejects.toThrow('ACTIVE_JOB_CONFLICT');
    expect(await get(job)).toEqual(accepted);
    expect(JSON.parse((await get(job))!.intentText).cloudReference.saveId).toBe(first.saveId);
    await command(job, 'cancel');
    expect(JSON.parse((await start(rebound)).intentText).cloudReference.saveId).toBe(second.saveId);
    expect(await jobCount()).toBe(2);
  });

  it('retains linked association through failure, guarded retry, completion and later missing inputs', async () => {
    const item = saved(); await complete(item);
    const job = intent(item, 'retry-chat', ownerA, 'second-clip-fails-once'); await start(job);
    await tick(); await tick();
    const failed = (await get(job))!;
    await expect(command(job, 'retry', failed.queue.revision - 1)).rejects.toThrow('REVISION_CONFLICT');
    const commandId = randomUUID(), retried = await command(job, 'retry', failed.queue.revision, ownerA, commandId);
    expect(await command(job, 'retry', failed.queue.revision, ownerA, commandId)).toEqual(retried);
    await db.exec('delete from storage.objects');
    while ((await get(job))!.queue.status === 'running') await tick();
    const done = (await get(job))!;
    expect(done.queue).toMatchObject({ status: 'complete', actualCents: 0 });
    expect(JSON.parse(done.intentText).cloudReference).toEqual(job.cloudReference);
    expect(done.queue.steps.map(step => step.attempts)).toEqual([1, 2, 1, 1, 1, 1, 1, 1]);
    // Existing reads and controls retain authority; a new start still revalidates its original inputs.
    expect((await command(job, 'cancel')).intentText).toBe(done.intentText);
    await expect(start(job)).rejects.toThrow('REFERENCE_MEDIA_INCOMPLETE');
    expect((await get(job))!.queue.status).toBe('complete');
  });

  it('preserves canonical plan, quote and owner checks for linked jobs', async () => {
    const item = saved(); await complete(item);
    const job = intent(item);
    await expect(start(job, ownerB)).rejects.toThrow('INVALID_INTENT');
    await expect(start(intent(item, 'not-enrolled', unenrolled))).rejects.toThrow('FIXTURE_OWNER_REQUIRED');
    await expect(start(job, '')).rejects.toThrow('FIXTURE_OWNER_REQUIRED');
    const malformed = structuredClone(job); malformed.plan.confirmation!.planSnapshot = '{}'; malformed.requestId = hash(identity(malformed));
    await expect(start(malformed)).rejects.toThrow('INVALID_IDENTITY_OR_CONFIRMATION');
    const badQuote = structuredClone(job); badQuote.plan.confirmation!.highCents = 1;
    await expect(start(badQuote)).rejects.toThrow('INVALID_CONFIRMED_QUOTE');
    const badScene = structuredClone(job); badScene.plan.scenes[0].end = '61'; resign(badScene);
    await expect(start(badScene)).rejects.toThrow('INVALID_SCENE_TIMING');
    await expect(start(job, ownerA, JSON.stringify(JSON.parse(identity(job)), null, 2))).rejects.toThrow('INVALID_IDENTITY_OR_CONFIRMATION');
    expect(await jobCount()).toBe(0);
  });

  it('adds only the private validator replacement and preserves access, RPCs and worker definitions', async () => {
    const sql = readFileSync(schemaPath, 'utf8');
    expect(sql.match(/create or replace function/g)).toHaveLength(1);
    expect(sql).not.toMatch(/\b(?:grant|revoke|create table|alter table|create policy|cron\.schedule)\b/i);
    for (const role of ['anon', 'authenticated'] as const) {
      await expect(asRole(role, ownerA, () => db.query('select * from grifon_fixture.reference_snapshots'))).rejects.toThrow('permission denied');
      await expect(asRole(role, ownerA, () => db.query("select grifon_fixture.validate_intent('{}', '[]', $1)", [ownerA]))).rejects.toThrow('permission denied');
      await expect(asRole(role, ownerA, () => db.query('select grifon_fixture.tick()'))).rejects.toThrow('permission denied');
    }
    const wrappers = (await db.query<{ proname: string; prosecdef: boolean }>("select proname, prosecdef from pg_proc join pg_namespace on pg_namespace.oid = pronamespace where nspname = 'public' and proname like 'grifon_fixture_%'")).rows;
    expect(wrappers).toHaveLength(4);
    expect(wrappers.every(row => !row.prosecdef)).toBe(true);
    for (const name of ['start', 'get', 'list', 'command', 'tick']) {
      const { rows } = await db.query<{ definition: string }>('select pg_get_functiondef(oid) as definition from pg_proc where pronamespace = $1::regnamespace and proname = $2', ['grifon_fixture', name]);
      const before = rows[0].definition;
      await db.exec(sql);
      expect((await db.query<{ definition: string }>('select pg_get_functiondef(oid) as definition from pg_proc where pronamespace = $1::regnamespace and proname = $2', ['grifon_fixture', name])).rows[0].definition).toBe(before);
    }
  });
});

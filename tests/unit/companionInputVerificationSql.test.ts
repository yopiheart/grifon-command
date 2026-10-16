import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ffmpeg from 'ffmpeg-static';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createReferenceDraft, type CompanionReferenceDraft } from '../../services/companionReferenceDraft.js';
import { fingerprintReferenceDraft, createSampleReview, confirmSampleReview } from '../../services/companionReferenceReview.js';
import { createFixtureJobIntent, fixtureJobIdentityText } from '../../services/companionFixtureJobs.js';
import { verifySavedFixtureInputs, type FixtureInputProof } from '../../api/_lib/companionInputVerifier.js';
import { fixtureInputTextSha256, validateFixtureInputVerificationReceipt, type FixtureInputVerificationReceipt } from '../../services/companionInputVerification.js';

const ownerA = '11111111-1111-4111-8111-111111111111', ownerB = '22222222-2222-4222-8222-222222222222', unenrolled = '33333333-3333-4333-8333-333333333333';
const path = 'supabase/companion_fixture_input_verification.sql', sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
let db: PGlite, png: Buffer, baseline: Record<string, unknown>[], red: string;
const definitions = () => db.query(`select nspname,proname,pg_get_functiondef(pg_proc.oid) as definition,proacl::text as acl from pg_proc join pg_namespace on pg_namespace.oid=pronamespace where nspname='grifon_fixture' or (nspname='public' and proname like 'grifon_%') order by nspname,proname`);
async function asRole<T>(role: string, owner: string, action: () => Promise<T>): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]); await db.exec(`set role ${role}`);
  try { return await action(); } finally { await db.exec('reset role'); }
}
async function rpc<T = unknown>(name: string, args: unknown[], owner = ownerA, role = 'authenticated'): Promise<T> {
  return asRole(role, owner, async () => (await db.query<{ value: T }>(`select public.${name}(${args.map((_, index) => `$${index + 1}`).join(',')}) as value`, args)).rows[0].value);
}
const write = (proof: FixtureInputProof, owner = proof.ownerId, role = 'service_role') => rpc<FixtureInputVerificationReceipt>('grifon_fixture_input_verification_record', [owner, proof.requestId, proof.sourceSaveId, proof.inputHash, proof.manifestSha256, proof.planSnapshotSha256, JSON.stringify(proof.verifiedMedia)], '', role);
const get = (proof: FixtureInputProof, owner = proof.ownerId, role = 'authenticated') => rpc<FixtureInputVerificationReceipt | null>('grifon_fixture_input_verification_get', [proof.requestId], owner, role);
async function fixture(owner = ownerA) {
  const video = readFileSync('api/_lib/assets/fixtures/companion-video-v1.mp4');
  const draft: CompanionReferenceDraft = { ...createReferenceDraft(), brief: 'Fixture verification', brandName: 'Fixture brand', productName: 'Fixture product', audience: 'Fixture audience', callToAction: 'See details',
    referenceVideo: { id: 'ref', name: 'fixture.mp4', blob: new Blob([video], { type: 'video/mp4' }), width: 360, height: 640, duration: 8 },
    photos: [{ id: 'photo', name: 'fixture.png', blob: new Blob([png], { type: 'image/png' }), width: 16, height: 24, role: 'product' }], voice: { id: 'fixture-voice', name: 'Fixture voice', source: 'curated' } };
  const { blob: _video, ...referenceVideo } = draft.referenceVideo!, { blob: _photo, ...photo } = draft.photos[0];
  const media = [{ slot: 'reference', ...referenceVideo, type: 'video/mp4', size: video.length, sha256: sha(video) }, { slot: 'photo-0', ...photo, type: 'image/png', size: png.length, sha256: sha(png) }];
  const inputHash = await fingerprintReferenceDraft(draft), manifestText = JSON.stringify({ version: 1, draft: { ...draft, referenceVideo, photos: [photo] }, media, inputHash });
  const identityText = JSON.stringify([owner, 'source-chat', manifestText]), saveId = await fixtureInputTextSha256(identityText);
  await rpc('grifon_reference_reserve', [saveId, 'source-chat', manifestText, identityText], owner);
  for (const item of media) await db.query('insert into storage.objects(bucket_id,name,owner,owner_id,metadata) values($1,$2,$3,$4,$5)', ['grifon-fixture-reference-media', `${owner}/${saveId}/${item.slot}`, owner, owner, JSON.stringify({ size: item.size, mimetype: item.type })]);
  const saved = await rpc('grifon_reference_commit', [saveId], owner), review = confirmSampleReview(createSampleReview(draft, inputHash, 0), inputHash, 0);
  const intent = await createFixtureJobIntent(owner, 'job-chat', review, 'normal', { version: 1, saveId, inputHash });
  const job = await rpc('grifon_fixture_start', [JSON.stringify(intent), fixtureJobIdentityText(intent)], owner);
  const proof = await verifySavedFixtureInputs(owner, intent.requestId, job, saved, async mediaPath => mediaPath.endsWith('/reference') ? new Blob([video], { type: 'video/mp4' }) : new Blob([png], { type: 'image/png' }));
  return { proof, intent, job, saved };
}

describe('server-attested fixture input verification PostgreSQL', { timeout: 30_000 }, () => {
  beforeAll(async () => {
    const generated = spawnSync(ffmpeg!, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=16x24', '-frames:v', '1', '-threads', '1', '-c:v', 'png', '-f', 'image2pipe', 'pipe:1'], { encoding: 'buffer', timeout: 10_000, maxBuffer: 1_048_576, windowsHide: true, env: {} });
    if (generated.status !== 0) throw new Error('Native fixture setup failed'); png = generated.stdout;
    db = new PGlite();
    await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth; create schema storage;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;$$;
      create function storage.operation() returns text language sql stable as $$select current_setting('storage.operation',true);$$;
      create function storage.allow_only_operation(expected text) returns boolean language sql stable as $$select storage.operation()=expected;$$;
      grant usage on schema auth,storage to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,owner uuid,owner_id text,metadata jsonb,unique(bucket_id,name));
      alter table storage.objects enable row level security; grant select,insert,update,delete on storage.objects to authenticated,anon;`);
    for (const source of ['supabase/companion_cloud_fixtures.sql', 'supabase/companion_cloud_references.sql', 'supabase/companion_cloud_fixture_references.sql']) await db.exec(readFileSync(source, 'utf8'));
    await db.query('insert into grifon_fixture.allowed_owners values($1),($2)', [ownerA, ownerB]); baseline = (await definitions()).rows;
    try { await rpc('grifon_fixture_input_verification_record', [ownerA, 'a'.repeat(64), 'b'.repeat(64), 'c'.repeat(64), 'd'.repeat(64), 'e'.repeat(64), '[]'], '', 'service_role'); throw new Error('Original schema unexpectedly accepted verification'); }
    catch (error) { red = String(error); }
    await db.exec(readFileSync(path, 'utf8')); await db.exec(readFileSync(path, 'utf8'));
  }, 30_000);
  beforeEach(async () => { await db.exec('reset role'); await db.exec('truncate grifon_fixture.input_verifications,grifon_fixture.command_receipts,grifon_fixture.events,grifon_fixture.jobs,storage.objects,grifon_fixture.reference_snapshots'); });
  afterAll(async () => { await db?.close(); });

  it('demonstrates the write goal fails on the original schema, then records actual decoded proof only through the server role', async () => {
    expect(red).toMatch(/function public.grifon_fixture_input_verification_record.*does not exist/);
    const { proof, intent } = await fixture(); expect(await get(proof)).toBeNull();
    const receipt = await write(proof); expect(await validateFixtureInputVerificationReceipt(receipt, ownerA, intent)).toEqual(receipt);
    expect(receipt).toMatchObject({ ...proof, version: 1, runtime: 'fixture-input-verification-v1', fixture: true, actualCents: 0, decoder: 'ffmpeg-full-null-v1', orientation: 'identity-only' });
    expect(receipt.verifiedAt).toBeGreaterThan(0); expect(await get(proof)).toEqual(receipt);
  });
  it('reverifies idempotently without changing the first timestamp or any existing job, snapshot, events or object metadata', async () => {
    const { proof } = await fixture(), before = (await db.query('select xmin::text,* from grifon_fixture.jobs')).rows, snapshots = (await db.query('select xmin::text,* from grifon_fixture.reference_snapshots')).rows;
    const first = await write(proof); for (let index = 0; index < 3; index++) expect(await write(proof)).toEqual(first);
    expect((await db.query('select xmin::text,* from grifon_fixture.jobs')).rows).toEqual(before); expect((await db.query('select xmin::text,* from grifon_fixture.reference_snapshots')).rows).toEqual(snapshots);
    expect((await db.query('select count(*)::int as n from grifon_fixture.input_verifications')).rows[0]).toEqual({ n: 1 });
    expect((await db.query('select count(*)::int as n from grifon_fixture.events')).rows[0]).toEqual({ n: 1 });
  });
  it('rejects client/anonymous claims and every direct write/read while isolating authenticated owner reads', async () => {
    const { proof } = await fixture();
    for (const role of ['anon', 'authenticated']) await expect(write(proof, ownerA, role)).rejects.toThrow('permission denied');
    await write(proof); expect(await get(proof, ownerB)).toBeNull();
    await expect(get(proof, unenrolled)).rejects.toThrow('FIXTURE_OWNER_REQUIRED'); await expect(get(proof, ownerA, 'anon')).rejects.toThrow('permission denied');
    for (const role of ['anon', 'authenticated', 'service_role']) await expect(asRole(role, ownerA, () => db.query('select * from grifon_fixture.input_verifications'))).rejects.toThrow('permission denied');
    await expect(write(proof, ownerB)).rejects.toThrow('FIXTURE_JOB_UNAVAILABLE'); await expect(write(proof, unenrolled)).rejects.toThrow('FIXTURE_OWNER_REQUIRED');
  });
  it('rejects forged request, source snapshot, input fingerprint and either raw-text hash', async () => {
    const { proof } = await fixture();
    for (const changes of [{ requestId: 'a'.repeat(64) }, { sourceSaveId: 'b'.repeat(64) }, { inputHash: 'c'.repeat(64) }, { manifestSha256: 'd'.repeat(64) }, { planSnapshotSha256: 'e'.repeat(64) }]) await expect(write({ ...proof, ...changes })).rejects.toThrow();
    expect((await db.query('select count(*)::int as n from grifon_fixture.input_verifications')).rows[0]).toEqual({ n: 0 });
  });
  it('checks exact bounded decoded evidence, slot order, metadata, hashes and measured timing before insertion', async () => {
    const { proof } = await fixture();
    for (const changes of [{ decoded: false }, { width: 1 }, { sha256: 'f'.repeat(64) }, { mimeType: 'text/html' }, { sizeBytes: 1 }, { durationSeconds: 9 }, { durationSeconds: null }, { frames: 0 }, { frames: 1801 }, { slot: 'photo-0' }, { provider: 'live' }]) {
      const media = structuredClone(proof.verifiedMedia); Object.assign(media[0], changes); await expect(write({ ...proof, verifiedMedia: media })).rejects.toThrow();
    }
    await expect(write({ ...proof, verifiedMedia: [...proof.verifiedMedia].reverse() })).rejects.toThrow('INVALID_FIXTURE_MEDIA_EVIDENCE');
    await expect(write({ ...proof, verifiedMedia: [] })).rejects.toThrow('INVALID_FIXTURE_MEDIA_EVIDENCE');
    expect((await db.query('select count(*)::int as n from grifon_fixture.input_verifications')).rows[0]).toEqual({ n: 0 });
  });
  it('rechecks current invalidation at the write boundary after decoding and never creates a stale receipt', async () => {
    const { proof } = await fixture(); await rpc('grifon_fixture_command', [proof.requestId, 'invalidate', crypto.randomUUID(), null]);
    await expect(write(proof)).rejects.toThrow('FIXTURE_JOB_UNAVAILABLE'); expect(await get(proof)).toBeNull();
  });
  it('rolls back a new receipt atomically and refuses to mutate or delete historical receipts', async () => {
    const { proof } = await fixture(); await db.exec('begin'); await write(proof); expect(await get(proof)).not.toBeNull(); await db.exec('rollback');
    expect(await get(proof)).toBeNull(); const receipt = await write(proof);
    await expect(db.exec('update grifon_fixture.input_verifications set verified_at=verified_at+1')).rejects.toThrow('VERIFICATION_IMMUTABLE');
    await expect(db.exec('delete from grifon_fixture.input_verifications')).rejects.toThrow('VERIFICATION_IMMUTABLE'); expect(await get(proof)).toEqual(receipt);
  });
  it('rejects conflicting measured evidence rather than silently overwriting or returning false new evidence', async () => {
    const { proof } = await fixture(); const first = await write(proof), changed = structuredClone(proof); changed.verifiedMedia[0].durationSeconds! -= 0.0001;
    await expect(write(changed)).rejects.toThrow('VERIFICATION_CONFLICT'); expect(await get(proof)).toEqual(first);
  });
  it('preserves existing definitions/ACLs, adds exactly service-role schema usage plus new function grants, and performs no backfill', async () => {
    const after = (await definitions()).rows;
    for (const old of baseline) expect(after.find(item => item.nspname === old.nspname && item.proname === old.proname)).toEqual(old);
    const wrappers = (await db.query<{ prosecdef: boolean; proconfig: string[] }>("select prosecdef,proconfig from pg_proc join pg_namespace on pg_namespace.oid=pronamespace where nspname='public' and proname like 'grifon_fixture_input_verification_%'")).rows;
    expect(wrappers).toHaveLength(2); expect(wrappers.every(item => !item.prosecdef && item.proconfig.includes('search_path=""'))).toBe(true);
    expect((await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where oid='grifon_fixture.input_verifications'::regclass")).rows[0].relrowsecurity).toBe(true);
    const sql = readFileSync(path, 'utf8'); expect(sql).not.toMatch(/cron\.|storage\.|auth\.users|alter table grifon_fixture\.(jobs|results)|grant .* on all|http|net\./i);
    expect((await db.query('select count(*)::int as n from grifon_fixture.input_verifications')).rows[0]).toEqual({ n: 0 });
  });
});

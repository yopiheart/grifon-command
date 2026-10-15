import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const ownerA = '11111111-1111-4111-8111-111111111111';
const ownerB = '22222222-2222-4222-8222-222222222222';
const unenrolled = '33333333-3333-4333-8333-333333333333';
const bucket = 'grifon-fixture-reference-media';
const schemaPath = 'supabase/companion_cloud_references.sql';
interface Receipt { runtime: string; ownerId: string; saveId: string; sourceChatId: string; manifestText: string; createdAt: number; committed: boolean }
interface Metadata { id: string; name: string; width: number; height: number; duration?: number; role?: string }
interface Manifest { version: number; draft: Record<string, unknown> & { referenceVideo: Metadata | null; photos: Metadata[] }; media: (Metadata & { slot: string; size: number; type: string; sha256: string })[]; inputHash: string }
let db: PGlite;

function manifest(photoCount = 1, video = false, size = 123): Manifest {
  const referenceVideo = video ? { id: 'original-video-id', name: 'original.mov', width: 1920, height: 1080, duration: 2.5 } : null;
  const photos = Array.from({ length: photoCount }, (_, index) => ({ id: `original-photo-${index}`, name: `${index}.png`, width: 32, height: 24, role: 'product' }));
  return {
    version: 1,
    draft: { version: 1, brief: '', brandName: '', productName: '', audience: '', offer: '', callToAction: '', instructions: '', outputLanguage: 'Taglish', referenceLanguage: '', referenceLink: '', referenceVideo, photos, voice: null },
    media: [...(referenceVideo ? [{ slot: 'reference', ...referenceVideo, type: 'video/quicktime', size, sha256: 'a'.repeat(64) }] : []), ...photos.map((photo, index) => ({ slot: `photo-${index}`, ...photo, type: 'image/png', size, sha256: 'b'.repeat(64) }))],
    inputHash: 'c'.repeat(64),
  };
}
function identity(value: Manifest | string, chat = 'source-chat', owner = ownerA) {
  const manifestText = typeof value === 'string' ? value : JSON.stringify(value);
  const identityText = JSON.stringify([owner, chat, manifestText]);
  return { manifestText, identityText, saveId: createHash('sha256').update(identityText).digest('hex'), chat, owner };
}
async function asRole<T>(role: 'authenticated' | 'anon', owner: string, action: () => Promise<T>, operation = '') {
  await db.query("select set_config('request.jwt.claim.sub', $1, false), set_config('storage.operation', $2, false)", [owner, operation]);
  await db.exec(`set role ${role}`);
  try { return await action(); } finally { await db.exec('reset role'); }
}
async function rpc<T = Receipt>(name: string, parameters: unknown[] = [], owner = ownerA) {
  return asRole('authenticated', owner, async () => (await db.query<{ value: T }>(`select public.grifon_reference_${name}(${parameters.map((_, index) => `$${index + 1}`).join(',')}) as value`, parameters)).rows[0].value);
}
const reserve = (item: ReturnType<typeof identity>, caller = item.owner) => rpc('reserve', [item.saveId, item.chat, item.manifestText, item.identityText], caller);
async function upload(item: ReturnType<typeof identity>, slot = 'photo-0', metadata?: Record<string, unknown>, caller = item.owner, targetBucket = bucket, targetName?: string) {
  const expected = (JSON.parse(item.manifestText) as Manifest).media.find(value => value.slot === slot)!;
  return asRole('authenticated', caller, () => db.query('insert into storage.objects(bucket_id, name, metadata) values ($1, $2, $3::jsonb) returning name', [targetBucket, targetName ?? `${item.owner}/${item.saveId}/${slot}`, JSON.stringify(metadata ?? { size: expected.size, mimetype: expected.type, eTag: 'server-etag' })]), 'storage.object.upload');
}
async function uploadPermissionProbe(item: ReturnType<typeof identity>, operation: string, upsert = true, size = 123) {
  // Storage probes caller permissions in a rolled-back transaction before accepting bytes or minting upload URLs.
  return asRole('authenticated', item.owner, async () => {
    await db.exec('begin');
    try {
      return await db.query(`insert into storage.objects(bucket_id, name, metadata) values ($1, $2, $3::jsonb)
        ${upsert ? 'on conflict(bucket_id, name) do update set metadata = excluded.metadata' : ''} returning name`,
      [bucket, `${item.owner}/${item.saveId}/photo-0`, JSON.stringify({ size, mimetype: 'image/png' })]);
    } finally { await db.exec('rollback'); }
  }, operation);
}
async function complete(item: ReturnType<typeof identity>) {
  await reserve(item);
  for (const media of (JSON.parse(item.manifestText) as Manifest).media) await upload(item, media.slot);
  return rpc('commit', [item.saveId], item.owner);
}

describe('cloud reference PostgreSQL execution', { timeout: 30_000 }, () => {
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
      grant select, insert, update, delete on storage.objects to authenticated, anon;
      insert into storage.buckets(id, name) values ('unrelated', 'unrelated');
      create policy unrelated_read on storage.objects for select to authenticated using (bucket_id = 'unrelated');`);
    await db.exec(readFileSync(schemaPath, 'utf8'));
    await db.exec(readFileSync(schemaPath, 'utf8'));
  }, 30_000);
  beforeEach(async () => {
    await db.exec('reset role; truncate storage.objects, grifon_fixture.reference_snapshots, grifon_fixture.allowed_owners');
    await db.query('insert into grifon_fixture.allowed_owners values ($1), ($2)', [ownerA, ownerB]);
  });
  afterAll(async () => { await db?.close(); });

  it('reserves once, exposes only committed snapshots, and preserves original bytes and IDs', async () => {
    const item = identity(manifest(2, true)), pending = await reserve(item);
    expect(pending).toEqual({ runtime: 'supabase-cloud-reference-v1', ownerId: ownerA, saveId: item.saveId, sourceChatId: item.chat, manifestText: item.manifestText, createdAt: expect.any(Number), committed: false });
    expect(await reserve(item)).toEqual(pending);
    expect(await rpc('get', [item.saveId])).toBeNull();
    expect(await rpc<Receipt[]>('list')).toEqual([]);
    await expect(rpc('commit', [item.saveId])).rejects.toThrow('REFERENCE_MEDIA_INCOMPLETE');
    const committed = await complete(item);
    expect(committed).toEqual({ ...pending, committed: true });
    expect(await reserve(item)).toEqual(committed);
    expect(await rpc('commit', [item.saveId])).toEqual(committed);
    expect(await rpc('get', [item.saveId])).toEqual(committed);
    expect(await rpc<Receipt[]>('list')).toEqual([committed]);
    expect(JSON.parse(committed.manifestText).draft.referenceVideo.id).toBe('original-video-id');
    expect(JSON.parse(committed.manifestText).draft.photos.map((photo: Metadata) => photo.id)).toEqual(['original-photo-0', 'original-photo-1']);
  });

  it('keeps owner authorization, private table RLS, and invoker wrappers at the SQL boundary', async () => {
    const item = identity(manifest());
    await complete(item);
    expect(await rpc('get', [item.saveId], ownerB)).toBeNull();
    expect(await rpc<Receipt[]>('list', [], ownerB)).toEqual([]);
    await expect(reserve(item, ownerB)).rejects.toThrow('INVALID_REFERENCE_IDENTITY');
    await expect(rpc('commit', [item.saveId], ownerB)).rejects.toThrow('REFERENCE_NOT_FOUND');
    await expect(reserve(identity(manifest(), 'chat', unenrolled))).rejects.toThrow('REFERENCE_OWNER_REQUIRED');
    await expect(rpc('list', [], '')).rejects.toThrow('REFERENCE_OWNER_REQUIRED');
    await expect(asRole('anon', '', () => db.query('select public.grifon_reference_list()'))).rejects.toThrow('permission denied');
    await expect(asRole('authenticated', ownerA, () => db.query('select * from grifon_fixture.reference_snapshots'))).rejects.toThrow('permission denied');
    await expect(asRole('authenticated', ownerA, () => db.query('insert into grifon_fixture.allowed_owners values ($1)', [unenrolled]))).rejects.toThrow('permission denied');
    const functions = (await db.query<{ proname: string; prosecdef: boolean; proconfig: string[] }>(`select proname, prosecdef, proconfig from pg_proc join pg_namespace on pg_namespace.oid = pronamespace where nspname = 'public' and proname like 'grifon_reference_%'`)).rows;
    expect(functions).toHaveLength(4);
    expect(functions.every(value => !value.prosecdef && value.proconfig.includes('search_path=""'))).toBe(true);
    expect((await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where oid = 'grifon_fixture.reference_snapshots'::regclass")).rows[0].relrowsecurity).toBe(true);
  });

  it('accepts exact Unicode identity bytes and rejects alternative tuple encodings or changed input', async () => {
    const value = manifest(); value.draft.brief = 'café 漢字 😀 / "quoted" \\ path\nnext\tline';
    const item = identity(JSON.stringify(value, null, 2), 'chat-漢字-"-\\-😀');
    expect((await complete(item)).manifestText).toBe(item.manifestText);
    const alternate = JSON.stringify(JSON.parse(item.identityText), null, 2);
    await expect(rpc('reserve', [createHash('sha256').update(alternate).digest('hex'), item.chat, item.manifestText, alternate])).rejects.toThrow('INVALID_REFERENCE_IDENTITY');
    await expect(rpc('reserve', [item.saveId, 'changed', item.manifestText, item.identityText])).rejects.toThrow('INVALID_REFERENCE_IDENTITY');
    await expect(rpc('reserve', [item.saveId, item.chat, `${item.manifestText} `, item.identityText])).rejects.toThrow('INVALID_REFERENCE_IDENTITY');
    await expect(rpc('reserve', ['d'.repeat(64), item.chat, item.manifestText, item.identityText])).rejects.toThrow('INVALID_REFERENCE_IDENTITY');
  });

  it('allows only exact reserved upload/download paths and never replacement or deletion', async () => {
    const item = identity(manifest()), other = identity(manifest(), 'other');
    await reserve(item);
    for (const [slot, name] of [['photo-1', undefined], ['photo-0', `${ownerA}/${item.saveId}/filename.png`], ['photo-0', `${ownerA}/${item.saveId}/photo-0/extra`], ['photo-0', `${ownerA}/${other.saveId}/photo-0`]] as const) {
      await expect(upload(item, slot, { size: 123, mimetype: 'image/png' }, ownerA, bucket, name)).rejects.toThrow('row-level security');
    }
    await expect(upload(item, 'photo-0', undefined, ownerB)).rejects.toThrow('row-level security');
    await expect(upload(item, 'photo-0', undefined, unenrolled)).rejects.toThrow('row-level security');
    await expect(upload(item, 'photo-0', undefined, ownerA, 'unrelated')).rejects.toThrow('row-level security');
    await upload(item);
    expect((await asRole('authenticated', ownerA, () => db.query('select name from storage.objects'))).rows).toHaveLength(1);
    expect((await asRole('authenticated', ownerB, () => db.query('select name from storage.objects'))).rows).toEqual([]);
    await rpc('commit', [item.saveId]);
    expect((await asRole('authenticated', ownerA, () => db.query("update storage.objects set metadata = '{}' returning name"))).rows).toEqual([]);
    expect((await asRole('authenticated', ownerA, () => db.query('delete from storage.objects returning name'))).rows).toEqual([]);
    await expect(upload(item)).rejects.toThrow('row-level security');
    const policies = (await db.query<{ policyname: string; cmd: string }>("select policyname, cmd from pg_policies where schemaname = 'storage' and tablename = 'objects' order by policyname")).rows;
    expect(policies).toEqual([{ policyname: 'grifon_reference_insert', cmd: 'INSERT' }, { policyname: 'grifon_reference_select', cmd: 'SELECT' }, { policyname: 'unrelated_read', cmd: 'SELECT' }]);
    const config = (await db.query<{ public: boolean; file_size_limit: number; allowed_mime_types: string[] }>('select public, file_size_limit, allowed_mime_types from storage.buckets where id = $1', [bucket])).rows[0];
    expect(config).toEqual({ public: false, file_size_limit: 6_000_000, allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'] });
  });

  it.each(['', 'storage.object.sign_upload_url', 'storage.object.upload_signed', 'storage.tus.upload.create', 'storage.tus.upload.part',
    'storage.s3.upload', 'storage.s3.upload.create_multipart', 'storage.s3.upload.complete_multipart', 'storage.s3.upload.part',
    'storage.s3.upload.part_copy', 'storage.s3.object.copy', 'storage.object.copy', 'storage.object.move', 'storage.object.upload_update'])
  ('rejects alternate storage operations at the absent-key caller permission probe: %s', async operation => {
    const item = identity(manifest()); await reserve(item);
    // Signed upsert permission checks can otherwise INSERT an absent key despite having no UPDATE policy.
    await expect(uploadPermissionProbe(item, operation)).rejects.toThrow('row-level security');
    expect((await db.query('select name from storage.objects')).rows).toEqual([]);
    expect(await rpc('get', [item.saveId])).toBeNull();
  });

  it('accepts standard uploads and rechecks a delayed upsert against committed immutable state', async () => {
    const item = identity(manifest()); await reserve(item);
    await uploadPermissionProbe(item, 'storage.object.upload', false);
    await uploadPermissionProbe(item, 'object.upload', false);
    // A standard upsert may be authorized while the key is absent. Its final caller check must still reject replacement.
    await uploadPermissionProbe(item, 'storage.object.upload');
    await upload(item); await rpc('commit', [item.saveId]);
    await expect(uploadPermissionProbe(item, 'storage.object.upload', true, 6_000_000)).rejects.toThrow('row-level security');
    expect((await db.query<{ actual_bytes: number }>('select actual_bytes from grifon_fixture.reference_snapshots where save_id = $1', [item.saveId])).rows[0].actual_bytes).toBe(123);
    expect((await db.query<{ metadata: { size: number } }>('select metadata from storage.objects')).rows[0].metadata.size).toBe(123);
  });

  it.each([{ size: 124, mimetype: 'image/png' }, { size: 123, mimetype: 'image/jpeg' }, { size: '123', mimetype: 'image/png' }, { mimetype: 'image/png' }, { size: 6_000_001, mimetype: 'image/png' }])('rejects commit with untrusted or mismatched server object metadata %j', async metadata => {
    const item = identity(manifest()); await reserve(item);
    await db.query('insert into storage.objects(bucket_id, name, metadata) values ($1, $2, $3::jsonb)', [bucket, `${ownerA}/${item.saveId}/photo-0`, JSON.stringify(metadata)]);
    await expect(rpc('commit', [item.saveId])).rejects.toThrow('REFERENCE_MEDIA_MISMATCH');
    expect(await rpc('get', [item.saveId])).toBeNull();
  });

  it('accounts pending records at the worst-case upload cap, then committed actual server bytes', async () => {
    const pending = Array.from({ length: 5 }, (_, index) => identity(manifest(5, true, 1), `pending-${index}`));
    for (const item of pending) await reserve(item);
    const sixth = identity(manifest(5, true, 1), 'sixth');
    await expect(reserve(sixth)).rejects.toThrow('REFERENCE_BYTE_LIMIT');
    await complete(pending[0]);
    expect((await reserve(sixth)).committed).toBe(false);
    const accounting = (await db.query<{ reserved_bytes: number; actual_bytes: number; object_metadata: Record<string, unknown> }>('select reserved_bytes, actual_bytes, object_metadata from grifon_fixture.reference_snapshots where save_id = $1', [pending[0].saveId])).rows[0];
    expect(accounting.reserved_bytes).toBe(36_000_000);
    expect(accounting.actual_bytes).toBe(6);
    expect(accounting.object_metadata).toMatchObject({ reference: { size: 1, mimetype: 'video/quicktime', eTag: 'server-etag' }, 'photo-4': { size: 1, mimetype: 'image/png', eTag: 'server-etag' } });
  });

  it('enforces the hard 200 MB ceiling with committed actual bytes and isolates owner quotas', async () => {
    for (let index = 0; index < 5; index++) await complete(identity(manifest(5, true, 6_000_000), `full-${index}`));
    await complete(identity(manifest(3, false, 6_000_000), '198-mb'));
    await expect(reserve(identity(manifest(1, false, 1), 'over-200-mb'))).rejects.toThrow('REFERENCE_BYTE_LIMIT');
    expect((await reserve(identity(manifest(5, true), 'other-owner', ownerB))).ownerId).toBe(ownerB);
  });

  it('counts pending records toward the 20 snapshot limit and retains idempotency at the cap', async () => {
    const items = Array.from({ length: 20 }, (_, index) => identity(manifest(0), `record-${index}`));
    for (const item of items) await reserve(item);
    expect((await reserve(items[0])).saveId).toBe(items[0].saveId);
    await expect(reserve(identity(manifest(0), 'record-21'))).rejects.toThrow('REFERENCE_RECORD_LIMIT');
    await rpc('commit', [items[0].saveId]);
    await expect(reserve(identity(manifest(0), 'still-record-21'))).rejects.toThrow('REFERENCE_RECORD_LIMIT');
  });

  it.each([
    ['missing draft field', (value: Manifest) => { delete value.draft.brief; }],
    ['unknown draft field', (value: Manifest) => { value.draft.extra = true; }],
    ['unknown root field', (value: Manifest) => { Object.assign(value, { extra: true }); }],
    ['wrong text type', (value: Manifest) => { value.draft.offer = 5; }],
    ['UTF-16 over-limit text', (value: Manifest) => { value.draft.brief = '😀'.repeat(2001); }],
    ['output language', (value: Manifest) => { value.draft.outputLanguage = 'French'; }],
    ['adaptation mode', (value: Manifest) => { value.draft.adaptationMode = 'other'; }],
    ['speech mode', (value: Manifest) => { value.draft.speechMode = null; }],
    ['voice source', (value: Manifest) => { value.draft.voice = { id: 'v', name: 'V', source: 'untrusted' }; }],
    ['voice extras', (value: Manifest) => { value.draft.voice = { id: 'v', name: 'V', source: 'curated', extra: true }; }],
    ['media metadata mismatch', (value: Manifest) => { value.media[0].name = 'changed.png'; }],
    ['blob field', (value: Manifest) => { Object.assign(value.draft.photos[0], { blob: {} }); }],
    ['unknown media field', (value: Manifest) => { Object.assign(value.media[0], { extra: true }); }],
    ['wrong slot', (value: Manifest) => { value.media[0].slot = 'photo-1'; }],
    ['duplicate slot', (value: Manifest) => { value.media.push({ ...value.media[0] }); }],
    ['zero width', (value: Manifest) => { value.draft.photos[0].width = value.media[0].width = 0; }],
    ['huge frame', (value: Manifest) => { value.draft.photos[0].width = value.media[0].width = 40_000_001; }],
    ['fractional height', (value: Manifest) => { value.draft.photos[0].height = value.media[0].height = 2.5; }],
    ['photo duration', (value: Manifest) => { value.draft.photos[0].duration = value.media[0].duration = 2; }],
    ['invalid role', (value: Manifest) => { value.draft.photos[0].role = value.media[0].role = 'other'; }],
    ['empty id', (value: Manifest) => { value.draft.photos[0].id = value.media[0].id = ''; }],
    ['control id', (value: Manifest) => { value.draft.photos[0].id = value.media[0].id = 'id\n'; }],
    ['long name', (value: Manifest) => { value.draft.photos[0].name = value.media[0].name = 'x'.repeat(256); }],
    ['empty file', (value: Manifest) => { value.media[0].size = 0; }],
    ['oversized file', (value: Manifest) => { value.media[0].size = 6_000_001; }],
    ['video MIME on photo', (value: Manifest) => { value.media[0].type = 'video/mp4'; }],
    ['bad digest', (value: Manifest) => { value.media[0].sha256 = 'x'.repeat(64); }],
    ['bad input hash', (value: Manifest) => { value.inputHash = 'bad'; }],
  ] as const)('rejects malformed manifest: %s', async (_, mutate) => {
    const value = manifest(); mutate(value);
    await expect(reserve(identity(value))).rejects.toThrow('INVALID_REFERENCE_MANIFEST');
    expect(await rpc<Receipt[]>('list')).toEqual([]);
  });

  it('rejects duplicate JSON keys, duplicate photo IDs, reordered media, invalid videos and chat IDs', async () => {
    const original = manifest();
    await expect(reserve(identity(JSON.stringify(original).replace('{', '{"version":1,')))).rejects.toThrow('INVALID_REFERENCE_MANIFEST');
    const duplicate = manifest(2); duplicate.draft.photos[1].id = duplicate.media[1].id = duplicate.draft.photos[0].id;
    await expect(reserve(identity(duplicate))).rejects.toThrow('INVALID_REFERENCE_MANIFEST');
    const reordered = manifest(2, true); reordered.media.reverse();
    await expect(reserve(identity(reordered))).rejects.toThrow('INVALID_REFERENCE_MANIFEST');
    for (const duration of [0, 181, null]) {
      const video = manifest(0, true); Object.assign(video.draft.referenceVideo!, { duration }); Object.assign(video.media[0], { duration });
      await expect(reserve(identity(video))).rejects.toThrow('INVALID_REFERENCE_MANIFEST');
    }
    for (const chat of ['', 'x'.repeat(201), 'chat\n']) await expect(reserve(identity(manifest(), chat))).rejects.toThrow('INVALID_REFERENCE_IDENTITY');
  });

  it('accepts all supported MIME kinds, optional draft modes and private voice without normalizing text', async () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']) {
      const value = manifest(type.startsWith('image/') ? 1 : 0, type.startsWith('video/'));
      value.media[0].type = type; value.draft.adaptationMode = 'close'; value.draft.speechMode = 'silent';
      value.draft.brief = '😀'.repeat(2000); value.draft.voice = { id: 'voice-id', name: 'Original voice', source: 'private' };
      const item = identity(value, type); expect((await complete(item)).manifestText).toBe(item.manifestText);
    }
  });
});

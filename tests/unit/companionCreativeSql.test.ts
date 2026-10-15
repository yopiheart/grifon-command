import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createReferenceDraft, type CompanionReferenceDraft } from '../../services/companionReferenceDraft.js';
import { confirmSampleReview, createSampleReview, editSampleReview } from '../../services/companionReferenceReview.js';
import { createCreativeSampleReview } from '../../services/companionCreativePlanner.js';
import { FIXTURE_CREATIVE_RECIPES } from '../../services/companionCreativeLibrary.js';
import { createCreativeDependencyNodes, isCreativePlan } from '../../services/companionCreativePlan.js';
import { createFixtureJobIntent, fixtureJobIdentityText, type FixtureJobIntent } from '../../services/companionFixtureJobs.js';

const owner = '11111111-1111-4111-8111-111111111111';
const otherOwner = '22222222-2222-4222-8222-222222222222';
const schemaPath = 'supabase/companion_creative_fixtures.sql';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
let db: PGlite;
let originalDefinitions: { oid: number; name: string; definition: string; acl: string[] | null }[];
const definitions = () => db.query<{ oid: number; name: string; definition: string; acl: string[] | null }>(`select pg_proc.oid, proname as name, pg_get_functiondef(pg_proc.oid) as definition, proacl as acl from pg_proc join pg_namespace on pg_namespace.oid=pronamespace where nspname='grifon_fixture' order by proname`);

function input(category: 'ugc' | 'motion-launch' | 'cinematic-spec' = 'ugc', mode: 'fixture-auto' | 'fixture-recipe' = 'fixture-auto'): CompanionReferenceDraft {
  const recipe = FIXTURE_CREATIVE_RECIPES.find(item => item.category === category)!;
  return {
    ...createReferenceDraft(), brief: 'Show the supplied product clearly.', brandName: 'Fixture brand', productName: 'Fixture product', audience: 'Sample audience', offer: 'Sample offer', callToAction: 'View the details', instructions: 'Keep the printed label unchanged.',
    photos: ['character', 'product'].map((role, index) => ({ id: `photo-${index}`, name: `sample-${index}.png`, role: role as 'character' | 'product', blob: new Blob(['sample'], { type: 'image/png' }), width: 1, height: 1 })),
    voice: { id: 'voice-1', name: 'One saved voice', source: 'private' },
    creativeSource: mode === 'fixture-auto' ? { version: 1, mode, category } : { version: 1, mode, category, recipeId: recipe.id, recipeVersion: 1 },
  };
}
function saved(draft = input(), sourceChat = 'source') {
  const photos = draft.photos.map(({ blob, ...metadata }) => metadata);
  const manifest = { version: 1, draft: { ...draft, photos }, media: photos.map((photo, index) => ({ ...photo, slot: `photo-${index}`, size: 6, type: 'image/png', sha256: 'b'.repeat(64) })), inputHash: 'c'.repeat(64) };
  const manifestText = JSON.stringify(manifest), identityText = JSON.stringify([owner, sourceChat, manifestText]);
  return { draft, manifest, manifestText, identityText, sourceChat, saveId: hash(identityText) };
}
async function asRole<T>(role: 'authenticated' | 'anon', action: () => Promise<T>, user = owner): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('storage.operation','object.upload',false)", [user]);
  await db.exec(`set role ${role}`);
  try { return await action(); } finally { await db.exec('reset role'); }
}
async function rpc<T = Record<string, unknown>>(name: string, args: unknown[] = [], user = owner): Promise<T> {
  return asRole('authenticated', async () => (await db.query<{ value: T }>(`select public.grifon_${name}(${args.map((_, index) => `$${index + 1}`).join(',')}) as value`, args)).rows[0].value, user);
}
async function complete(item: ReturnType<typeof saved>) {
  await rpc('reference_reserve', [item.saveId, item.sourceChat, item.manifestText, item.identityText]);
  for (const media of item.manifest.media) await asRole('authenticated', () => db.query('insert into storage.objects(bucket_id,name,metadata) values($1,$2,$3::jsonb)', ['grifon-fixture-reference-media', `${owner}/${item.saveId}/${media.slot}`, JSON.stringify({ size: media.size, mimetype: media.type })]));
  await rpc('reference_commit', [item.saveId]);
}
async function job(item: ReturnType<typeof saved>, edited = false) {
  let review = item.draft.creativeSource ? createCreativeSampleReview(item.draft, item.manifest.inputHash, 2) : createSampleReview(item.draft, item.manifest.inputHash, 2);
  if (edited) review = editSampleReview(review, { scenes: review.scenes.map((scene, index) => ({ ...scene, start: String(index * 3), end: String((index + 1) * 3), visual: scene.visual + ' Approved framing change.' })) });
  review = confirmSampleReview(review, item.manifest.inputHash, 2);
  return createFixtureJobIntent(owner, 'job-chat', review, 'normal', { version: 1, saveId: item.saveId, inputHash: item.manifest.inputHash });
}
function resign(value: FixtureJobIntent) {
  const { confirmation, ...plan } = value.plan;
  value.plan.confirmation = { ...confirmation!, planSnapshot: JSON.stringify(plan) };
  value.requestId = hash(fixtureJobIdentityText(value));
  return value;
}
const start = (value: FixtureJobIntent) => rpc<{ intentText: string; queue: { status: string; actualCents: number } }>('fixture_start', [JSON.stringify(value), fixtureJobIdentityText(value)]);

describe('creative fixture PostgreSQL compatibility and trust boundary', { timeout: 30_000 }, () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;
      create function storage.allow_only_operation(expected text) returns boolean language sql stable as $$ select current_setting('storage.operation',true)=expected; $$;
      grant usage on schema auth,storage to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
      create table storage.buckets(id text primary key,name text not null,public boolean default false,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text not null,owner uuid,owner_id text,metadata jsonb,unique(bucket_id,name));
      alter table storage.objects enable row level security;grant select,insert,update,delete on storage.objects to authenticated,anon;`);
    for (const path of ['supabase/companion_cloud_fixtures.sql', 'supabase/companion_cloud_references.sql', 'supabase/companion_cloud_fixture_references.sql', 'supabase/companion_cloud_fixture_results.sql']) await db.exec(readFileSync(path, 'utf8'));
    originalDefinitions = (await definitions()).rows;
    if (existsSync(schemaPath)) { await db.exec(readFileSync(schemaPath, 'utf8')); await db.exec(readFileSync(schemaPath, 'utf8')); }
  }, 30_000);
  beforeEach(async () => {
    await db.exec('reset role;truncate grifon_fixture.results,grifon_fixture.command_receipts,grifon_fixture.events,grifon_fixture.jobs,storage.objects,grifon_fixture.reference_snapshots,grifon_fixture.allowed_owners');
    await db.query('insert into grifon_fixture.allowed_owners values($1),($2)', [owner, otherOwner]);
  });
  afterAll(async () => { await db?.close(); });

  it.each(['ugc', 'motion-launch', 'cinematic-spec'] as const)('saves and runs %s manual and Auto fixtures to one zero-spend result', async category => {
    for (const mode of ['fixture-auto', 'fixture-recipe'] as const) {
      const item = saved(input(category, mode), mode); await complete(item);
      const value = await job(item, true), accepted = await start(value);
      expect(accepted.intentText).toBe(JSON.stringify(value));
      expect((await start(value)).intentText).toBe(accepted.intentText);
      for (let index = 0; index < 20; index++) { await db.exec('update grifon_fixture.jobs set next_due_at=0 where next_due_at is not null'); await db.query('select grifon_fixture.tick()'); }
      const result = await rpc<{ status: string; actualCents: number; inputHash: string }>('fixture_result_get', [value.requestId]);
      expect(result).toMatchObject({ status: 'READY', actualCents: 0, inputHash: item.manifest.inputHash });
    }
    expect((await db.query('select count(*)::int as n from grifon_fixture.results')).rows[0].n).toBe(2);
  });

  it('preserves original function OIDs and ACLs, changes only the two wrappers, and pins exact base bodies and domain catalog', async () => {
    const current = (await definitions()).rows;
    for (const original of originalDefinitions) {
      const now = current.find(item => item.name === original.name)!;
      expect(now.oid).toBe(original.oid); expect(now.acl).toEqual(original.acl);
      if (!['reference_validate_manifest', 'validate_intent'].includes(original.name)) expect(now.definition).toBe(original.definition);
    }
    for (const name of ['reference_validate_manifest', 'validate_intent']) {
      const original = originalDefinitions.find(item => item.name === name)!;
      const base = current.find(item => item.name === `${name}_v1_base`)!;
      expect(base.definition.replace(`${name}_v1_base(`, `${name}(`)).toBe(original.definition);
    }
    const catalog = (await db.query<{ value: unknown[] }>('select grifon_fixture.creative_catalog_v1() as value')).rows[0].value;
    expect(catalog).toEqual(FIXTURE_CREATIVE_RECIPES.map(recipe => ({ ...recipe, spokenNodes: createCreativeDependencyNodes(recipe.shots, true), silentNodes: createCreativeDependencyNodes(recipe.shots, false) })));
    for (const helper of current.filter(item => !originalDefinitions.some(original => original.name === item.name))) {
      for (const role of ['anon', 'authenticated']) expect((await db.query<{ ok: boolean }>('select has_function_privilege($1,$2::oid,\'EXECUTE\') as ok', [role, helper.oid])).rows[0].ok).toBe(false);
      expect(helper.definition).toContain("SET search_path TO ''");
    }
  });

  it('retains absent-field legacy manifests and linked jobs exactly', async () => {
    const draft = input(); delete draft.creativeSource;
    const item = saved(draft); await complete(item);
    expect((await rpc<{ manifestText: string }>('reference_get', [item.saveId])).manifestText).toBe(item.manifestText);
    const value = await job(item), accepted = await start(value);
    expect(accepted.intentText).toBe(JSON.stringify(value));
    expect(value.plan).not.toHaveProperty('creativePlan');
  });

  it.each(['silent', 'missing voice', 'blank call to action'] as const)('matches the domain validator for %s fixture metadata', async variant => {
    const draft = input('cinematic-spec');
    if (variant === 'silent') { draft.speechMode = 'silent'; draft.adaptationMode = 'close'; }
    if (variant === 'missing voice') draft.voice = null;
    if (variant === 'blank call to action') draft.callToAction = ' \n\t';
    const item = saved(draft); await complete(item);
    const value = await job(item, true), plan = value.plan.creativePlan!;
    expect(isCreativePlan(plan)).toBe(true);
    expect((await db.query<{ valid: boolean }>('select grifon_fixture.creative_plan_valid_v1($1::jsonb,$2::jsonb,$3::jsonb) as valid', [JSON.stringify(plan), JSON.stringify(value.plan), JSON.stringify(item.manifest.draft)])).rows[0].valid).toBe(true);
    expect((await start(value)).queue.actualCents).toBe(0);
    if (variant === 'silent') {
      expect(plan.audio.selectedVoice).toEqual(draft.voice);
      expect(plan.audio.routes.every(route => route.route === 'none' && route.voiceId === null)).toBe(true);
      expect(plan.execution.nodes.some(node => node.kind === 'voice')).toBe(false);
    }
  });

  it('delegates malformed absent-source manifests to the unchanged legacy validator with the same error', async () => {
    for (const raw of ['null', '[]', '{}', '{"draft":null}', 'bad json']) {
      await expect(db.query('select grifon_fixture.reference_validate_manifest_v1_base($1)', [raw])).rejects.toThrow('INVALID_REFERENCE_MANIFEST');
      await expect(db.query('select grifon_fixture.reference_validate_manifest($1)', [raw])).rejects.toThrow('INVALID_REFERENCE_MANIFEST');
    }
  });

  it('rejects malformed sources and duplicate original keys before JSONB sanitization', async () => {
    const variants = [null, { version: 2, mode: 'fixture-auto', category: 'ugc' }, { version: 1, mode: 'production-auto', category: 'ugc' }, { version: 1, mode: 'fixture-auto', category: 'unknown' }, { version: 1, mode: 'fixture-auto', category: 'ugc', extra: true }, { version: 1, mode: 'fixture-recipe', category: 'ugc', recipeId: 'unknown', recipeVersion: 1 }];
    for (const source of variants) {
      const item = saved(); const raw = JSON.stringify({ ...item.manifest, draft: { ...item.manifest.draft, creativeSource: source } });
      await expect(db.query('select grifon_fixture.reference_validate_manifest($1)', [raw])).rejects.toThrow('INVALID_CREATIVE_SOURCE');
    }
    for (const raw of [saved().manifestText.replace('"creativeSource":{', '"creativeSource":{"version":1,'), saved().manifestText.replace('"brief":', '"brief":"duplicate","brief":')]) await expect(db.query('select grifon_fixture.reference_validate_manifest($1)', [raw])).rejects.toThrow('INVALID_REFERENCE_MANIFEST');
  });

  it('rejects re-signed plan tampering and exact photo/source/voice/hash/dependency mismatches atomically', async () => {
    const item = saved(); await complete(item); const value = await job(item);
    const mutations: ((job: FixtureJobIntent) => void)[] = [
      job => { delete job.plan.creativePlan; },
      job => { job.plan.creativePlan!.productionEligible = true as false; },
      job => { job.plan.creativePlan!.inputHash = 'e'.repeat(64); },
      job => { job.plan.creativePlan!.inputRevision++; },
      job => { job.plan.creativePlan!.source.recipeId = 'fixture-motion-launch-v1'; },
      job => { job.plan.creativePlan!.source.provenance = 'creator-derived' as 'original-synthetic-fixture'; },
      job => { job.plan.creativePlan!.editDNA.shots[1].startSeconds = 0; },
      job => { job.plan.creativePlan!.bindings[0].photoId = 'other-photo'; },
      job => { job.plan.creativePlan!.bindings[0].role = 'product'; },
      job => { job.plan.creativePlan!.bindings.pop(); },
      job => { job.plan.creativePlan!.audio.selectedVoice!.id = 'other-voice'; },
      job => { job.plan.creativePlan!.audio.routes[0].voiceId = 'other-voice'; },
      job => { job.plan.creativePlan!.execution.providerCalls = 1 as 0; },
      job => { job.plan.creativePlan!.execution.nodes[0].dependsOn = ['qa']; },
      job => { job.plan.creativePlan!.brandStrategy.facts[0].value = 'Invented fact'; },
      job => { job.plan.creativePlan!.brandStrategy.objective = 'An invented sales outcome'; },
      job => { job.plan.creativePlan!.brandStrategy.messaging = 'Research proves it converts.'; },
      job => { job.plan.scenes[0].id = 'unknown'; },
      job => { Object.assign(job.plan.creativePlan!, { modelId: 'unapproved' }); },
    ];
    for (const mutate of mutations) {
      const changed = structuredClone(value); mutate(changed); resign(changed);
      await expect(start(changed)).rejects.toThrow(/INVALID_CREATIVE_PLAN|CREATIVE_PLAN_REQUIRED/);
    }
    expect((await db.query('select count(*)::int as n from grifon_fixture.jobs')).rows[0].n).toBe(0);
  });

  it('rejects malformed nested plan shapes without throwing a database internal error', async () => {
    const item = saved(); await complete(item); const value = await job(item);
    const plan = value.plan.creativePlan!;
    const variants = [null, [], {}, { ...plan, selection: { reasons: {}, productionAutoEligible: false } }, { ...plan, editDNA: { ...plan.editDNA, preserve: {} } }, { ...plan, bindings: {} }, { ...plan, audio: { ...plan.audio, routes: {} } }, { ...plan, execution: { ...plan.execution, nodes: {} } }, { ...plan, brandStrategy: { ...plan.brandStrategy, missing: {} } }];
    for (const malformed of variants) {
      expect(isCreativePlan(malformed)).toBe(false);
      const result = await db.query<{ valid: boolean }>('select grifon_fixture.creative_plan_valid_v1($1::jsonb,$2::jsonb,$3::jsonb) as valid', [JSON.stringify(malformed), JSON.stringify(value.plan), JSON.stringify(item.manifest.draft)]);
      expect(result.rows[0].valid).toBe(false);
    }
  });

  it('rejects a copied UGC plan with missing required character role, despite a valid saved partial draft', async () => {
    const completeDraft = input();
    const partialDraft = { ...completeDraft, photos: completeDraft.photos.filter(photo => photo.role === 'product') };
    const item = saved(partialDraft); await complete(item);
    const plan = createCreativeSampleReview(completeDraft, item.manifest.inputHash, 2);
    const confirmed = confirmSampleReview(plan, item.manifest.inputHash, 2);
    confirmed.creativePlan!.bindings = confirmed.creativePlan!.bindings.filter(binding => binding.role === 'product');
    const value = { version: 1, fixture: true, requestId: '', ownerId: owner, ownerChatId: 'copied-ugc', inputRevision: 2, plan: confirmed, scenario: 'normal', cloudReference: { version: 1, saveId: item.saveId, inputHash: item.manifest.inputHash } } as FixtureJobIntent;
    resign(value);
    await expect(start(value)).rejects.toThrow('INVALID_CREATIVE_PLAN');
  });

  it('rejects new plans without a linked source and keeps private owner isolation on new saved inputs', async () => {
    const item = saved(); await complete(item); const value = await job(item);
    const unlinked = structuredClone(value); delete unlinked.cloudReference; resign(unlinked);
    await expect(start(unlinked)).rejects.toThrow('CREATIVE_PLAN_REQUIRES_SOURCE');
    const draft = input(); delete draft.creativeSource; const legacy = saved(draft, 'legacy'); await complete(legacy);
    const linkedLegacy = await job(legacy); linkedLegacy.plan.creativePlan = value.plan.creativePlan; resign(linkedLegacy);
    await expect(start(linkedLegacy)).rejects.toThrow('CREATIVE_PLAN_REQUIRES_SOURCE');
    expect(await rpc('reference_get', [item.saveId], otherOwner)).toBeNull();
    await expect(asRole('anon', () => db.query('select public.grifon_reference_list()'))).rejects.toThrow('permission denied');
  });
});

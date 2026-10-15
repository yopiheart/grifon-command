import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ffmpeg from 'ffmpeg-static';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { decodeFixtureInput, verifySavedFixtureInputs } from '../../api/_lib/companionInputVerifier.js';
import { createReferenceDraft, type CompanionReferenceDraft } from '../../services/companionReferenceDraft.js';
import { fingerprintReferenceDraft, createSampleReview, confirmSampleReview } from '../../services/companionReferenceReview.js';
import { createFixtureJobIntent } from '../../services/companionFixtureJobs.js';
import { createReferenceQueue } from '../../services/companionReferenceQueue.js';
import { fixtureInputTextSha256 } from '../../services/companionInputVerification.js';
import type { CloudReferenceMedia } from '../../services/companionCloudReferences.js';

const owner = '11111111-1111-4111-8111-111111111111', sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const fixtures = new Map<string, Buffer>();
function generate(mime: string): Buffer {
  const video = mime.startsWith('video'), codec = mime === 'image/png' ? 'png' : mime === 'image/jpeg' ? 'mjpeg' : mime === 'image/webp' ? 'libwebp' : 'libvpx-vp9';
  const args = ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=16x24:r=10', ...(video ? ['-t', '0.5'] : ['-frames:v', '1']), '-threads', '1', '-c:v', codec, '-f', video ? 'webm' : 'image2pipe', 'pipe:1'];
  const result = spawnSync(ffmpeg!, args, { encoding: 'buffer', timeout: 10_000, maxBuffer: 1_048_576, windowsHide: true, env: {} });
  if (result.status !== 0) throw new Error(`Fixture setup failed: ${result.stderr}`);
  return result.stdout;
}
const metadata = (bytes: Buffer, type = 'image/png', changes: Partial<CloudReferenceMedia> = {}): CloudReferenceMedia => ({ slot: type.startsWith('video') ? 'reference' : 'photo-0', id: 'fixture-media', name: 'fixture', width: 16, height: 24,
  ...(type.startsWith('video') ? { duration: 0.5 } : { role: 'product' as const }), type, size: bytes.length, sha256: sha(bytes), ...changes });
async function savedFixture() {
  const png = fixtures.get('image/png')!, webm = fixtures.get('video/webm')!;
  const draft: CompanionReferenceDraft = { ...createReferenceDraft(), brief: 'Fixture preflight', brandName: 'Fixture brand', productName: 'Fixture product', audience: 'Fixture audience', callToAction: 'See details',
    referenceVideo: { id: 'ref', name: 'fixture.webm', blob: new Blob([webm], { type: 'video/webm' }), width: 16, height: 24, duration: 0.5 },
    photos: [{ id: 'photo', name: 'fixture.png', blob: new Blob([png], { type: 'image/png' }), width: 16, height: 24, role: 'product' }], voice: { id: 'fixture-voice', name: 'Fixture voice', source: 'curated' } };
  const media = [metadata(webm, 'video/webm', { id: 'ref', name: 'fixture.webm' }), metadata(png, 'image/png', { id: 'photo', name: 'fixture.png' })];
  const { blob: _ref, ...referenceVideo } = draft.referenceVideo!, { blob: _photo, ...photo } = draft.photos[0];
  const inputHash = await fingerprintReferenceDraft(draft), manifestText = JSON.stringify({ version: 1, draft: { ...draft, referenceVideo, photos: [photo] }, media, inputHash });
  const saveId = await fixtureInputTextSha256(JSON.stringify([owner, 'source-chat', manifestText]));
  const plan = confirmSampleReview(createSampleReview(draft, inputHash, 0), inputHash, 0), intent = await createFixtureJobIntent(owner, 'job-chat', plan, 'normal', { version: 1, saveId, inputHash });
  const { plan: _plan, ...queue } = createReferenceQueue(plan, 0, 'normal');
  return { draft, intent, job: { runtime: 'supabase-cloud-fixture-v1', intentText: JSON.stringify(intent), queue, updatedAt: 0, nextDueAt: null }, saved: { runtime: 'supabase-cloud-reference-v1', ownerId: owner, saveId, sourceChatId: 'source-chat', manifestText, createdAt: 0, committed: true }, png, webm };
}
beforeAll(() => { for (const type of ['image/png', 'image/jpeg', 'image/webp', 'video/webm']) fixtures.set(type, generate(type)); }, 30_000);
afterEach(() => { vi.unstubAllGlobals(); });

describe('real stdin-only full-null fixture decoding', () => {
  it.each(['image/png', 'image/jpeg', 'image/webp', 'video/webm'])('fully decodes actual %s bytes and returns measured metadata', async type => {
    const bytes = fixtures.get(type)!, evidence = await decodeFixtureInput(bytes, metadata(bytes, type));
    expect(evidence).toMatchObject({ mimeType: type, sha256: sha(bytes), sizeBytes: bytes.length, width: 16, height: 24, decoded: true, frames: type.startsWith('video') ? 5 : 1, durationSeconds: type.startsWith('video') ? 0.5 : null });
  });
  it('fully decodes the real immutable MP4 fixture rather than accepting its hash alone', async () => {
    const bytes = readFileSync('api/_lib/assets/fixtures/companion-video-v1.mp4');
    const decoded = await decodeFixtureInput(bytes, metadata(bytes, 'video/mp4', { width: 360, height: 640, duration: 8 }));
    expect(decoded).toMatchObject({ width: 360, height: 640, frames: 192, decoded: true }); expect(decoded.durationSeconds).toBeCloseTo(8, 5);
  });
  it('rejects truncated video/photo bytes even when their saved hash and size match those corrupt bytes', async () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp', 'video/webm']) {
      const bytes = fixtures.get(type)!.subarray(0, fixtures.get(type)!.length - (type === 'video/webm' ? 40 : 4));
      await expect(decodeFixtureInput(bytes, metadata(bytes, type))).rejects.toThrow(/TRUNCATED|SIGNATURE|DECODE|METADATA/);
    }
    const mp4 = readFileSync('api/_lib/assets/fixtures/companion-video-v1.mp4').subarray(0, 1000);
    await expect(decodeFixtureInput(mp4, metadata(mp4, 'video/mp4', { width: 360, height: 640, duration: 8 }))).rejects.toThrow(/TRUNCATED|DECODE/);
  });
  it('rejects same-size corrupted PNG payload with a recomputed hash and plausible dimensions', async () => {
    const bytes = Buffer.from(fixtures.get('image/png')!); const idat = bytes.indexOf(Buffer.from('IDAT')); bytes[idat + 5] ^= 255;
    await expect(decodeFixtureInput(bytes, metadata(bytes))).rejects.toThrow(/DECODE/);
  });
  it('checks signature, MIME, decoded dimensions, measured duration, byte integrity and stricter limits', async () => {
    const png = fixtures.get('image/png')!, webm = fixtures.get('video/webm')!;
    await expect(decodeFixtureInput(png, metadata(png, 'image/jpeg'))).rejects.toThrow('SIGNATURE_MISMATCH');
    await expect(decodeFixtureInput(png, metadata(png, 'image/png', { width: 17 }))).rejects.toThrow('METADATA_MISMATCH');
    await expect(decodeFixtureInput(webm, metadata(webm, 'video/webm', { duration: 0.49 }))).rejects.toThrow('METADATA_MISMATCH');
    await expect(decodeFixtureInput(png, metadata(png, 'image/png', { sha256: 'a'.repeat(64) }))).rejects.toThrow('INTEGRITY_MISMATCH');
    await expect(decodeFixtureInput(webm, metadata(webm, 'video/webm', { duration: 31 }))).rejects.toThrow('LIMIT_UNSUPPORTED');
    await expect(decodeFixtureInput(png, metadata(png, 'image/png', { width: 10000, height: 10000 }))).rejects.toThrow('LIMIT_UNSUPPORTED');
  });
  it('includes fully decoded audio in measured duration rather than trusting only video frame timing', async () => {
    const made = spawnSync(ffmpeg!, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-t', '0.5', '-i', 'color=c=blue:s=16x24:r=10', '-f', 'lavfi', '-t', '1', '-i', 'anullsrc=r=48000:cl=mono', '-map', '0:v:0', '-map', '1:a:0', '-af', 'asetpts=PTS+0.1/TB', '-threads', '1', '-c:v', 'libvpx-vp9', '-c:a', 'libopus', '-f', 'webm', 'pipe:1'], { encoding: 'buffer', timeout: 10_000, maxBuffer: 1_048_576, windowsHide: true, env: {} });
    if (made.status !== 0) throw new Error('Native audio fixture setup failed');
    await expect(decodeFixtureInput(made.stdout, metadata(made.stdout, 'video/webm'))).rejects.toThrow('METADATA_MISMATCH');
  });
  it('rejects expired total budgets and kills actual decoder work at the child deadline', async () => {
    const bytes = readFileSync('api/_lib/assets/fixtures/companion-video-v1.mp4'), expected = metadata(bytes, 'video/mp4', { width: 360, height: 640, duration: 8 });
    await expect(decodeFixtureInput(bytes, expected, { deadlineAt: Date.now() - 1 })).rejects.toThrow('VERIFICATION_DEADLINE');
    await expect(decodeFixtureInput(bytes, expected, { timeoutMs: 1 })).rejects.toThrow('DECODER_TIMEOUT');
  });
  it('rejects image EXIF and animation metadata rather than claiming browser-orientation parity', async () => {
    const jpeg = Buffer.concat([fixtures.get('image/jpeg')!.subarray(0, 2), Buffer.from('Exif\0\0'), fixtures.get('image/jpeg')!.subarray(2)]);
    await expect(decodeFixtureInput(jpeg, metadata(jpeg, 'image/jpeg'))).rejects.toThrow('ORIENTATION_OR_ANIMATION_UNSUPPORTED');
    const png = fixtures.get('image/png')!, animation = Buffer.concat([png.subarray(0, 33), Buffer.from([0, 0, 0, 0]), Buffer.from('acTL'), Buffer.alloc(4), png.subarray(33)]);
    await expect(decodeFixtureInput(animation, metadata(animation))).rejects.toThrow('ORIENTATION_OR_ANIMATION_UNSUPPORTED');
  });
});

describe('saved fixture input identity verification', () => {
  it.each(['facts', 'voice'] as const)('preserves semantically identical %s despite PostgreSQL object key order', async field => {
    const test = await savedFixture(), changed = { ...test.intent.plan, confirmation: null };
    if (field === 'facts') changed.facts = changed.facts.map(fact => ({ value: fact.value, label: fact.label }));
    else changed.voice = { source: changed.voice!.source, name: changed.voice!.name, id: changed.voice!.id };
    const plan = confirmSampleReview(changed, changed.inputHash, changed.inputRevision), intent = await createFixtureJobIntent(owner, 'job-chat', plan, 'normal', test.intent.cloudReference);
    const proof = await verifySavedFixtureInputs(owner, intent.requestId, { ...test.job, intentText: JSON.stringify(intent) }, test.saved, async path => path.endsWith('/reference') ? new Blob([test.webm], { type: 'video/webm' }) : new Blob([test.png], { type: 'image/png' }));
    expect(proof.inputHash).toBe(test.intent.plan.inputHash);
  });
  it('downloads canonical slots, verifies native decoded bytes, and rebuilds the exact draft fingerprint without external fetch', async () => {
    const test = await savedFixture(), external = vi.fn(async () => { throw new Error('Network forbidden'); }); vi.stubGlobal('fetch', external);
    const paths: string[] = [], proof = await verifySavedFixtureInputs(owner, test.intent.requestId, test.job, test.saved, async path => {
      paths.push(path); return path.endsWith('/reference') ? new Blob([test.webm], { type: 'video/webm' }) : new Blob([test.png], { type: 'image/png' });
    });
    expect(paths).toEqual([`${owner}/${test.saved.saveId}/reference`, `${owner}/${test.saved.saveId}/photo-0`]);
    expect(proof).toMatchObject({ ownerId: owner, requestId: test.intent.requestId, sourceSaveId: test.saved.saveId, inputHash: await fingerprintReferenceDraft(test.draft), manifestSha256: await fixtureInputTextSha256(test.saved.manifestText), planSnapshotSha256: await fixtureInputTextSha256(test.intent.plan.confirmation!.planSnapshot) });
    expect(proof.verifiedMedia.map(media => media.decoded)).toEqual([true, true]); expect(external).not.toHaveBeenCalled();
  });
  it('rejects foreign/mismatched/invalidated jobs, uncommitted or forged raw manifests before downloading', async () => {
    const test = await savedFixture(), download = vi.fn();
    for (const [ownerId, requestId, job, saved] of [
      ['22222222-2222-4222-8222-222222222222', test.intent.requestId, test.job, test.saved],
      [owner, 'a'.repeat(64), test.job, test.saved], [owner, test.intent.requestId, { ...test.job, queue: { ...test.job.queue, invalidated: true } }, test.saved],
      [owner, test.intent.requestId, test.job, { ...test.saved, committed: false }], [owner, test.intent.requestId, test.job, { ...test.saved, manifestText: test.saved.manifestText + ' ' }],
    ] as const) await expect(verifySavedFixtureInputs(ownerId, requestId, job, saved, download)).rejects.toThrow();
    expect(download).not.toHaveBeenCalled();
  });
  it('rejects wrong download MIME, a digest mismatch, or a byte-valid manifest with a false draft fingerprint', async () => {
    const test = await savedFixture();
    await expect(verifySavedFixtureInputs(owner, test.intent.requestId, test.job, test.saved, async () => new Blob([test.webm], { type: 'video/mp4' }))).rejects.toThrow('INTEGRITY_MISMATCH');
    const mutated = Buffer.from(test.webm); mutated[mutated.length - 1] ^= 255;
    await expect(verifySavedFixtureInputs(owner, test.intent.requestId, test.job, test.saved, async () => new Blob([mutated], { type: 'video/webm' }))).rejects.toThrow('INTEGRITY_MISMATCH');
    const manifest = JSON.parse(test.saved.manifestText); manifest.draft.brief = 'Different brief';
    const manifestText = JSON.stringify(manifest), saveId = await fixtureInputTextSha256(JSON.stringify([owner, 'source-chat', manifestText]));
    const intent = await createFixtureJobIntent(owner, 'job-chat', test.intent.plan, 'normal', { ...test.intent.cloudReference!, saveId });
    await expect(verifySavedFixtureInputs(owner, intent.requestId, { ...test.job, intentText: JSON.stringify(intent) }, { ...test.saved, saveId, manifestText }, async path => path.endsWith('/reference') ? new Blob([test.webm], { type: 'video/webm' }) : new Blob([test.png], { type: 'image/png' }))).rejects.toThrow('FINGERPRINT_MISMATCH');
  });
});

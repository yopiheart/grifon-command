import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { createReferenceDraft, type CompanionReferenceDraft } from '../../services/companionReferenceDraft.js';
import { fingerprintReferenceDraft } from '../../services/companionReferenceReview.js';
import { cloudReferenceLink, createCloudReferenceClient, ensureCloudReference, verifyCloudReferenceDraft, type CloudReferenceReceipt, type CloudReferenceTransport } from '../../services/companionCloudReferences.js';

// Browser decoding is covered by the fresh-browser E2E. These tests isolate the authenticated byte/manifest protocol.
const decode = vi.hoisted(() => vi.fn());
vi.mock('../../services/companionReferenceDraft.js', async importOriginal => ({ ...await importOriginal<typeof import('../../services/companionReferenceDraft.js')>(), prepareReferenceMedia: decode }));
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
function draft(): CompanionReferenceDraft {
  return { ...createReferenceDraft(), brief: 'Exact brief', productName: 'Coffee', adaptationMode: 'close', voice: { id: 'unavailable', name: 'Preserved private voice', source: 'private' },
    referenceVideo: { id: 'video-id', name: 'Original.mov', blob: new Blob(['video bytes'], { type: 'video/quicktime' }), width: 640, height: 360, duration: 4 },
    photos: [
      { id: 'photo-first', name: 'First.webp', blob: new Blob(['first photo'], { type: 'image/webp' }), width: 20, height: 10, role: 'clothing' },
      { id: 'photo-last', name: 'Last.png', blob: new Blob(['last photo'], { type: 'image/png' }), width: 10, height: 20, role: 'character' },
    ] };
}
function service() {
  const snapshots = new Map<string, CloudReferenceReceipt>(), objects = new Map<string, Blob>();
  let failUpload = '', lostUpload = '', lostCommit = false;
  const rpc = vi.fn(async (name: string, args?: Record<string, unknown>) => {
    const id = String(args?.p_save_id);
    if (name === 'grifon_reference_reserve') {
      if (!snapshots.has(id)) snapshots.set(id, { runtime: 'supabase-cloud-reference-v1', ownerId: owner, saveId: id, sourceChatId: String(args?.p_source_chat_id), manifestText: String(args?.p_manifest_text), createdAt: 1, committed: false });
      return { data: { ...snapshots.get(id)! }, error: null };
    }
    if (name === 'grifon_reference_commit') {
      const receipt = snapshots.get(id)!;
      receipt.committed = true;
      if (lostCommit) { lostCommit = false; throw new Error('Lost acknowledgement'); }
      return { data: { ...receipt }, error: null };
    }
    if (name === 'grifon_reference_get') return { data: snapshots.get(id)?.committed ? { ...snapshots.get(id)! } : null, error: null };
    return { data: [...snapshots.values()].filter(item => item.committed).map(item => ({ ...item })), error: null };
  });
  const transport: CloudReferenceTransport = { rpc,
    upload: vi.fn(async (path, blob) => {
      if (path.endsWith(failUpload) && failUpload) return { error: { message: 'Interrupted' } };
      if (objects.has(path)) return { error: { code: '409' } };
      objects.set(path, blob);
      if (path.endsWith(lostUpload) && lostUpload) { lostUpload = ''; throw new Error('Lost upload acknowledgement'); }
      return { error: null };
    }),
    download: vi.fn(async path => ({ data: objects.get(path) ?? null, error: objects.has(path) ? null : { message: 'Missing' } })),
  };
  return { transport, rpc, objects, snapshots, fail: (slot: string) => { failUpload = slot; }, loseUpload: (slot: string) => { lostUpload = slot; }, loseCommit: () => { lostCommit = true; } };
}
beforeEach(() => { decode.mockReset(); decode.mockImplementation(async (file: File, kind: string) => ({ id: 'decoder-new-id', name: file.name, blob: file, width: kind === 'video' ? 640 : file.name === 'First.webp' ? 20 : 10, height: kind === 'video' ? 360 : file.name === 'First.webp' ? 10 : 20, ...(kind === 'video' ? { duration: 4 } : {}) })); });

describe('immutable private cloud reference briefs', () => {
  it('reuses verified committed inputs after opening a copy without uploading or reserving another snapshot', async () => {
    const backend = service(), client = createCloudReferenceClient(owner, backend.transport), original = draft();
    const receipt = await client.save('original-chat', original);
    const link = await cloudReferenceLink(receipt, owner);
    const opened = await client.openSnapshot(receipt.saveId);
    expect(opened.receipt).toEqual(receipt);
    const reserveCount = backend.rpc.mock.calls.filter(call => call[0] === 'grifon_reference_reserve').length;
    const uploadCount = vi.mocked(backend.transport.upload).mock.calls.length;
    expect(await ensureCloudReference(client, owner, 'new-copy-chat', opened.draft, link)).toEqual(link);
    expect(await ensureCloudReference(client, owner, 'new-copy-chat', opened.draft, link)).toEqual(link);
    expect(backend.rpc.mock.calls.filter(call => call[0] === 'grifon_reference_reserve')).toHaveLength(reserveCount);
    expect(vi.mocked(backend.transport.upload)).toHaveBeenCalledTimes(uploadCount);
    expect(backend.snapshots.size).toBe(1);
    const changed = { ...opened.draft, offer: 'Updated offer' };
    expect(await verifyCloudReferenceDraft(changed, link)).toBe(false);
    expect((await ensureCloudReference(client, owner, 'new-copy-chat', changed, link)).saveId).not.toBe(link.saveId);
    expect(backend.snapshots.size).toBe(2);
  });
  it('saves original bytes/metadata/order/voice and reopens from a new client without generation or cloud fields in the draft', async () => {
    const backend = service(), original = draft();
    const receipt = await createCloudReferenceClient(owner, backend.transport).save('source-chat', original);
    expect(receipt.committed).toBe(true);
    decode.mockClear();
    const reopened = await createCloudReferenceClient(owner, backend.transport).open(receipt.saveId);
    expect(reopened).toEqual(original);
    expect(await fingerprintReferenceDraft(reopened)).toBe(await fingerprintReferenceDraft(original));
    expect(reopened.photos.map(photo => [photo.id, photo.role])).toEqual([['photo-first', 'clothing'], ['photo-last', 'character']]);
    expect(await reopened.referenceVideo!.blob.text()).toBe('video bytes');
    expect(decode.mock.calls.map(call => [call[0].name, call[1]])).toEqual([['Original.mov', 'video'], ['First.webp', 'photo'], ['Last.png', 'photo']]);
    expect(JSON.stringify(reopened)).not.toMatch(/saveId|ownerId|storage|blob:|https:/);
    expect(backend.rpc.mock.calls.map(call => call[0])).toEqual(['grifon_reference_reserve', 'grifon_reference_commit', 'grifon_reference_get']);
  });
  it('reuses content-derived identity after lost commit acknowledgement and after reload, while distinct edits keep both snapshots', async () => {
    const backend = service(), original = draft();
    backend.loseCommit();
    const first = await createCloudReferenceClient(owner, backend.transport).save('chat', original);
    const again = await createCloudReferenceClient(owner, backend.transport).save('chat', structuredClone(original));
    expect(again.saveId).toBe(first.saveId);
    expect(backend.snapshots.size).toBe(1);
    const changed = await createCloudReferenceClient(owner, backend.transport).save('chat', { ...original, offer: 'Different' });
    expect(changed.saveId).not.toBe(first.saveId);
    expect(await createCloudReferenceClient(owner, backend.transport).list()).toHaveLength(2);
  });
  it('reconciles a lost upload ACK without overwrite, and leaves interrupted snapshots unpublished until exact retry', async () => {
    const backend = service(), original = draft();
    backend.loseUpload('reference'); backend.fail('photo-0');
    await expect(createCloudReferenceClient(owner, backend.transport).save('chat', original)).rejects.toThrow(/upload|saved|confirm/i);
    expect(await createCloudReferenceClient(owner, backend.transport).list()).toEqual([]);
    expect(backend.rpc.mock.calls.some(call => call[0] === 'grifon_reference_commit')).toBe(false);
    backend.fail('');
    const receipt = await createCloudReferenceClient(owner, backend.transport).save('chat', original);
    expect(receipt.committed).toBe(true);
    expect(backend.snapshots.size).toBe(1);
    expect(backend.objects.size).toBe(3);
  });
  it('rejects corrupt bytes, changed MIME, invalid decode metadata and incorrect original fingerprint before returning media', async () => {
    for (const tamper of ['bytes', 'mime', 'decode', 'fingerprint']) {
      const backend = service(), original = draft();
      const receipt = await createCloudReferenceClient(owner, backend.transport).save('chat', original);
      const path = `${owner}/${receipt.saveId}/reference`;
      if (tamper === 'bytes') backend.objects.set(path, new Blob(['bad video!!'], { type: 'video/quicktime' }));
      if (tamper === 'mime') backend.objects.set(path, new Blob(['video bytes'], { type: 'video/mp4' }));
      if (tamper === 'decode') decode.mockResolvedValueOnce({ width: 1, height: 1, duration: 4 });
      if (tamper === 'fingerprint') {
        const value = backend.snapshots.get(receipt.saveId)!;
        const manifest = JSON.parse(value.manifestText); manifest.inputHash = '0'.repeat(64);
        value.manifestText = JSON.stringify(manifest);
        // Keep content identity valid so this specifically reaches the reconstructed draft fingerprint check.
        const changedId = createHash('sha256').update(JSON.stringify([owner, value.sourceChatId, value.manifestText])).digest('hex');
        backend.snapshots.delete(value.saveId);
        for (const [oldPath, blob] of [...backend.objects]) backend.objects.set(oldPath.replace(value.saveId, changedId), blob);
        value.saveId = changedId; receipt.saveId = changedId; backend.snapshots.set(changedId, value);
      }
      await expect(createCloudReferenceClient(owner, backend.transport).open(receipt.saveId)).rejects.toThrow(/invalid|match|integrity|decode/i);
    }
  });
  it('rejects other accounts, malformed manifests, missing snapshots and oversized local blobs', async () => {
    const backend = service(), original = draft();
    const receipt = await createCloudReferenceClient(owner, backend.transport).save('chat', original);
    await expect(createCloudReferenceClient(other, backend.transport).list()).rejects.toThrow(/account|owner/i);
    await expect(createCloudReferenceClient(owner, backend.transport).open('f'.repeat(64))).rejects.toThrow(/unavailable|missing/i);
    const tooLarge = { ...original, referenceVideo: { ...original.referenceVideo!, blob: new Blob([new Uint8Array(6_000_001)], { type: 'video/mp4' }) } };
    const spy = vi.fn();
    await expect(createCloudReferenceClient(owner, { ...backend.transport, rpc: spy }).save('chat', tooLarge)).rejects.toThrow(/6|limit/i);
    expect(spy).not.toHaveBeenCalled();
    backend.snapshots.get(receipt.saveId)!.manifestText = '{}';
    await expect(createCloudReferenceClient(owner, backend.transport).list()).rejects.toThrow(/invalid/i);
  });
  it('rejects cloud receipts or URLs spread into original draft/media metadata before any upload', async () => {
    for (const original of [
      { ...draft(), saveId: 'unexpected' },
      { ...draft(), photos: [{ ...draft().photos[0], storagePath: 'owner/save/photo-0' }] },
      { ...draft(), voice: { ...draft().voice!, signedUrl: 'https://example.com' } },
    ]) {
      const backend = service();
      await expect(createCloudReferenceClient(owner, backend.transport).save('chat', original)).rejects.toThrow(/invalid/i);
      expect(backend.rpc).not.toHaveBeenCalled();
      expect(backend.transport.upload).not.toHaveBeenCalled();
    }
  });
});

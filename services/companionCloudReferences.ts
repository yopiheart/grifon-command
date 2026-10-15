import { getSupabase } from './supabaseClient.js';
import { isReferenceDraft, prepareReferenceMedia, type CompanionReferenceDraft, type ReferenceMedia, type ReferencePhoto } from './companionReferenceDraft.js';
import { fingerprintReferenceDraft } from './companionReferenceReview.js';
import { isCloudReferenceLink, type CloudReferenceLink } from './companionFixtureJobs.js';

export const CLOUD_REFERENCE_BUCKET = 'grifon-fixture-reference-media';
export const CLOUD_REFERENCE_FILE_LIMIT = 6_000_000;
type CloudError = { code?: string; message?: string } | null;
export interface CloudReferenceTransport {
  rpc: (name: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: CloudError }>;
  upload: (path: string, blob: Blob) => PromiseLike<{ error: CloudError }>;
  download: (path: string) => PromiseLike<{ data: Blob | null; error: CloudError }>;
}
type MediaMetadata = Omit<ReferenceMedia, 'blob'> & { role?: ReferencePhoto['role'] };
export interface CloudReferenceMedia extends MediaMetadata { slot: string; type: string; size: number; sha256: string }
export interface CloudReferenceManifest {
  version: 1;
  draft: Omit<CompanionReferenceDraft, 'referenceVideo' | 'photos'> & { referenceVideo: MediaMetadata | null; photos: MediaMetadata[] };
  media: CloudReferenceMedia[];
  inputHash: string;
}
export interface CloudReferenceReceipt {
  runtime: 'supabase-cloud-reference-v1';
  ownerId: string;
  saveId: string;
  sourceChatId: string;
  manifestText: string;
  createdAt: number;
  committed: boolean;
}
export interface CloudReferenceClient {
  runtime: 'supabase-cloud-reference-v1';
  simulation?: boolean;
  save: (sourceChatId: string, draft: CompanionReferenceDraft) => Promise<CloudReferenceReceipt>;
  list: () => Promise<CloudReferenceReceipt[]>;
  open: (saveId: string) => Promise<CompanionReferenceDraft>;
  openSnapshot: (saveId: string) => Promise<{ draft: CompanionReferenceDraft; receipt: CloudReferenceReceipt }>;
}
const runtime = 'supabase-cloud-reference-v1' as const;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const hash = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const identifier = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 200 && !/[\u0000-\u001f]/.test(value);
const only = (value: object, keys: string[]) => Object.keys(value).every(key => keys.includes(key));
const metadataKeys = ['id', 'name', 'width', 'height', 'duration', 'role'];
const draftKeys = ['version', 'brief', 'brandName', 'productName', 'audience', 'offer', 'callToAction', 'instructions', 'outputLanguage', 'referenceLanguage', 'referenceLink', 'referenceVideo', 'photos', 'voice', 'adaptationMode', 'speechMode', 'creativeSource'];
async function sha256(bytes: BufferSource): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
}
const identity = (ownerId: string, sourceChatId: string, manifestText: string) => JSON.stringify([ownerId, sourceChatId, manifestText]);
export async function cloudReferenceLink(receipt: CloudReferenceReceipt, ownerId: string): Promise<CloudReferenceLink> {
  if (receipt.ownerId !== ownerId || !receipt.committed || receipt.runtime !== runtime || !hash(receipt.saveId) || !identifier(receipt.sourceChatId)
    || typeof receipt.manifestText !== 'string' || receipt.manifestText.length > 131072
    || await sha256(new TextEncoder().encode(identity(ownerId, receipt.sourceChatId, receipt.manifestText))) !== receipt.saveId) throw new Error('The saved cloud inputs do not match this account or snapshot.');
  const payload = manifest(JSON.parse(receipt.manifestText));
  return { version: 1, saveId: receipt.saveId, inputHash: payload.inputHash };
}
export async function verifyCloudReferenceDraft(draft: CompanionReferenceDraft, link: CloudReferenceLink): Promise<boolean> {
  return isCloudReferenceLink(link) && await fingerprintReferenceDraft(draft) === link.inputHash;
}
export async function ensureCloudReference(client: CloudReferenceClient, ownerId: string, chatId: string, draft: CompanionReferenceDraft, existing?: CloudReferenceLink): Promise<CloudReferenceLink> {
  const inputHash = await fingerprintReferenceDraft(draft);
  if (existing !== undefined && !isCloudReferenceLink(existing)) throw new Error('The saved cloud input link is invalid. Your local work is kept.');
  const reuse = existing?.inputHash === inputHash;
  const receipt = reuse ? (await client.openSnapshot(existing.saveId)).receipt : await client.save(chatId, draft);
  const verified = await cloudReferenceLink(receipt, ownerId);
  if (verified.inputHash !== inputHash || (reuse && verified.saveId !== existing.saveId)) throw new Error('The cloud snapshot does not match the current brief. Your local work is kept.');
  return verified;
}
function metadata(media: ReferenceMedia): MediaMetadata { const { blob: _, ...rest } = media; return rest; }
function mediaList(draft: CompanionReferenceDraft) {
  return [...(draft.referenceVideo ? [{ slot: 'reference', media: draft.referenceVideo }] : []), ...draft.photos.map((media, index) => ({ slot: `photo-${index}`, media }))];
}
function manifest(value: unknown): CloudReferenceManifest {
  if (!record(value) || !only(value, ['version', 'draft', 'media', 'inputHash']) || value.version !== 1 || !hash(value.inputHash)
    || !record(value.draft) || !only(value.draft, draftKeys) || !Array.isArray(value.draft.photos) || value.draft.photos.length > 5 || !Array.isArray(value.media) || value.media.length > 6) throw new Error('The cloud brief has an invalid manifest.');
  const draft = value.draft, photos = value.draft.photos as unknown[];
  const expected = [...(draft.referenceVideo === null ? [] : [{ slot: 'reference', media: draft.referenceVideo }]), ...photos.map((media, index) => ({ slot: `photo-${index}`, media }))];
  if (expected.length !== value.media.length) throw new Error('The cloud brief has invalid media ordering.');
  for (const [index, item] of value.media.entries()) {
    const original = expected[index].media, video = expected[index].slot === 'reference';
    if (!record(item) || !record(original) || !only(original, metadataKeys) || !only(item, ['slot', ...metadataKeys, 'type', 'size', 'sha256'])
      || item.slot !== expected[index].slot || !identifier(item.id) || !hash(item.sha256) || !Number.isSafeInteger(item.size) || (item.size as number) < 1 || (item.size as number) > CLOUD_REFERENCE_FILE_LIMIT
      || !(video ? ['video/mp4', 'video/webm', 'video/quicktime'] : ['image/jpeg', 'image/png', 'image/webp']).includes(item.type as string)
      || (video ? 'role' in item || 'role' in original : 'duration' in item || 'duration' in original)
      || metadataKeys.some(key => item[key] !== original[key])) throw new Error('The cloud brief has invalid media metadata.');
  }
  const withBlob = (item: unknown, index: number) => ({ ...(item as MediaMetadata), blob: new Blob(['x'], { type: (value.media as CloudReferenceMedia[])[index].type }) });
  const local = { ...draft, referenceVideo: draft.referenceVideo === null ? null : withBlob(draft.referenceVideo, 0), photos: photos.map((photo, index) => withBlob(photo, index + (draft.referenceVideo === null ? 0 : 1))) };
  if (!isReferenceDraft(local) || (draft.voice !== null && (!record(draft.voice) || !only(draft.voice, ['id', 'name', 'source'])))) throw new Error('The cloud brief has invalid draft or voice metadata.');
  return value as unknown as CloudReferenceManifest;
}
// The server verifier reuses this pure metadata boundary; no browser transport runs here.
export { manifest as parseCloudReferenceManifest };
async function verifyBytes(blob: Blob, expected: CloudReferenceMedia): Promise<void> {
  if (!(blob instanceof Blob) || blob.size !== expected.size || blob.type !== expected.type || await sha256(await blob.arrayBuffer()) !== expected.sha256) throw new Error('Cloud media integrity did not match the saved bytes, size or MIME.');
}
async function verifyDecoded(blob: Blob, expected: MediaMetadata, video: boolean): Promise<void> {
  const decoded = await prepareReferenceMedia(new File([blob], expected.name, { type: blob.type }), video ? 'video' : 'photo');
  if (decoded.width !== expected.width || decoded.height !== expected.height || (video && Math.abs((decoded.duration ?? 0) - (expected.duration ?? 0)) > 0.001)) throw new Error('Cloud media decode did not match the original dimensions or duration.');
}
const nativeTransport: CloudReferenceTransport = {
  rpc: async (name, args) => getSupabase().rpc(name, args),
  upload: async (path, blob) => getSupabase().storage.from(CLOUD_REFERENCE_BUCKET).upload(path, blob, { contentType: blob.type, upsert: false }),
  download: async path => getSupabase().storage.from(CLOUD_REFERENCE_BUCKET).download(path),
};

// Native authenticated RPC and storage enforce auth.uid(); no owner header or durable signed URL is used.
export function createCloudReferenceClient(ownerId: string, transport: CloudReferenceTransport = nativeTransport): CloudReferenceClient {
  const call = async (name: string, args?: Record<string, unknown>) => {
    let result;
    try { result = await transport.rpc(name, args); }
    catch { throw new Error('The cloud brief service could not confirm this request. Reconnect and retry the same brief.'); }
    if (result.error) {
      if (['PGRST202', '42883', '42501'].includes(result.error.code ?? '')) throw new Error('Cloud reference activation is required for this signed-in account. Your local brief is kept.');
      throw new Error('The cloud brief was not confirmed. Check the fixture limits (20 snapshots, 200 MB per account) and retry the same brief when connected.');
    }
    return result.data;
  };
  const decode = async (value: unknown, expectedId?: string): Promise<CloudReferenceReceipt> => {
    if (!record(value) || value.ownerId !== ownerId) throw new Error('The cloud brief has an invalid account or owner.');
    if (value.runtime !== runtime || !hash(value.saveId) || (expectedId && value.saveId !== expectedId) || !identifier(value.sourceChatId)
      || typeof value.manifestText !== 'string' || value.manifestText.length > 131072 || !Number.isSafeInteger(value.createdAt) || (value.createdAt as number) < 0 || typeof value.committed !== 'boolean') throw new Error('The cloud brief service returned an invalid snapshot.');
    let parsed: unknown;
    try { parsed = JSON.parse(value.manifestText); } catch { throw new Error('The cloud brief has an invalid manifest.'); }
    manifest(parsed);
    if (await sha256(new TextEncoder().encode(identity(ownerId, value.sourceChatId, value.manifestText))) !== value.saveId) throw new Error('The cloud brief identity does not match its original manifest.');
    return value as unknown as CloudReferenceReceipt;
  };
  const download = async (path: string, expected: CloudReferenceMedia) => {
    let result;
    try { result = await transport.download(path); }
    catch { throw new Error('A cloud media download could not be confirmed. The current local chat is kept.'); }
    if (result.error || !result.data) throw new Error('Cloud media is unavailable. The current local chat is kept. Retry when connected.');
    await verifyBytes(result.data, expected);
    return result.data;
  };
  const openSnapshot: CloudReferenceClient['openSnapshot'] = async saveId => {
    if (!hash(saveId)) throw new Error('The cloud brief identity is invalid.');
    const value = await call('grifon_reference_get', { p_save_id: saveId });
    if (!value) throw new Error('This cloud brief is unavailable or has not finished saving.');
    const receipt = await decode(value, saveId);
    if (!receipt.committed) throw new Error('This cloud brief has not finished saving.');
    const payload = manifest(JSON.parse(receipt.manifestText)), restored = new Map<string, ReferenceMedia>();
    for (const item of payload.media) {
      const blob = await download(`${ownerId}/${saveId}/${item.slot}`, item);
      await verifyDecoded(blob, item, item.slot === 'reference');
      const { slot: _, type: _type, size: _size, sha256: _hash, ...original } = item;
      restored.set(item.slot, { ...original, blob });
    }
    const draft = { ...payload.draft, referenceVideo: payload.draft.referenceVideo ? restored.get('reference')! : null, photos: payload.draft.photos.map((_, index) => restored.get(`photo-${index}`) as ReferencePhoto) };
    if (!isReferenceDraft(draft) || await fingerprintReferenceDraft(draft) !== payload.inputHash) throw new Error('The cloud brief fingerprint does not match the original draft.');
    return { draft, receipt };
  };
  return {
    runtime,
    save: async (sourceChatId, draft) => {
      if (!identifier(sourceChatId) || !identifier(ownerId) || !/^[a-zA-Z0-9_-]+$/.test(ownerId) || !isReferenceDraft(draft)) throw new Error('This cloud brief has an invalid source chat or draft.');
      const frozen = structuredClone(draft), files = mediaList(frozen);
      if (files.some(({ media }) => media.blob.size > CLOUD_REFERENCE_FILE_LIMIT)) throw new Error('Cloud fixture media must be 6,000,000 bytes (6 MB) or smaller per file. Your larger local media is kept.');
      const media: CloudReferenceMedia[] = [];
      for (const file of files) media.push({ slot: file.slot, ...metadata(file.media), type: file.media.blob.type, size: file.media.blob.size, sha256: await sha256(await file.media.blob.arrayBuffer()) });
      const payload = manifest({ version: 1, draft: { ...frozen, referenceVideo: frozen.referenceVideo ? metadata(frozen.referenceVideo) : null, photos: frozen.photos.map(metadata) }, media, inputHash: await fingerprintReferenceDraft(frozen) });
      for (const file of files) await verifyDecoded(file.media.blob, file.media, file.slot === 'reference');
      const manifestText = JSON.stringify(payload), identityText = identity(ownerId, sourceChatId, manifestText), saveId = await sha256(new TextEncoder().encode(identityText));
      const reserved = await decode(await call('grifon_reference_reserve', { p_save_id: saveId, p_source_chat_id: sourceChatId, p_manifest_text: manifestText, p_identity_text: identityText }), saveId);
      if (reserved.manifestText !== manifestText || reserved.sourceChatId !== sourceChatId) throw new Error('The cloud brief reservation does not match this saved input.');
      if (reserved.committed) return reserved;
      for (const [index, file] of files.entries()) {
        const path = `${ownerId}/${saveId}/${file.slot}`;
        let uploaded = false;
        try { uploaded = !(await transport.upload(path, file.media.blob)).error; } catch { /* Lost upload acknowledgements reconcile the same immutable path below. */ }
        if (!uploaded) {
          try { await download(path, media[index]); }
          catch { throw new Error('A cloud media upload was not confirmed. No incomplete snapshot was published. Retry this same brief to resume.'); }
        }
      }
      let committed: CloudReferenceReceipt;
      try { committed = await decode(await call('grifon_reference_commit', { p_save_id: saveId }), saveId); }
      catch (error) {
        const recovered = await call('grifon_reference_get', { p_save_id: saveId });
        if (!recovered) throw error;
        committed = await decode(recovered, saveId);
      }
      if (!committed.committed || committed.manifestText !== manifestText) throw new Error('The cloud brief commit was not confirmed. Retry the same brief to recover its acknowledgement.');
      return committed;
    },
    list: async () => {
      const value = await call('grifon_reference_list');
      if (!Array.isArray(value) || value.length > 20) throw new Error('The cloud brief service returned an invalid list or exceeded its snapshot limit.');
      const receipts = await Promise.all(value.map(item => decode(item)));
      if (receipts.some(item => !item.committed) || new Set(receipts.map(item => item.saveId)).size !== receipts.length) throw new Error('The cloud brief service returned an invalid unpublished or duplicate snapshot.');
      return receipts;
    },
    openSnapshot,
    open: async saveId => (await openSnapshot(saveId)).draft,
  };
}

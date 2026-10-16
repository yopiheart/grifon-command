import { getSupabase } from './supabaseClient.js';
import { verifyFixtureJobIntent, type FixtureJobIntent } from './companionFixtureJobs.js';

export const FIXTURE_INPUT_VERIFICATION_RUNTIME = 'fixture-input-verification-v1' as const;
export const FIXTURE_INPUT_DECODE_POLICY = { maxFileBytes: 6_000_000, maxPixels: 16_000_000, maxReferenceSeconds: 30, maxFrames: 1800, maxFps: 60 } as const;
export interface FixtureVerifiedMedia {
  slot: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  width: number;
  height: number;
  durationSeconds: number | null;
  frames: number;
  decoded: true;
}
export interface FixtureInputVerificationReceipt {
  version: 1;
  runtime: typeof FIXTURE_INPUT_VERIFICATION_RUNTIME;
  fixture: true;
  actualCents: 0;
  ownerId: string;
  requestId: string;
  sourceSaveId: string;
  inputHash: string;
  manifestSha256: string;
  planSnapshotSha256: string;
  decoder: 'ffmpeg-full-null-v1';
  orientation: 'identity-only';
  verifiedMedia: FixtureVerifiedMedia[];
  verifiedAt: number;
}
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const hash = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const only = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(value, key));
export async function fixtureInputTextSha256(text: string): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function validateFixtureInputVerificationReceipt(value: unknown, ownerId: string, intent?: FixtureJobIntent): Promise<FixtureInputVerificationReceipt> {
  if (!record(value) || !only(value, ['version', 'runtime', 'fixture', 'actualCents', 'ownerId', 'requestId', 'sourceSaveId', 'inputHash', 'manifestSha256', 'planSnapshotSha256', 'decoder', 'orientation', 'verifiedMedia', 'verifiedAt'])
    || value.version !== 1 || value.runtime !== FIXTURE_INPUT_VERIFICATION_RUNTIME || value.fixture !== true || value.actualCents !== 0 || value.ownerId !== ownerId
    || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(ownerId)
    || !['requestId', 'sourceSaveId', 'inputHash', 'manifestSha256', 'planSnapshotSha256'].every(key => hash(value[key]))
    || value.decoder !== 'ffmpeg-full-null-v1' || value.orientation !== 'identity-only' || !integer(value.verifiedAt)
    || !Array.isArray(value.verifiedMedia) || value.verifiedMedia.length < 1 || value.verifiedMedia.length > 6) throw new Error('INVALID_FIXTURE_INPUT_VERIFICATION');
  const slots = new Set<string>(); let photo = 0;
  for (const media of value.verifiedMedia) {
    if (!record(media) || !only(media, ['slot', 'mimeType', 'sizeBytes', 'sha256', 'width', 'height', 'durationSeconds', 'frames', 'decoded'])
      || typeof media.slot !== 'string' || slots.has(media.slot) || !hash(media.sha256) || media.decoded !== true || !integer(media.sizeBytes) || media.sizeBytes < 1 || media.sizeBytes > FIXTURE_INPUT_DECODE_POLICY.maxFileBytes
      || !integer(media.width) || media.width < 1 || !integer(media.height) || media.height < 1 || media.width * media.height > FIXTURE_INPUT_DECODE_POLICY.maxPixels
      || !integer(media.frames) || media.frames < 1 || media.frames > FIXTURE_INPUT_DECODE_POLICY.maxFrames) throw new Error('INVALID_FIXTURE_INPUT_VERIFICATION');
    if (media.slot === 'reference') {
      if (slots.size !== 0 || !['video/mp4', 'video/webm', 'video/quicktime'].includes(media.mimeType as string) || typeof media.durationSeconds !== 'number' || !Number.isFinite(media.durationSeconds) || media.durationSeconds <= 0 || media.durationSeconds > FIXTURE_INPUT_DECODE_POLICY.maxReferenceSeconds + 0.001 || media.frames / media.durationSeconds > FIXTURE_INPUT_DECODE_POLICY.maxFps + 0.001) throw new Error('INVALID_FIXTURE_INPUT_VERIFICATION');
    } else if (media.slot !== `photo-${photo++}` || !['image/png', 'image/jpeg', 'image/webp'].includes(media.mimeType as string) || media.durationSeconds !== null || media.frames !== 1) throw new Error('INVALID_FIXTURE_INPUT_VERIFICATION');
    slots.add(media.slot);
  }
  if (intent && (!await verifyFixtureJobIntent(intent) || intent.ownerId !== ownerId || !intent.cloudReference || value.requestId !== intent.requestId || value.sourceSaveId !== intent.cloudReference.saveId
    || value.inputHash !== intent.plan.inputHash || value.planSnapshotSha256 !== await fixtureInputTextSha256(intent.plan.confirmation!.planSnapshot))) throw new Error('MISMATCHED_FIXTURE_INPUT_VERIFICATION');
  return value as unknown as FixtureInputVerificationReceipt;
}

export type FixtureInputVerificationRpc = (name: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>;
export type FixtureInputVerificationSession = () => Promise<{ ownerId: string; accessToken: string } | null>;
const nativeSession: FixtureInputVerificationSession = async () => {
  const current = await getSupabase().auth.getSession(), session = current.data.session;
  return session ? { ownerId: session.user.id, accessToken: session.access_token } : null;
};
// This verifies already-saved inputs. It never starts or advances a job.
export async function verifyFixtureInputs(intent: FixtureJobIntent, fetchImpl: typeof fetch = fetch, currentSession: FixtureInputVerificationSession = nativeSession): Promise<FixtureInputVerificationReceipt> {
  if (!await verifyFixtureJobIntent(intent) || !intent.cloudReference) throw new Error('Save and link the exact inputs before fixture preflight.');
  const session = await currentSession();
  if (!session || session.ownerId !== intent.ownerId) throw new Error('Sign in to the account that owns these fixture inputs.');
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 55_000);
  try {
    const response = await fetchImpl('/api/fixtures/verify-inputs', { method: 'POST', headers: { Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: intent.requestId }), cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error(response.status === 422 ? 'These saved inputs are unsupported or failed the fixture decode check. No generation was started.' : 'Fixture input preflight was not confirmed. Your saved inputs are kept.');
    const verified = await validateFixtureInputVerificationReceipt(await response.json(), intent.ownerId, intent);
    const after = await currentSession();
    if (controller.signal.aborted || after?.ownerId !== intent.ownerId) throw new Error('The current account changed during fixture preflight.');
    return verified;
  } finally { clearTimeout(timer); }
}

export async function readFixtureInputVerification(intent: FixtureJobIntent, rpc: FixtureInputVerificationRpc = async (name, args) => getSupabase().rpc(name, args), currentOwner: () => Promise<string | null> = async () => (await nativeSession())?.ownerId ?? null): Promise<FixtureInputVerificationReceipt | null> {
  if (!await verifyFixtureJobIntent(intent) || !intent.cloudReference) throw new Error('Linked fixture inputs are required to reopen preflight.');
  if (await currentOwner() !== intent.ownerId) throw new Error('Sign in to the account that owns these fixture inputs.');
  const result = await rpc('grifon_fixture_input_verification_get', { p_request_id: intent.requestId });
  if (result.error) throw new Error('Fixture input verification activation is required for this account. No verification was started.');
  const verified = result.data === null ? null : await validateFixtureInputVerificationReceipt(result.data, intent.ownerId, intent);
  if (await currentOwner() !== intent.ownerId) throw new Error('The current account changed while reopening fixture preflight.');
  return verified;
}

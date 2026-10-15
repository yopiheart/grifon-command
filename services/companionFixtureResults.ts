import { getSupabase } from './supabaseClient.js';
import { verifyFixtureJobIntent, type FixtureJobIntent } from './companionFixtureJobs.js';
import type { CloudFixtureRpc } from './companionCloudFixtures';
import { FIXTURE_VIDEO_MANIFEST } from './companionFixtureVideo.js';

export interface CloudFixtureResultReceipt {
  version: 1;
  fixture: true;
  runtime: 'supabase-cloud-fixture-result-v1';
  fixtureVersion: 'v1';
  manifestId: typeof FIXTURE_VIDEO_MANIFEST.id;
  ownerId: string;
  ownerChatId: string;
  requestId: string;
  jobId: string;
  sourceSaveId: string;
  inputHash: string;
  intentText: string;
  status: 'PENDING' | 'READY';
  actualCents: 0;
  createdAt: number;
  readyAt: number | null;
}
export interface CloudFixtureResultClient {
  runtime: 'supabase-cloud-fixture-result-v1';
  simulation?: boolean;
  get: (intent: FixtureJobIntent) => Promise<CloudFixtureResultReceipt | null>;
  list: () => Promise<CloudFixtureResultReceipt[]>;
}
const runtime = 'supabase-cloud-fixture-result-v1' as const;
const keys = ['version', 'fixture', 'runtime', 'fixtureVersion', 'manifestId', 'ownerId', 'ownerChatId', 'requestId', 'jobId', 'sourceSaveId', 'inputHash', 'intentText', 'status', 'actualCents', 'createdAt', 'readyAt'];
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const hash = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const identifier = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 200 && !/[\u0000-\u001f\u007f]/.test(value);
const uuid = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
const timestamp = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
function shape(value: unknown): value is CloudFixtureResultReceipt {
  return record(value) && Object.keys(value).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(value, key))
    && value.version === 1 && value.fixture === true && value.runtime === runtime && value.fixtureVersion === FIXTURE_VIDEO_MANIFEST.version
    && value.manifestId === FIXTURE_VIDEO_MANIFEST.id && identifier(value.ownerId) && identifier(value.ownerChatId)
    && hash(value.requestId) && uuid(value.jobId) && hash(value.sourceSaveId) && hash(value.inputHash)
    && typeof value.intentText === 'string' && value.intentText.length <= 131072 && value.actualCents === 0 && timestamp(value.createdAt)
    && ((value.status === 'PENDING' && value.readyAt === null)
      || (value.status === 'READY' && timestamp(value.readyAt) && value.readyAt >= value.createdAt));
}
async function ownerIntent(intent: FixtureJobIntent, ownerId: string): Promise<void> {
  if (!intent || intent.ownerId !== ownerId) throw new Error('This fixture result has an invalid account or owner.');
  if (!await verifyFixtureJobIntent(intent)) throw new Error('This fixture result has an invalid reviewed-plan identity.');
  if (!intent.cloudReference) throw new Error('A fixture result requires the original linked cloud inputs.');
}

// Shared by the authenticated media handler and browser reads; no URL is part of the durable receipt.
export async function validateCloudFixtureResultReceipt(value: unknown, ownerId: string, expectedIntent?: FixtureJobIntent): Promise<CloudFixtureResultReceipt> {
  if (!shape(value)) throw new Error('The fixture result service returned an invalid receipt or manifest.');
  if (value.ownerId !== ownerId) throw new Error('This fixture result has an invalid account or owner.');
  let intent: FixtureJobIntent;
  try { intent = JSON.parse(value.intentText); } catch { throw new Error('The fixture result has invalid frozen reviewed-plan text.'); }
  await ownerIntent(intent, ownerId);
  if (intent.requestId !== value.requestId || intent.ownerChatId !== value.ownerChatId
    || intent.cloudReference!.saveId !== value.sourceSaveId || intent.cloudReference!.inputHash !== value.inputHash
    || intent.plan.inputHash !== value.inputHash || (expectedIntent && !same(intent, expectedIntent))) throw new Error('The fixture result has a mismatched reviewed job or cloud input identity.');
  return { ...value };
}
export function fixtureResultMediaPath(receipt: CloudFixtureResultReceipt): string {
  if (!shape(receipt) || receipt.status !== 'READY') throw new Error('A valid READY fixture result is required to open its video.');
  return `/api/fixtures/video?requestId=${receipt.requestId}`;
}

// Native Supabase RPC carries the current session; both read helpers recheck auth.uid() and owner enrollment.
export function createCloudFixtureResultClient(ownerId: string, rpc: CloudFixtureRpc = async (name, args) => getSupabase().rpc(name, args)): CloudFixtureResultClient {
  const observed = new Map<string, CloudFixtureResultReceipt>();
  const call = async (name: string, args?: Record<string, unknown>) => {
    let result;
    try { result = await rpc(name, args); }
    catch { throw new Error('The fixture result service is offline or unreachable. Keep the last confirmed result and refresh when connected.'); }
    if (result.error) {
      if (['PGRST202', '42883', '42501'].includes(result.error.code ?? '')) throw new Error('Fixture result activation is required for this signed-in account. The confirmed job is kept.');
      throw new Error('The fixture result service could not confirm this request. Refresh results when connected.');
    }
    return result.data;
  };
  const check = (receipt: CloudFixtureResultReceipt) => {
    const previous = observed.get(receipt.requestId);
    if (!previous) return;
    const immutable = keys.filter(key => key !== 'status' && key !== 'readyAt') as (keyof CloudFixtureResultReceipt)[];
    if (immutable.some(key => receipt[key] !== previous[key]) || (previous.status === 'READY' && (receipt.status !== 'READY' || receipt.readyAt !== previous.readyAt))) throw new Error('The fixture result service returned an older or conflicting receipt.');
  };
  const accept = (receipt: CloudFixtureResultReceipt) => { observed.set(receipt.requestId, { ...receipt }); return receipt; };
  return {
    runtime,
    get: async intent => {
      await ownerIntent(intent, ownerId);
      const value = await call('grifon_fixture_result_get', { p_request_id: intent.requestId });
      if (value === null) {
        if (observed.has(intent.requestId)) throw new Error('The previously confirmed fixture result is unavailable. Its last confirmed receipt is kept.');
        return null;
      }
      const receipt = await validateCloudFixtureResultReceipt(value, ownerId, intent);
      check(receipt);
      return accept(receipt);
    },
    list: async () => {
      const value = await call('grifon_fixture_result_list');
      if (!Array.isArray(value) || value.length > 100) throw new Error('The fixture result service returned an invalid list or exceeded its limit.');
      const receipts = await Promise.all(value.map(item => validateCloudFixtureResultReceipt(item, ownerId)));
      if (receipts.some(item => item.status !== 'READY') || new Set(receipts.map(item => item.requestId)).size !== receipts.length) throw new Error('The fixture result service returned an invalid pending or duplicate result list.');
      if ([...observed.values()].some(previous => previous.status === 'READY' && !receipts.some(item => item.requestId === previous.requestId))) throw new Error('A previously confirmed fixture result is unavailable in the result list. Its last confirmed receipt is kept.');
      receipts.forEach(check);
      return receipts.map(accept);
    },
  };
}

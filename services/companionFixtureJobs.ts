import { isReferenceReview, type ReferenceReview } from './companionReferenceReview';
import { isReferenceQueue, type QueueScenario, type ReferenceQueue } from './companionReferenceQueue';

// Local fixture identity only. This protocol grants no provider or spending authority.
export interface CloudReferenceLink { version: 1; saveId: string; inputHash: string }
export interface FixtureJobIntent {
  version: 1;
  fixture: true;
  requestId: string;
  ownerId: string;
  ownerChatId: string;
  inputRevision: number;
  plan: ReferenceReview;
  scenario: QueueScenario;
  cloudReference?: CloudReferenceLink;
}
export interface FixtureJobLink { intent: FixtureJobIntent; invalidated: boolean }
export interface FixtureJobSnapshot {
  version: 1;
  fixture: true;
  intent: FixtureJobIntent;
  queue: ReferenceQueue;
  updatedAt: number;
  nextDueAt: number | null;
}
export type FixtureJobAction = 'retry' | 'cancel' | 'invalidate';
export interface FixtureJobClient {
  start: (intent: FixtureJobIntent) => Promise<FixtureJobSnapshot>;
  get: (intent: FixtureJobIntent) => Promise<FixtureJobSnapshot | null>;
  control: (intent: FixtureJobIntent, action: FixtureJobAction, expectedRevision: number | null, commandId: string) => Promise<FixtureJobSnapshot>;
}
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const identity = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 200 && !/[\u0000-\u001f]/.test(value);
export function isCloudReferenceLink(value: unknown): value is CloudReferenceLink {
  return record(value) && Object.keys(value).length === 3 && value.version === 1
    && typeof value.saveId === 'string' && /^[a-f0-9]{64}$/.test(value.saveId)
    && typeof value.inputHash === 'string' && /^[a-f0-9]{64}$/.test(value.inputHash);
}
export function cloudReferenceMatchesReview(link: CloudReferenceLink | undefined, review: ReferenceReview | undefined, inputRevision: number): boolean {
  return isCloudReferenceLink(link) && !!review && !review.stale && review.inputRevision === inputRevision && link.inputHash === review.inputHash;
}
export function isFixtureJobIntent(value: unknown): value is FixtureJobIntent {
  return record(value) && value.version === 1 && value.fixture === true && typeof value.requestId === 'string' && /^[a-f0-9]{64}$/.test(value.requestId)
    && identity(value.ownerId) && identity(value.ownerChatId) && Number.isSafeInteger(value.inputRevision) && (value.inputRevision as number) >= 0
    && isReferenceReview(value.plan) && !!value.plan.confirmation && !value.plan.stale && value.plan.inputRevision === value.inputRevision
    && (value.cloudReference === undefined || (isCloudReferenceLink(value.cloudReference) && value.cloudReference.inputHash === value.plan.inputHash))
    && ['normal', 'second-clip-fails-once'].includes(value.scenario as string)
    && (value.scenario !== 'second-clip-fails-once' || value.plan.scenes.length >= 2);
}
export function fixtureJobIdentityText(intent: Pick<FixtureJobIntent, 'ownerId' | 'ownerChatId' | 'plan' | 'cloudReference'>): string {
  return JSON.stringify([intent.ownerId, intent.ownerChatId, intent.plan.confirmation!.planSnapshot, ...(intent.cloudReference ? [intent.cloudReference.saveId] : [])]);
}
async function requestId(ownerId: string, ownerChatId: string, plan: ReferenceReview, cloudReference?: CloudReferenceLink): Promise<string> {
  const bytes = new TextEncoder().encode(fixtureJobIdentityText({ ownerId, ownerChatId, plan, cloudReference }));
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function createFixtureJobIntent(ownerId: string, ownerChatId: string, plan: ReferenceReview, scenario: QueueScenario = 'normal', cloudReference?: CloudReferenceLink): Promise<FixtureJobIntent> {
  if (!identity(ownerId) || !identity(ownerChatId) || !isReferenceReview(plan) || !plan.confirmation || plan.stale) throw new Error('Save and confirm the current sample plan before preparing a background fixture job.');
  if (cloudReference !== undefined && (!isCloudReferenceLink(cloudReference) || cloudReference.inputHash !== plan.inputHash)) throw new Error('Save the exact current inputs to cloud before starting this fixture job.');
  const intent: FixtureJobIntent = { version: 1, fixture: true, requestId: await requestId(ownerId, ownerChatId, plan, cloudReference), ownerId, ownerChatId, inputRevision: plan.inputRevision, plan: JSON.parse(JSON.stringify(plan)), scenario, ...(cloudReference ? { cloudReference: { ...cloudReference } } : {}) };
  if (!isFixtureJobIntent(intent)) throw new Error('The background fixture job is not a valid confirmed plan.');
  return intent;
}
export async function verifyFixtureJobIntent(value: unknown): Promise<boolean> {
  return isFixtureJobIntent(value) && value.requestId === await requestId(value.ownerId, value.ownerChatId, value.plan, value.cloudReference);
}
export function fixtureIntentMatchesReview(intent: FixtureJobIntent, review: ReferenceReview | undefined, inputRevision = review?.inputRevision): boolean {
  return isFixtureJobIntent(intent) && !!review?.confirmation && intent.inputRevision === inputRevision && same(intent.plan, review);
}
export function isFixtureJobLink(value: unknown, ownerId: string, review?: ReferenceReview, inputRevision?: number): value is FixtureJobLink {
  return record(value) && isFixtureJobIntent(value.intent) && value.intent.ownerId === ownerId && typeof value.invalidated === 'boolean'
    && (value.invalidated || fixtureIntentMatchesReview(value.intent, review, inputRevision));
}
export function isFixtureJobSnapshot(value: unknown, intent: FixtureJobIntent): value is FixtureJobSnapshot {
  return record(value) && value.version === 1 && value.fixture === true && isFixtureJobIntent(value.intent) && same(value.intent, intent)
    && isReferenceQueue(value.queue) && same(value.queue.plan, intent.plan) && value.queue.scenario === intent.scenario
    && Number.isSafeInteger(value.updatedAt) && (value.updatedAt as number) >= 0
    && (value.nextDueAt === null || (Number.isSafeInteger(value.nextDueAt) && (value.nextDueAt as number) >= 0));
}
export function createFixtureJobClient(baseUrl = '/__companion-fixture-jobs', fetchImpl: typeof fetch = fetch): FixtureJobClient {
  const observed = new Map<string, FixtureJobSnapshot>();
  const request = async (intent: FixtureJobIntent, path: string, body?: unknown, missing = false) => {
    if (!await verifyFixtureJobIntent(intent)) throw new Error('The saved fixture job identity could not be verified.');
    const key = `${intent.ownerId}:${intent.ownerChatId}:${intent.requestId}`;
    const response = await fetchImpl(`${baseUrl}${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { 'x-grifon-fixture-user': intent.ownerId, ...(body === undefined ? {} : { 'content-type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: 'no-store' });
    if (response.status === 404 && missing) {
      if (observed.has(key)) throw new Error('The previously confirmed worker job is unavailable. Its last confirmed status is kept; check the local journal connection.');
      return null;
    }
    if (!response.ok) throw new Error(`The local fixture worker could not confirm this request (${response.status}). Refresh status before trying again.`);
    const value: unknown = await response.json();
    if (!isFixtureJobSnapshot(value, intent)) throw new Error('The local fixture worker returned a mismatched job snapshot.');
    const previous = observed.get(key);
    if (previous && (value.queue.revision < previous.queue.revision || (value.queue.revision === previous.queue.revision && !same(value.queue, previous.queue)))) throw new Error('The local fixture worker returned an older or conflicting revision.');
    observed.set(key, value);
    return value;
  };
  return {
    start: async intent => (await request(intent, '/start', { intent }))!,
    get: intent => request(intent, `/job?requestId=${encodeURIComponent(intent.requestId)}&chatId=${encodeURIComponent(intent.ownerChatId)}`, undefined, true),
    control: async (intent, action, expectedRevision, commandId) => (await request(intent, '/command', { intent, action, expectedRevision, commandId }))!,
  };
}

import type { AdReferenceBrief, AdReferencePacket, MarketResearchAdAngle, MarketResearchReport } from '../types.ts';

export const MAX_REFERENCE_PACKET_BYTES = 64 * 1024;
const formats = ['UGC', 'Testimonial', 'Founder POV', 'Demo', 'Reaction'];
const normalize = (s: string): string => s.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
export class AdReferenceError extends Error {}
function fail(message: string): never { throw new AdReferenceError(`Ad references: ${message}`); }
type RecordValue = Record<string, unknown>;

function object(value: unknown, keys: string[], name: string): RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${name} must be an object.`);
  const item = value as RecordValue;
  if (Object.keys(item).some(key => !keys.includes(key))) fail(`${name} contains unsupported fields.`);
  return item;
}
function text(value: unknown, name: string, max = 1200): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) fail(`${name} must be nonempty text (maximum ${max} characters).`);
  return value.trim();
}
function id(value: unknown, name: string): string {
  const result = text(value, name, 80);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(result)) fail(`${name} must be a simple identifier.`);
  return result;
}
function numeric(value: unknown, name: string): string {
  const result = text(value, name, 32);
  if (!/^[1-9]\d{0,31}$/.test(result)) fail(`${name} must be a numeric Meta ID.`);
  return result;
}
function list(value: unknown, name: string, max: number, min = 0): unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) fail(`${name} needs ${min}–${max} items.`);
  return value as unknown[];
}
function strings(value: unknown, name: string, max: number, min = 0): string[] {
  return list(value, name, max, min).map(item => text(item, name));
}
function unique(values: string[], name: string): void {
  if (new Set(values.map(normalize)).size !== values.length) fail(`${name} contains duplicates.`);
}
function oneOf<T extends string>(value: unknown, values: readonly T[], name: string): T {
  if (typeof value !== 'string' || !values.includes(value as T)) fail(`${name} is unsupported.`);
  return value as T;
}
function day(value: unknown, name: string): string {
  const result = text(value, name, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(Date.parse(result)) || new Date(result).toISOString().slice(0, 10) !== result) fail(`${name} must be a real YYYY-MM-DD date.`);
  return result;
}
function timestamp(value: unknown, name: string): string {
  const result = text(value, name, 30);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(result) || !Number.isFinite(Date.parse(result))) fail(`${name} must be a UTC ISO timestamp.`);
  day(result.slice(0, 10), name);
  if (new Date(result).toISOString().slice(0, 19) !== result.slice(0, 19)) fail(`${name} is not a real timestamp.`);
  if (Date.parse(result) > Date.now() + 5 * 60 * 1000) fail(`${name} is in the future.`);
  return result;
}
function metaUrl(value: unknown, name: string): URL {
  const raw = text(value, name, 600);
  let url: URL;
  try { url = new URL(raw); } catch { return fail(`${name} must be an HTTPS Meta URL.`); }
  if (url.protocol !== 'https:' || !['facebook.com', 'www.facebook.com'].includes(url.hostname) || url.username || url.password || url.port || url.hash) fail(`${name} must use the exact facebook.com HTTPS domain.`);
  return url;
}

/** Validation checks consistency, not whether an operator's claims are true. */
export function validateReferencePacket(value: unknown): AdReferencePacket {
  let encoded: string;
  try { encoded = JSON.stringify(value); } catch { return fail('Packet cannot be serialized.'); }
  if (!encoded || new TextEncoder().encode(encoded).length > MAX_REFERENCE_PACKET_BYTES) fail('Packet exceeds 64 KiB.');
  const p = object(value, ['version', 'id', 'evidenceMode', 'observedAt', 'subject', 'competitors', 'sources', 'concepts'], 'Packet');
  if (p.version !== 1) fail('Unsupported packet version.');
  const subject = object(p.subject, ['brandName', 'productName', 'offer', 'audience'], 'Subject');
  const observedAt = timestamp(p.observedAt, 'Packet observation time');
  const competitors = list(p.competitors, 'Competitors', 10, 1).map(value => {
    const c = object(value, ['id', 'name', 'domain', 'pageId', 'identitySourceUrl', 'collectionStatus', 'limitations'], 'Competitor');
    const pageId = numeric(c.pageId, 'Advertiser Page ID');
    const url = metaUrl(c.identitySourceUrl, 'Identity source');
    const identityKeys = [...url.searchParams.keys()];
    if (new Set(identityKeys).size !== identityKeys.length) fail('Identity source contains duplicate URL parameters.');
    const pinned = (url.pathname === '/ads/library/' && url.searchParams.get('view_all_page_id') === pageId)
      || (url.pathname === '/profile.php' && url.searchParams.get('id') === pageId)
      || url.pathname === `/${pageId}` || url.pathname === `/${pageId}/`
      || /^\/pages\/[^/]+\/\d+\/?$/.test(url.pathname) && url.pathname.replace(/\/$/, '').endsWith(`/${pageId}`);
    if (!pinned) fail('Identity source must name the same advertiser Page ID.');
    const domain = text(c.domain, 'Competitor domain', 253).toLowerCase();
    if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) fail('Competitor domain must be a hostname.');
    const collectionStatus = oneOf(c.collectionStatus, ['complete', 'partial', 'blocked', 'unknown'] as const, 'Collection status');
    const limitations = strings(c.limitations, 'Collection limits', 12);
    if (collectionStatus !== 'complete' && !limitations.length) fail('Incomplete collections must state their limits.');
    return { id: id(c.id, 'Competitor ID'), name: text(c.name, 'Competitor name', 160), domain, pageId,
      identitySourceUrl: url.href, collectionStatus, limitations };
  });
  unique(competitors.map(c => c.id), 'Competitor IDs');
  unique(competitors.map(c => c.pageId), 'Advertiser Page IDs');
  const sources = list(p.sources, 'Sources', 30).map(value => {
    const s = object(value, ['id', 'competitorId', 'libraryId', 'sourceUrl', 'observedAt', 'startDate', 'activity', 'scope', 'observations'], 'Source');
    const competitorId = id(s.competitorId, 'Source competitor ID');
    if (!competitors.some(c => c.id === competitorId)) fail('Source has a missing competitor.');
    const libraryId = numeric(s.libraryId, 'Library ID');
    const url = metaUrl(s.sourceUrl, 'Ad source');
    if (url.pathname !== '/ads/library/' || url.searchParams.getAll('id').length !== 1 || url.searchParams.get('id') !== libraryId || [...url.searchParams.keys()].some(key => key !== 'id')) fail('Ad source must be the canonical Meta Library permalink for its Library ID.');
    const sourceTime = timestamp(s.observedAt, 'Source observation time');
    if (Date.parse(sourceTime) > Date.parse(observedAt)) fail('Source observation is later than packet observation.');
    const startDate = s.startDate === null ? null : day(s.startDate, 'Displayed start date');
    if (startDate && startDate > sourceTime.slice(0, 10)) fail('Displayed start date is later than observation.');
    const observations = list(s.observations, 'Observations', 12).map(value => {
      const o = object(value, ['id', 'text'], 'Observation');
      return { id: id(o.id, 'Observation ID'), text: text(o.text, 'Recorded observation') };
    });
    return { id: id(s.id, 'Source ID'), competitorId, libraryId, sourceUrl: url.href, observedAt: sourceTime, startDate,
      activity: oneOf(s.activity, ['active', 'inactive', 'unknown'] as const, 'Activity'),
      scope: oneOf(s.scope, ['card', 'video'] as const, 'Observation scope'), observations };
  });
  unique(sources.map(s => s.id), 'Source IDs');
  unique(sources.map(s => s.libraryId), 'Library IDs');
  unique(sources.flatMap(s => s.observations.map(o => o.id)), 'Observation IDs');
  const concepts = list(p.concepts, 'Concepts', 3, 3).map(value => {
    const c = object(value, ['id', 'title', 'format', 'customerProblem', 'sellingAngle', 'hook', 'originalProof', 'requiredAssets', 'testHypothesis', 'sourceIds', 'observationIds'], 'Concept');
    const sourceIds = list(c.sourceIds, 'Concept source IDs', 10, 1).map(v => id(v, 'Source reference'));
    const observationIds = list(c.observationIds, 'Concept observation IDs', 15, 1).map(v => id(v, 'Observation reference'));
    unique(sourceIds, 'Concept source IDs'); unique(observationIds, 'Concept observation IDs');
    const cited = sources.filter(s => sourceIds.includes(s.id));
    if (cited.length !== sourceIds.length) fail('Concept cites a missing source.');
    if (cited.some(s => !s.observations.some(o => observationIds.includes(o.id)))) fail('Every cited source needs a cited observation.');
    if (observationIds.some(ref => !cited.some(s => s.observations.some(o => o.id === ref)))) fail('Concept cites a missing or unrelated observation.');
    return { id: id(c.id, 'Concept ID'), title: text(c.title, 'Concept title', 160),
      format: oneOf(c.format, formats, 'Concept format') as MarketResearchAdAngle['format'],
      customerProblem: text(c.customerProblem, 'Customer problem'), sellingAngle: text(c.sellingAngle, 'Selling angle'),
      hook: text(c.hook, 'Hook'), originalProof: text(c.originalProof, 'Original proof plan'),
      requiredAssets: strings(c.requiredAssets, 'Required assets', 12, 1), testHypothesis: text(c.testHypothesis, 'Test hypothesis'), sourceIds, observationIds };
  });
  unique(concepts.map(c => c.id), 'Concept IDs');
  unique(concepts.map(c => c.sellingAngle), 'Selling angles');
  unique(concepts.map(c => c.customerProblem), 'Customer problems');
  return { version: 1, id: id(p.id, 'Packet ID'), evidenceMode: oneOf(p.evidenceMode, ['observed', 'synthetic'] as const, 'Evidence mode'), observedAt,
    subject: { brandName: text(subject.brandName, 'Brand', 160), productName: text(subject.productName, 'Product', 160), offer: text(subject.offer, 'Offer'), audience: text(subject.audience, 'Audience') },
    competitors, sources, concepts };
}

export function parseReferencePacket(raw: string): AdReferencePacket {
  if (new TextEncoder().encode(raw).length > MAX_REFERENCE_PACKET_BYTES) fail('Packet exceeds 64 KiB.');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return fail('Choose a valid JSON reference packet.'); }
  return validateReferencePacket(value);
}

export function validateReferenceBrief(value: unknown): AdReferenceBrief {
  const b = object(value, ['packet', 'selectedConceptId', 'acceptedLimits'], 'Review');
  if (typeof b.acceptedLimits !== 'boolean') fail('Review acceptance must be explicit.');
  const packet = validateReferencePacket(b.packet);
  const selectedConceptId = b.selectedConceptId === undefined ? undefined : id(b.selectedConceptId, 'Selected concept');
  if (selectedConceptId && !packet.concepts.some(c => c.id === selectedConceptId)) fail('Selected concept is missing.');
  return { packet, selectedConceptId, acceptedLimits: b.acceptedLimits };
}

export function conceptIsUsable(packet: AdReferencePacket, concept: AdReferencePacket['concepts'][number]): boolean {
  return concept.sourceIds.length > 0 && concept.sourceIds.every(ref => {
    const source = packet.sources.find(s => s.id === ref);
    const collection = packet.competitors.find(c => c.id === source?.competitorId);
    return !!source?.observations.length && source.activity === 'active' && !!collection && ['complete', 'partial'].includes(collection.collectionStatus);
  });
}

export function referenceLimits(packet: AdReferencePacket): string[] {
  return [
    'Operator-recorded observations are not independently verified by importing this file.',
    'Displayed start dates show elapsed calendar time only; they do not prove continuous delivery or profitability.',
    ...packet.competitors.flatMap(c => [`${c.name}: ${c.collectionStatus} collection.`, ...c.limitations.map(limit => `${c.name}: ${limit}`)]),
    ...(packet.sources.some(s => !s.startDate) ? ['Some ads have no recorded start date; their age is unknown.'] : []),
    ...(packet.sources.some(s => s.scope === 'card') ? ['Card observations do not establish the full video sequence or its audio.'] : []),
  ];
}

export function displayedDateElapsedDays(source: AdReferencePacket['sources'][number]): number | null {
  return source.startDate ? Math.floor((Date.parse(source.observedAt.slice(0, 10)) - Date.parse(source.startDate)) / 86400000) : null;
}

/** Revalidate persisted review data and bind it to the current intake before generation. */
export function resolveSelectedReference(value: unknown, subject: { brandName: string; productName: string; offer: string }, forProduction = true): AdReferencePacket['concepts'][number] | undefined {
  if (value === undefined || value === null) return undefined;
  const brief = validateReferenceBrief(value);
  if (!brief.selectedConceptId) return undefined;
  if (!brief.acceptedLimits) fail('Review the observations and collection limits before selecting a concept.');
  const concept = brief.packet.concepts.find(c => c.id === brief.selectedConceptId)!;
  if (!conceptIsUsable(brief.packet, concept)) fail('Selected concept needs an active source with usable collection evidence. Import usable observations or remove the selection.');
  for (const key of ['brandName', 'productName', 'offer'] as const) {
    if (normalize(brief.packet.subject[key]) !== normalize(subject[key])) fail(`Selected packet ${key} does not match this brief. Restore the packet subject or remove references.`);
  }
  if (forProduction && brief.packet.evidenceMode === 'synthetic') fail('Synthetic fixture is for review only and is not production-ready. Remove references or import operator-recorded evidence.');
  return concept;
}

/** Data-only view consumed by the existing angle helper; never stored as research. */
export function selectedReferenceAngleReport(value: unknown, subject: { brandName: string; productName: string; offer: string }, report: MarketResearchReport): MarketResearchReport {
  const concept = resolveSelectedReference(value, subject);
  return concept ? { ...report, fbAdLibraryAngles: [{ format: concept.format,
    angle: `${concept.sellingAngle}. Customer problem: ${concept.customerProblem}. Original proof plan: ${concept.originalProof}. Required assets: ${concept.requiredAssets.join('; ')}`,
    openingLine: concept.hook, whyItWorks: concept.testHypothesis }] } : report;
}

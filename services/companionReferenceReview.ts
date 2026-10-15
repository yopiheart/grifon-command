import type { CompanionReferenceDraft, ReferenceMedia, ReferenceVoice } from './companionReferenceDraft';

// A device-local fixture review. It cannot authorize, enqueue or price production.
export interface SampleScene { id: string; start: string; end: string; script: string; visual: string }
export interface SampleQuote {
  items: { id: string; label: string; lowPesos: string; highPesos: string }[];
  contingencyPesos: string;
  maxDemoCapPesos: string;
}
export interface ReferenceReview {
  version: 1;
  fixture: true;
  revision: number;
  inputRevision: number;
  inputHash: string;
  stale: boolean;
  direction: string;
  outputLanguage: string;
  adaptationMode: 'adapt' | 'close';
  speechMode: 'spoken' | 'silent';
  voice: ReferenceVoice | null;
  facts: { label: string; value: string }[];
  missing: string[];
  scenes: SampleScene[];
  audio: { speech: string; music: string; sfx: string };
  quote: SampleQuote;
  confirmation: { revision: number; inputRevision: number; inputHash: string; planSnapshot: string; lowCents: number; highCents: number; capCents: number } | null;
}
const mediaHashes = new WeakMap<Blob, Promise<string>>();
async function sha256(bytes: BufferSource): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
}
async function mediaSnapshot(media: ReferenceMedia) {
  let hash = mediaHashes.get(media.blob);
  if (!hash) { hash = media.blob.arrayBuffer().then(sha256); mediaHashes.set(media.blob, hash); void hash.catch(() => mediaHashes.delete(media.blob)); }
  const { blob, ...metadata } = media;
  return { ...metadata, type: blob.type, size: blob.size, sha256: await hash };
}
export async function fingerprintReferenceDraft(draft: CompanionReferenceDraft): Promise<string> {
  const snapshot = {
    ...draft, adaptationMode: draft.adaptationMode ?? 'adapt', speechMode: draft.speechMode ?? 'spoken',
    referenceVideo: draft.referenceVideo ? await mediaSnapshot(draft.referenceVideo) : null,
    photos: await Promise.all(draft.photos.map(mediaSnapshot)),
  };
  return sha256(new TextEncoder().encode(JSON.stringify(snapshot)));
}
export function createSampleReview(draft: CompanionReferenceDraft, inputHash: string, inputRevision: number, previousRevision = 0): ReferenceReview {
  const silent = draft.speechMode === 'silent';
  const facts = [
    { label: 'Brief', value: draft.brief }, { label: 'Brand', value: draft.brandName }, { label: 'Product or service', value: draft.productName },
    { label: 'Audience', value: draft.audience }, { label: 'Offer', value: draft.offer }, { label: 'Call to action', value: draft.callToAction },
    { label: 'Instructions', value: draft.instructions },
  ];
  const missing = facts.filter(fact => !fact.value.trim() && ['Product or service', 'Audience', 'Call to action'].includes(fact.label)).map(fact => fact.label);
  if (!draft.referenceVideo && !draft.referenceLink.trim()) missing.push('Reference video or link');
  if (!draft.photos.length) missing.push('Brand photos');
  if (!silent && !draft.voice) missing.push('Selected voice');
  return {
    version: 1, fixture: true, revision: previousRevision + 1, inputRevision, inputHash, stale: false,
    direction: 'Sample direction: introduce the subject, hold on one visible detail, then close with a clear next step. Timing and framing are illustrative; no supplied reference or photos have been analyzed.',
    outputLanguage: draft.outputLanguage, adaptationMode: draft.adaptationMode ?? 'adapt', speechMode: silent ? 'silent' : 'spoken', voice: draft.voice ? { ...draft.voice } : null,
    facts, missing,
    scenes: [
      { id: 'intro', start: '0', end: '5', script: silent ? '' : 'Take a closer look.', visual: 'Sample: medium framing of the subject or product. Opening cut is illustrative.' },
      { id: 'detail', start: '5', end: '12', script: silent ? '' : 'Here is a detail to show clearly.', visual: 'Sample: close-up of a detail chosen during real planning. Do not imply an unverified result.' },
      { id: 'close', start: '12', end: '20', script: silent ? '' : 'Explore the details before you decide.', visual: 'Sample: finish on the product or service identity. CTA and on-screen text need brand approval.' },
    ],
    audio: {
      speech: silent ? 'No spoken audio. The selected voice remains saved but is not used in this sample.' : 'One selected voice across speaking footage conversion and off-screen narration. Alignment and listening checks are planned, not performed.',
      music: 'Illustrative assumption: one original instrumental score fitted to the approved timeline. No music has been generated.',
      sfx: 'Illustrative assumption: restrained existing sound-bank cues. No custom sound generation included.',
    },
    quote: { items: [
      { id: 'planning', label: 'Analysis and planning', lowPesos: '20.00', highPesos: '30.00' },
      { id: 'clips', label: 'Video clips', lowPesos: '90.00', highPesos: '150.00' },
      { id: 'voice', label: 'One voice: conversion, narration and alignment', lowPesos: silent ? '0.00' : '30.00', highPesos: silent ? '0.00' : '50.00' },
      { id: 'music', label: 'Instrumental music', lowPesos: '20.00', highPesos: '35.00' },
      { id: 'sfx', label: 'Existing sound-bank cues', lowPesos: '5.00', highPesos: '10.00' },
      { id: 'assembly', label: 'Assembly and quality checks', lowPesos: '15.00', highPesos: '25.00' },
    ], contingencyPesos: '40.00', maxDemoCapPesos: '350.00' },
    confirmation: null,
  };
}
export function pesosToCents(text: string): number {
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(text.trim())) throw new Error('Use a non-negative PHP amount with up to two decimal places.');
  const [whole, decimals = ''] = text.trim().split('.');
  const cents = Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
  if (cents > 100_000_000) throw new Error('Demo amounts must be PHP 1,000,000 or less.');
  return cents;
}
export function sampleQuoteTotals(quote: SampleQuote) {
  const contingency = pesosToCents(quote.contingencyPesos);
  return { lowCents: quote.items.reduce((total, item) => total + pesosToCents(item.lowPesos), contingency), highCents: quote.items.reduce((total, item) => total + pesosToCents(item.highPesos), contingency), capCents: pesosToCents(quote.maxDemoCapPesos) };
}
export function reviewErrors(review: ReferenceReview): string[] {
  const errors: string[] = [];
  if (review.stale) errors.push('The brief changed. Prepare an updated sample plan before confirming.');
  if (!review.direction.trim()) errors.push('Add a direction.');
  let previousEnd = 0;
  review.scenes.forEach((scene, index) => {
    const start = Number(scene.start), end = Number(scene.end);
    if (!/^\d+(\.\d{1,2})?$/.test(scene.start) || !/^\d+(\.\d{1,2})?$/.test(scene.end) || start !== previousEnd || end <= start || end > 60) errors.push(`Scene ${index + 1}: use consecutive times, starting at 0, with an end after its start and total duration up to 60 seconds.`);
    previousEnd = end;
    if (!scene.visual.trim()) errors.push(`Scene ${index + 1}: add a visual description.`);
    if (review.speechMode === 'spoken' && !scene.script.trim()) errors.push(`Scene ${index + 1}: add sample speech.`);
    if (review.speechMode === 'silent' && scene.script !== '') errors.push(`Scene ${index + 1}: a no-voiceover plan must have no speech.`);
  });
  try {
    const totals = sampleQuoteTotals(review.quote);
    if (review.quote.items.some(item => pesosToCents(item.lowPesos) > pesosToCents(item.highPesos))) errors.push('Each minimum cost must be at or below its maximum.');
    if (totals.highCents > totals.capCents) errors.push('The demo cap must cover the upper estimate including contingency.');
  } catch (error) { errors.push((error as Error).message); }
  return errors;
}
export function editSampleReview(review: ReferenceReview, patch: Partial<Pick<ReferenceReview, 'direction' | 'scenes' | 'quote'>>): ReferenceReview {
  return { ...review, ...patch, revision: review.revision + 1, confirmation: null };
}
function planSnapshot(review: ReferenceReview): string {
  const { confirmation, ...plan } = review;
  return JSON.stringify(plan);
}
export function confirmSampleReview(review: ReferenceReview, inputHash: string, inputRevision: number): ReferenceReview {
  const errors = reviewErrors(review);
  if (errors.length || inputHash !== review.inputHash || inputRevision !== review.inputRevision) throw new Error(errors[0] || 'The brief changed. Prepare an updated sample plan.');
  return { ...review, confirmation: { revision: review.revision, inputRevision, inputHash, planSnapshot: planSnapshot(review), ...sampleQuoteTotals(review.quote) } };
}

const text = (value: unknown, max = 4000): value is string => typeof value === 'string' && value.length <= max;
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const hash = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export function isReferenceReview(value: unknown): value is ReferenceReview {
  if (!record(value) || value.version !== 1 || value.fixture !== true || !Number.isSafeInteger(value.revision) || (value.revision as number) < 1
    || !Number.isSafeInteger(value.inputRevision) || (value.inputRevision as number) < 0 || !hash(value.inputHash) || typeof value.stale !== 'boolean'
    || !text(value.direction) || !['Taglish', 'Tagalog', 'English'].includes(value.outputLanguage as string)
    || !['adapt', 'close'].includes(value.adaptationMode as string) || !['spoken', 'silent'].includes(value.speechMode as string)
    || !Array.isArray(value.facts) || value.facts.length > 10 || !value.facts.every(fact => record(fact) && text(fact.label, 100) && text(fact.value))
    || !Array.isArray(value.missing) || value.missing.length > 10 || !value.missing.every(item => text(item, 100))
    || !Array.isArray(value.scenes) || value.scenes.length < 1 || value.scenes.length > 12
    || !value.scenes.every(scene => record(scene) && text(scene.id, 100) && text(scene.start, 10) && text(scene.end, 10) && text(scene.script, 2000) && text(scene.visual, 2000))
    || new Set(value.scenes.map(scene => scene.id)).size !== value.scenes.length
    || !record(value.audio) || !['speech', 'music', 'sfx'].every(key => text(value.audio && (value.audio as Record<string, unknown>)[key]))
    || !record(value.quote) || !text(value.quote.contingencyPesos, 20) || !text(value.quote.maxDemoCapPesos, 20) || !Array.isArray(value.quote.items) || value.quote.items.length !== 6
    || !value.quote.items.every(item => record(item) && text(item.id, 100) && text(item.label, 200) && text(item.lowPesos, 20) && text(item.highPesos, 20))
    || new Set(value.quote.items.map(item => item.id)).size !== 6
    || (value.voice !== null && (!record(value.voice) || !text(value.voice.id, 200) || !value.voice.id || !text(value.voice.name, 200) || !value.voice.name || !['curated', 'private'].includes(value.voice.source as string)))) return false;
  const review = value as unknown as ReferenceReview;
  if (review.confirmation === null) return true;
  if (!record(review.confirmation) || reviewErrors(review).length) return false;
  const confirmation = review.confirmation;
  const totals = sampleQuoteTotals(review.quote);
  return confirmation.revision === review.revision && confirmation.inputRevision === review.inputRevision && confirmation.inputHash === review.inputHash
    && confirmation.planSnapshot === planSnapshot(review) && confirmation.lowCents === totals.lowCents && confirmation.highCents === totals.highCents && confirmation.capCents === totals.capCents;
}

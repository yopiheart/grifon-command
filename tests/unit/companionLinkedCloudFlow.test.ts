import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { createReferenceDraft } from '../../services/companionReferenceDraft.js';
import { confirmSampleReview, createSampleReview, fingerprintReferenceDraft } from '../../services/companionReferenceReview.js';
import { cloudReferenceMatchesReview, createFixtureJobIntent, fixtureJobIdentityText, isCloudReferenceLink, verifyFixtureJobIntent } from '../../services/companionFixtureJobs.js';
import { createCloudFixtureClient } from '../../services/companionCloudFixtures.js';
import { createReferenceQueue } from '../../services/companionReferenceQueue.js';
import { adoptConversations, clearCloudCopyApproval, loadConversations, updateConversation, type CompanionConversations } from '../../services/companionConversations.js';

const owner = '11111111-1111-4111-8111-111111111111';
const hash = 'a'.repeat(64), saveId = 'b'.repeat(64);
const reference = { version: 1 as const, saveId, inputHash: hash };
const plan = () => confirmSampleReview(createSampleReview(createReferenceDraft(), hash, 0), hash, 0);

describe('linked cloud fixture review and identity', () => {
  it('claims cloud-saved review inputs only for the exact current non-stale snapshot', () => {
    const review = plan();
    expect(cloudReferenceMatchesReview(reference, review, 0)).toBe(true);
    expect(cloudReferenceMatchesReview(undefined, review, 0)).toBe(false);
    expect(cloudReferenceMatchesReview(reference, { ...review, stale: true }, 0)).toBe(false);
    expect(cloudReferenceMatchesReview(reference, review, 1)).toBe(false);
    expect(cloudReferenceMatchesReview({ ...reference, inputHash: 'c'.repeat(64) }, review, 0)).toBe(false);
    expect(cloudReferenceMatchesReview(reference, undefined, 0)).toBe(false);
    expect(cloudReferenceMatchesReview(reference, { ...review, confirmation: null }, 0)).toBe(true);
  });
  it('binds the frozen plan and exact cloud snapshot without changing legacy identities', async () => {
    const review = plan();
    const legacy = await createFixtureJobIntent(owner, 'chat', review);
    const linked = await createFixtureJobIntent(owner, 'chat', review, 'normal', reference);
    const text = JSON.stringify([owner, 'chat', review.confirmation!.planSnapshot, saveId]);
    expect(linked.cloudReference).toEqual(reference);
    expect(fixtureJobIdentityText(linked)).toBe(text);
    expect(linked.requestId).toBe(createHash('sha256').update(text).digest('hex'));
    expect(legacy.requestId).toBe(createHash('sha256').update(JSON.stringify([owner, 'chat', review.confirmation!.planSnapshot])).digest('hex'));
    expect(await verifyFixtureJobIntent(linked)).toBe(true);
    expect(await verifyFixtureJobIntent({ ...linked, cloudReference: { ...reference, saveId: 'c'.repeat(64) } })).toBe(false);
  });
  it('rejects malformed, expanded and mismatched snapshot links before dispatch', async () => {
    for (const value of [{ ...reference, version: 2 }, { ...reference, saveId: 'short' }, { ...reference, extra: true }, { ...reference, inputHash: 'c'.repeat(64) }]) {
      if ('extra' in value || value.version !== 1 || value.saveId === 'short') expect(isCloudReferenceLink(value)).toBe(false);
      await expect(createFixtureJobIntent(owner, 'chat', plan(), 'normal', value as typeof reference)).rejects.toThrow();
    }
  });
  it('sends the linked identity through authenticated native RPC and reads old jobs', async () => {
    const intent = await createFixtureJobIntent(owner, 'chat', plan(), 'normal', reference);
    const old = await createFixtureJobIntent(owner, 'legacy-chat', plan());
    const wire = (value: typeof intent) => {
      const { plan: _, ...queue } = createReferenceQueue(value.plan, 0, 'normal');
      return { runtime: 'supabase-cloud-fixture-v1', intentText: JSON.stringify(value), queue, updatedAt: 1, nextDueAt: null };
    };
    const linkedWire = wire(intent), oldWire = wire(old);
    const rpc = vi.fn().mockResolvedValueOnce({ data: linkedWire, error: null }).mockResolvedValueOnce({ data: [linkedWire, oldWire], error: null });
    const client = createCloudFixtureClient(owner, rpc);
    await client.start(intent);
    expect(rpc.mock.calls[0][1].p_identity_text).toBe(JSON.stringify([owner, 'chat', intent.plan.confirmation!.planSnapshot, saveId]));
    expect((await client.list()).map(job => job.intent.ownerChatId)).toEqual(['chat', 'legacy-chat']);
  });
  it('keeps snapshot provenance outside the draft hash and historical job through edits', async () => {
    let book = adoptConversations(owner, null, null);
    const id = book.selectedId, draft = createReferenceDraft(), inputHash = await fingerprintReferenceDraft(draft);
    book = updateConversation(book, id, { referenceDraft: draft });
    const review = confirmSampleReview(createSampleReview(draft, inputHash, 1), inputHash, 1);
    book = updateConversation(book, id, { referenceReview: review, referenceCloudSource: { ...reference, inputHash } });
    const intent = await createFixtureJobIntent(owner, id, review, 'normal', { ...reference, inputHash });
    book = updateConversation(book, id, { referenceCloudJob: intent });
    expect(book.chats[0].referenceCloudSource?.saveId).toBe(saveId);
    expect(await fingerprintReferenceDraft(book.chats[0].referenceDraft!)).toBe(inputHash);
    book = updateConversation(book, id, { referenceDraft: { ...draft, offer: 'A changed offer' } });
    expect(book.chats[0].referenceCloudSource).toBeUndefined();
    expect(book.chats[0].referenceReview?.confirmation).toBeNull();
    expect(book.chats[0].referenceCloudJob).toEqual(intent);
  });
  it('clears approval in every cloud conflict copy and observes the frozen original job', async () => {
    const review = plan(), intent = await createFixtureJobIntent(owner, 'original', review, 'normal', reference);
    const chat = { ...adoptConversations(owner, null, null).chats[0], referenceDraft: createReferenceDraft(), referenceReview: review };
    const local = clearCloudCopyApproval(chat);
    expect(local).toBe(chat);
    expect(local.referenceReview?.confirmation).toEqual(review.confirmation);
    for (const cloudFields of [{ referenceCloudSource: reference }, { referenceCloudJob: intent }, { referenceCloudObservation: intent }]) {
      const copied = clearCloudCopyApproval({ ...chat, ...cloudFields });
      expect(copied.referenceReview?.confirmation).toBeNull();
      expect(copied.referenceReview?.scenes).toEqual(review.scenes);
      expect(copied.referenceCloudJob).toBeUndefined();
      if ('referenceCloudJob' in cloudFields || 'referenceCloudObservation' in cloudFields) expect(copied.referenceCloudObservation).toEqual(intent);
    }
    expect(review.confirmation).not.toBeNull();
    expect(intent.plan.confirmation).not.toBeNull();
  });
  it('reopens a book with a cloud copy of mixed legacy execution state without invalidating its original', async () => {
    const review = plan(), localIntent = await createFixtureJobIntent(owner, 'mixed-original', review);
    const original = { ...adoptConversations(owner, null, null).chats[0], id: 'mixed-original', referenceDraft: createReferenceDraft(), referenceInputRevision: 0,
      referenceReview: review, referenceCloudSource: reference, referenceQueue: createReferenceQueue(review, 0, 'normal'), referenceFixtureJob: { intent: localIntent, invalidated: false } };
    const copy = { ...clearCloudCopyApproval(original), id: 'mixed-copy' };
    const stored: CompanionConversations = { version: 1, revision: 1, userId: owner, selectedId: copy.id, chats: [copy, original] };
    // Substitute the IndexedDB read seam; loadConversations still runs its real full-book decoders.
    vi.stubGlobal('indexedDB', { open: () => {
      const database = { close: () => {}, transaction: () => ({ objectStore: () => ({ get: () => {
        const request = { result: stored, onsuccess: null as null | (() => void) };
        queueMicrotask(() => request.onsuccess?.()); return request;
      } }) }) };
      const request = { result: database, onsuccess: null as null | (() => void) };
      queueMicrotask(() => request.onsuccess?.()); return request;
    } });
    try {
      const reopened = await loadConversations(owner);
      expect(reopened.selectedId).toBe('mixed-copy');
      expect(reopened.chats[0].referenceReview?.confirmation).toBeNull();
      expect(reopened.chats[0].referenceQueue).toBeUndefined();
      expect(reopened.chats[0].referenceFixtureJob).toBeUndefined();
      expect(reopened.chats[1].referenceQueue?.invalidated).toBe(false);
      expect(reopened.chats[1].referenceFixtureJob?.invalidated).toBe(false);
      expect(reopened.chats[1].referenceReview?.confirmation).toEqual(review.confirmation);
      const legacyOnly = clearCloudCopyApproval({ ...original, referenceCloudSource: undefined });
      expect(legacyOnly.referenceQueue).toEqual(original.referenceQueue);
      expect(legacyOnly.referenceFixtureJob).toEqual(original.referenceFixtureJob);
    } finally { vi.unstubAllGlobals(); }
  });
});

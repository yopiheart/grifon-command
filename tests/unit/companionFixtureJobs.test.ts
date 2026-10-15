import { describe, expect, it, vi } from 'vitest';
import { createReferenceDraft } from '../../services/companionReferenceDraft.js';
import { confirmSampleReview, createSampleReview, editSampleReview } from '../../services/companionReferenceReview.js';
import { createReferenceQueue } from '../../services/companionReferenceQueue.js';
import { adoptConversations, updateConversation } from '../../services/companionConversations.js';
import { createFixtureJobClient, createFixtureJobIntent, fixtureIntentMatchesReview, isFixtureJobSnapshot, verifyFixtureJobIntent } from '../../services/companionFixtureJobs.js';

const hash = 'a'.repeat(64);
const plan = () => confirmSampleReview(createSampleReview(createReferenceDraft(), hash, 0), hash, 0);

describe('background fixture job binding', () => {
  it('uses one stable reviewed-plan identity across tabs and excludes the test scenario', async () => {
    const review = plan();
    const first = await createFixtureJobIntent('fixture-user-a', 'chat-a', review, 'normal');
    const duplicate = await createFixtureJobIntent('fixture-user-a', 'chat-a', review, 'second-clip-fails-once');
    expect(first.requestId).toMatch(/^[a-f0-9]{64}$/);
    expect(duplicate.requestId).toBe(first.requestId);
    expect(await verifyFixtureJobIntent(first)).toBe(true);
    expect(await verifyFixtureJobIntent({ ...first, ownerChatId: 'chat-b' })).toBe(false);
    expect((await createFixtureJobIntent('fixture-user-b', 'chat-a', review)).requestId).not.toBe(first.requestId);
  });
  it('requires current confirmation and strictly binds server snapshots', async () => {
    const review = plan();
    await expect(createFixtureJobIntent('fixture-user-a', 'chat-a', editSampleReview(review, { direction: 'Edited' }))).rejects.toThrow();
    const intent = await createFixtureJobIntent('fixture-user-a', 'chat-a', review);
    const snapshot = { version: 1, fixture: true, intent, queue: createReferenceQueue(review, 0, 'normal'), updatedAt: 1, nextDueAt: null };
    expect(isFixtureJobSnapshot(snapshot, intent)).toBe(true);
    expect(isFixtureJobSnapshot({ ...snapshot, intent: { ...intent, ownerId: 'fixture-user-b' } }, intent)).toBe(false);
    expect(isFixtureJobSnapshot({ ...snapshot, queue: { ...snapshot.queue, actualCents: 1 } }, intent)).toBe(false);
    expect(fixtureIntentMatchesReview(intent, editSampleReview(review, { direction: 'Edited' }), 0)).toBe(false);
  });
  it('locks inputs until invalidation, never revives the old link, and retains copy ownership', async () => {
    let book = adoptConversations('fixture-user-a', null, null);
    const id = book.selectedId, draft = createReferenceDraft(), review = plan();
    book = updateConversation(book, id, { referenceDraft: draft });
    const currentReview = confirmSampleReview(createSampleReview(draft, hash, 1), hash, 1);
    book = updateConversation(book, id, { referenceReview: currentReview });
    const intent = await createFixtureJobIntent('fixture-user-a', id, currentReview);
    book = updateConversation(book, id, { referenceFixtureJob: { intent, invalidated: false } });
    expect(updateConversation(book, id, { referenceDraft: { ...draft, brief: 'Changed' } })).toBe(book);
    expect(updateConversation(book, id, { referenceReview: review })).toBe(book);
    const invalidated = updateConversation(book, id, { referenceFixtureJob: { intent, invalidated: true } });
    expect(updateConversation(invalidated, id, { referenceFixtureJob: { intent, invalidated: false } })).toBe(invalidated);
    expect(updateConversation(invalidated, id, { referenceDraft: { ...draft, brief: 'Changed' } })).not.toBe(invalidated);
    const copy = { ...book.chats[0], id: 'copy' };
    expect(copy.referenceFixtureJob?.intent.ownerChatId).toBe(id);
    expect(updateConversation({ ...book, selectedId: copy.id, chats: [copy] }, copy.id, { referenceFixtureJob: { intent, invalidated: true } }).chats[0]).toBe(copy);
  });
  it('GET recovery is read-only and refuses mismatched status or revision regression', async () => {
    const review = plan(), intent = await createFixtureJobIntent('fixture-user-a', 'chat-a', review);
    const snapshot = { version: 1, fixture: true, intent, queue: { ...createReferenceQueue(review, 0, 'normal'), revision: 4 }, updatedAt: 1, nextDueAt: null };
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(snapshot))).mockResolvedValueOnce(new Response(JSON.stringify({ ...snapshot, queue: { ...snapshot.queue, revision: 3 } })));
    const client = createFixtureJobClient('/__companion-fixture-jobs', fetcher);
    expect(await client.get(intent)).toEqual(snapshot);
    expect(fetcher.mock.calls[0][1].method).toBe('GET');
    expect(fetcher.mock.calls[0][1].headers).toEqual({ 'x-grifon-fixture-user': 'fixture-user-a' });
    await expect(client.get(intent)).rejects.toThrow(/older/i);
    expect(fetcher.mock.calls.every(call => call[1].method === 'GET')).toBe(true);
  });
  it('retains a previously confirmed worker job when a later lookup is unavailable', async () => {
    const review = plan(), intent = await createFixtureJobIntent('fixture-user-a', 'chat-a', review);
    const snapshot = { version: 1, fixture: true, intent, queue: createReferenceQueue(review, 0, 'normal'), updatedAt: 1, nextDueAt: null };
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(snapshot))).mockResolvedValueOnce(new Response(null, { status: 404 }));
    const client = createFixtureJobClient('/__companion-fixture-jobs', fetcher);
    await client.get(intent);
    await expect(client.get(intent)).rejects.toThrow(/previously confirmed/i);
  });
});

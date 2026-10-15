import { describe, expect, it } from 'vitest';
import { createReferenceDraft } from '../../services/companionReferenceDraft.js';
import { confirmSampleReview, createSampleReview, editSampleReview } from '../../services/companionReferenceReview.js';
import { adoptConversations, updateConversation } from '../../services/companionConversations.js';
import { createReferenceQueue, isReferenceQueue, queueMatchesReview, transitionReferenceQueue } from '../../services/companionReferenceQueue.js';

const hash = 'a'.repeat(64);
function confirmed(silent = false) {
  const draft = { ...createReferenceDraft(), speechMode: silent ? 'silent' as const : 'spoken' as const };
  return confirmSampleReview(createSampleReview(draft, hash, 0), hash, 0);
}

describe('local fixture production queue', () => {
  it('requires an exact confirmed current plan and starts with no spend or completed work', () => {
    const plan = confirmed();
    expect(() => createReferenceQueue({ ...plan, confirmation: null }, 0, 'normal')).toThrow();
    expect(() => createReferenceQueue(plan, 1, 'normal')).toThrow();
    const queue = createReferenceQueue(plan, 0, 'normal');
    expect(queue).toMatchObject({ fixture: true, revision: 1, status: 'prepared', invalidated: false, actualCents: 0 });
    expect(queue.steps.map(step => step.id)).toEqual(['clip-1', 'clip-2', 'clip-3', 'voice', 'music', 'sfx', 'assembly', 'quality']);
    expect(queue.steps.every(step => step.status === 'queued' && step.attempts === 0)).toBe(true);
    expect(queue.plan.confirmation).toMatchObject({ lowCents: 22000, highCents: 34000, capCents: 35000 });
    expect(queueMatchesReview(queue, { ...plan, direction: 'Changed without revision' }, 0)).toBe(false);
  });
  it('runs sequentially, stops at the second clip once, and retries only that step once', () => {
    const plan = confirmed();
    let queue = createReferenceQueue(plan, 0, 'second-clip-fails-once');
    queue = transitionReferenceQueue(queue, 'start', plan, 0);
    expect(transitionReferenceQueue(queue, 'start', plan, 0)).toBe(queue);
    queue = transitionReferenceQueue(queue, 'tick', plan, 0);
    expect(queue.steps.slice(0, 3).map(step => [step.status, step.attempts])).toEqual([['succeeded', 1], ['running', 1], ['queued', 0]]);
    queue = transitionReferenceQueue(queue, 'tick', plan, 0);
    expect(queue.status).toBe('failed');
    expect(queue.steps[1]).toMatchObject({ status: 'failed', attempts: 1 });
    expect(transitionReferenceQueue(queue, 'tick', plan, 0)).toBe(queue);
    const completed = queue.steps[0];
    queue = transitionReferenceQueue(queue, 'retry', plan, 0);
    expect(queue.steps[0]).toEqual(completed);
    expect(queue.steps[1]).toMatchObject({ status: 'running', attempts: 2 });
    expect(transitionReferenceQueue(queue, 'retry', plan, 0)).toBe(queue);
    for (let index = 0; index < 7; index++) queue = transitionReferenceQueue(queue, 'tick', plan, 0);
    expect(queue.status).toBe('complete');
    expect(queue.steps.map(step => step.attempts)).toEqual([1, 2, 1, 1, 1, 1, 1, 1]);
    expect(queue.actualCents).toBe(0);
    expect(isReferenceQueue(queue, plan, 0)).toBe(true);
  });
  it('pause/resume retains the running attempt; cancel and stale bindings are terminal', () => {
    const plan = confirmed();
    const running = transitionReferenceQueue(createReferenceQueue(plan, 0, 'normal'), 'start', plan, 0);
    const paused = transitionReferenceQueue(running, 'pause', plan, 0);
    expect(paused.steps).toEqual(running.steps);
    expect(transitionReferenceQueue(paused, 'tick', plan, 0)).toBe(paused);
    expect(transitionReferenceQueue(paused, 'resume', plan, 0).steps).toEqual(running.steps);
    const cancelled = transitionReferenceQueue(running, 'cancel', plan, 0);
    for (const action of ['start', 'resume', 'retry', 'tick'] as const) expect(transitionReferenceQueue(cancelled, action, plan, 0)).toBe(cancelled);
    expect(transitionReferenceQueue(running, 'tick', editSampleReview(plan, { direction: 'New' }), 0)).toBe(running);
  });
  it('omits voice work for no-voiceover plans and refuses malformed/dependency-bypassing records', () => {
    const plan = confirmed(true), queue = createReferenceQueue(plan, 0, 'normal');
    expect(queue.steps.map(step => step.id)).toEqual(['clip-1', 'clip-2', 'clip-3', 'music', 'sfx', 'assembly', 'quality']);
    expect(isReferenceQueue(queue, plan, 0)).toBe(true);
    for (const malformed of [null, { ...queue, actualCents: 1 }, { ...queue, fixture: false }, { ...queue, steps: null },
      { ...queue, steps: queue.steps.map((step, index) => index === 5 ? { ...step, status: 'succeeded', attempts: 1 } : step) },
      { ...queue, steps: queue.steps.map((step, index) => index === 0 ? { ...step, attempts: 3 } : step) },
      { ...queue, plan: { ...plan, confirmation: { ...plan.confirmation, capCents: 1 } } },
    ]) expect(isReferenceQueue(malformed, plan, 0)).toBe(false);
  });
  it('persists irreversible invalidation and rejects a caller restoring or forging queue progress', () => {
    const plan = confirmed(), draft = createReferenceDraft();
    let book = adoptConversations('alice', null, null);
    book.chats[0].referenceDraft = draft; book.chats[0].referenceReview = plan;
    const queue = createReferenceQueue(plan, 0, 'normal');
    book = updateConversation(book, book.selectedId, { referenceQueue: queue });
    expect(book.chats[0].referenceQueue).toEqual(queue);
    expect(updateConversation(book, book.selectedId, { referenceQueue: { ...queue, status: 'complete', revision: 2 } })).toBe(book);
    const edited = updateConversation(book, book.selectedId, { referenceDraft: { ...draft, brief: 'Changed' } });
    const reverted = updateConversation(edited, book.selectedId, { referenceDraft: draft, referenceQueue: queue });
    expect(reverted.chats[0].referenceQueue?.invalidated).toBe(true);
    expect(isReferenceQueue(reverted.chats[0].referenceQueue, reverted.chats[0].referenceReview, 2)).toBe(true);
    const reviewEdited = updateConversation(book, book.selectedId, { referenceReview: editSampleReview(plan, { direction: 'Changed' }), referenceQueue: queue });
    expect(reviewEdited.chats[0].referenceQueue?.invalidated).toBe(true);
    expect(updateConversation(reviewEdited, book.selectedId, { referenceQueue: queue })).toBe(reviewEdited);
  });
});

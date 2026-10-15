import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createReferenceDraft } from '../../services/companionReferenceDraft.js';
import { confirmSampleReview, createSampleReview, editSampleReview } from '../../services/companionReferenceReview.js';
import * as queueDomain from '../../services/companionReferenceQueue.js';
import * as fixtureDomain from '../../services/companionFixtureJobs.js';
import { openFixtureJournal } from '../../tools/reference-fixture-journal.mjs';

const journals: ReturnType<typeof openFixtureJournal>[] = [];
function open(stepMs = 100) {
  const directory = path.resolve('.tmp/companion-fixture-journal-tests', randomUUID());
  mkdirSync(directory, { recursive: true });
  let time = 1000;
  const journal = openFixtureJournal({ dbPath: path.join(directory, 'jobs.sqlite'), domain: { ...queueDomain, ...fixtureDomain }, stepMs, now: () => time });
  journals.push(journal);
  return { journal, dbPath: path.join(directory, 'jobs.sqlite'), setTime: (value: number) => { time = value; } };
}
async function intent(ownerId = 'fixture-user-a', chat = 'chat-a', scenario: queueDomain.QueueScenario = 'normal') {
  const hash = 'a'.repeat(64);
  const plan = confirmSampleReview(createSampleReview(createReferenceDraft(), hash, 0), hash, 0);
  return fixtureDomain.createFixtureJobIntent(ownerId, chat, plan, scenario);
}
afterEach(() => { for (const journal of journals.splice(0)) journal.close(); });

describe('durable fixture journal', { timeout: 30_000 }, () => {
  it('starts once, binds owner/chat, and status reads do not advance work', async () => {
    const { journal, setTime } = open(), job = await intent();
    const started = await journal.start(job, job.ownerId);
    expect(started.queue).toMatchObject({ status: 'running', revision: 2, actualCents: 0 });
    expect(started.nextDueAt).toBe(1100);
    const duplicates = await Promise.all(Array.from({ length: 6 }, () => journal.start(job, job.ownerId)));
    expect(duplicates.every(result => result.queue.id === started.queue.id && result.queue.revision === 2)).toBe(true);
    setTime(5000);
    expect(journal.get(job.requestId, job.ownerId, job.ownerChatId)).toEqual(started);
    expect(journal.get(job.requestId, 'fixture-user-b', job.ownerChatId)).toBeNull();
    expect(journal.get(job.requestId, job.ownerId, 'other-chat')).toBeNull();
    expect(journal.events(job.requestId)).toHaveLength(1);
    await expect(journal.start({ ...job, scenario: 'second-clip-fails-once' }, job.ownerId)).rejects.toMatchObject({ code: 'INTENT_CONFLICT', status: 409 });
    await expect(journal.start(job, 'fixture-user-b')).rejects.toMatchObject({ status: 403 });
    await expect(journal.start(await intent('real-user'), 'real-user')).rejects.toMatchObject({ status: 403 });
  });

  it('allows only one active plan per owner/chat and rejects unconfirmed/corrupt intents', async () => {
    const { journal } = open(), job = await intent();
    await journal.start(job, job.ownerId);
    const changed = editSampleReview(job.plan, { direction: 'A different confirmed direction.' });
    const plan = confirmSampleReview(changed, changed.inputHash, changed.inputRevision);
    const replacement = await fixtureDomain.createFixtureJobIntent(job.ownerId, job.ownerChatId, plan);
    await expect(journal.start(replacement, job.ownerId)).rejects.toMatchObject({ code: 'ACTIVE_JOB_CONFLICT', status: 409 });
    await expect(journal.start({ ...job, requestId: 'f'.repeat(64) }, job.ownerId)).rejects.toMatchObject({ status: 400 });
    await expect(journal.start({ ...job, inputRevision: 9 }, job.ownerId)).rejects.toMatchObject({ status: 400 });
    await expect(journal.start({ ...job, plan: { ...job.plan, confirmation: null } }, job.ownerId)).rejects.toMatchObject({ status: 400 });
  });

  it('serializes due transitions across connections and schedules from actual completion', async () => {
    const first = open(), job = await intent();
    await first.journal.start(job, job.ownerId);
    const second = openFixtureJournal({ dbPath: first.dbPath, domain: { ...queueDomain, ...fixtureDomain }, stepMs: 100, now: () => 5000 });
    journals.push(second);
    first.setTime(5000);
    expect(first.journal.tickDue()?.queue.revision).toBe(3);
    expect(second.tickDue()).toBeNull();
    expect(first.journal.get(job.requestId, job.ownerId, job.ownerChatId)?.nextDueAt).toBe(5100);
    expect(first.journal.events(job.requestId).map(event => event.occurredAt)).toEqual([1000, 5000]);
  });

  it('persists bounded retry receipts and retains completed work after reopen', async () => {
    const state = open(), job = await intent('fixture-user-a', 'chat-a', 'second-clip-fails-once');
    await state.journal.start(job, job.ownerId);
    state.setTime(1100); state.journal.tickDue();
    state.setTime(1200); const failed = state.journal.tickDue();
    expect(failed?.queue.status).toBe('failed');
    const command = { intent: job, action: 'retry', expectedRevision: failed!.queue.revision, commandId: randomUUID() };
    const retried = await state.journal.command(command, job.ownerId);
    expect(retried.queue.steps.slice(0, 2).map(step => [step.status, step.attempts])).toEqual([['succeeded', 1], ['running', 2]]);
    expect(await state.journal.command(command, job.ownerId)).toEqual(retried);
    await expect(state.journal.command({ ...command, action: 'cancel' }, job.ownerId)).rejects.toMatchObject({ code: 'COMMAND_CONFLICT' });
    await expect(state.journal.command({ ...command, commandId: randomUUID() }, job.ownerId)).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    await expect(state.journal.command({ ...command, expectedRevision: null, commandId: randomUUID() }, job.ownerId)).rejects.toMatchObject({ status: 400 });
    for (let time = 1300; time <= 1900; time += 100) { state.setTime(time); state.journal.tickDue(); }
    const reopened = openFixtureJournal({ dbPath: state.dbPath, domain: { ...queueDomain, ...fixtureDomain }, stepMs: 100 });
    journals.push(reopened);
    const complete = reopened.get(job.requestId, job.ownerId, job.ownerChatId);
    expect(complete?.queue).toMatchObject({ status: 'complete', actualCents: 0 });
    expect(complete?.queue.steps.map(step => step.attempts)).toEqual([1, 2, 1, 1, 1, 1, 1, 1]);
    expect(complete?.nextDueAt).toBeNull();
  });

  it.each(['cancel', 'invalidate'] as const)('makes %s terminal even when a late submission follows the tombstone', async action => {
    const { journal, setTime } = open(), job = await intent();
    const stopped = await journal.command({ intent: job, action, expectedRevision: null, commandId: randomUUID() }, job.ownerId);
    expect(stopped.nextDueAt).toBeNull();
    expect(stopped.queue.status).toBe('cancelled');
    expect(stopped.queue.invalidated).toBe(action === 'invalidate');
    expect(await journal.start(job, job.ownerId)).toEqual(stopped);
    setTime(5000); expect(journal.tickDue()).toBeNull();
    expect(journal.events(job.requestId)).toHaveLength(1);
  });

  it('cancels an unknown-outcome running revision atomically and rejects stale known revisions', async () => {
    const { journal, setTime } = open(), job = await intent();
    const start = await journal.start(job, job.ownerId);
    setTime(1100); journal.tickDue();
    await expect(journal.command({ intent: job, action: 'cancel', expectedRevision: start.queue.revision, commandId: randomUUID() }, job.ownerId)).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    const cancelled = await journal.command({ intent: job, action: 'cancel', expectedRevision: null, commandId: randomUUID() }, job.ownerId);
    setTime(9000); expect(journal.tickDue()).toBeNull();
    expect(cancelled.queue.steps[0]).toMatchObject({ status: 'succeeded', attempts: 1 });
    expect(cancelled.nextDueAt).toBeNull();
  });
});

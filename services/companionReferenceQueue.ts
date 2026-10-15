import { isReferenceReview, type ReferenceReview } from './companionReferenceReview';

export type QueueScenario = 'normal' | 'second-clip-fails-once';
export type QueueAction = 'start' | 'pause' | 'resume' | 'tick' | 'retry' | 'cancel';
export interface ReferenceQueueStep {
  id: string;
  kind: 'clip' | 'voice' | 'music' | 'sfx' | 'assembly' | 'quality';
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  attempts: number;
}
// Local simulation only. This record grants no production or spending authority.
export interface ReferenceQueue {
  version: 1;
  fixture: true;
  id: string;
  revision: number;
  status: 'prepared' | 'running' | 'paused' | 'failed' | 'cancelled' | 'complete';
  invalidated: boolean;
  scenario: QueueScenario;
  plan: ReferenceReview;
  steps: ReferenceQueueStep[];
  actualCents: 0;
}
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
function queueSteps(plan: ReferenceReview): ReferenceQueueStep[] {
  const steps: { id: string; kind: ReferenceQueueStep['kind'] }[] = plan.scenes.map((_, index) => ({ id: `clip-${index + 1}`, kind: 'clip' }));
  if (plan.speechMode === 'spoken') steps.push({ id: 'voice', kind: 'voice' });
  steps.push({ id: 'music', kind: 'music' }, { id: 'sfx', kind: 'sfx' }, { id: 'assembly', kind: 'assembly' }, { id: 'quality', kind: 'quality' });
  return steps.map(step => ({ ...step, status: 'queued', attempts: 0 }));
}
export function queueMatchesReview(queue: ReferenceQueue, review: ReferenceReview | undefined, inputRevision: number): boolean {
  return !queue.invalidated && !!review?.confirmation && isReferenceReview(review)
    && review.inputRevision === inputRevision && same(queue.plan, review);
}
export function createReferenceQueue(review: ReferenceReview, inputRevision: number, scenario: QueueScenario): ReferenceQueue {
  if (!isReferenceReview(review) || !review.confirmation || review.inputRevision !== inputRevision
    || !['normal', 'second-clip-fails-once'].includes(scenario) || (scenario === 'second-clip-fails-once' && review.scenes.length < 2)) throw new Error('Save and confirm the current sample plan before preparing a demo queue.');
  const plan = JSON.parse(JSON.stringify(review)) as ReferenceReview;
  return { version: 1, fixture: true, id: crypto.randomUUID(), revision: 1, status: 'prepared', invalidated: false, scenario, plan, steps: queueSteps(plan), actualCents: 0 };
}
export function transitionReferenceQueue(queue: ReferenceQueue, action: QueueAction, review: ReferenceReview | undefined, inputRevision: number): ReferenceQueue {
  if (!isReferenceQueue(queue, review, inputRevision) || !queueMatchesReview(queue, review, inputRevision) || ['cancelled', 'complete'].includes(queue.status)) return queue;
  let status = queue.status;
  let steps = queue.steps;
  const running = steps.findIndex(step => step.status === 'running');
  if (action === 'cancel') status = 'cancelled';
  else if (action === 'pause' && status === 'running') status = 'paused';
  else if (action === 'resume' && (status === 'paused' || status === 'running')) {
    if (status === 'running') return queue;
    status = 'running';
  } else if (action === 'start' && status === 'prepared') {
    status = 'running'; steps = steps.map((step, index) => index === 0 ? { ...step, status: 'running', attempts: 1 } : step);
  } else if (action === 'retry' && status === 'failed') {
    const failed = steps.findIndex(step => step.status === 'failed' && step.id === 'clip-2' && step.attempts === 1);
    if (failed < 0) return queue;
    status = 'running'; steps = steps.map((step, index) => index === failed ? { ...step, status: 'running', attempts: 2 } : step);
  } else if (action === 'tick' && status === 'running' && running >= 0) {
    const fails = queue.scenario === 'second-clip-fails-once' && steps[running].id === 'clip-2' && steps[running].attempts === 1;
    steps = steps.map((step, index) => index === running ? { ...step, status: fails ? 'failed' : 'succeeded' } : step);
    if (fails) status = 'failed';
    else if (running === steps.length - 1) status = 'complete';
    else steps = steps.map((step, index) => index === running + 1 ? { ...step, status: 'running', attempts: 1 } : step);
  } else return queue;
  return { ...queue, revision: queue.revision + 1, status, steps };
}
export function invalidateReferenceQueue(queue: ReferenceQueue): ReferenceQueue {
  return queue.invalidated ? queue : { ...queue, revision: queue.revision + 1, invalidated: true };
}

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export function isReferenceQueue(value: unknown, review?: ReferenceReview, inputRevision?: number): value is ReferenceQueue {
  if (!record(value) || value.version !== 1 || value.fixture !== true || typeof value.id !== 'string' || !/^[a-f0-9-]{36}$/.test(value.id)
    || !Number.isSafeInteger(value.revision) || (value.revision as number) < 1 || typeof value.invalidated !== 'boolean' || value.actualCents !== 0
    || !['normal', 'second-clip-fails-once'].includes(value.scenario as string)
    || !['prepared', 'running', 'paused', 'failed', 'cancelled', 'complete'].includes(value.status as string)
    || !isReferenceReview(value.plan) || !value.plan.confirmation || !Array.isArray(value.steps)) return false;
  const queue = value as unknown as ReferenceQueue;
  const expected = queueSteps(queue.plan);
  if (queue.steps.length !== expected.length || (queue.scenario === 'second-clip-fails-once' && queue.plan.scenes.length < 2)) return false;
  let unfinished = false, active = 0;
  for (let index = 0; index < expected.length; index++) {
    const step = queue.steps[index];
    if (!record(step) || step.id !== expected[index].id || step.kind !== expected[index].kind || !['queued', 'running', 'succeeded', 'failed'].includes(step.status)
      || !Number.isSafeInteger(step.attempts)) return false;
    const mayFail = queue.scenario === 'second-clip-fails-once' && step.id === 'clip-2';
    if (step.status === 'queued') { if (step.attempts !== 0) return false; }
    else if (step.attempts < 1 || step.attempts > (mayFail ? 2 : 1)) return false;
    if (step.status === 'failed' && (!mayFail || step.attempts !== 1)) return false;
    if (step.status === 'succeeded') { if (unfinished || (mayFail && step.attempts !== 2)) return false; }
    else {
      if (step.status !== 'queued') { if (unfinished) return false; active++; }
      unfinished = true;
    }
  }
  const hasRunning = queue.steps.some(step => step.status === 'running'), hasFailed = queue.steps.some(step => step.status === 'failed');
  if (active > 1 || (queue.status === 'prepared' && queue.steps.some(step => step.status !== 'queued'))
    || (['running', 'paused'].includes(queue.status) && !hasRunning) || (queue.status === 'failed' && !hasFailed)
    || (queue.status === 'complete' && unfinished)) return false;
  if (inputRevision !== undefined && !queue.invalidated && !queueMatchesReview(queue, review, inputRevision)) return false;
  return true;
}
export function acceptsReferenceQueue(previous: ReferenceQueue | undefined, next: ReferenceQueue, review: ReferenceReview | undefined, inputRevision: number): boolean {
  if (!isReferenceQueue(next, review, inputRevision)) return false;
  if (previous && same(previous, next)) return true;
  if (!previous || previous.id !== next.id) {
    return next.status === 'prepared' && next.revision === 1 && queueMatchesReview(next, review, inputRevision)
      && (!previous || (previous.invalidated && !same(previous.plan, next.plan)));
  }
  return (['start', 'pause', 'resume', 'tick', 'retry', 'cancel'] as const).some(action => {
    const transitioned = transitionReferenceQueue(previous, action, review, inputRevision);
    return transitioned !== previous && same(transitioned, next);
  });
}

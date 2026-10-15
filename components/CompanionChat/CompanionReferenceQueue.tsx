import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Circle, LoaderCircle, AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import { GlassPanel } from '../ui/GlassPanel';
import { GoldButton } from '../ui/GoldButton';
import { createReferenceQueue, queueMatchesReview, transitionReferenceQueue, type QueueAction, type QueueScenario } from '../../services/companionReferenceQueue';
import type { ConversationBinding } from './CompanionChatShell';

const control = 'min-h-11 min-w-11 !rounded-xl !text-sm !font-semibold !normal-case !tracking-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCC00] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed';
const ghost = `${control} !bg-zinc-950 border border-white/10 !text-zinc-400 hover:!text-white hover:!border-[#FFCC00]`;
const money = (cents: number) => `PHP ${(cents / 100).toFixed(2)}`;
const scenarioName = (scenario: QueueScenario) => scenario === 'normal' ? 'Normal completion' : 'Second clip fails once';

export function CompanionReferenceQueue({ conversation, userId, onBack }: { conversation: ConversationBinding; userId: string; onBack: () => void }) {
  const queue = conversation.chat.referenceQueue;
  const review = conversation.chat.referenceReview;
  const inputRevision = conversation.chat.referenceInputRevision ?? 0;
  const saved = conversation.saved && !conversation.saving && !conversation.saveConflict;
  const scope = `${userId}:${conversation.chat.id}`;
  const [scenario, setScenario] = useState<QueueScenario>('normal');
  const [intent, setIntent] = useState<string | null>(null);
  const current = useRef({ conversation, scope, saved }); current.current = { conversation, scope, saved };
  const active = useRef(true);
  const prepareLock = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => { if (!conversation.saved && !conversation.saving) setIntent(null); }, [conversation.saved, conversation.saving]);
  const matches = !!queue && queueMatchesReview(queue, review, inputRevision);
  const playing = !!queue && intent === `${scope}:${queue.id}` && matches && queue.status === 'running';
  useEffect(() => {
    if (!queue || !playing || !saved) return;
    const id = queue.id, revision = queue.revision, startedScope = scope;
    const timer = window.setTimeout(() => {
      const latest = current.current, chat = latest.conversation.chat;
      if (!active.current || latest.scope !== startedScope || !latest.saved || !latest.conversation.queueIsCurrent(id, revision)
        || chat.referenceQueue?.id !== id || chat.referenceQueue.revision !== revision) return;
      const next = transitionReferenceQueue(chat.referenceQueue, 'tick', chat.referenceReview, chat.referenceInputRevision ?? 0);
      if (next !== chat.referenceQueue) latest.conversation.update({ referenceQueue: next });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [queue, playing, saved, scope]);
  const act = (action: QueueAction) => {
    const latest = current.current, chat = latest.conversation.chat, previous = chat.referenceQueue;
    if (action === 'pause' || action === 'cancel') setIntent(null);
    if (!previous || !latest.saved || !latest.conversation.queueIsCurrent(previous.id, previous.revision)) return;
    const next = transitionReferenceQueue(previous, action, chat.referenceReview, chat.referenceInputRevision ?? 0);
    if (next !== previous) latest.conversation.update({ referenceQueue: next });
    if (['start', 'resume', 'retry'].includes(action) && next.status === 'running' && queueMatchesReview(next, chat.referenceReview, chat.referenceInputRevision ?? 0)) setIntent(`${latest.scope}:${next.id}`);
  };
  const prepare = () => {
    if (prepareLock.current || !saved || !review?.confirmation) return;
    prepareLock.current = true;
    try { conversation.update({ referenceQueue: createReferenceQueue(review, inputRevision, scenario) }); }
    finally { queueMicrotask(() => { prepareLock.current = false; }); }
  };
  const plan = queue?.plan ?? review;
  const confirmation = plan?.confirmation;
  const eligible = !!review?.confirmation && !review.stale && review.inputRevision === inputRevision;
  const replacement = !!queue?.invalidated && eligible && JSON.stringify(queue.plan) !== JSON.stringify(review);
  const status = queue?.invalidated ? 'Earlier plan · stopped' : !queue ? 'Ready to prepare' : ({ prepared: 'Ready to start', running: playing ? 'Demo simulation running' : 'Resume needed', paused: 'Demo paused', failed: 'Demo stopped at a failed step', cancelled: 'Demo cancelled', complete: 'Demo complete' })[queue.status];
  return <div className="space-y-4" data-testid="demo-queue-panel">
    <Button variant="ghost" className={`${ghost} flex items-center gap-3`} onClick={onBack}><ArrowLeft className="h-5 w-5 shrink-0" />Back to sample plan</Button>
    <GlassPanel className="space-y-4 p-4 sm:p-5">
      <h2 className="!text-lg !font-semibold !normal-case !tracking-normal">Demo production queue</h2>
      <p className="text-sm leading-relaxed text-zinc-300">A local simulation of the reviewed steps. No clips, voice, music or finished video are created. Nothing is delivered to Assets.</p>
      <p className="text-xs leading-relaxed text-zinc-400">Progress is saved only in this browser. Keep this queue open while it runs. Leaving or reopening requires Resume; it does not run in the background.</p>
      <p role="status" data-testid="demo-queue-status" className="text-sm font-semibold">{status}{queue && !saved ? ' · not saved yet' : ''}</p>
      {!saved && <p role="alert" className="text-sm text-zinc-300">Demo progress is waiting to be saved. Simulation stops until saving succeeds. Check the save status below and retry if needed.</p>}
      {queue?.invalidated && <p role="alert" className="text-sm leading-relaxed text-zinc-300">This demo queue belongs to an earlier plan. Review and confirm the updated plan before preparing a replacement.</p>}
      {queue?.status === 'failed' && !queue.invalidated && <p className="flex items-start gap-2 text-sm text-amber-500"><AlertTriangle className="h-4 w-4 shrink-0" />The second clip failed in this test. Completed steps are kept. One retry is available for that clip.</p>}
      {plan && confirmation && <details>
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCC00]">Original sample plan · revision {plan.revision}</summary>
        <div className="space-y-3 break-words text-sm text-zinc-300">
          <p>Saved voice: {plan.voice?.name || 'Not selected'}{plan.speechMode === 'silent' ? ' · unused in this no-voiceover plan' : ''}</p>
          <ol className="space-y-2">{plan.scenes.map((scene, index) => <li key={scene.id}>Scene {index + 1}: {scene.start}–{scene.end} seconds · {scene.visual}</li>)}</ol>
          <p className="text-xs text-zinc-400">Planning is already reviewed. This simulation does not repeat analysis or validate the supplied assets, reference resemblance or audio.</p>
        </div>
      </details>}
      {confirmation && <p className="text-sm text-zinc-300">Original illustrative estimate: {money(confirmation.lowCents)}–{money(confirmation.highCents)}. Demo cap: {money(confirmation.capCents)}.</p>}
      <p className="text-sm font-semibold text-[#FFCC00]">Actual spend: PHP 0.00. No spending is authorized.</p>
      {(!queue || replacement) && <>
        {replacement && <p className="text-sm text-zinc-300">Replacement uses newly confirmed sample revision {review?.revision}. Preparing it replaces the earlier demo queue.</p>}
        <details><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCC00]">Demo test scenario · {scenarioName(scenario)}</summary>
          <label className="block text-sm text-zinc-400">Demo scenario<select aria-label="Demo scenario" value={scenario} onChange={event => setScenario(event.target.value as QueueScenario)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]"><option value="normal">Normal completion</option><option value="second-clip-fails-once" disabled={(review?.scenes.length ?? 0) < 2}>Second clip fails once</option></select></label>
        </details>
        <GoldButton className={`${control} w-full disabled:opacity-50 disabled:hover:scale-100`} disabled={!saved || !eligible} onClick={prepare}>{replacement ? 'Prepare replacement demo queue' : 'Prepare demo queue'}</GoldButton>
      </>}
      {queue && <p className="text-xs text-zinc-400">Test scenario: {scenarioName(queue.scenario)}. No automatic repairs.</p>}
      {queue && matches && <div className="space-y-3">
        {queue.status === 'prepared' && <GoldButton className={`${control} w-full`} disabled={!saved} onClick={() => act('start')}>Start demo queue</GoldButton>}
        {['paused', 'running'].includes(queue.status) && !playing && <GoldButton className={`${control} w-full`} disabled={!saved} onClick={() => act('resume')}>Resume demo queue</GoldButton>}
        {playing && <Button variant="secondary" className={`${ghost} w-full`} onClick={() => act('pause')}>Pause demo queue</Button>}
        {queue.status === 'failed' && <GoldButton className={`${control} w-full`} disabled={!saved} onClick={() => act('retry')}>Retry failed step</GoldButton>}
        {!['cancelled', 'complete'].includes(queue.status) && <Button variant="ghost" className={`${ghost} w-full`} disabled={!saved} onClick={() => act('cancel')}>Cancel demo queue</Button>}
      </div>}
    </GlassPanel>
    {queue && <GlassPanel className="space-y-4 p-4 sm:p-5" aria-label="Demo steps">
      <h3 className="!text-base !font-semibold !normal-case !tracking-normal">Reviewed steps · {queue.steps.filter(step => step.status === 'succeeded').length}/{queue.steps.length} demo passed</h3>
      <ol className="space-y-4">{queue.steps.map((step, index) => {
        const sceneIndex = step.kind === 'clip' ? Number(step.id.slice(5)) - 1 : -1;
        const scene = queue.plan.scenes[sceneIndex];
        const label = scene ? `Scene ${sceneIndex + 1} clip · ${scene.start}–${scene.end} seconds` : ({ voice: 'Locked voice and alignment', music: 'Instrumental music', sfx: 'Existing sound-bank cues', assembly: 'Assembly', quality: 'Quality check' } as Record<string, string>)[step.kind];
        const stepStatus = step.status === 'running' ? !saved ? 'Pending save' : queue.invalidated || queue.status === 'cancelled' ? 'Stopped' : playing ? 'Simulating' : 'Resume needed' : ({ queued: 'Waiting', succeeded: 'Demo passed', failed: 'Demo failed' })[step.status];
        const Icon = step.status === 'succeeded' ? Check : step.status === 'failed' ? AlertTriangle : step.status === 'running' ? LoaderCircle : Circle;
        return <li key={step.id} data-testid={`demo-step-${step.id}`} className="flex items-start gap-2 text-sm">
          <Icon aria-hidden className={`mt-0.5 h-4 w-4 shrink-0 ${step.status === 'succeeded' ? 'text-[#FFCC00]' : step.status === 'failed' ? 'text-amber-500' : 'text-zinc-400'}`} />
          <div className="min-w-0 flex-1"><p className="font-normal text-zinc-200">{index + 1}. {label}</p><p className="mt-1 text-zinc-400">{stepStatus} · Attempt {step.attempts}</p></div>
        </li>;
      })}</ol>
      {queue.status === 'complete' && <p className="text-sm leading-relaxed text-zinc-300">Demo complete. All simulated steps passed. There is no rendered video to play or download.</p>}
    </GlassPanel>}
  </div>;
}

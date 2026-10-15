import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, AlertTriangle, Check, Circle, LoaderCircle } from 'lucide-react';
import Button from '../ui/Button';
import { GlassPanel } from '../ui/GlassPanel';
import { GoldButton } from '../ui/GoldButton';
import { createFixtureJobIntent, fixtureIntentMatchesReview, type FixtureJobAction, type FixtureJobClient, type FixtureJobIntent, type FixtureJobSnapshot } from '../../services/companionFixtureJobs';
import type { QueueScenario } from '../../services/companionReferenceQueue';
import type { ConversationBinding } from './CompanionChatShell';

const control = 'min-h-11 min-w-11 !rounded-xl !text-sm !font-semibold !normal-case !tracking-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCC00] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed';
const ghost = `${control} !bg-zinc-950 border border-white/10 !text-zinc-400 hover:!text-white hover:!border-[#FFCC00]`;
const money = (cents: number) => `PHP ${(cents / 100).toFixed(2)}`;

export function CompanionFixtureJob({ conversation, userId, client, onBack }: { conversation: ConversationBinding; userId: string; client: FixtureJobClient; onBack: () => void }) {
  const link = conversation.chat.referenceFixtureJob, review = conversation.chat.referenceReview;
  const saved = conversation.saved && !conversation.saving && !conversation.saveConflict;
  const owner = !link || (link.intent.ownerId === userId && link.intent.ownerChatId === conversation.chat.id);
  const [scenario, setScenario] = useState<QueueScenario>('normal');
  const [snapshot, setSnapshot] = useState<FixtureJobSnapshot | null>(null);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState('');
  const [commandError, setCommandError] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false), alive = useRef(true);
  const reading = useRef(false), generation = useRef(0);
  const [armed, setArmed] = useState<string | null>(null);
  const [editAfterSave, setEditAfterSave] = useState<string | null>(null);
  const scope = `${userId}:${conversation.chat.id}`;
  const current = useRef({ conversation, scope, saved }); current.current = { conversation, scope, saved };
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const isCurrent = (intent: FixtureJobIntent, invalidated: boolean) => alive.current && current.current.scope === scope
    && current.current.conversation.fixtureJobIsCurrent(intent.requestId, invalidated);
  const accept = (value: FixtureJobSnapshot | null) => {
    setSnapshot(previous => value && previous && previous.intent.requestId === value.intent.requestId && previous.queue.revision > value.queue.revision ? previous : value);
    setChecked(true); setError('');
  };
  const refresh = async (explicit = false) => {
    if (explicit) setCommandError('');
    const target = current.current.conversation.chat.referenceFixtureJob;
    if (!target || locked.current || reading.current) return;
    reading.current = true;
    const requestGeneration = ++generation.current;
    const startedScope = current.current.scope;
    try {
      const next = await client.get(target.intent);
      if (generation.current === requestGeneration && current.current.scope === startedScope && isCurrent(target.intent, target.invalidated)) accept(next);
    } catch (reason) { if (generation.current === requestGeneration && current.current.scope === startedScope && isCurrent(target.intent, target.invalidated)) setError(reason instanceof Error ? reason.message : 'Connection to the local fixture worker failed.'); }
    finally { reading.current = false; }
  };
  // Opening a chat only reads the worker journal. It never starts or advances work.
  useEffect(() => {
    setSnapshot(null); setChecked(false); setError(''); setCommandError('');
    if (!link) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 1000);
    return () => { generation.current++; window.clearInterval(timer); };
  }, [scope, link?.intent.requestId, client]);
  const submit = async (intent: FixtureJobIntent) => {
    if (locked.current || !current.current.saved || !isCurrent(intent, false) || intent.ownerChatId !== current.current.conversation.chat.id) return;
    locked.current = true; setBusy(true); setError(''); setCommandError('');
    generation.current++;
    try {
      const next = await client.start(intent);
      if (isCurrent(intent, false)) accept(next);
    } catch {
      // A lost start acknowledgement is reconciled by identity, never a new submission.
      try {
        const existing = await client.get(intent);
        if (isCurrent(intent, false)) { accept(existing); if (!existing) setError('Start was not confirmed. Refresh status, then explicitly start the saved fixture job if it is still absent.'); }
      } catch { if (isCurrent(intent, false)) setError('Start acknowledgement is unknown. The worker may still be running. Refresh job status to reconcile this saved request.'); }
    } finally { locked.current = false; if (alive.current) setBusy(false); }
  };
  // This arm exists only after an explicit click. IndexedDB must acknowledge the exact link first.
  useEffect(() => {
    if (!armed || !link || link.intent.requestId !== armed || link.invalidated || !saved || locked.current) return;
    setArmed(null); void submit(link.intent);
  }, [armed, link, saved]);
  useEffect(() => {
    if (editAfterSave && link?.intent.requestId === editAfterSave && link.invalidated && saved
      && conversation.fixtureJobIsCurrent(editAfterSave, true)) { setEditAfterSave(null); onBack(); }
  }, [editAfterSave, link, saved, conversation.fixtureJobIsCurrent, onBack]);
  const prepare = async () => {
    if (locked.current || !saved || !owner || !review?.confirmation) return;
    locked.current = true; setBusy(true); setError(''); setCommandError('');
    const startedScope = scope, original = review;
    try {
      const intent = await createFixtureJobIntent(userId, conversation.chat.id, original, scenario);
      const latest = current.current;
      if (!alive.current || latest.scope !== startedScope || !latest.saved || latest.conversation.chat.referenceReview !== original
        || !fixtureIntentMatchesReview(intent, original, latest.conversation.chat.referenceInputRevision ?? 0)) return;
      if (latest.conversation.chat.referenceFixtureJob?.intent.requestId === intent.requestId) { setError('This plan already has a saved fixture job. Change and confirm the plan before preparing a replacement.'); return; }
      latest.conversation.update({ referenceFixtureJob: { intent, invalidated: false } });
      setArmed(intent.requestId);
    } catch (reason) { if (alive.current && current.current.scope === startedScope) setError(reason instanceof Error ? reason.message : 'The fixture job could not be prepared.'); }
    finally { locked.current = false; if (alive.current) setBusy(false); }
  };
  const command = async (action: FixtureJobAction) => {
    if (!link || !owner || locked.current || !saved || !conversation.fixtureJobIsCurrent(link.intent.requestId, link.invalidated)) return;
    locked.current = true; setBusy(true); setError(''); setCommandError(''); setArmed(null);
    generation.current++;
    const target = link;
    try {
      const next = await client.control(target.intent, action, action === 'retry' ? snapshot?.queue.revision ?? null : null, crypto.randomUUID());
      if (!isCurrent(target.intent, target.invalidated)) return;
      if (action === 'invalidate' && !next.queue.invalidated) throw new Error('The worker did not acknowledge stopping this plan. Editing stays locked.');
      accept(next);
      if (action === 'invalidate') {
        current.current.conversation.update({ referenceFixtureJob: { intent: target.intent, invalidated: true } });
        setEditAfterSave(target.intent.requestId);
      }
    } catch (reason) { if (isCurrent(target.intent, target.invalidated)) setCommandError(reason instanceof Error ? reason.message : 'The worker could not acknowledge this command. Refresh status before trying again.'); }
    finally { locked.current = false; if (alive.current) setBusy(false); }
  };
  const plan = link?.intent.plan ?? review, confirmation = plan?.confirmation, queue = snapshot?.queue;
  const replacement = !!link?.invalidated && !!review?.confirmation && !fixtureIntentMatchesReview(link.intent, review, conversation.chat.referenceInputRevision ?? 0);
  const eligible = !!review?.confirmation && !review.stale && review.inputRevision === (conversation.chat.referenceInputRevision ?? 0);
  const stopped = link?.invalidated || queue?.invalidated;
  const visibleError = commandError || error;
  const status = stopped ? 'Earlier plan · stopped' : !link ? 'Ready to start' : !checked ? 'Checking saved job…' : !queue ? 'Saved request · worker acceptance not confirmed' : ({ prepared: 'Worker accepted', running: 'Background fixture running', paused: 'Worker paused', failed: 'Fixture stopped at a failed step', cancelled: 'Background fixture cancelled', complete: 'Background fixture complete' })[queue.status];
  return <div className="space-y-4" data-testid="background-fixture-panel">
    {(!link || (link.invalidated && owner)) && <Button variant="ghost" className={`${ghost} flex items-center gap-3`} disabled={busy || !!editAfterSave} onClick={onBack}><ArrowLeft className="h-5 w-5 shrink-0" />Back to sample plan</Button>}
    <GlassPanel className="space-y-4 p-4 sm:p-5">
      <h2 className="!text-lg !font-semibold !normal-case !tracking-normal">Background fixture job</h2>
      <p className="text-sm leading-relaxed text-zinc-300">A local worker simulates the reviewed steps. It continues after closing this tab while the local server and worker remain on. Reopen this chat to check the same job.</p>
      <p className="text-xs leading-relaxed text-zinc-400">Local fixture proof only. No clips, voice, music or finished video are created. Nothing is delivered to Assets. Browser drafts and job links remain on this device; worker status lives in the local journal.</p>
      <p role="status" data-testid="background-fixture-status" className="text-sm font-semibold">{status}</p>
      {!owner && <p className="flex items-start gap-2 text-sm leading-relaxed text-amber-500"><AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /><span className="min-w-0">This chat is a copy. It observes the original chat’s job. Start, retry, cancel and plan editing are available only in the original chat.</span></p>}
      {!saved && <p role="alert" className="flex items-start gap-2 text-sm leading-relaxed text-amber-500"><AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /><span className="min-w-0">The browser job link is not saved yet. New submissions and editing wait for saving. An already accepted worker job keeps running.</span></p>}
      {visibleError && <p role="alert" className="flex items-start gap-2 break-words text-sm text-amber-500"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span className="min-w-0">{visibleError} {snapshot ? 'The last confirmed worker status is shown below.' : 'No worker progress is confirmed.'}</span></p>}
      {plan && <details><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCC00]">Original sample plan · revision {plan.revision}</summary><div className="space-y-3 break-words text-sm text-zinc-300"><p>{plan.direction}</p><p>Saved voice: {plan.voice?.name || 'Not selected'}{plan.speechMode === 'silent' ? ' · unused in this no-voiceover plan' : ''}</p><ol className="space-y-3">{plan.scenes.map((scene, index) => <li key={scene.id}><p>Scene {index + 1}: {scene.start}–{scene.end} seconds</p><p>{scene.script}</p><p>{scene.visual}</p></li>)}</ol></div></details>}
      {confirmation && <p className="text-sm text-zinc-300">Original illustrative estimate: {money(confirmation.lowCents)}–{money(confirmation.highCents)}. Demo cap: {money(confirmation.capCents)}.</p>}
      <p className="text-sm font-semibold text-[#FFCC00]">Actual spend: PHP 0.00. No spending is authorized.</p>
      {owner && (!link || replacement) && <>
        <label className="block text-sm text-zinc-400">Background fixture scenario<select aria-label="Background fixture scenario" disabled={busy || !!armed} value={scenario} onChange={event => setScenario(event.target.value as QueueScenario)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]"><option value="normal">Normal completion</option><option value="second-clip-fails-once" disabled={(review?.scenes.length ?? 0) < 2}>Second clip fails once</option></select></label>
        <GoldButton className={`${control} w-full`} disabled={!saved || !eligible || busy || !!armed} onClick={() => void prepare()}>{replacement ? 'Start replacement background fixture job' : 'Start background fixture job'}</GoldButton>
      </>}
      {link && <div className="space-y-3">
        <Button variant="ghost" className={`${ghost} w-full`} disabled={busy} onClick={() => void refresh(true)}>Refresh job status</Button>
        {owner && !stopped && <>
          {checked && !queue && <GoldButton className={`${control} w-full`} disabled={!saved || busy || !!armed} onClick={() => void submit(link.intent)}>Start saved fixture job</GoldButton>}
          {queue?.status === 'failed' && <GoldButton className={`${control} w-full`} disabled={!saved || busy} onClick={() => void command('retry')}>Retry failed step</GoldButton>}
          {queue && !['complete', 'cancelled'].includes(queue.status) && <Button variant="ghost" className={`${ghost} w-full`} disabled={!saved || busy} onClick={() => void command('cancel')}>Cancel background fixture job</Button>}
        </>}
        {owner && !link.invalidated && <Button variant="ghost" className={`${ghost} w-full`} disabled={!saved || busy} onClick={() => void command('invalidate')}>Stop job and edit plan</Button>}
        {owner && link.invalidated && <p className="text-sm text-zinc-300">This job is permanently stopped for plan editing. Confirm a changed plan before starting a replacement.</p>}
        {queue?.status === 'failed' && !stopped && <p className="flex items-start gap-2 text-sm text-amber-500"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />The second clip failed in this fixture. Completed steps are kept. One retry is available.</p>}
      </div>}
    </GlassPanel>
    {queue && <GlassPanel className="space-y-4 p-4 sm:p-5" aria-label="Background fixture steps">
      <h3 className="!text-base !font-semibold !normal-case !tracking-normal">Reviewed steps · {queue.steps.filter(step => step.status === 'succeeded').length}/{queue.steps.length} fixture passed</h3>
      <p className="text-xs text-zinc-400">Worker revision {queue.revision}. Status updates only from worker responses.</p>
      <ol className="space-y-4">{queue.steps.map((step, index) => {
        const sceneIndex = step.kind === 'clip' ? Number(step.id.slice(5)) - 1 : -1, scene = queue.plan.scenes[sceneIndex];
        const label = scene ? `Scene ${sceneIndex + 1} clip · ${scene.start}–${scene.end} seconds` : ({ voice: 'Locked voice and alignment', music: 'Instrumental music', sfx: 'Existing sound-bank cues', assembly: 'Assembly', quality: 'Quality check' } as Record<string, string>)[step.kind];
        const Icon = step.status === 'succeeded' ? Check : step.status === 'failed' ? AlertTriangle : step.status === 'running' ? LoaderCircle : Circle;
        const stepStatus = step.status === 'running' && (stopped || queue.status === 'cancelled') ? 'Stopped' : ({ queued: 'Waiting', running: 'Worker simulating', succeeded: 'Fixture passed', failed: 'Fixture failed' })[step.status];
        return <li key={step.id} data-testid={`background-step-${step.id}`} className="flex items-start gap-2 break-words text-sm"><Icon aria-hidden className={`mt-0.5 h-4 w-4 shrink-0 ${step.status === 'succeeded' ? 'text-[#FFCC00]' : step.status === 'failed' ? 'text-amber-500' : 'text-zinc-400'}`} /><div className="min-w-0 flex-1"><p className="text-zinc-200">{index + 1}. {label}</p><p className="mt-1 text-zinc-400">{stepStatus} · Attempt {step.attempts}</p></div></li>;
      })}</ol>
      {queue.status === 'complete' && <p className="text-sm leading-relaxed text-zinc-300">Fixture complete. All simulated steps passed. There is no rendered video to play or download.</p>}
    </GlassPanel>}
  </div>;
}

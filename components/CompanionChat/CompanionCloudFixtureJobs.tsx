import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, Circle, Cloud, LoaderCircle, PanelLeft } from 'lucide-react';
import Button from '../ui/Button';
import { GoldButton } from '../ui/GoldButton';
import { GlassPanel } from '../ui/GlassPanel';
import { createFixtureJobIntent, fixtureIntentMatchesReview, type FixtureJobAction, type FixtureJobIntent } from '../../services/companionFixtureJobs';
import type { CloudFixtureClient, CloudFixtureSnapshot } from '../../services/companionCloudFixtures';
import type { QueueScenario } from '../../services/companionReferenceQueue';
import { cloudReferenceLink, verifyCloudReferenceDraft, type CloudReferenceReceipt } from '../../services/companionCloudReferences';
import type { CompanionReferenceDraft } from '../../services/companionReferenceDraft';
import type { ConversationBinding } from './CompanionChatShell';

const control = 'min-h-11 min-w-11 !rounded-xl !text-sm !font-semibold !normal-case !tracking-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCC00] disabled:opacity-50 disabled:cursor-not-allowed';
const ghost = `${control} !bg-zinc-950 border border-white/10 !text-zinc-400 hover:!text-white hover:!border-[#FFCC00]`;
const money = (cents: number) => `PHP ${(cents / 100).toFixed(2)}`;
const active = (job: CloudFixtureSnapshot) => !job.queue.invalidated && !['complete', 'cancelled'].includes(job.queue.status);

export function CompanionCloudFixtureJobs({ userId, conversation, client, onBack, onOpenInputs }: {
  userId: string; conversation: ConversationBinding; client: CloudFixtureClient; onBack: () => void;
  onOpenInputs: (draft: CompanionReferenceDraft, sourceLocalChatId: string, receipt: CloudReferenceReceipt, job: FixtureJobIntent) => Promise<void>;
}) {
  const [jobs, setJobs] = useState<CloudFixtureSnapshot[]>([]);
  const [selected, setSelected] = useState<CloudFixtureSnapshot | null>(null);
  const [pending, setPending] = useState<FixtureJobIntent | null>(conversation.chat.referenceCloudJob ?? null);
  const [confirmedAbsent, setConfirmedAbsent] = useState(false);
  const [checked, setChecked] = useState(false);
  const [scenario, setScenario] = useState<QueueScenario>('normal');
  const [error, setError] = useState('');
  const [commandError, setCommandError] = useState('');
  const [busy, setBusy] = useState(false);
  const alive = useRef(true), locked = useRef(false), reading = useRef(false), generation = useRef(0);
  const current = useRef({ userId, conversation, selected, pending }); current.current = { userId, conversation, selected, pending };
  const visible = () => alive.current && current.current.userId === userId;
  const accept = (job: CloudFixtureSnapshot) => {
    if (!visible() || job.intent.ownerId !== userId) return;
    setSelected(previous => previous?.intent.requestId === job.intent.requestId && previous.queue.revision > job.queue.revision ? previous : job);
    setJobs(previous => [job, ...previous.filter(item => item.intent.requestId !== job.intent.requestId)]);
  };
  const refresh = async (explicit = false) => {
    if (locked.current || reading.current) return;
    if (explicit) setCommandError('');
    reading.current = true;
    const requestGeneration = ++generation.current;
    const pendingIntent = current.current.pending;
    const target = current.current.selected?.intent ?? pendingIntent ?? current.current.conversation.chat.referenceCloudObservation;
    try {
      const next = await client.list();
      const found = target ? next.find(job => job.intent.requestId === target.requestId) ?? await client.get(target) : null;
      const recovered = pendingIntent ? next.find(job => job.intent.requestId === pendingIntent.requestId)
        ?? (found?.intent.requestId === pendingIntent.requestId ? found : await client.get(pendingIntent)) : null;
      if (!visible() || requestGeneration !== generation.current) return;
      setJobs(next); setChecked(true); setError('');
      if (found) accept(found);
      if (pendingIntent) {
        if (recovered) { if (!target || target.requestId === pendingIntent.requestId) accept(recovered); setPending(null); setConfirmedAbsent(false); }
        else { setConfirmedAbsent(true); setError('Cloud acceptance is not confirmed for this saved request. No replacement request was submitted.'); }
      } else if (target && !found) setError('The selected cloud job is unavailable. Its saved identity has been kept.');
    } catch (reason) {
      if (visible() && requestGeneration === generation.current) setError(reason instanceof Error ? reason.message : 'The cloud fixture service is unreachable.');
    } finally { reading.current = false; }
  };
  // Reads only: closing every browser or opening a different device never drives the worker.
  useEffect(() => {
    alive.current = true; reading.current = false;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 1500);
    return () => { alive.current = false; generation.current++; window.clearInterval(timer); };
  }, [userId, client]);
  const open = (job: CloudFixtureSnapshot) => {
    if (locked.current || job.intent.ownerId !== userId) return;
    generation.current++; setSelected(job); setError(''); setCommandError('');
  };
  const start = async (savedIntent?: FixtureJobIntent) => {
    const original = current.current.conversation;
    const chat = original.chat, review = chat.referenceReview, source = savedIntent?.cloudReference ?? chat.referenceCloudSource;
    if (locked.current || !original.saved || original.saving || original.saveConflict || !source || !original.cloudReferenceClient) return;
    if (savedIntent ? JSON.stringify(savedIntent) !== JSON.stringify(chat.referenceCloudJob)
      : !review?.confirmation || review.stale || review.inputRevision !== (chat.referenceInputRevision ?? 0) || source.inputHash !== review.inputHash) return;
    locked.current = true; setBusy(true); setError(''); setCommandError(''); generation.current++;
    let intent: FixtureJobIntent | null = null;
    const unchanged = () => visible() && current.current.conversation.chat.id === chat.id
      && (savedIntent ? current.current.conversation.chat.referenceCloudJob?.requestId === savedIntent.requestId
        : current.current.conversation.chat.referenceDraft === chat.referenceDraft && current.current.conversation.chat.referenceReview === review
          && JSON.stringify(current.current.conversation.chat.referenceCloudSource) === JSON.stringify(source));
    try {
      const opened = await original.cloudReferenceClient.openSnapshot(source.saveId);
      const verified = await cloudReferenceLink(opened.receipt, userId);
      if (JSON.stringify(verified) !== JSON.stringify(source) || (!savedIntent && (!chat.referenceDraft || !await verifyCloudReferenceDraft(chat.referenceDraft, source)))) throw new Error('The cloud snapshot or current input bytes changed. Prepare and confirm the current inputs again.');
      intent = savedIntent ?? await createFixtureJobIntent(userId, chat.id, review!, scenario, source);
      if (intent.ownerChatId !== chat.id || intent.ownerId !== userId || !intent.cloudReference || !unchanged()) return;
      // Persist the immutable request before dispatch so reloads recover the same unknown acknowledgement.
      if (!savedIntent) await original.updateSaved({ referenceCloudJob: intent }, chat);
      if (!unchanged()) return;
      setPending(intent); setConfirmedAbsent(false);
      const next = await client.start(intent);
      if (unchanged()) { accept(next); setPending(null); setConfirmedAbsent(false); setChecked(true); }
    } catch (reason) {
      if (!unchanged()) return;
      if (intent) {
        try {
          const recovered = await client.get(intent);
          if (!unchanged()) return;
          if (recovered) { accept(recovered); setPending(null); setConfirmedAbsent(false); setChecked(true); return; }
          setConfirmedAbsent(true);
        } catch { /* Keep the frozen intent and the last confirmed status for explicit reconciliation. */ }
      }
      if (visible()) setCommandError(reason instanceof Error ? reason.message : 'Cloud start acknowledgement is unknown. Refresh cloud jobs to reconcile the saved request.');
    } finally { locked.current = false; if (visible()) setBusy(false); }
  };
  const openInputs = async () => {
    const target = current.current.selected, original = current.current.conversation;
    if (locked.current || !target?.intent.cloudReference || !original.cloudReferenceClient) return;
    locked.current = true; setBusy(true); setError(''); setCommandError(''); generation.current++;
    try {
      const opened = await original.cloudReferenceClient.openSnapshot(target.intent.cloudReference.saveId);
      const verified = await cloudReferenceLink(opened.receipt, userId);
      if (JSON.stringify(verified) !== JSON.stringify(target.intent.cloudReference)) throw new Error('The saved inputs do not match this job’s original snapshot.');
      if (visible() && current.current.conversation.chat.id === original.chat.id && current.current.selected?.intent.requestId === target.intent.requestId) await onOpenInputs(opened.draft, original.chat.id, opened.receipt, target.intent);
    } catch (reason) { if (visible()) setCommandError(reason instanceof Error ? reason.message : 'The saved inputs could not be opened. Your current chat is kept.'); }
    finally { locked.current = false; if (visible()) setBusy(false); }
  };
  const command = async (action: FixtureJobAction) => {
    const target = current.current.selected;
    if (!target || locked.current || target.intent.ownerId !== userId) return;
    locked.current = true; setBusy(true); setError(''); setCommandError(''); generation.current++;
    try {
      const next = await client.control(target.intent, action, action === 'retry' ? target.queue.revision : null, crypto.randomUUID());
      if (visible() && current.current.selected?.intent.requestId === target.intent.requestId) accept(next);
    } catch (reason) { if (visible()) setCommandError(reason instanceof Error ? reason.message : 'The cloud command was not acknowledged. Refresh before trying again.'); }
    finally { locked.current = false; if (visible()) setBusy(false); }
  };
  const review = conversation.chat.referenceReview;
  const eligible = conversation.saved && !conversation.saving && !conversation.saveConflict && !!review?.confirmation && !review.stale
    && review.inputRevision === (conversation.chat.referenceInputRevision ?? 0) && !!conversation.cloudReferenceClient
    && conversation.chat.referenceCloudSource?.inputHash === review.inputHash;
  const currentJob = jobs.find(job => job.intent.ownerChatId === conversation.chat.id && active(job));
  const samePlan = jobs.find(job => job.intent.ownerChatId === conversation.chat.id && fixtureIntentMatchesReview(job.intent, review, conversation.chat.referenceInputRevision ?? 0)
    && JSON.stringify(job.intent.cloudReference) === JSON.stringify(conversation.chat.referenceCloudSource));
  const queue = selected?.queue, plan = selected?.intent.plan;
  const status = !queue ? 'Select a cloud fixture job' : queue.invalidated ? 'Cloud fixture stopped for editing' : ({ prepared: 'Cloud fixture accepted', running: 'Cloud fixture running', paused: 'Cloud fixture paused', failed: 'Cloud fixture stopped at a failed step', cancelled: 'Cloud fixture cancelled', complete: 'Cloud fixture complete' })[queue.status];
  return <section data-testid="cloud-fixture-panel" aria-busy={busy} className="flex h-full min-h-0 flex-col">
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 p-3 sm:px-5">
      <Button variant="ghost" className={`${ghost} flex items-center gap-3 !px-3`} onClick={onBack}><ArrowLeft className="h-5 w-5 shrink-0" />Back to chat</Button>
      <Button variant="ghost" className={`${ghost} !px-3 md:hidden`} aria-label="Open conversations" onClick={conversation.openNavigation}><PanelLeft className="h-5 w-5 shrink-0" /></Button>
    </header>
    <div className="companion-sidebar-scroll min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <GlassPanel className="space-y-4 p-4 sm:p-5">
          <h1 className="flex items-center gap-3 !text-lg !font-semibold !normal-case !tracking-normal"><Cloud className="h-5 w-5 shrink-0 text-[#FFCC00]" />Cloud fixture jobs</h1>
          <p className="text-sm leading-relaxed text-zinc-300">{client.simulation ? 'Cloud fixture simulation. This preview uses a test service; it does not prove an activated cloud worker.' : 'Accepted fixture jobs run in the cloud while your PC is off. Sign in to the same account on another device to reopen the same job here.'}</p>
          <p className="text-sm leading-relaxed text-zinc-400">New jobs freeze the approved sample plan and exact private cloud input snapshot. These fixtures simulate steps and create no clips, voice, music, finished video or Assets entry. Review edits stay on this device until Start is accepted.</p>
          <p className="text-sm font-semibold text-[#FFCC00]">Actual spend: PHP 0.00. No spending is authorized.</p>
          {busy && <p role="status" className="text-sm leading-relaxed text-zinc-300">Checking your cloud request…</p>}
          {(commandError || error) && <p role="alert" className="flex items-start gap-2 break-words text-sm leading-relaxed text-amber-500"><AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /><span className="min-w-0">{commandError || error} {selected ? 'The last confirmed cloud status is shown.' : 'No cloud progress is confirmed.'}</span></p>}
          <Button variant="ghost" className={`${ghost} w-full`} disabled={busy} onClick={() => void refresh(true)}>Refresh cloud jobs</Button>
        </GlassPanel>
        <GlassPanel className="space-y-4 p-4 sm:p-5">
          <h2 className="!text-base !font-semibold !normal-case !tracking-normal">Start from this chat’s approved sample plan</h2>
          <p className="text-sm leading-relaxed text-zinc-300">{eligible ? review!.direction : 'Return to chat, save the brief and confirm its current sample plan first.'}</p>
          {currentJob && <p className="flex items-start gap-2 text-sm text-amber-500"><AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /><span>A cloud job for this original chat is still active. Reopen it to retry or cancel before starting a changed plan.</span></p>}
          {samePlan && !currentJob && <p className="text-sm text-zinc-300">This approved plan already has a cloud job. Reopen it below. Confirm a changed plan to create another version.</p>}
          <label className="block text-sm text-zinc-400">Cloud fixture scenario<select aria-label="Cloud fixture scenario" value={scenario} disabled={busy || !!pending} onChange={event => setScenario(event.target.value as QueueScenario)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]"><option value="normal">Normal completion</option><option value="second-clip-fails-once" disabled={(review?.scenes.length ?? 0) < 2}>Second clip fails once</option></select></label>
          <GoldButton className={`${control} w-full`} disabled={!checked || !eligible || busy || !!pending || !!currentJob || !!samePlan} onClick={() => void start()}>Start cloud fixture job</GoldButton>
          {pending && <p className="text-sm leading-relaxed text-zinc-300">Start acknowledgement is pending for the saved request. Refresh cloud jobs to recover it. Another job will not be submitted automatically.</p>}
          {pending && confirmedAbsent && <Button variant="ghost" className={`${ghost} w-full`} disabled={busy || !conversation.saved || conversation.saving || conversation.saveConflict} onClick={() => void start(pending)}>Retry saved cloud request</Button>}
        </GlassPanel>
        <GlassPanel className="space-y-3 p-4 sm:p-5" aria-label="Saved cloud fixture jobs">
          <h2 className="!text-base !font-semibold !normal-case !tracking-normal">Your cloud fixture jobs</h2>
          <p className="text-xs leading-relaxed text-zinc-400">Up to 100 stored fixture jobs for this account. Each keeps its original approved plan independently of browser chats.</p>
          {!checked && <p role="status" className="text-sm text-zinc-300">Checking cloud jobs…</p>}
          {checked && !jobs.length && <p className="text-sm text-zinc-300">No cloud fixture jobs found.</p>}
          {jobs.map(job => <Button key={job.intent.requestId} variant="ghost" aria-label={`Open cloud fixture job: ${job.intent.requestId}`} aria-pressed={selected?.intent.requestId === job.intent.requestId} disabled={busy} className={`${ghost} w-full !text-left ${selected?.intent.requestId === job.intent.requestId ? '!text-[#FFCC00] border-[#FFCC00]/50' : ''}`} onClick={() => open(job)}><span className="block break-words">{job.intent.plan.direction}</span><span className="mt-1 block break-all text-xs font-normal text-zinc-400">Original chat {job.intent.ownerChatId} · {job.queue.status} · Revision {job.queue.revision}</span></Button>)}
        </GlassPanel>
        {selected && queue && plan && <GlassPanel className="space-y-4 p-4 sm:p-5" aria-label="Cloud fixture job details">
          <h2 data-testid="cloud-fixture-status" role="status" className="!text-base !font-semibold !normal-case !tracking-normal">{status}</h2>
          <details><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCC00]">Fixture details</summary><div className="space-y-2 text-xs leading-relaxed text-zinc-400">
            <p>Original chat: <span className="break-all">{selected.intent.ownerChatId}</span></p>
            <p>Request: <span className="break-all">{selected.intent.requestId}</span></p>
            <p>Job: <span className="break-all">{queue.id}</span></p>
            <p>Worker revision {queue.revision}</p>
            {selected.intent.cloudReference && <p>Input snapshot: <span className="break-all">{selected.intent.cloudReference.saveId}</span></p>}
          </div></details>
          <details><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCC00]">Approved cloud plan · revision {plan.revision}</summary><div className="space-y-3 break-words text-sm leading-relaxed text-zinc-300"><p>{plan.direction}</p><p>Saved voice: {plan.voice?.name || 'Not selected'}{plan.speechMode === 'silent' ? ' · unused in this no-voiceover plan' : ''}</p><ol className="space-y-3">{plan.scenes.map((scene, index) => <li key={scene.id}><p>Scene {index + 1}: {scene.start}–{scene.end} seconds</p><p>{scene.script}</p><p>{scene.visual}</p></li>)}</ol><p>Original illustrative estimate: {money(plan.confirmation!.lowCents)}–{money(plan.confirmation!.highCents)}. Demo cap: {money(plan.confirmation!.capCents)}.</p></div></details>
          {selected.intent.cloudReference ? <>
            <Button variant="ghost" className={`${ghost} w-full`} disabled={busy || !conversation.cloudReferenceClient} onClick={() => void openInputs()}>Open saved inputs/review in chat</Button>
            <p className="text-xs leading-relaxed text-zinc-400">Creates a new editable chat with verified reference, photos, selected voice and original review content. Its approval is cleared. The original job stays unchanged.</p>
          </> : <p className="text-sm leading-relaxed text-zinc-400">Saved inputs are unavailable for this older job. Its original approved plan and controls remain available.</p>}
          <ol className="space-y-3">{queue.steps.map((step, index) => {
            const Icon = step.status === 'succeeded' ? Check : step.status === 'failed' ? AlertTriangle : step.status === 'running' ? LoaderCircle : Circle;
            const label = step.kind === 'clip' ? `Scene ${step.id.slice(5)} clip` : ({ voice: 'Locked voice and alignment', music: 'Instrumental music', sfx: 'Existing sound-bank cues', assembly: 'Assembly', quality: 'Quality check' } as Record<string, string>)[step.kind];
            const stepStatus = step.status === 'running' && (queue.invalidated || queue.status === 'cancelled') ? 'Stopped' : ({ queued: 'Waiting', running: 'Worker simulating', succeeded: 'Fixture passed', failed: 'Fixture failed' })[step.status];
            return <li key={step.id} data-testid={`cloud-step-${step.id}`} className="flex items-start gap-2 text-sm"><Icon aria-hidden className={`mt-0.5 h-4 w-4 shrink-0 ${step.status === 'succeeded' ? 'text-[#FFCC00]' : step.status === 'failed' ? 'text-amber-500' : 'text-zinc-400'}`} /><div className="min-w-0"><p className="text-zinc-200">{index + 1}. {label}</p><p className="mt-1 text-zinc-400">{stepStatus} · Attempt {step.attempts}</p></div></li>;
          })}</ol>
          {queue.status === 'failed' && !queue.invalidated && <GoldButton className={`${control} w-full`} disabled={busy} onClick={() => void command('retry')}>Retry failed cloud step</GoldButton>}
          {active(selected) && <Button variant="ghost" className={`${ghost} w-full`} disabled={busy} onClick={() => void command('cancel')}>Cancel cloud fixture job</Button>}
          {queue.status === 'complete' && <p className="text-sm leading-relaxed text-zinc-300">All simulated steps passed. There is no rendered video to play or download.</p>}
        </GlassPanel>}
      </div>
    </div>
  </section>;
}

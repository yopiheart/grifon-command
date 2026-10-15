import { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import { GlassPanel } from '../ui/GlassPanel';
import type { FixtureJobIntent } from '../../services/companionFixtureJobs';
import type { FixtureExecutionReceipt } from '../../services/companionExecutionSafety.js';
import type { FixtureExecutionSafetyClient } from '../../services/companionExecutionSafetyClient.js';

const ghost = 'min-h-11 !rounded-xl !text-sm !font-semibold !bg-zinc-950 border border-white/10 !text-zinc-400 hover:!text-white hover:!border-[#FFCC00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCC00]';
type Action = 'quote' | 'refresh' | 'normal' | 'unknown' | 'cancel' | 'success' | 'reject';

export function CompanionExecutionSafety({ userId, intent, client }: { userId: string; intent: FixtureJobIntent; client: FixtureExecutionSafetyClient }) {
  const [receipt, setReceipt] = useState<FixtureExecutionReceipt | null>(null);
  const [checked, setChecked] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const alive = useRef(true), locked = useRef(false), generation = useRef(0);
  const scope = `${userId}:${intent.requestId}:${intent.plan.inputHash}`;
  const current = useRef(scope); current.current = scope;
  const visible = () => alive.current && current.current === scope && intent.ownerId === userId;
  const refresh = async () => {
    if (locked.current || intent.ownerId !== userId || !intent.cloudReference) return;
    locked.current = true; setBusy(true); setError('');
    const turn = ++generation.current;
    try {
      const next = await client.find(intent.requestId, intent.plan.inputHash);
      if (visible() && generation.current === turn) { setReceipt(next); setChecked(true); }
    } catch (reason) { if (visible() && generation.current === turn) { setChecked(false); setError(reason instanceof Error ? reason.message : 'The saved test budget check is unavailable.'); } }
    finally { locked.current = false; if (visible() && generation.current === turn) setBusy(false); }
  };
  useEffect(() => {
    alive.current = true; setReceipt(null); setChecked(false); locked.current = false;
    void refresh();
    return () => { alive.current = false; generation.current++; };
  }, [userId, intent.requestId, intent.plan.inputHash, client]);
  const act = async (action: Action) => {
    if (locked.current || !visible() || !checked || error || (!receipt && action !== 'quote')) return;
    locked.current = true; setBusy(true); setError(''); const turn = ++generation.current;
    const valid = () => visible() && generation.current === turn;
    let next = receipt;
    const accept = (value: FixtureExecutionReceipt | null) => { if (!valid()) return false; next = value; setReceipt(value); return true; };
    try {
      if (action === 'quote') { accept(await client.quote(intent.requestId, intent.plan.inputHash)); return; }
      if (!next) return;
      if (action === 'refresh') { accept(await client.get(next)); return; }
      if (action === 'cancel') { accept(await client.command(next, { action: 'cancel' })); return; }
      let attempt = next.attempts.find(item => item.stage === 'clip');
      const submissionKey = attempt?.submissionKey ?? `${next.runId.replace(/-/g, '')}-clip-1`;
      const send = async (command: Parameters<FixtureExecutionSafetyClient['command']>[1]) => valid() && next ? accept(await client.command(next, command)) : false;
      if (!attempt) {
        if (!['normal', 'unknown'].includes(action) || next.cancelled) return;
        if (!accept(await client.reserve(next, 'clip', submissionKey))) return;
        attempt = next!.attempts.find(item => item.submissionKey === submissionKey);
      }
      if (!attempt || ['succeeded', 'rejected', 'cancelled'].includes(attempt.state)) return;
      if (attempt.state === 'reserved' && !await send({ action: 'begin', submissionKey })) return;
      if (action === 'unknown') { await send({ action: 'unknown', submissionKey }); return; }
      if (action === 'normal') {
        if (attempt.state === 'reconciliation_required') return;
        if (attempt.state !== 'submitted' && !await send({ action: 'accept', submissionKey, fakeHandle: `fixture:${submissionKey}` })) return;
      } else if (action === 'reject') { await send({ action: 'reject', submissionKey, evidenceKey: `fake-reject:${submissionKey}` }); return; }
      else {
        if (attempt.state !== 'reconciliation_required' && !await send({ action: 'unknown', submissionKey })) return;
        if (!await send({ action: 'recover', submissionKey, fakeHandle: `fixture:${submissionKey}` })) return;
      }
      await send({ action: 'succeed', submissionKey, fakeHandle: `fixture:${submissionKey}`, evidenceKey: `fake-success:${submissionKey}` });
    } catch (reason) { if (valid()) { setChecked(false); setError(reason instanceof Error ? reason.message : 'The test action was not confirmed. Refresh its saved state.'); } }
    finally { locked.current = false; if (valid()) setBusy(false); }
  };
  const attempt = receipt?.attempts.find(item => item.stage === 'clip');
  const unresolved = !!attempt && !['succeeded', 'rejected', 'cancelled'].includes(attempt.state);
  const canSimulate = !!receipt && !receipt.cancelled && (!attempt || ['reserved', 'submitting', 'submitted'].includes(attempt.state));
  return <GlassPanel className="p-4 sm:p-5" aria-label="Budget and recovery check">
    <details><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCC00]">Budget and recovery check</summary><div className="space-y-4 pt-2">
      <p className="text-sm leading-relaxed text-zinc-300">Separate TEST_UNIT simulation for this linked job. It does not run or gate the video fixture worker.</p>
      <p className="text-sm font-semibold text-[#FFCC00]">Actual spend PHP 0.00. Test units are not money or credits.</p>
      {busy && <p role="status" className="text-sm text-zinc-400">Checking the saved test allowance…</p>}
      {error && <p role="alert" className="flex items-start gap-2 text-sm leading-relaxed text-amber-500"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span className="min-w-0 break-words">{error}</span></p>}
      {checked && !receipt && <p className="text-sm text-zinc-400">No test budget check exists for this job. Opening this panel did not create one.</p>}
      {receipt && <><dl data-testid="execution-test-budget" className="grid grid-cols-3 gap-3 text-sm"><div><dt className="text-zinc-400">Held</dt><dd className="mt-1 text-white">{receipt.budget.heldUnits}</dd></div><div><dt className="text-zinc-400">Settled</dt><dd className="mt-1 text-white">{receipt.budget.settledUnits}</dd></div><div><dt className="text-zinc-400">Cap</dt><dd className="mt-1 text-white">{receipt.budget.capUnits}</dd></div></dl><p className="text-xs leading-relaxed text-zinc-400">TEST_UNIT · shared account allowance, including other checks. These are the last confirmed server values.</p><p role="status" data-testid="execution-test-state" className="text-sm text-zinc-300">{receipt.cancelled ? 'Test check cancelled. ' : ''}{attempt ? ({ reserved: 'Test clip reserved.', submitting: 'Test submission recorded.', submitted: 'Fake submission accepted.', reconciliation_required: 'Unknown test outcome. Allowance stays held until reconciliation.', succeeded: 'Fake success settled once.', rejected: 'Fake rejection released its hold.', cancelled: 'Unsubmitted test clip cancelled.' })[attempt.state] : 'No test clip reserved.'}</p></>}
      <div className="grid gap-3 sm:grid-cols-2">
        {!receipt && checked && !error && <Button variant="ghost" className={ghost} disabled={busy} onClick={() => void act('quote')}>Create test budget check</Button>}
        <Button variant="ghost" className={ghost} disabled={busy} onClick={() => void refresh()}>Refresh test budget</Button>
        {canSimulate && <><Button variant="ghost" className={ghost} disabled={busy || !checked || !!error} onClick={() => void act('normal')}>Simulate normal completion</Button><Button variant="ghost" className={ghost} disabled={busy || !checked || !!error} onClick={() => void act('unknown')}>Simulate unknown submission</Button></>}
        {receipt && !receipt.cancelled && <Button variant="ghost" className={ghost} disabled={busy || !checked || !!error} onClick={() => void act('cancel')}>Cancel test budget check</Button>}
        {unresolved && attempt?.state !== 'reserved' && <><Button variant="ghost" className={ghost} disabled={busy || !checked || !!error} onClick={() => void act('success')}>Reconcile fake success</Button><Button variant="ghost" className={ghost} disabled={busy || !checked || !!error} onClick={() => void act('reject')}>Reconcile fake rejection</Button></>}
      </div>
      <p className="text-xs leading-relaxed text-zinc-400">One fixed synthetic clip attempt for this demo. Unknown or already submitted work keeps its hold after cancellation. Reconciliation uses fake evidence only; no provider is contacted.</p>
      {receipt && <details><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Test receipt details</summary><dl className="space-y-2 text-xs text-zinc-400"><div><dt>Run</dt><dd className="break-all font-mono">{receipt.runId}</dd></div><div><dt>Linked request</dt><dd className="break-all font-mono">{receipt.runKey}</dd></div><div><dt>Input fingerprint</dt><dd className="break-all font-mono">{receipt.inputHash}</dd></div></dl></details>}
    </div></details>
  </GlassPanel>;
}

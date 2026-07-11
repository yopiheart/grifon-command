import React, { useState } from 'react';
import { Download, RefreshCw, Wand2, Plus, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import { ShimmerButton, SceneReveal } from './motion';
import type { ProductionRun } from '../../services/producerOrchestrator';
import type { LockablePresetId } from '../../types';

/** First Cut edit-preset switcher (Decision 8). AUTO = server rotation (free, all tiers);
 * IMPACT/CLEAN lock a look (Pro+). null = AUTO. */
const PRESETS: { id: LockablePresetId | null; label: string; pro: boolean }[] = [
  { id: 'none', label: 'RAW', pro: false },
  { id: null, label: 'AUTO', pro: false },
  { id: 'impact', label: 'IMPACT', pro: true },
  { id: 'clean', label: 'CLEAN', pro: true },
];

/** Free "takes" (manual re-rolls of a scene that already worked) per ad before
 * credits kick in. Fixing a FLAGGED scene is always free and never counts. */
const FREE_TAKES = 2;

export const FirstCutScreen: React.FC<{
  run: ProductionRun;
  reshooting: number | null;
  onReshoot: (sceneIdx: number) => void;
  onMakeAnother: () => void;
  /** Re-render the final cut with a chosen preset (null = AUTO). Absent → hide switcher. */
  onChoosePreset?: (id: LockablePresetId | null) => void;
  /** Pro+ unlock for IMPACT/CLEAN + raw export. Locked users get the upsell. */
  proUnlocked?: boolean;
  onUpgrade?: () => void;
  /** True while a preset re-render is assembling. */
  presetBusy?: boolean;
}> = ({ run, reshooting, onReshoot, onMakeAnother, onChoosePreset, proUnlocked = false, onUpgrade, presetBusy = false }) => {
  const activePreset = run.presetId ?? null;
  const flagged = run.scenes.filter((s) => s.status === 'flagged').length;
  // Per-run take allowance, lifted into the run (persisted) so free takes survive remount AND
  // reload — ProducerFlow.handleReshoot bumps run.takesUsed for a re-roll of a scene that worked.
  const takesUsed = run.takesUsed ?? 0;
  const [armedIdx, setArmedIdx] = useState<number | null>(null);
  const freeTakesLeft = Math.max(0, FREE_TAKES - takesUsed);

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 px-4 py-10 text-white">
      <div className="relative mx-auto w-full max-w-3xl">
        <p className="mb-1 text-[10px] font-mono uppercase tracking-widest text-zinc-500">// REVIEW · RESHOOT · SHIP</p>
        <h1 className="mb-6 text-3xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500">
          Your First Cut
        </h1>

        {/* Hero player */}
        <GlassPanel className="relative overflow-hidden p-3 shadow-[0_0_30px_rgba(255,204,0,0.18)]">
          <div className="osa-land pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-[#FFCC00]/25 to-transparent" />
          {run.finalVideoUrl ? (
            <video src={run.finalVideoUrl} controls autoPlay loop className="aspect-[9/16] max-h-[60vh] w-full rounded-xl bg-zinc-950 object-contain" />
          ) : (
            <div className="flex aspect-[9/16] max-h-[60vh] w-full items-center justify-center rounded-xl bg-zinc-950 text-xs font-mono text-zinc-500">
              assembling final cut…
            </div>
          )}
        </GlassPanel>

        {/* Status line */}
        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {flagged === 0 ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-[#FFCC00]" />
              <span className="text-zinc-300">All scenes landed. Love it? Ship it.</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-zinc-300">{flagged} scene{flagged > 1 ? 's' : ''} ready for your call — fix below (free).</span>
            </>
          )}
          <span className="text-zinc-500">·</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            {freeTakesLeft > 0 ? `${freeTakesLeft} free take${freeTakesLeft > 1 ? 's' : ''} left` : 'extra takes use 1 credit'}
          </span>
        </div>

        {run.error?.startsWith('preset:') && (
          <div role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Couldn&apos;t apply that edit style. Your previous cut is still selected. Try again.</span>
          </div>
        )}

        {/* Scene film-strip */}
        <div className="mt-4 flex snap-x gap-3 overflow-x-auto pb-2">
          {run.scenes.map((sc) => {
            const busy = reshooting === sc.sceneIdx;
            const isFlagged = sc.status === 'flagged';
            const isPaid = !isFlagged && takesUsed >= FREE_TAKES; // free allowance spent → a take costs a credit
            const armed = armedIdx === sc.sceneIdx;
            // Short labels — they live in a 112px-wide film-strip card. The fuller
            // "free takes left / extra takes use 1 credit" context is in the status line.
            const label = busy
              ? 'Working…'
              : isFlagged
                ? 'Fix scene'
                : isPaid
                  ? armed ? 'Confirm?' : 'Take · 1 credit'
                  : 'New take';

            const handleClick = () => {
              if (busy || reshooting !== null) return;
              if (isPaid && !armed) {
                setArmedIdx(sc.sceneIdx); // first tap arms the paid confirm (avoids accidental credit spend)
                return;
              }
              setArmedIdx(null);
              // A "take" on a scene that already worked consumes the allowance; fixing a flagged
              // scene is always free and never counts. The counter now lives on the run and is
              // bumped + persisted in ProducerFlow.handleReshoot (survives remount + reload).
              // TODO(billing): when One-Shot is metered, deduct 1 credit here when isPaid.
              onReshoot(sc.sceneIdx);
            };

            const Icon = isFlagged ? RefreshCw : Wand2;
            return (
              <div
                key={sc.sceneIdx}
                className={`relative w-28 shrink-0 snap-start overflow-hidden rounded-xl border ${
                  isFlagged ? 'border-amber-500/70 animate-pulse' : 'border-white/10'
                }`}
              >
                <div className="aspect-[9/16]">
                  <SceneReveal imageUrl={sc.imageUrl} loading={busy} alt={`Scene ${sc.sceneIdx + 1}`} />
                </div>
                <div className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-mono text-zinc-300">
                  {sc.sceneIdx + 1}
                </div>
                <button
                  onClick={handleClick}
                  disabled={busy || reshooting !== null}
                  className={`flex min-h-[40px] w-full items-center justify-center gap-1 whitespace-nowrap px-1 py-2 text-[10px] font-mono uppercase tracking-wide transition-colors disabled:opacity-50 ${
                    isFlagged
                      ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                      : armed
                        ? 'bg-[#FFCC00]/20 text-[#FFCC00]'
                        : 'bg-zinc-900 text-zinc-400 hover:text-[#FFCC00]'
                  }`}
                >
                  <Icon className={`h-3 w-3 shrink-0 ${busy ? 'animate-spin' : ''}`} /> {label}
                </button>
              </div>
            );
          })}
        </div>

        {/* Edit-style switcher (Decision 8) — AUTO free/all-tiers; IMPACT/CLEAN Pro+. */}
        {onChoosePreset && (
          <div className="mt-6">
            <div className="flex items-center gap-2">
              {PRESETS.map((p) => {
                const active = activePreset === p.id;
                const locked = p.pro && !proUnlocked;
                return (
                  <button
                    key={p.label}
                    onClick={() => {
                      if (presetBusy || active) return;
                      if (locked) { onUpgrade?.(); return; }
                      onChoosePreset(p.id);
                    }}
                    disabled={presetBusy}
                    className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-[11px] font-mono uppercase tracking-widest transition-colors disabled:opacity-50 ${
                      active ? 'border-[#FFCC00] bg-[#FFCC00]/15 text-[#FFCC00]' : 'border-white/10 bg-zinc-950 text-zinc-400 hover:border-[#FFCC00]/50 hover:text-white'
                    }`}
                  >
                    {active && <CheckCircle2 className="h-3 w-3" />}
                    {locked && <Lock className="h-3 w-3" />}
                    {p.label}
                  </button>
                );
              })}
              {presetBusy && <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#FFCC00]" />}
            </div>
            {/* Quiet Pro nudge — the "you're not locked in" raw-export lever (Decision 4). */}
            {!proUnlocked && (
              <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">
                May sariling editor? <span className="text-zinc-400">Kunin mo yung clean scene clips + voiceover + captions — i-edit mo sa paraan mo.</span>{' '}
                <button onClick={onUpgrade} className="font-mono uppercase tracking-widest text-[#FFCC00] hover:underline">[PRO]</button>
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <a href={run.finalDownloadUrl ?? run.finalVideoUrl ?? '#'} download className={run.finalVideoUrl ? '' : 'pointer-events-none'}>
              <ShimmerButton disabled={!run.finalVideoUrl}>
                <span className="inline-flex items-center justify-center gap-2">
                  <Download className="h-4 w-4" /> Download Ad
                </span>
              </ShimmerButton>
            </a>
          </div>
          <button
            onClick={onMakeAnother}
            className="flex items-center justify-center gap-2 rounded-full border border-white/10 bg-zinc-950 px-6 py-4 text-sm font-mono uppercase tracking-widest text-zinc-300 hover:border-[#FFCC00] hover:text-white sm:w-48"
          >
            <Plus className="h-4 w-4" /> Make Another
          </button>
        </div>
      </div>
    </div>
  );
};

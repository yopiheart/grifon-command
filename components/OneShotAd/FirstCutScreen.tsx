import React, { useState } from 'react';
import { Download, RefreshCw, Wand2, Plus, CheckCircle2, AlertTriangle } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import { ShimmerButton, SceneReveal } from './motion';
import type { AutopilotRun } from '../../services/autopilotOrchestrator';

/** Free "takes" (manual re-rolls of a scene that already worked) per ad before
 * credits kick in. Fixing a FLAGGED scene is always free and never counts. */
const FREE_TAKES = 2;

export const FirstCutScreen: React.FC<{
  run: AutopilotRun;
  reshooting: number | null;
  onReshoot: (sceneIdx: number) => void;
  onMakeAnother: () => void;
}> = ({ run, reshooting, onReshoot, onMakeAnother }) => {
  const flagged = run.scenes.filter((s) => s.status === 'flagged').length;
  // Per-run take allowance. Component-local for the seam; the real meter lives in
  // the billing slice (One-Shot is admin-gated/unmetered today).
  const [takesUsed, setTakesUsed] = useState(0);
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
              // A "take" on a scene that already worked consumes the allowance;
              // fixing a flagged scene is always free and never counts.
              // TODO(billing): when One-Shot is metered, deduct 1 credit here when isPaid.
              if (!isFlagged) setTakesUsed((t) => t + 1);
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

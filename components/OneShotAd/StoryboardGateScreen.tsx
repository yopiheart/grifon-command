import React from 'react';
import { RefreshCw, Clapperboard, CheckCircle2, AlertTriangle, Film } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import { ShimmerButton, SceneReveal } from './motion';
import type { ProductionRun } from '../../services/producerOrchestrator';

/**
 * Storyboard-image approval gate (grill 2026-07-01, locked Decision 1). The PRE-RENDER
 * cost gate: the user verifies / regenerates the storyboard scene IMAGES and approves
 * BEFORE the expensive video render fires. Applies to BOTH One-Shot and Concierge.
 *
 * This screen only PARKS the run — the orchestrator crossed into `review` with
 * gate === 'storyboard'. Approving calls onApprove → approveStoryboard() continues into
 * the video fan-out. A flagged/regenerating image never reaches the render.
 */
export const StoryboardGateScreen: React.FC<{
  run: ProductionRun;
  /** Scene index currently regenerating, or null. */
  regenerating: number | null;
  onRegenScene: (sceneIdx: number) => void;
  onApprove: () => void;
}> = ({ run, regenerating, onRegenScene, onApprove }) => {
  const flagged = run.scenes.filter((s) => s.status === 'flagged').length;
  const anyBusy = regenerating !== null;
  // Can't film until every scene has an image and none is still flagged.
  const allReady = run.scenes.length > 0 && run.scenes.every((s) => s.imageUrl && s.status !== 'flagged');

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 px-4 py-10 text-white">
      <div className="relative mx-auto w-full max-w-4xl">
        <p className="mb-1 text-[10px] font-mono uppercase tracking-widest text-zinc-500">// APPROVE YOUR SCENES · BEFORE WE FILM</p>
        <h1 className="mb-2 text-3xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500">
          Your Storyboard
        </h1>
        <p className="mb-6 max-w-xl text-sm text-zinc-400">
          These are your scenes before we film them. Regenerate any you don't love — then approve.
          <span className="text-zinc-300"> Filming (the expensive part) only starts after you say go.</span>
        </p>

        {/* Status line */}
        <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {flagged === 0 ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-[#FFCC00]" />
              <span className="text-zinc-300">{allReady ? 'All scenes ready. Approve to start filming.' : 'Building your scenes…'}</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-zinc-300">{flagged} scene{flagged > 1 ? 's' : ''} need a regenerate before we film.</span>
            </>
          )}
        </div>

        {/* Scene grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {run.scenes.map((sc) => {
            const busy = regenerating === sc.sceneIdx;
            const isFlagged = sc.status === 'flagged';
            const scriptLine = run.storyboard?.[sc.sceneIdx]?.scriptLine ?? '';
            const endFrameUrl = run.storyboard?.[sc.sceneIdx]?.endFrameImageUrl;
            return (
              <GlassPanel
                key={sc.sceneIdx}
                className={`relative overflow-hidden p-0 ${isFlagged ? 'ring-1 ring-amber-500/60' : ''}`}
              >
                <div className="aspect-[9/16]">
                  <SceneReveal imageUrl={sc.imageUrl} loading={busy} alt={`Scene ${sc.sceneIdx + 1}`} />
                </div>
                {/* Hook-morph END keyframe: the tile's main image is the START frame; the video
                    morphs into this one. Inset so the user approves BOTH compositions. */}
                {endFrameUrl && !busy && (
                  <div className="absolute bottom-11 right-1.5 w-[36%] overflow-hidden rounded border border-white/25 shadow-lg">
                    <img src={endFrameUrl} alt={`Scene ${sc.sceneIdx + 1} end frame`} className="block aspect-[9/16] w-full object-cover" />
                    <div className="absolute left-0 top-0 rounded-br bg-black/70 px-1 py-0.5 text-[8px] font-mono uppercase text-zinc-300">End</div>
                  </div>
                )}
                <div className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-mono text-zinc-300">
                  {sc.sceneIdx + 1}
                </div>
                {scriptLine && (
                  <div className="absolute inset-x-0 bottom-9 line-clamp-2 bg-gradient-to-t from-black/85 to-transparent px-2 pb-1 pt-4 text-[10px] leading-tight text-zinc-200">
                    {scriptLine}
                  </div>
                )}
                <button
                  onClick={() => !anyBusy && onRegenScene(sc.sceneIdx)}
                  disabled={anyBusy}
                  className={`flex min-h-[36px] w-full items-center justify-center gap-1 px-1 py-2 text-[10px] font-mono uppercase tracking-wide transition-colors disabled:opacity-50 ${
                    isFlagged ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25' : 'bg-zinc-900 text-zinc-400 hover:text-[#FFCC00]'
                  }`}
                >
                  <RefreshCw className={`h-3 w-3 shrink-0 ${busy ? 'animate-spin' : ''}`} /> {busy ? 'Working…' : isFlagged ? 'Fix' : 'Regenerate'}
                </button>
              </GlassPanel>
            );
          })}
        </div>

        {/* Approve gate */}
        <div className="mt-8">
          <ShimmerButton disabled={!allReady || anyBusy} onClick={onApprove}>
            <span className="inline-flex items-center justify-center gap-2">
              <Clapperboard className="h-4 w-4" /> Looks good — Film it
            </span>
          </ShimmerButton>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
            <Film className="h-3 w-3" /> Approving starts the video render
          </p>
        </div>
      </div>
    </div>
  );
};

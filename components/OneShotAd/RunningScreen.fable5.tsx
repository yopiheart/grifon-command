import React from 'react';
import { Minimize2, RefreshCw } from 'lucide-react';
import { DriftOrbs, SceneReveal, SpineNode } from './motion';
import type { ProductionRun, ProductionStageId } from '../../services/producerOrchestrator';

// Display-only grouping: the orchestrator keeps its 8 stages (resume needs them),
// but the user sees 4 friendly film-crew PHASES — momentum reads better than a long
// to-do list, and it blurs the exact pipeline shape.
const PHASES: { label: string; stages: ProductionStageId[] }[] = [
  { label: 'Researching your market', stages: ['market_research'] },
  // 'storyboard' no longer plans the shots — that's the split-out video_prompts node, which runs
  // parallel to scene_images. The cover-frame (thumbnail) runs parallel to the video stage.
  { label: 'Directing your shoot', stages: ['script', 'storyboard', 'scene_images', 'video_prompts'] },
  { label: 'Filming your scenes', stages: ['video', 'thumbnail', 'voices'] },
  { label: 'Polishing the final cut', stages: ['edl', 'final_render'] },
];

export const RunningScreen: React.FC<{ run: ProductionRun; onMinimize: () => void }> = ({ run, onMinimize }) => {
  const stageOf = (id: ProductionStageId) => run.stages.find((s) => s.id === id);
  const phases = PHASES.map((p) => {
    const sts = p.stages.map((id) => stageOf(id)?.status ?? 'pending');
    const state: 'done' | 'active' | 'pending' = sts.every((s) => s === 'done')
      ? 'done'
      : sts.some((s) => s === 'running' || s === 'done')
        ? 'active'
        : 'pending';
    // While a phase is active, show its currently-running sub-stage's label as a live detail.
    const running = p.stages.map(stageOf).find((s) => s?.status === 'running');
    const failed = p.stages.map(stageOf).find((s) => s?.status === 'failed');
    return { label: p.label, state, detail: running?.label, error: failed?.error };
  });
  const doneCount = phases.filter((p) => p.state === 'done').length;
  const total = phases.length;

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 px-4 py-10 text-white">
      <DriftOrbs />
      <div className="relative mx-auto w-full max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#FFCC00]">// YOUR AI AGENCY IS WORKING</p>
            <h1 className="text-2xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500">
              Building your ad
            </h1>
          </div>
          <button
            onClick={onMinimize}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-zinc-400 hover:border-[#FFCC00] hover:text-white"
          >
            <Minimize2 className="h-3.5 w-3.5 shrink-0" /> Minimize
          </button>
        </div>

        {/* ETA + honest "keep this tab open" framing (the build is client-side — it pauses if the tab closes). */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono uppercase tracking-widest text-zinc-400">
              Rendering in HD · {doneCount}/{total} phases
            </span>
            <span className="font-mono text-on-surface-sublabel">~15–45 min</span>
          </div>
          <p className="mt-1 text-[11px] text-on-surface-sublabel">Keep this tab open — your AI crew is filming live. Minimize is fine, just don’t close it.</p>
        </div>

        <div className="grid gap-8 md:grid-cols-[1fr_1.1fr]">
          {/* Phase spine */}
          <div>
            {phases.map((phase, i) => (
              <SpineNode key={phase.label} state={phase.state} last={i === phases.length - 1}>
                <p className={`text-sm font-semibold ${phase.state === 'pending' ? 'text-on-surface-sublabel' : 'text-white'}`}>
                  {phase.label}
                  {phase.state === 'active' && <span className="ml-1 text-[#FFCC00]">…</span>}
                </p>
                {phase.state === 'active' && phase.detail && <p className="mt-0.5 text-xs text-zinc-400">{phase.detail}</p>}
                {phase.error && <p className="mt-0.5 text-xs text-red-400">{phase.error}</p>}
              </SpineNode>
            ))}
          </div>

          {/* Progressive scene gallery */}
          <div>
            <p className="mb-1 text-[10px] font-mono uppercase tracking-widest text-on-surface-sublabel">// Your scenes, assembling</p>
            <p className="mb-3 text-[11px] text-on-surface-sublabel">Your scenes appear here as they’re shot.</p>
            {run.scenes.length === 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-[9/16] animate-pulse rounded-lg bg-gradient-to-br from-zinc-800/70 to-zinc-900" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {run.scenes.map((sc) => (
                  <div
                    key={sc.sceneIdx}
                    className={`relative aspect-[9/16] overflow-hidden rounded-lg border ${
                      sc.status === 'flagged' ? 'border-amber-500/60' : sc.status === 'done' ? 'border-[#FFCC00]/40' : 'border-white/10'
                    }`}
                  >
                    <SceneReveal imageUrl={sc.imageUrl} loading={sc.status === 'rendering' || sc.status === 'pending'} alt={`Scene ${sc.sceneIdx + 1}`} />
                    {sc.status === 'rendering' && (
                      <div className="absolute bottom-1 right-1 rounded-full bg-black/70 p-1">
                        <RefreshCw className="h-3 w-3 animate-spin text-[#FFCC00]" />
                      </div>
                    )}
                    {sc.status === 'flagged' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-[9px] font-mono uppercase text-amber-400">flagged</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Minimize2 } from 'lucide-react';
import { DriftOrbs, SpineNode } from './motion';
import type { OneShotStage, OneShotStageId } from '../../hooks/useOneShotGeneration';

/**
 * "Building your ad" screen for the One-Shot Ad flow. Reads the live stage list
 * from `useOneShotGeneration` and groups the 6 pipeline stages into 4 friendly
 * film-crew PHASES — momentum reads better than a long checklist, and it blurs
 * the exact pipeline shape. A leading "Researching" phase reflects the market
 * research call that runs before the generation chain.
 */
const PIPELINE_PHASES: { label: string; stages: OneShotStageId[] }[] = [
  { label: 'Directing your shoot', stages: ['script', 'avatar', 'storyboard'] },
  { label: 'Filming your scenes', stages: ['scenes'] },
  { label: 'Polishing the final cut', stages: ['thumbnail', 'videoPrompts'] },
];

type PhaseState = 'done' | 'active' | 'pending';

export const RunningScreen: React.FC<{
  researching: boolean;
  stages: OneShotStage[];
  onMinimize: () => void;
}> = ({ researching, stages, onMinimize }) => {
  const stageOf = (id: OneShotStageId) => stages.find((s) => s.id === id);
  const started = stages.some((s) => s.status !== 'pending');

  // Leading research phase: active while researching, done once the chain starts.
  const researchPhase = {
    label: 'Researching your market',
    state: (researching ? 'active' : started ? 'done' : 'pending') as PhaseState,
    detail: researching ? 'Reading your market…' : undefined,
    error: undefined as string | undefined,
  };

  const pipelinePhases = PIPELINE_PHASES.map((p) => {
    const sts = p.stages.map((id) => stageOf(id)?.status ?? 'pending');
    const state: PhaseState = sts.every((s) => s === 'done' || s === 'skipped')
      ? 'done'
      : sts.some((s) => s === 'running' || s === 'done')
        ? 'active'
        : 'pending';
    const running = p.stages.map(stageOf).find((s) => s?.status === 'running');
    const errored = p.stages.map(stageOf).find((s) => s?.status === 'error');
    return { label: p.label, state, detail: running?.detail || running?.label, error: errored?.detail };
  });

  const phases = [researchPhase, ...pipelinePhases];
  const doneCount = phases.filter((p) => p.state === 'done').length;
  const total = phases.length;
  const sceneDetail = stageOf('scenes')?.detail;

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

        <div className="mb-8 rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono uppercase tracking-widest text-zinc-400">
              Building your plan · {doneCount}/{total} phases
            </span>
            <span className="font-mono text-on-surface-sublabel">~1–3 min</span>
          </div>
          <p className="mt-1 text-[11px] text-on-surface-sublabel">Keep this tab open — your AI crew is on it. We&apos;ll drop you into review when the plan&apos;s ready.</p>
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

          {/* Scene placeholder gallery — fills as the storyboard renders. */}
          <div>
            <p className="mb-1 text-[10px] font-mono uppercase tracking-widest text-on-surface-sublabel">// Your scenes, assembling</p>
            <p className="mb-3 text-[11px] text-on-surface-sublabel">{sceneDetail ? `Scenes rendering — ${sceneDetail}` : 'Your scenes appear here as they are shot.'}</p>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[9/16] animate-pulse rounded-lg bg-gradient-to-br from-zinc-800/70 to-zinc-900" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

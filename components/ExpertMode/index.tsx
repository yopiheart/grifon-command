import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Clapperboard, Loader2, Check, AlertTriangle, RotateCw } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import { IntakeScreen } from './IntakeScreen';
import { ScriptStudio } from './ScriptStudio';
import { SceneDirectionScreen } from './SceneDirection';
import {
  emptyExpertIntake, emptySceneDirection, buildExpertWizardState,
  type ExpertIntake, type SceneDirection,
} from './types';
import type { PlanId } from '../../utils/planGate';
import {
  customBeats,
  type ExpertFormatId, type TargetDurationSec,
} from '../../utils/scriptGuardrails';
import { useExpertGeneration, type ExpertStage } from '../../hooks/useExpertGeneration';
import type { OneShotSinks } from '../../hooks/useOneShotGeneration';
import type { ClientDetails, BusinessInfo } from '../../types';

// ===========================================================================
// Expert Mode — "Director's Cut" (bring-your-own-script door in Director AI).
//
// Additive sibling to One-Shot + the 8-step wizard: the expert brings their own
// script and controls each storyboard scene, on Grifon's guardrails. v1 is
// dev-unlock gated (grifon_dev_unlock / ?admin=on) — see App.tsx.
//
// Internal phase machine. Slice 3: slim intake. Slices 4–5 add Script Studio +
// per-scene direction + generation wiring. PRESENTATIONAL — holds its own draft
// state; writes to App's wizard state only when the flow generates (slice 5).
// ===========================================================================

type Phase = 'intake' | 'studio' | 'direction' | 'review';

export interface ExpertModeProps {
  onBack: () => void;
  /** Effective plan tier for the scene cap (dev-unlock passes 'business'). */
  plan: PlanId;
  /** Setters into App's central wizard state (shared with One-Shot, so Step 8 review sees it). */
  sinks: OneShotSinks;
  setClientDetails: (c: ClientDetails) => void;
  setBusinessInfo: (b: BusinessInfo) => void;
  setAspectRatio: (r: '9:16' | '16:9') => void;
  /** After a successful run → Step 8 review + video hand-off (same as One-Shot). */
  onReview: () => void;
}

const ExpertMode: React.FC<ExpertModeProps> = ({
  onBack, plan, sinks, setClientDetails, setBusinessInfo, setAspectRatio, onReview,
}) => {
  const [phase, setPhase] = useState<Phase>('intake');
  const [intake, setIntake] = useState<ExpertIntake>(emptyExpertIntake);
  const gen = useExpertGeneration();

  // Script Studio state (lifted so it survives back/forward navigation).
  const [target, setTarget] = useState<TargetDurationSec>(20);
  const [lines, setLines] = useState<string[]>([]);

  // Scene Direction state — one entry per script line.
  const [directions, setDirections] = useState<SceneDirection[]>([]);

  // Generic beat labels (Hook → Scene N → CTA), 1:1 with the free-form script lines.
  const beats = useMemo(() => customBeats(lines.length), [lines.length]);

  // Keep directions length in lock-step with the script lines (preserve by index).
  useEffect(() => {
    setDirections((prev) =>
      prev.length === lines.length ? prev : lines.map((_, i) => prev[i] ?? emptySceneDirection()),
    );
  }, [lines.length]);

  const setDirection = (i: number, d: SceneDirection) =>
    setDirections((prev) => prev.map((cur, idx) => (idx === i ? d : cur)));

  // Generate All — map intake → wizard state, run the chain (honoring direction), route to review.
  const handleGenerate = async () => {
    const resolvedFormatId: ExpertFormatId = 'Custom';
    const { clientDetails, businessInfo } = buildExpertWizardState(intake, resolvedFormatId);
    setClientDetails(clientDetails);
    setBusinessInfo(businessInfo);
    setAspectRatio(intake.aspectRatio);
    setPhase('review');
    const ok = await gen.run({ clientDetails, businessInfo, intake, lines, directions, formatId: resolvedFormatId }, sinks);
    if (ok) onReview();
  };

  if (phase === 'intake') {
    return (
      <Frame onBack={onBack}>
        <IntakeScreen
          intake={intake}
          setIntake={setIntake}
          onBack={onBack}
          onNext={() => setPhase('studio')}
        />
      </Frame>
    );
  }

  if (phase === 'studio') {
    return (
      <Frame onBack={() => setPhase('intake')} backLabel="BACK TO INTAKE">
        <ScriptStudio
          plan={plan}
          target={target}
          setTarget={setTarget}
          lines={lines}
          setLines={setLines}
          onBack={() => setPhase('intake')}
          onNext={() => setPhase('direction')}
        />
      </Frame>
    );
  }

  if (phase === 'direction') {
    return (
      <Frame onBack={() => setPhase('studio')} backLabel="BACK TO SCRIPT">
        <SceneDirectionScreen
          lines={lines}
          beats={beats}
          directions={directions}
          setDirection={setDirection}
          onBack={() => setPhase('studio')}
          onGenerate={handleGenerate}
          generating={gen.running}
        />
      </Frame>
    );
  }

  // 'review' — generation in flight, error, or done (onReview routes to Step 8 on success).
  return (
    <Frame
      onBack={() => { gen.reset(); setPhase('direction'); }}
      backLabel="BACK TO DIRECTION"
    >
      <GenerationProgress
        stages={gen.stages}
        running={gen.running}
        error={gen.error}
        onRetry={handleGenerate}
        onBack={() => { gen.reset(); setPhase('direction'); }}
      />
    </Frame>
  );
};

// Generation progress — the staged chain readout (matches One-Shot's running screen register).
const GenerationProgress: React.FC<{
  stages: ExpertStage[];
  running: boolean;
  error: string | null;
  onRetry: () => void;
  onBack: () => void;
}> = ({ stages, running, error, onRetry, onBack }) => (
  <GlassPanel className="mx-auto flex max-w-2xl flex-col gap-5">
    <div>
      <p className="mb-1 text-[10px] font-mono uppercase tracking-widest text-on-surface-sublabel">// DIRECTOR'S CUT · GENERATING</p>
      <h2 className="text-2xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500">
        Building Your Ad
      </h2>
    </div>

    <ul className="flex flex-col gap-2">
      {stages.map((s) => (
        <li key={s.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-950 px-4 py-3">
          <span className="shrink-0">
            {s.status === 'running' ? <Loader2 className="h-4 w-4 animate-spin text-[#FFCC00]" />
              : s.status === 'done' ? <Check className="h-4 w-4 text-[#FFCC00]" />
              : s.status === 'error' ? <AlertTriangle className="h-4 w-4 text-amber-500" />
              : <span className="block h-2 w-2 rounded-full bg-zinc-700" />}
          </span>
          <span className={`text-sm ${s.status === 'pending' || s.status === 'skipped' ? 'text-on-surface-sublabel' : 'text-zinc-200'}`}>
            {s.label}
          </span>
          {s.detail && <span className="ml-auto text-[10px] font-mono uppercase tracking-widest text-on-surface-sublabel">{s.detail}</span>}
        </li>
      ))}
    </ul>

    {error && !running && (
      <div className="flex flex-col gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
        <p className="flex items-center gap-2 text-xs text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-2 rounded-xl bg-[#FFCC00] px-4 py-2 text-xs font-bold uppercase tracking-wide text-black transition-all hover:shadow-[0_0_20px_rgba(255,204,0,0.4)]"
          >
            <RotateCw className="h-3.5 w-3.5 shrink-0" /> Retry
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-white/10 bg-zinc-950 px-4 py-2 text-xs font-bold uppercase tracking-wide text-zinc-400 transition-colors hover:border-[#FFCC00]/50 hover:text-white"
          >
            Back to direction
          </button>
        </div>
      </div>
    )}
  </GlassPanel>
);

// Shared page chrome — header + back affordance, matching the Director AI surface.
const Frame: React.FC<{ onBack: () => void; backLabel?: string; children: React.ReactNode }> = ({
  onBack,
  backLabel = 'BACK TO ONE-SHOT',
  children,
}) => (
  <div className="min-h-screen bg-zinc-950 font-sans flex flex-col items-center p-4 sm:p-6 md:p-8 text-white">
    <div className="w-full max-w-6xl mx-auto">
      <header className="flex flex-col items-start gap-4 mb-8 w-full border-b border-white/10 pb-4">
        <button
          onClick={onBack}
          className="-ml-1 flex min-h-11 items-center gap-2 px-1 py-2 text-xs font-mono text-on-surface-sublabel hover:text-white uppercase tracking-widest transition-colors"
        >
          <ChevronLeft className="w-4 h-4 shrink-0" /> <span className="hidden md:inline">{backLabel}</span>
          <span className="md:hidden">BACK</span>
        </button>
        <div className="flex flex-col items-start gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500 uppercase tracking-tight">
              Director&apos;s Cut
            </h1>
            <span className="rounded-md border border-[#FFCC00]/40 bg-[#FFCC00]/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-[#FFCC00]">
              Dev
            </span>
            <Clapperboard className="h-5 w-5 text-on-surface-sublabel" />
          </div>
          <p className="text-[10px] text-on-surface-sublabel font-mono tracking-widest uppercase">
            // BRING YOUR OWN SCRIPT · CONTROL EVERY SCENE
          </p>
        </div>
      </header>
      {children}
    </div>
  </div>
);

export default ExpertMode;

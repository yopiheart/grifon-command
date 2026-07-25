import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import {
  createAutopilotRun,
  runAutopilot,
  reshootScene,
  type AutopilotInput,
  type AutopilotRun,
} from '../../services/autopilotOrchestrator';
import { realAutopilotDeps } from '../../services/autopilotDeps';
import { loadActiveAutopilotRun, clearAutopilotRun } from '../../services/autopilotRunStore';
import { LaunchScreen } from './LaunchScreen';
import { RunningScreen } from './RunningScreen';
import { FirstCutScreen } from './FirstCutScreen';
import { makePreviewRun } from './previewMock';

/**
 * One-Shot Ad module container. Owns the run lifecycle: starts the orchestrator,
 * streams live updates into React, resumes an in-flight run on reopen (client-
 * side resumable), and routes between Launch / Running / First Cut by run status.
 */
const OneShotAd: React.FC<{ onBack: () => void; userId: string | null }> = ({ onBack, userId }) => {
  const [run, setRun] = useState<AutopilotRun | null>(null);
  const [reshooting, setReshooting] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const resumedRef = useRef(false);

  // Live-update sink: clone the top-level ref so React re-renders on each stage.
  const sink = (r: AutopilotRun) => setRun({ ...r });

  // Resume an in-flight run on mount (survives reload/reboot).
  useEffect(() => {
    if (!userId || resumedRef.current) return;
    resumedRef.current = true;
    loadActiveAutopilotRun(userId).then((existing) => {
      if (!existing) return;
      setRun(existing);
      if (existing.status === 'running') {
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        void runAutopilot(existing, { onUpdate: sink, signal: ctrl.signal, userId }, realAutopilotDeps);
      }
    });
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const start = (input: AutopilotInput) => {
    if (!userId) return;
    const fresh = createAutopilotRun(input, userId);
    setRun(fresh);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    void runAutopilot(fresh, { onUpdate: sink, signal: ctrl.signal, userId }, realAutopilotDeps);
  };

  const onReshoot = (sceneIdx: number) => {
    if (!run || !userId || reshooting !== null) return;
    setReshooting(sceneIdx);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    void reshootScene(run, sceneIdx, { onUpdate: sink, signal: ctrl.signal, userId }, realAutopilotDeps).finally(() => setReshooting(null));
  };

  const onMakeAnother = () => {
    abortRef.current?.abort();
    if (run) void clearAutopilotRun(run.runId);
    setRun(null);
  };

  const BackBar = (
    <button
      onClick={onBack}
      className="absolute left-4 top-4 z-20 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-on-surface-sublabel hover:text-white"
    >
      <ChevronLeft className="h-4 w-4" /> Command Center
    </button>
  );

  // DEV-ONLY design preview (?osaPreview=running|firstcut) — renders a screen
  // with mock data and NO orchestrator (zero API spend). Safe to delete.
  const previewKind = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('osaPreview') : null;
  if (previewKind === 'launch' || previewKind === 'running' || previewKind === 'firstcut') {
    return (
      <div className="relative">
        {BackBar}
        {previewKind === 'launch' && <LaunchScreen onLaunch={() => {}} />}
        {previewKind === 'running' && <RunningScreen run={makePreviewRun('running')} onMinimize={onBack} />}
        {previewKind === 'firstcut' && (
          <FirstCutScreen run={makePreviewRun('firstcut')} reshooting={null} onReshoot={() => {}} onMakeAnother={() => {}} />
        )}
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        {BackBar}
        <p className="text-sm">Sign in to use One-Shot Ad.</p>
      </div>
    );
  }

  let screen: React.ReactNode;
  if (!run || run.status === 'error') {
    screen = (
      <>
        {run?.status === 'error' && (
          <div className="mx-auto mt-4 flex max-w-xl items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-300">
            <AlertTriangle className="h-4 w-4" /> {run.error ?? 'Something failed.'} — adjust and try again.
          </div>
        )}
        <LaunchScreen onLaunch={start} />
      </>
    );
  } else if (run.status === 'running') {
    screen = <RunningScreen run={run} onMinimize={onBack} />;
  } else {
    screen = <FirstCutScreen run={run} reshooting={reshooting} onReshoot={onReshoot} onMakeAnother={onMakeAnother} />;
  }

  return (
    <div className="relative">
      {BackBar}
      {screen}
    </div>
  );
};

export default OneShotAd;

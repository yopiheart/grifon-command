import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, AlertTriangle, RotateCw, Loader2 } from 'lucide-react';
import type { Avatar } from '../../types';
import { generateMarketResearch, generateAvatarImage } from '../../services/geminiService';
import type { AutopilotInput as IntakeInput } from '../../services/oneShotIntake';
import { LaunchScreen } from './LaunchScreen';
import { RunningScreen } from './RunningScreen.fable5';
import { StoryboardGateScreen } from './StoryboardGateScreen';
import { FirstCutScreen } from './FirstCutScreen';
import { FeedbackWidget } from '../ui/FeedbackWidget';
import {
  createAutopilotRun,
  runAutopilot,
  approveStoryboard,
  reshootScene,
  mapReportToWizard,
  type AutopilotRun,
  type AutopilotInput as OrchInput,
} from '../../services/autopilotOrchestrator';
import { realAutopilotDeps } from '../../services/autopilotDeps';
import { newRunId, loadRun, type AutopilotRunRow, type AutopilotSceneRow } from '../../services/autopilotRunService';

/**
 * One-Shot AUTOPILOT container (slice 4, 2026-07-01 grill). Drives the real consumer
 * flow on the rebuilt orchestrator: LaunchScreen → Running → storyboard-image gate →
 * First Cut, with resume-to-true-state and the no-double-spend fan-out. Users never see
 * the 8-step wizard.
 *
 * This is mounted opt-in (see OneShotAd/index.tsx `?osaEngine=autopilot`) so the live
 * useOneShotGeneration→Step 8 path stays intact until the SIGLA smoke signs this off.
 * The orchestrator OWNS its state (it does not write into App.tsx wizard state).
 */
const ACTIVE_RUN_KEY = 'osa_autopilot_active_run';

/** Rebuild an in-memory run from the server checkpoint (resume-to-true-state). */
function fromRow(row: AutopilotRunRow, scenes: AutopilotSceneRow[]): AutopilotRun {
  const art = (row.artifacts ?? {}) as Record<string, any>;
  // Prefer the richer artifact scene snapshot; fall back to the server job-queue rows.
  const sceneState =
    art.scenes ??
    scenes.map((s) => ({ sceneIdx: s.scene_idx, status: s.status === 'submitting' ? 'rendering' : s.status, videoUrl: s.video_url ?? undefined, audioUrl: s.audio_url ?? undefined, imageUrl: s.image_url ?? undefined }));
  return {
    runId: row.run_id,
    userId: row.user_id,
    createdAt: Date.parse(row.created_at) || 0,
    updatedAt: Date.parse(row.updated_at) || 0,
    status: row.status,
    mode: row.mode,
    gate: art.gate ?? undefined,
    storyboardApproved: art.storyboardApproved ?? false,
    input: row.input as unknown as OrchInput,
    stages: (row.stages as any[]) ?? [],
    scenes: sceneState,
    report: art.report,
    clientDetails: art.clientDetails,
    businessInfo: art.businessInfo,
    script: art.script,
    finalScript: art.finalScript,
    storyboard: art.storyboard,
    videoPrompts: art.videoPrompts,
    edl: art.edl,
    finalVideoUrl: art.finalVideoUrl,
    finalDownloadUrl: art.finalDownloadUrl,
    error: row.error ?? undefined,
  };
}

interface Props {
  userId: string | null;
  directorUnlocked: boolean;
  onBack: () => void;
  onUpgrade: () => void;
  onSwitchToSteps: () => void;
  onSwitchToExpert?: () => void;
  onCloneVoice: () => void;
}

const OneShotAutopilot: React.FC<Props> = ({ userId, directorUnlocked, onBack, onUpgrade, onSwitchToSteps, onSwitchToExpert, onCloneVoice }) => {
  const [run, setRun] = useState<AutopilotRun | null>(null);
  const [phase, setPhase] = useState<'launch' | 'researching' | 'error' | 'resuming'>('resuming');
  const [errMsg, setErrMsg] = useState('');
  const [reshooting, setReshooting] = useState<number | null>(null);
  const [delivered, setDelivered] = useState(false);
  const abortRef = useRef<AbortController>(new AbortController());

  const cb = (r: AutopilotRun) => ({ onUpdate: setRun, signal: abortRef.current.signal, userId: r.userId });

  // Resume-on-mount: if a run id is remembered, pull its true state from the server and
  // drop the user exactly where they were (mid-run, at a gate, or at First Cut).
  useEffect(() => {
    let alive = true;
    const activeId = typeof localStorage !== 'undefined' ? localStorage.getItem(ACTIVE_RUN_KEY) : null;
    if (!activeId) { setPhase('launch'); return; }
    void loadRun(activeId)
      .then((res) => {
        if (!alive) return;
        if (!res || res.run.status === 'done' || res.run.status === 'error') { setPhase('launch'); return; }
        const resumed = fromRow(res.run, res.scenes);
        setRun(resumed);
        setPhase('launch'); // phase now derives from run.status below
        // If the run was interrupted mid-stage (running), continue the loop; a parked
        // 'review' run just shows its gate and waits for a human tap.
        if (resumed.status === 'running') void runAutopilot(resumed, cb(resumed), realAutopilotDeps);
      })
      .catch(() => alive && setPhase('launch'));
    return () => {
      alive = false;
      abortRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async (input: IntakeInput) => {
    if (!userId) return;
    setErrMsg('');
    setPhase('researching');
    abortRef.current = new AbortController();
    try {
      // 1 — Market research (auto).
      const report = await generateMarketResearch({
        brandName: input.brandName,
        productName: input.productName,
        productDescription: input.productDescription,
        priceOffer: input.price ? `${input.offer} (${input.price})` : input.offer,
        isLocalService: input.isLocalService ?? (input.scriptType === 'Services' || input.scriptType === 'RealEstate'),
        businessAddress: input.businessAddress?.trim() || undefined,
        uploadedImages: input.heroImageBase64 ? [input.heroImageBase64] : [],
      });

      // 2 — Project onto wizard fields (research is load-bearing context for the script).
      const orchInputBase: OrchInput = {
        brandName: input.brandName,
        offer: input.offer,
        price: input.price,
        productName: input.productName,
        productDescription: input.productDescription,
        heroImageBase64: input.heroImageBase64,
        avatar: input.avatar,
        voiceId: input.voiceId,
        language: input.language,
        aspectRatio: input.aspectRatio,
        resolution: input.resolution,
        scriptType: input.scriptType,
        forceFreshResearch: input.forceFreshResearch,
      };
      const { clientDetails, businessInfo } = mapReportToWizard(orchInputBase, report);

      // 3 — Lock the presenter at intake (the orchestrator threads a fixed avatar). Auto
      // mode casts from the research persona + optional hints; an uploaded photo is used
      // as-is. Storyboard/scene stages depend on avatar.description + .ethnicity + .url.
      let avatar: Avatar = input.avatar;
      if (!avatar?.url) {
        const castAr: '9:16' | '16:9' = input.aspectRatio === '16:9' ? '16:9' : '9:16';
        const ethnicity = input.castHints?.ethnicity?.trim() || 'Filipino';
        const cast = await generateAvatarImage(
          businessInfo.audience || input.productDescription,
          input.castHints?.gender ?? 'Any',
          input.castHints?.ageRange ?? '',
          ethnicity,
          castAr,
          '1K',
          [],
          input.scriptType
        );
        avatar = { prompt: '', url: cast.url, description: cast.description, ethnicity, gender: input.castHints?.gender ?? 'Any' };
      }

      // 4 — Create the run with research + avatar prefilled (market_research already done)
      //     and drive it. runId is the stable idempotency anchor; remember it for resume.
      const runId = newRunId();
      if (typeof localStorage !== 'undefined') localStorage.setItem(ACTIVE_RUN_KEY, runId);
      const fresh = createAutopilotRun(
        { ...orchInputBase, avatar },
        userId,
        { runId, mode: 'oneshot', prefill: { report, clientDetails, businessInfo }, doneStages: ['market_research'] }
      );
      setRun(fresh);
      setPhase('launch'); // phase derives from run.status now
      await runAutopilot(fresh, cb(fresh), realAutopilotDeps);
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setPhase('error');
    }
  };

  const handleApprove = async () => {
    if (!run) return;
    await approveStoryboard(run, cb(run), realAutopilotDeps);
  };

  const handleReshoot = async (sceneIdx: number) => {
    if (!run || reshooting !== null) return;
    setReshooting(sceneIdx);
    try {
      await reshootScene(run, sceneIdx, cb(run), realAutopilotDeps);
    } finally {
      setReshooting(null);
    }
  };

  const handleMakeAnother = () => {
    abortRef.current.abort();
    if (typeof localStorage !== 'undefined') localStorage.removeItem(ACTIVE_RUN_KEY);
    setRun(null);
    setDelivered(false);
    setPhase('launch');
  };

  const BackBar = (
    <button onClick={onBack} className="absolute left-4 top-4 z-20 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500 hover:text-white">
      <ChevronLeft className="h-4 w-4" /> Command Center
    </button>
  );

  if (!userId) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        {BackBar}
        <p className="text-sm">Sign in to use One-Shot Ad.</p>
      </div>
    );
  }

  if (phase === 'resuming') {
    return (
      <div className="relative min-h-screen bg-zinc-950">
        {BackBar}
        <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#FFCC00]" /></div>
      </div>
    );
  }

  // Live run → screen derives from run.status + run.gate (the resume/gate model).
  if (run && (run.status === 'running' || run.status === 'review')) {
    if (run.status === 'review' && run.gate === 'storyboard') {
      return (
        <div className="relative">
          {BackBar}
          <StoryboardGateScreen run={run} regenerating={reshooting} onRegenScene={handleReshoot} onApprove={handleApprove} />
        </div>
      );
    }
    if (run.status === 'review' && run.gate === 'first_cut') {
      return (
        <div className="relative">
          {BackBar}
          <FirstCutScreen
            run={run}
            reshooting={reshooting}
            onReshoot={handleReshoot}
            onMakeAnother={() => { setDelivered(true); handleMakeAnother(); }}
          />
          <FeedbackWidget active={delivered} module="one_shot_autopilot" />
        </div>
      );
    }
    // status === 'running' → live build progress (Fable 5 screen).
    return (
      <div className="relative">
        {BackBar}
        <RunningScreen run={run} onMinimize={onBack} />
      </div>
    );
  }

  if (phase === 'researching') {
    return (
      <div className="relative min-h-screen bg-zinc-950">
        {BackBar}
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-zinc-400">
          <Loader2 className="h-6 w-6 animate-spin text-[#FFCC00]" />
          <p className="text-xs font-mono uppercase tracking-widest">Researching your market…</p>
        </div>
      </div>
    );
  }

  // Launch (with an inline error banner on failure).
  return (
    <div className="relative">
      {phase === 'error' && (
        <div className="mx-auto mt-6 flex max-w-xl items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {errMsg}
          <button onClick={() => setPhase('launch')} className="ml-auto flex items-center gap-1 text-[#FFCC00] hover:underline">
            <RotateCw className="h-3.5 w-3.5" /> Start over
          </button>
        </div>
      )}
      <LaunchScreen
        onLaunch={start}
        directorUnlocked={directorUnlocked}
        onUpgrade={onUpgrade}
        onSwitchToSteps={onSwitchToSteps}
        onSwitchToExpert={onSwitchToExpert}
        onBack={onBack}
        onCloneVoice={onCloneVoice}
      />
    </div>
  );
};

export default OneShotAutopilot;

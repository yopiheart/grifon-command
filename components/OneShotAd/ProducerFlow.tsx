import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, AlertTriangle, RotateCw, Loader2 } from 'lucide-react';
import type { Avatar, LockablePresetId } from '../../types';
import { generateMarketResearch, generateAvatarImage } from '../../services/geminiService';
import type { ProductionInput as IntakeInput } from '../../services/oneShotIntake';
import { LaunchScreen } from './LaunchScreen';
import { RunningScreen } from './RunningScreen.fable5';
import { StoryboardGateScreen } from './StoryboardGateScreen';
import { FirstCutScreen } from './FirstCutScreen';
import { FeedbackWidget } from '../ui/FeedbackWidget';
import { GlassPanel } from '../ui/GlassPanel';
import { GoldButton } from '../ui/GoldButton';
import {
  createProductionRun,
  runProduction,
  approveStoryboard,
  reshootScene,
  regenSceneImage,
  applyPreset,
  mapReportToWizard,
  type ProductionRun,
  type ProductionInput as OrchInput,
} from '../../services/producerOrchestrator';
import { realProducerDeps } from '../../services/producerDeps';
import { newRunId, loadRun, type ProductionRunRow, type ProductionSceneRow } from '../../services/producerRunService';

/**
 * One-Shot PRODUCER container (slice 4, 2026-07-01 grill). Drives the real consumer
 * flow on the rebuilt orchestrator: LaunchScreen → Running → storyboard-image gate →
 * First Cut, with resume-to-true-state and the no-double-spend fan-out. Users never see
 * the 8-step wizard.
 *
 * This is mounted opt-in (see OneShotAd/index.tsx `?osaEngine=producer`) so the live
 * useOneShotGeneration→Step 8 path stays intact until the SIGLA smoke signs this off.
 * The orchestrator OWNS its state (it does not write into App.tsx wizard state).
 */
const ACTIVE_RUN_KEY = 'osa_producer_active_run';

/** Rebuild an in-memory run from the server checkpoint (resume-to-true-state). */
function fromRow(row: ProductionRunRow, scenes: ProductionSceneRow[]): ProductionRun {
  const art = (row.artifacts ?? {}) as Record<string, any>;
  // Prefer the richer artifact scene snapshot; fall back to the server job-queue rows.
  const sceneState =
    art.scenes ??
    scenes.map((s) => ({ sceneIdx: s.scene_idx, status: s.status === 'submitting' ? 'rendering' : s.status, videoUrl: s.video_url ?? undefined, audioUrl: s.audio_url ?? undefined, imageUrl: s.image_url ?? undefined }));
  // M1 fix: `storyboardApproved` rides a best-effort checkpoint that can drop. Derive it
  // from stage progress too — if any post-gate stage has started, the gate was crossed —
  // so a dropped flag can't bounce a mid-render run back to the storyboard gate.
  const stagesArr = ((row.stages as any[]) ?? []);
  const impliedApproved = stagesArr.some((s) => ['video', 'voices', 'edl', 'final_render'].includes(s?.id) && s?.status && s.status !== 'pending');
  return {
    runId: row.run_id,
    userId: row.user_id,
    createdAt: Date.parse(row.created_at) || 0,
    updatedAt: Date.parse(row.updated_at) || 0,
    status: row.status,
    mode: row.mode,
    gate: art.gate ?? undefined,
    storyboardApproved: art.storyboardApproved || impliedApproved,
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

const ProducerFlow: React.FC<Props> = ({ userId, directorUnlocked, onBack, onUpgrade, onSwitchToSteps, onSwitchToExpert, onCloneVoice }) => {
  const [run, setRun] = useState<ProductionRun | null>(null);
  const [phase, setPhase] = useState<'launch' | 'researching' | 'error' | 'resuming'>('resuming');
  const [errMsg, setErrMsg] = useState('');
  const [reshooting, setReshooting] = useState<number | null>(null);
  const [presetBusy, setPresetBusy] = useState(false);
  const [delivered, setDelivered] = useState(false);
  const abortRef = useRef<AbortController>(new AbortController());
  // Guards the resume auto-run so React 18 StrictMode's mount→cleanup→mount cycle can't
  // double-drive (or abort) a resumed run.
  const resumeStarted = useRef(false);

  // C1 fix: the orchestrator mutates its `run` object IN PLACE, so we MUST hand React a
  // fresh reference or useState bails the re-render (Object.is) and the UI freezes.
  const cb = (r: ProductionRun) => ({ onUpdate: (u: ProductionRun) => setRun({ ...u }), signal: abortRef.current.signal, userId: r.userId });

  // Resume-on-mount: if a run id is remembered, pull its true state from the server and
  // drop the user exactly where they were (mid-run, at a gate, or at First Cut).
  useEffect(() => {
    let alive = true;
    const activeId = typeof localStorage !== 'undefined' ? localStorage.getItem(ACTIVE_RUN_KEY) : null;
    if (!activeId) { setPhase('launch'); return; }
    void loadRun(activeId)
      .then((res) => {
        if (!alive) return;
        // Stale-key fix: a missing or already-finished run must not resume — drop the key.
        if (!res || res.run.status === 'done') {
          if (typeof localStorage !== 'undefined') localStorage.removeItem(ACTIVE_RUN_KEY);
          setPhase('launch');
          return;
        }
        // An `error` run is kept: fromRow surfaces it in the error branch so the user can
        // Retry (resume) or Start over — only "Start over" clears the key.
        const resumed = fromRow(res.run, res.scenes);
        setRun(resumed);
        setPhase('launch'); // phase now derives from run.status below
        // If the run was interrupted mid-stage (running), continue the loop; a parked
        // 'review' run just shows its gate and waits for a human tap. resumeStarted guards
        // StrictMode's double-mount so we drive the loop exactly once, on a fresh signal.
        if (resumed.status === 'running' && !resumeStarted.current) {
          resumeStarted.current = true;
          abortRef.current = new AbortController();
          void runProduction(resumed, cb(resumed), realProducerDeps);
        }
      })
      .catch(() => alive && setPhase('launch'));
    // NOTE: no abort() here — StrictMode's synchronous cleanup would otherwise kill the
    // resumed run before its second mount. Explicit teardown lives in handleMakeAnother.
    return () => { alive = false; };
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
        servicePhotos: input.servicePhotos,
        serviceArchetype: input.serviceArchetype,
        realEstateArchetype: input.realEstateArchetype,
        isLocalService: input.isLocalService,
        businessAddress: input.businessAddress,
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
      const fresh = createProductionRun(
        { ...orchInputBase, avatar },
        userId,
        { runId, mode: 'oneshot', prefill: { report, clientDetails, businessInfo }, doneStages: ['market_research'] }
      );
      setRun(fresh);
      setPhase('launch'); // phase derives from run.status now
      await runProduction(fresh, cb(fresh), realProducerDeps);
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setPhase('error');
    }
  };

  const handleApprove = async () => {
    if (!run) return;
    await approveStoryboard(run, cb(run), realProducerDeps);
  };

  // Storyboard gate: image-ONLY regen (cheap — the cost gate hasn't fired yet).
  const handleRegenImage = async (sceneIdx: number) => {
    if (!run || reshooting !== null) return;
    setReshooting(sceneIdx);
    try {
      await regenSceneImage(run, sceneIdx, cb(run), realProducerDeps);
    } finally {
      setReshooting(null);
    }
  };

  // First Cut: full reshoot (image → video → voice → re-assemble) for a rendered clip.
  const handleReshoot = async (sceneIdx: number) => {
    if (!run || reshooting !== null) return;
    setReshooting(sceneIdx);
    try {
      await reshootScene(run, sceneIdx, cb(run), realProducerDeps);
    } finally {
      setReshooting(null);
    }
  };

  const handleChoosePreset = async (id: LockablePresetId | null) => {
    if (!run || presetBusy) return;
    setPresetBusy(true);
    try {
      await applyPreset(run, id, cb(run), realProducerDeps);
    } finally {
      setPresetBusy(false);
    }
  };

  // Error recovery: re-enter the driver on the SAME run. runProduction skips completed
  // stages and re-runs the failed one, so no work (or spend) is redone. Flip status back to
  // 'running' first — setStage doesn't touch run.status, so this is what lifts the UI off
  // the error screen onto live progress. Mirrors the resume path's fresh-controller pattern.
  const handleRetry = async () => {
    if (!run) return;
    abortRef.current = new AbortController();
    const resumed: ProductionRun = { ...run, status: 'running', error: undefined };
    setRun(resumed);
    await runProduction(resumed, cb(resumed), realProducerDeps);
  };

  const handleMakeAnother = () => {
    abortRef.current.abort();
    resumeStarted.current = false;
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
          <StoryboardGateScreen run={run} regenerating={reshooting} onRegenScene={handleRegenImage} onApprove={handleApprove} />
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
            onChoosePreset={handleChoosePreset}
            proUnlocked={directorUnlocked}
            onUpgrade={onUpgrade}
            presetBusy={presetBusy}
          />
          <FeedbackWidget active={delivered} module="one_shot_producer" />
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

  // A run whose driver hit a stage error parks in `error` (runProduction returns normally).
  // Surface WHAT failed + a Retry (resume the same run) / Start over (drop it) choice.
  if (run && run.status === 'error') {
    const failedStage = run.stages.find((s) => s.status === 'failed');
    return (
      <div className="relative min-h-screen bg-zinc-950 px-4 py-10 text-white">
        {BackBar}
        <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center">
          <GlassPanel className="w-full p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-red-500/40 bg-red-500/10">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <p className="mb-1 text-[10px] font-mono uppercase tracking-widest text-zinc-500">// Production paused</p>
            <h1 className="mb-3 text-2xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500">
              {failedStage?.label ?? 'A step hit a snag'}
            </h1>
            <p className="mb-6 text-sm text-zinc-400">
              {run.error ?? 'Something went wrong mid-production.'} Your finished steps are saved — Retry picks up right where it stopped.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <GoldButton onClick={handleRetry} className="flex items-center gap-2">
                <RotateCw className="h-4 w-4" /> Retry
              </GoldButton>
              <button
                onClick={handleMakeAnother}
                className="rounded-full border border-white/10 bg-zinc-950 px-6 py-3 text-xs font-bold uppercase tracking-widest text-zinc-400 transition-colors hover:border-[#FFCC00]/50 hover:text-white"
              >
                Start over
              </button>
            </div>
          </GlassPanel>
        </div>
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

export default ProducerFlow;

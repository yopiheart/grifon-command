import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, AlertTriangle, RotateCw, Loader2 } from 'lucide-react';
import type { Avatar, LockablePresetId } from '../../types';
import { generateMarketResearch, generateAvatarImage } from '../../services/geminiService';
import { resolvePersonStatePresenter, type ProductionInput as IntakeInput } from '../../services/oneShotIntake';
import { LaunchScreen } from './LaunchScreen';
import { RunningScreen } from './RunningScreen.fable5';
import { StoryboardGateScreen } from './StoryboardGateScreen';
import { FirstCutScreen } from './FirstCutScreen';
import { FeedbackWidget } from '../ui/FeedbackWidget';
import { GlassPanel } from '../ui/GlassPanel';
import { GoldButton } from '../ui/GoldButton';
import { CTRL_H, R_CTRL, T_CTRL } from '../ui/wizardTokens';
import {
  createProductionRun,
  runProduction,
  approveStoryboard,
  reshootScene,
  regenSceneImage,
  applyPreset,
  mapReportToWizard,
  researchCacheKey,
  type ProductionRun,
  type ProductionInput as OrchInput,
} from '../../services/producerOrchestrator';
import { getCachedResearch, putCachedResearch } from '../../services/researchCacheStore';
import { realProducerDeps } from '../../services/producerDeps';
import { newRunId, loadRun, type ProductionRunRow, type ProductionSceneRow } from '../../services/producerRunService';
import { canSettleCompanionRun, withCompanionProductionLock, type CompanionOperationReceipt } from '../../services/companionProductionLock';

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

function readActiveRun(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function rememberActiveRun(key: string, value: string | null): void {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); }
  catch { /* The server checkpoint remains authoritative when device storage is unavailable. */ }
}

/**
 * Splice the durable presenter reference back into `input`.
 *
 * `input.avatar.url` never survives a checkpoint: slimCheckpointInput drops data: strings over
 * 700KB to stay under api/producer/run's 2mb cap, and a 2K avatar exceeds it (the compressed hero,
 * ~160KB, does not — which is why the hero comes back and the avatar does not). The durable copy
 * lives on producer_runs.avatar_url, written out-of-band by 'record_avatar' — same doctrine as
 * scene images and the cover frame: base64 never rides the run-header jsonb.
 *
 * Without this a resumed run has no reference, and a regen renders a person-free still with a
 * blank product label over a good image (run apr_876ef559, 2026-07-25). The column is preferred
 * over whatever is in `input` because the slimmer only ever removes — it never leaves a stale
 * value — and the fallback keeps runs checkpointed before the column existed working unchanged.
 */
export function hydrateInput(row: ProductionRunRow): OrchInput {
  const input = row.input as unknown as OrchInput;
  if (!row.avatar_url || !input?.avatar) return input;
  return { ...input, avatar: { ...input.avatar, url: row.avatar_url } };
}

/** Rebuild an in-memory run from the server checkpoint (resume-to-true-state). */
function fromRow(row: ProductionRunRow, scenes: ProductionSceneRow[]): ProductionRun {
  const art = (row.artifacts ?? {}) as Record<string, any>;
  const rowByIdx = new Map(scenes.map((s) => [s.scene_idx, s]));
  // Prefer the richer artifact scene snapshot; fall back to the server job-queue rows.
  let sceneState =
    art.scenes ??
    scenes.map((s) => ({ sceneIdx: s.scene_idx, status: s.status === 'submitting' ? 'rendering' : s.status, videoUrl: s.video_url ?? undefined, audioUrl: s.audio_url ?? undefined, imageUrl: s.image_url ?? undefined }));
  // Rehydrate scene images from their per-scene rows. The checkpoint is deliberately slim —
  // base64 images are stripped at the transport boundary (slimCheckpointArtifacts) because fat
  // jsonb checkpoints hit statement timeouts, went stale, and made resume RE-BUY images
  // (2026-07-02 SIGLA smoke). The durable copy lives in producer_scenes.image_url/end_frame_url.
  sceneState = sceneState.map((s: any) => ({ ...s, imageUrl: s.imageUrl ?? rowByIdx.get(s.sceneIdx)?.image_url ?? undefined }));
  const storyboard = (art.storyboard as any[] | undefined)?.map((sc, i) => ({
    ...sc,
    imageUrl: sc.imageUrl ?? rowByIdx.get(i)?.image_url ?? undefined,
    endFrameImageUrl: sc.endFrameImageUrl ?? rowByIdx.get(i)?.end_frame_url ?? undefined,
  }));
  // Reload-mid-reshoot recovery (C3): a reshoot/preset op parks the run at first_cut with
  // run.busy set and the reshot scene mid-'rendering'. We do NOT resume the in-flight reshoot —
  // simplest correct behavior is to drop back to the last good First Cut with the scene claimable:
  // clear busy (below) and normalize any 'rendering'/'submitting' scene to 'done' (its prior video
  // is still attached) or 'flagged' (never rendered), so the user can just re-tap reshoot.
  if ((art.gate ?? undefined) === 'first_cut') {
    sceneState = sceneState.map((s: any) =>
      s.status === 'rendering' || s.status === 'submitting'
        ? { ...s, status: s.videoUrl ? 'done' : 'flagged' }
        : s
    );
  }
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
    gate: art.gate ?? (row.status === 'done' && art.finalVideoUrl ? 'first_cut' : undefined),
    storyboardApproved: art.storyboardApproved || impliedApproved,
    // C4: restore the applied preset so the switcher highlights it (not AUTO) after reload.
    presetId: art.presetId ?? undefined,
    // C3: restore the free-take counter; deliberately do NOT restore run.busy — a reload
    // abandons any in-flight reshoot/preset op (see the scene normalization above).
    takesUsed: typeof art.takesUsed === 'number' ? art.takesUsed : 0,
    busy: undefined,
    input: hydrateInput(row),
    stages: (row.stages as any[]) ?? [],
    scenes: sceneState,
    report: art.report,
    clientDetails: art.clientDetails,
    businessInfo: art.businessInfo,
    script: art.script,
    finalScript: art.finalScript,
    storyboard,
    videoPrompts: art.videoPrompts,
    edl: art.edl,
    finalVideoUrl: art.finalVideoUrl,
    finalDownloadUrl: art.finalDownloadUrl,
    // Cover frame lives on its own run-header column (written via 'record_thumbnail'), NOT in
    // artifacts — it is a base64 data URL and would bloat every later checkpoint. The artifacts
    // fallback covers runs checkpointed before that column existed (it will simply be absent).
    thumbnailUrl: row.thumbnail_url ?? (art.thumbnailUrl as string | undefined),
    error: row.error ?? undefined,
    // Carry the server revision so the resumed run's next checkpoint guards on the fresh value
    // (optimistic concurrency) instead of racing from 0.
    revision: typeof row.revision === 'number' ? row.revision : 0,
  };
}

export interface ProducerSurfaceController {
  readOnly?: boolean;
  resume?: () => Promise<void>;
  run: ProductionRun | null;
  phase: 'launch' | 'researching' | 'error' | 'resuming' | 'resume-error';
  error: string;
  busy: boolean;
  reshooting: number | null;
  presetBusy: boolean;
  approving: boolean;
  start: (input: IntakeInput) => Promise<void>;
  approve: () => Promise<void>;
  regenScene: (sceneIdx: number) => Promise<void>;
  reshoot: (sceneIdx: number) => Promise<void>;
  choosePreset: (id: LockablePresetId | null) => Promise<void>;
  retry: () => Promise<void>;
  retryResume: () => void;
  reset: () => void;
  cancel: () => void;
}

interface Props {
  userId: string | null;
  /** Dev-only unlock for the 8-step wizard door (LaunchScreen). */
  directorUnlocked: boolean;
  /** Pro+ unlock for the First Cut edit presets (IMPACT/CLEAN). */
  presetUnlocked: boolean;
  /** True when the user is already on Business — hides the First Cut "Advanced Editor" teaser. */
  isBusinessTier: boolean;
  /** Landing-segmentation vertical — a DEFAULT for the LaunchScreen picker only. */
  preferredVertical?: string;
  onBack: () => void;
  onUpgrade: () => void;
  onSwitchToSteps: () => void;
  onSwitchToExpert?: () => void;
  onCloneVoice: () => void;
  /** Alternate presentation; the same producer owns all paid work and recovery. */
  renderSurface?: (controller: ProducerSurfaceController) => React.ReactNode;
  conversation?: { id: string; runId: string | null };
}

const ProducerFlow: React.FC<Props> = ({ userId, directorUnlocked, presetUnlocked, isBusinessTier, preferredVertical, onBack, onUpgrade, onSwitchToSteps, onSwitchToExpert, onCloneVoice, renderSurface, conversation }) => {
  const [run, setRun] = useState<ProductionRun | null>(null);
  const [phase, setPhase] = useState<'launch' | 'researching' | 'error' | 'resuming' | 'resume-error'>('resuming');
  const [resumeAttempt, setResumeAttempt] = useState(0);
  const [errMsg, setErrMsg] = useState('');
  const [reshooting, setReshooting] = useState<number | null>(null);
  const [presetBusy, setPresetBusy] = useState(false);
  const [approving, setApproving] = useState(false);
  const approvingRef = useRef(false);
  const abortRef = useRef<AbortController>(new AbortController());
  // Guards the resume auto-run so React 18 StrictMode's mount→cleanup→mount cycle can't
  // double-drive (or abort) a resumed run.
  const resumeStarted = useRef(false);
  const mountedRef = useRef(false);
  const epochRef = useRef(0);
  const operationRef = useRef(false);
  const [operationBusy, setOperationBusy] = useState(false);
  const [readOnly, setReadOnly] = useState(!!conversation?.runId);
  const initialConversationRun = useRef(conversation?.runId);
  const activeRunKey = renderSurface ? `osa_producer_companion:${userId ?? ''}` : ACTIVE_RUN_KEY;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // StrictMode remounts synchronously; a real departure cancels the driver.
      queueMicrotask(() => {
        if (!mountedRef.current) { epochRef.current++; abortRef.current.abort(); }
      });
    };
  }, []);

  // C1 fix: the orchestrator mutates its `run` object IN PLACE, so we MUST hand React a
  // fresh reference or useState bails the re-render (Object.is) and the UI freezes.
  const cb = (r: ProductionRun) => {
    const epoch = epochRef.current;
    const signal = abortRef.current.signal;
    return { onUpdate: (u: ProductionRun) => {
      if (mountedRef.current && epoch === epochRef.current && !signal.aborted && u.userId === userId) setRun({ ...u });
    }, signal, userId: r.userId };
  };

  const lockProduction = <T,>(identity: string, action: (receipt: CompanionOperationReceipt) => Promise<T>) => conversation && userId
    ? withCompanionProductionLock(userId, identity, action) : action({ begin: () => {}, settle: () => {} });
  const settleProduction = async (receipt: CompanionOperationReceipt, completed: ProductionRun) => {
    if (!conversation) return true;
    try {
      const latest = await loadRun(completed.runId);
      if (!latest || !canSettleCompanionRun(completed, fromRow(latest.run, latest.scenes))) return false;
      receipt.settle();
      return true;
    } catch { return false; }
  };

  // Resume-on-mount: if a run id is remembered, pull its true state from the server and
  // drop the user exactly where they were (mid-run, at a gate, or at First Cut).
  useEffect(() => {
    let alive = true;
    abortRef.current.abort();
    abortRef.current = new AbortController();
    const epoch = ++epochRef.current;
    resumeStarted.current = false;
    operationRef.current = false;
    setOperationBusy(false);
    setRun(null);
    setErrMsg('');
    if (!userId) { setPhase('launch'); return; }
    const activeId = conversation ? initialConversationRun.current : readActiveRun(activeRunKey);
    if (conversation) setReadOnly(!!activeId);
    if (!activeId) { setPhase('launch'); return; }
    setPhase('resuming');
    void loadRun(activeId)
      .then((res) => {
        if (!alive || epoch !== epochRef.current) return;
        // Stale-key fix: a missing or already-finished run must not resume — drop the key.
        if (!res || res.run.user_id !== userId || (!conversation && res.run.status === 'done')) {
          if (conversation) { setPhase('resume-error'); return; }
          rememberActiveRun(activeRunKey, null);
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
        if (!conversation && resumed.status === 'running' && !resumeStarted.current) {
          resumeStarted.current = true;
          abortRef.current = new AbortController();
          operationRef.current = true; setOperationBusy(true);
          void runProduction(resumed, cb(resumed), realProducerDeps)
            .catch(error => {
              if (mountedRef.current && epoch === epochRef.current) {
                const message = error instanceof Error ? error.message : 'Could not resume your ad.';
                setErrMsg(message); setRun({ ...resumed, status: 'error', busy: undefined, error: message });
              }
            })
            .finally(() => {
              if (mountedRef.current && epoch === epochRef.current) { operationRef.current = false; setOperationBusy(false); }
            });
        }
      })
      .catch(() => alive && epoch === epochRef.current && setPhase('resume-error'));
    // NOTE: no abort() here — StrictMode's synchronous cleanup would otherwise kill the
    // resumed run before its second mount. Explicit teardown lives in handleMakeAnother.
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeAttempt, userId, activeRunKey]);

  const start = async (input: IntakeInput) => {
    if (!userId || readOnly || operationRef.current || run || phase === 'resuming' || phase === 'resume-error') return;
    operationRef.current = true;
    setOperationBusy(true);
    const epoch = ++epochRef.current;
    const current = () => mountedRef.current && epoch === epochRef.current && !abortRef.current.signal.aborted;
    setErrMsg('');
    setPhase('researching');
    abortRef.current = new AbortController();
    try { await lockProduction(`chat:${conversation?.id}`, async receipt => {
      // 1 — Market research (auto). Same cache seam as the orchestrator's market_research
      // stage (research stays locked per brand identity; "Re-research" forces fresh) —
      // this path pre-fills the run with doneStages:['market_research'], so the stage's
      // own cache read never fires and the reuse must happen here.
      const identityKey = researchCacheKey(input.brandName, input.productName);
      const cacheKey = renderSurface ? `${userId}:${identityKey}` : identityKey;
      let report = input.forceFreshResearch ? null : await getCachedResearch(cacheKey);
      if (!current()) return;
      if (!report) {
        receipt.begin();
        report = await generateMarketResearch({
          brandName: input.brandName,
          productName: input.productName,
          productDescription: input.productDescription,
          priceOffer: input.price ? `${input.offer} (${input.price})` : input.offer,
          isLocalService: input.isLocalService ?? (input.scriptType === 'Services' || input.scriptType === 'RealEstate'),
          businessAddress: input.businessAddress?.trim() || undefined,
          uploadedImages: input.heroImageBase64 ? [input.heroImageBase64] : [],
        });
        if (!current()) return;
        await putCachedResearch(cacheKey, report);
      }
      if (!current()) return;

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
        scriptType: input.scriptType,
        businessType: input.businessType,
        ugcProFormat: input.ugcProFormat,
        asmrFlag: input.asmrFlag,
        audioMode: input.audioMode,
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
      let avatar: Avatar = resolvePersonStatePresenter(input).avatar;
      if (!avatar?.url) {
        const castAr: '9:16' | '16:9' = input.aspectRatio === '16:9' ? '16:9' : '9:16';
        const ethnicity = input.castHints?.ethnicity?.trim() || 'Filipino';
        receipt.begin();
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
        if (!current()) return;
        avatar = { prompt: '', url: cast.url, description: cast.description, ethnicity, gender: input.castHints?.gender ?? 'Any' };
      }

      // 4 — Create the run with research + avatar prefilled (market_research already done)
      //     and drive it. runId is the stable idempotency anchor; remember it for resume.
      const runId = newRunId();
      if (!current()) return;
      if (!conversation) rememberActiveRun(activeRunKey, runId);
      const fresh = createProductionRun(
        { ...orchInputBase, avatar },
        userId,
        { runId, mode: 'oneshot', prefill: { report, clientDetails, businessInfo }, doneStages: ['market_research'] }
      );
      // First Cut starts as the unstyled assembly; the user opts into an edit preset.
      fresh.presetId = 'none';
      setRun(fresh);
      setPhase('launch'); // phase derives from run.status now
      const settled = await lockProduction(`run:${fresh.runId}`, async runReceipt => {
        runReceipt.begin();
        const completed = await runProduction(fresh, cb(fresh), realProducerDeps);
        return settleProduction(runReceipt, completed);
      });
      if (settled) receipt.settle();
    });
    } catch (e: unknown) {
      if (!current()) return;
      setErrMsg(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setPhase('error');
    } finally {
      if (mountedRef.current && epoch === epochRef.current) { operationRef.current = false; setOperationBusy(false); }
    }
  };

  const withRun = async (action: (active: ProductionRun, receipt: CompanionOperationReceipt) => Promise<ProductionRun | void>) => {
    if (!run || readOnly || operationRef.current || run.busy || (run.status === 'running' && !run.gate)) return;
    operationRef.current = true;
    setOperationBusy(true);
    setErrMsg('');
    abortRef.current = new AbortController();
    const epoch = epochRef.current;
    const signal = abortRef.current.signal;
    try {
      await lockProduction(`run:${run.runId}`, async receipt => {
        let active = run;
        if (conversation) {
          const latest = await loadRun(run.runId);
          if (!mountedRef.current || epoch !== epochRef.current || signal.aborted) return;
          if (!latest || latest.run.user_id !== userId) throw new Error('Your saved ad could not be opened. Please retry.');
          active = fromRow(latest.run, latest.scenes);
          setRun(active);
          if (active.gate !== run.gate || !!active.storyboardApproved !== !!run.storyboardApproved || (active.status === 'done' && !active.gate)) {
            setReadOnly(true);
            return;
          }
        }
        const completed = await action(active, receipt);
        if (completed) await settleProduction(receipt, completed);
      });
    } catch (error) {
      if (mountedRef.current && epoch === epochRef.current && !signal.aborted) {
        const message = error instanceof Error ? error.message : 'Please try again.';
        setErrMsg(message);
        setRun(active => active ? { ...active, status: active.gate ? 'review' : 'error', busy: undefined, error: message } : active);
      }
    } finally {
      if (mountedRef.current && epoch === epochRef.current) {
        operationRef.current = false;
        approvingRef.current = false;
        setOperationBusy(false); setApproving(false); setReshooting(null); setPresetBusy(false);
      }
    }
  };

  const handleApprove = async () => {
    if (!run || run.gate !== 'storyboard' || approvingRef.current || !run.scenes.length || run.scenes.some(scene => !scene.imageUrl || scene.status === 'flagged')) return;
    await withRun(async (active, receipt) => {
      if (!active.scenes.length || active.scenes.some(scene => !scene.imageUrl || scene.status === 'flagged')) throw new Error('Every scene needs an image without a flag before approval. Review the refreshed storyboard.');
      approvingRef.current = true; setApproving(true);
      receipt.begin();
      return approveStoryboard(active, cb(active), realProducerDeps);
    });
  };

  // Storyboard gate: image-ONLY regen (cheap — the cost gate hasn't fired yet).
  const handleRegenImage = async (sceneIdx: number) => {
    if (!run || run.gate !== 'storyboard' || !run.scenes.some(scene => scene.sceneIdx === sceneIdx)) return;
    await withRun(async (active, receipt) => {
      setReshooting(sceneIdx);
      receipt.begin();
      return regenSceneImage(active, sceneIdx, cb(active), realProducerDeps);
    });
  };

  // First Cut: full reshoot (image → video → voice → re-assemble) for a rendered clip.
  const handleReshoot = async (sceneIdx: number) => {
    if (!run || run.gate !== 'first_cut' || !run.scenes.some(scene => scene.sceneIdx === sceneIdx)) return;
    await withRun(async (active, receipt) => {
    setReshooting(sceneIdx);
    // C3: a manual re-roll of a scene that already worked counts toward the free-take
    // allowance; fixing a FLAGGED scene is always free. Mutating run.takesUsed here means
    // reshootScene's own persist() checkpoints it, so the count survives remount AND reload.
    const sc = active.scenes.find((s) => s.sceneIdx === sceneIdx);
    receipt.begin();
    if (sc && sc.status !== 'flagged') active.takesUsed = (active.takesUsed ?? 0) + 1;
    return reshootScene(active, sceneIdx, cb(active), realProducerDeps);
    });
  };

  const handleChoosePreset = async (id: LockablePresetId | null) => {
    if (!run || run.gate !== 'first_cut') return;
    if (id !== null && id !== 'none' && !presetUnlocked) { onUpgrade(); return; }
    await withRun(async (active, receipt) => {
      setPresetBusy(true);
      receipt.begin();
      return applyPreset(active, id, cb(active), realProducerDeps);
    });
  };

  // Error recovery: re-enter the driver on the SAME run. runProduction skips completed
  // stages and re-runs the failed one, so no work (or spend) is redone. Flip status back to
  // 'running' first — setStage doesn't touch run.status, so this is what lifts the UI off
  // the error screen onto live progress. Mirrors the resume path's fresh-controller pattern.
  const handleRetry = async () => {
    await withRun(async (active, receipt) => {
      if (active.gate || active.status === 'done') { setRun(active); setPhase('launch'); return; }
      const resumed: ProductionRun = { ...active, status: 'running', error: undefined, busy: undefined };
      setRun(resumed); setPhase('launch');
      receipt.begin();
      return runProduction(resumed, cb(resumed), realProducerDeps);
    });
  };

  const handleResumeConversation = async () => {
    if (!conversation || !readOnly || !run || operationRef.current) return;
    operationRef.current = true; setOperationBusy(true); setErrMsg('');
    abortRef.current = new AbortController();
    const epoch = ++epochRef.current;
    const signal = abortRef.current.signal;
    const continuationApproved = !run.gate && run.status !== 'done';
    try { await lockProduction(`run:${run.runId}`, async receipt => {
      // Submitted work may have checkpointed since history was opened.
      const latest = await loadRun(run.runId);
      if (!mountedRef.current || epoch !== epochRef.current || signal.aborted) return;
      if (!latest || latest.run.user_id !== userId) throw new Error('Your saved ad could not be opened. Please retry.');
      const fresh = fromRow(latest.run, latest.scenes);
      setRun(fresh);
      if (fresh.gate || fresh.status === 'done') { setReadOnly(false); return; }
      // "Resume editing" did not authorize restarting a now-running task.
      // A newly crossed approval gate also needs the refreshed allowance check.
      if (!continuationApproved || !!fresh.storyboardApproved !== !!run.storyboardApproved) return;
      setReadOnly(false);
      const resumed: ProductionRun = { ...fresh, status: 'running', error: undefined, busy: undefined };
      setRun(resumed);
      receipt.begin();
      const completed = await runProduction(resumed, cb(resumed), realProducerDeps);
      await settleProduction(receipt, completed);
    });
    }
    catch (error) {
      if (mountedRef.current && epoch === epochRef.current && !signal.aborted) {
        const message = error instanceof Error ? error.message : 'Could not resume your ad.';
        setErrMsg(message); setPhase('resume-error'); setReadOnly(true);
      }
    } finally { if (mountedRef.current && epoch === epochRef.current) { operationRef.current = false; setOperationBusy(false); } }
  };

  const handleCancel = () => {
    abortRef.current.abort();
    const message = operationRef.current
      ? 'Stopped waiting. A submitted step is still finishing and may use your allowance. When it settles, check saved progress. If its outcome is uncertain, contact support before more production.'
      : 'Stopped waiting. Work already submitted may still finish. Resume this ad to check its saved progress.';
    setErrMsg(message);
    if (run) setRun({ ...run, status: 'error', busy: undefined, error: message });
    else setPhase('error');
  };

  const handleMakeAnother = () => {
    if (operationRef.current) return;
    epochRef.current++;
    abortRef.current.abort();
    resumeStarted.current = false;
    operationRef.current = false; approvingRef.current = false;
    setOperationBusy(false); setApproving(false); setReshooting(null); setPresetBusy(false); setErrMsg('');
    if (!conversation) rememberActiveRun(activeRunKey, null);
    setRun(null);
    setPhase('launch');
  };

  const BackBar = (
    <button onClick={onBack} className="absolute left-4 top-4 z-20 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-on-surface-sublabel hover:text-white">
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

  if (renderSurface) return <>{renderSurface({
    readOnly, resume: handleResumeConversation,
    run, phase, error: errMsg || run?.error || '',
    busy: operationBusy || (!readOnly && (phase === 'researching' || (run?.status === 'running' && !run.gate) || !!run?.busy)),
    reshooting, presetBusy, approving,
    start, approve: handleApprove, regenScene: handleRegenImage, reshoot: handleReshoot,
    choosePreset: handleChoosePreset, retry: handleRetry,
    retryResume: () => { if (operationRef.current) return; if (conversation && run) initialConversationRun.current = run.runId; setResumeAttempt(attempt => attempt + 1); }, reset: handleMakeAnother, cancel: handleCancel,
  })}</>;

  if (phase === 'resume-error') {
    return (
      <div className="relative min-h-screen bg-zinc-950 px-4 py-10 text-white">
        {BackBar}
        <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center">
          <GlassPanel className="w-full p-6 text-center">
            <AlertTriangle className="mx-auto mb-4 h-8 w-8 text-zinc-400" />
            <h1 className="mb-3 text-2xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500">
              Couldn't load your saved ad
            </h1>
            <p role="alert" className="mb-6 text-sm text-zinc-400">
              Your saved ad is still selected. Retry to open it without starting a new one.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <GoldButton onClick={() => setResumeAttempt((attempt) => attempt + 1)} className="flex min-h-11 items-center gap-3 !rounded-xl">
                <RotateCw className="h-5 w-5 shrink-0" /> Retry
              </GoldButton>
              <button onClick={onBack} className={`${CTRL_H} ${R_CTRL} ${T_CTRL} border border-white/10 bg-zinc-950 px-6 text-zinc-400 transition-colors hover:border-[#FFCC00]/50 hover:text-white`}>
                Back
              </button>
            </div>
          </GlassPanel>
        </div>
      </div>
    );
  }

  if (phase === 'resuming') {
    // Branded rehydration state (finding #31) — the resume path used to flash a bare
    // black screen + spinner. GlassPanel + gold spinner + reassuring copy instead.
    return (
      <div className="relative min-h-screen bg-zinc-950 px-4 py-10 text-white">
        {BackBar}
        <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center">
          <GlassPanel className="w-full p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#FFCC00]/30 bg-[#FFCC00]/10">
              <Loader2 className="h-6 w-6 animate-spin text-[#FFCC00]" />
            </div>
            <p className="mb-1 text-[10px] font-mono uppercase tracking-widest text-on-surface-sublabel">// Resuming</p>
            <h1 className="mb-2 text-2xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500">
              Binabalik ang cut mo…
            </h1>
            <p className="text-sm text-zinc-400">Loading your ad — seconds lang ito.</p>
          </GlassPanel>
        </div>
      </div>
    );
  }

  // Live run → screen derives from run.gate FIRST, then status (the resume/gate model).
  // Routing precedence: gate === 'storyboard' → StoryboardGateScreen; gate === 'first_cut'
  // → FirstCutScreen; otherwise (running, no gate) → RunningScreen. Gate wins over status so
  // a First-Cut reshoot/preset re-assemble (C3: status stays 'review'/'first_cut', run.busy set)
  // keeps FirstCutScreen mounted instead of bouncing to the full "Building your ad" screen.
  if (run && (run.status === 'running' || run.status === 'review')) {
    if (run.gate === 'storyboard') {
      return (
        <div className="relative">
          {BackBar}
          <StoryboardGateScreen run={run} regenerating={reshooting} onRegenScene={handleRegenImage} onApprove={handleApprove} onStartOver={handleMakeAnother} approving={approving} />
        </div>
      );
    }
    if (run.gate === 'first_cut') {
      // Spinner props come alive from local state (instant, live session) OR the persisted run
      // state (run.busy + the scene's own 'rendering' status), so a cross-tab/remount view still
      // shows the in-flight reshoot/preset op.
      const renderingSceneIdx = run.scenes.find((s) => s.status === 'rendering')?.sceneIdx ?? null;
      const reshootingProp = reshooting ?? (run.busy === 'reshoot' ? renderingSceneIdx : null);
      const presetBusyProp = presetBusy || run.busy === 'preset';
      return (
        <div className="relative">
          {BackBar}
          <FirstCutScreen
            run={run}
            reshooting={reshootingProp}
            onReshoot={handleReshoot}
            onMakeAnother={handleMakeAnother}
            onChoosePreset={handleChoosePreset}
            proUnlocked={presetUnlocked}
            onUpgrade={onUpgrade}
            presetBusy={presetBusyProp}
            isBusinessTier={isBusinessTier}
          />
          {/* NPS fires the whole time First Cut is up (value delivered), not on the make-another
              click that unmounts the widget in the same batch. FeedbackWidget self-gates frequency. */}
          <FeedbackWidget active={run.gate === 'first_cut'} module="one_shot_producer" />
        </div>
      );
    }
    // running with no gate → live build progress (Fable 5 screen).
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
            <p className="mb-1 text-[10px] font-mono uppercase tracking-widest text-on-surface-sublabel">// Production paused</p>
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
        preferredVertical={preferredVertical}
        producerEngine
      />
    </div>
  );
};

export default ProducerFlow;

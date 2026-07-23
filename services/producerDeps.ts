// Real-services wiring for the producer orchestrator (slice 3/4, 2026-07-01).
//
// Assembles the concrete ProducerDeps the app runs with: the tuned Gemini/voice/render
// service functions + the server run-store (services/producerRunService.ts). The
// orchestrator itself imports NONE of these at runtime (deps are injected) so it stays
// unit-testable and the UI can import its types without pulling this heavy chain.

import type { ProducerDeps, ProductionRun, ProducerRunStore, VideoJobHandle } from './producerOrchestrator';
import {
  generateMarketResearch,
  generateAdScript,
  generateStoryboard,
  generateSceneImage,
  generateVideoPrompts,
  generateThumbnail,
  generateEditDecisionList,
  submitVideo,
  resumeVideoOperation,
} from './geminiService';
import { consolidateVoices } from './voiceConsolidationService';
import { renderFinalVideo } from './finalRenderService';
import { getCachedResearch, putCachedResearch } from './researchCacheStore';
import {
  saveRunCheckpoint,
  seedScenes,
  claimScene,
  recordScene,
  recordSceneImage,
  completeScene,
  flagScene,
  requeueScene,
  type RunCheckpoint,
} from './producerRunService';

/** Map the full in-memory run to the partial server checkpoint (persist-after-every-transition). */
const toCheckpoint = (run: ProductionRun): RunCheckpoint => ({
  mode: run.mode ?? 'oneshot',
  status: run.status,
  currentStage: run.stages.find((s) => s.status === 'running')?.id ?? run.gate ?? null,
  // `input` is static after launch and carries the base64 hero + avatar — send it ONLY on the
  // creating write (revision still 0; it stays 0 until a write succeeds, so a failed first
  // write retries WITH input). Re-sending it on every transition was half the payload bloat
  // behind the checkpoint statement timeouts (2026-07-02).
  ...(run.revision ? {} : { input: run.input as unknown as Record<string, unknown> }),
  stages: run.stages,
  // Optimistic-concurrency guard: the client's last-known revision (default 0 for a fresh run's
  // first create). The server updates WHERE revision = this and increments (see api/producer/run.ts).
  revision: run.revision ?? 0,
  // Only the resume-critical artifacts + the storyboard-approval flag. Heavy base64 hero
  // images live in run.input; scene images ride in storyboard[].imageUrl.
  artifacts: {
    gate: run.gate ?? null,
    storyboardApproved: run.storyboardApproved ?? false,
    // C4: the applied First Cut preset, so the switcher highlights it (not AUTO) after reload.
    presetId: run.presetId ?? null,
    // C3: free-take counter + in-flight First-Cut op, so re-rolls survive remount/reload.
    takesUsed: run.takesUsed ?? 0,
    busy: run.busy ?? null,
    report: run.report,
    clientDetails: run.clientDetails,
    businessInfo: run.businessInfo,
    script: run.script,
    finalScript: run.finalScript,
    storyboard: run.storyboard,
    videoPrompts: run.videoPrompts,
    edl: run.edl,
    scenes: run.scenes,
    finalVideoUrl: run.finalVideoUrl,
    finalDownloadUrl: run.finalDownloadUrl,
  } as Record<string, unknown>,
  error: run.error ?? null,
});

// The run-header checkpoint is BEST-EFFORT: a failed/oversized write must not hard-stop a
// live pipeline. The no-double-spend guarantee does NOT depend on it — it rides the small,
// authoritative per-scene claim calls below. Worst case a dropped checkpoint means a
// coarser resume, never a lost render or a double charge.
const persist = async (run: ProductionRun): Promise<void> => {
  try {
    const res = await saveRunCheckpoint(run.runId, toCheckpoint(run));
    if (res.changed) {
      // Track the run's revision in memory so the next checkpoint sends the fresh value.
      if (typeof res.revision === 'number') run.revision = res.revision;
    } else {
      // Stale-write conflict: a fresher checkpoint (e.g. another tab) already advanced the row.
      // Persist is best-effort — do NOT overwrite; adopt the server's revision so a later write
      // can win, log, and continue. The no-double-spend guarantee rides the per-scene claim, not this.
      if (res.current && typeof res.current.revision === 'number') run.revision = res.current.revision;
      console.warn('[producer] checkpoint superseded (revision conflict) — adopted server revision', run.revision);
    }
  } catch (e) {
    console.warn('[producer] checkpoint write failed (best-effort):', (e as Error)?.message);
  }
};

/** Adapt the run-store client to the orchestrator's ProducerRunStore shape. */
const runStore: ProducerRunStore = {
  seedScenes,
  claimScene: async (runId, sceneIdx) => {
    const { claimed, scene } = await claimScene(runId, sceneIdx);
    return {
      claimed,
      status: scene?.status,
      videoUrl: scene?.video_url,
      audioUrl: scene?.audio_url,
      jobHandle: (scene?.job_handle as VideoJobHandle | null) ?? null,
    };
  },
  recordScene: (runId, sceneIdx, handle) => recordScene(runId, sceneIdx, handle as unknown as Record<string, unknown>),
  recordSceneImage,
  completeScene,
  flagScene,
  requeueScene,
};

/** The app's default deps. `now` stays injectable via the spread for tests. */
export const realProducerDeps: ProducerDeps = {
  generateMarketResearch,
  generateAdScript,
  generateStoryboard,
  generateSceneImage,
  generateVideoPrompts,
  // P3: thumbnail is a producer node (generated during the Gate-1 park). Thin pass-through of
  // the tuned geminiService export — the orchestrator owns the best-effort/degrade policy.
  generateThumbnail,
  generateEditDecisionList,
  consolidateVoices,
  renderFinalVideo,
  // Split video render: submit returns a serializable provider handle (recorded before the long
  // poll); poll drives that handle to the final url with no re-spend. Reuses geminiService's
  // existing transport (submitVideo + resumeVideoOperation) — no transport reimplemented here.
  submitVideo,
  pollVideo: (handle, opts) => resumeVideoOperation(handle as Parameters<typeof resumeVideoOperation>[0], opts),
  persist,
  run: runStore,
  // Research reuse: locks the target market per brand+product so it doesn't drift between ads.
  // A Recon run (components/MarketResearch.tsx) also seeds this store on the same key.
  getCachedResearch,
  putCachedResearch,
  now: () => Date.now(),
};

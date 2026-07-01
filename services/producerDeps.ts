// Real-services wiring for the producer orchestrator (slice 3/4, 2026-07-01).
//
// Assembles the concrete ProducerDeps the app runs with: the tuned Gemini/voice/render
// service functions + the server run-store (services/producerRunService.ts). The
// orchestrator itself imports NONE of these at runtime (deps are injected) so it stays
// unit-testable and the UI can import its types without pulling this heavy chain.

import type { ProducerDeps, ProductionRun, ProducerRunStore } from './producerOrchestrator';
import {
  generateMarketResearch,
  generateAdScript,
  generateStoryboard,
  generateSceneImage,
  generateVideoPrompts,
  generateEditDecisionList,
} from './geminiService';
import { consolidateVoices } from './voiceConsolidationService';
import { renderFinalVideo } from './finalRenderService';
import { runQueue } from '../components/GenerateVideo/RenderAllRunner';
import {
  saveRunCheckpoint,
  seedScenes,
  claimScene,
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
  input: run.input as unknown as Record<string, unknown>,
  stages: run.stages,
  // Only the resume-critical artifacts + the storyboard-approval flag. Heavy base64 hero
  // images live in run.input; scene images ride in storyboard[].imageUrl.
  artifacts: {
    gate: run.gate ?? null,
    storyboardApproved: run.storyboardApproved ?? false,
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
    await saveRunCheckpoint(run.runId, toCheckpoint(run));
  } catch (e) {
    console.warn('[producer] checkpoint write failed (best-effort):', (e as Error)?.message);
  }
};

/** Adapt the run-store client to the orchestrator's ProducerRunStore shape. */
const runStore: ProducerRunStore = {
  seedScenes,
  claimScene: async (runId, sceneIdx) => {
    const { claimed, scene } = await claimScene(runId, sceneIdx);
    return { claimed, status: scene?.status, videoUrl: scene?.video_url, audioUrl: scene?.audio_url };
  },
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
  generateEditDecisionList,
  consolidateVoices,
  renderFinalVideo,
  runQueue,
  persist,
  run: runStore,
  now: () => Date.now(),
};

// TYPES-ONLY recovery of Fable 5's One-Shot "autopilot" data model.
//
// Fable 5 (the most capable model) built the original One-Shot Ad on an autopilot
// ORCHESTRATOR — an AutopilotRun state machine (createAutopilotRun / runAutopilot /
// reshootScene) with a run store + injected service deps. `main` later REPLACED that
// engine with the current `useOneShotGeneration` -> Step 8 flow, so the orchestrator
// RUNTIME never merged and the branch (feat/one-shot-ad-autopilot) was deleted.
//
// These type definitions are recovered VERBATIM from commit 91afea9 so the preserved
// FirstCutScreen + previewMock compile and can be previewed with zero API spend
// (dev/oneShotFlowPreview.tsx). The orchestrator runtime is intentionally NOT restored
// here — reviving it live (replacing today's One-Shot engine) is a separate initiative.
// See workflows/handoff_2026-06-09-one-shot-ad-v1.md for Fable 5's original design.

import type {
  Avatar,
  BusinessInfo,
  Script,
  Scene,
  VideoPrompt,
  MarketResearchReport,
  ClientDetails,
  EditDecisionList,
  StabilityMode,
} from '../types';

export type AutopilotStageId =
  | 'market_research'
  | 'script'
  | 'storyboard'
  | 'scene_images'
  | 'video'
  | 'voices'
  | 'edl'
  | 'final_render';

export type StageStatus = 'pending' | 'running' | 'done' | 'failed';

export interface AutopilotStageState {
  id: AutopilotStageId;
  /** Outcome-framed UI label ("Researching your market", not "calling MarketMind"). */
  label: string;
  status: StageStatus;
  /** A short proof-of-work line revealed on completion ("Found your customer's #1 fear"). */
  detail?: string;
  error?: string;
  attempts: number;
}

export type SceneStatus = 'pending' | 'rendering' | 'done' | 'flagged';

export interface AutopilotSceneState {
  sceneIdx: number;
  status: SceneStatus;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  /** Why this scene needs a reshoot (image/video/voice failure). */
  flaggedReason?: string;
}

/** Everything the intake form collects (3 hero inputs + Customize-drawer defaults). */
export interface AutopilotInput {
  brandName: string;
  offer: string;
  price: string;
  productName: string;
  productDescription: string;
  /** Hero product image (base64 / data URL) — product-in-hand for size anchoring. */
  heroImageBase64: string;
  /** Avatar locked at intake (uploaded or generated+accepted) so the run is pure. */
  avatar: Avatar;
  /** Pinoy/pinay voice id chosen at intake. */
  voiceId: string;
  language: 'English' | 'Taglish';
  aspectRatio: '9:16' | '16:9' | '1:1';
  /** Render resolution. 720p is the only unlocked tier today; 1080p is gated to
   * Business (UI shows it LOCKED). Defaults to '720p' when absent so older runs
   * and the current intake stay valid. Drives engine + duration selection. */
  resolution?: '720p' | '1080p';
  /** Script strategy — auto-detected default, override in the Customize drawer. */
  scriptType: NonNullable<BusinessInfo['scriptType']>;
  stabilityMode?: StabilityMode;
  /** When true, ignore any cached market research for this product and run fresh
   * (the intake "Re-research" toggle). Default: reuse the cache when present. */
  forceFreshResearch?: boolean;
}

export type AutopilotRunStatus = 'running' | 'review' | 'done' | 'error';

export interface AutopilotRun {
  runId: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  status: AutopilotRunStatus;
  input: AutopilotInput;
  stages: AutopilotStageState[];
  scenes: AutopilotSceneState[];
  // ---- Persisted intermediate artifacts (so resume skips completed stages) ----
  report?: MarketResearchReport;
  clientDetails?: ClientDetails;
  businessInfo?: BusinessInfo;
  script?: Script;
  finalScript?: string[];
  storyboard?: Scene[];
  videoPrompts?: VideoPrompt[];
  edl?: EditDecisionList;
  finalVideoUrl?: string;
  finalDownloadUrl?: string;
  error?: string;
}

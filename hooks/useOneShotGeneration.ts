import { useCallback, useRef, useState } from 'react';
import type { Script, Avatar, Scene, VideoPrompt, BusinessInfo, ClientDetails } from '../types';
import {
  generateAdScript,
  generateAvatarImage,
  generateStoryboard,
  generateThumbnail,
  generateVideoPrompts,
} from '../services/geminiService';
import { renderSceneImages } from '../utils/sceneRender';
import { useQuota } from './useQuota';
import { PLAN_LIMITS } from '../utils/planGate';

/**
 * One-shot orchestrator: runs the same generation chain the 8-step Director
 * wizard runs (script → avatar → storyboard → scene images → thumbnail →
 * video prompts), but end-to-end from one click. It writes through to App.tsx's
 * central wizard state via `sinks`, so Step 8 (FinalOutput) and the
 * GenerateVideo hand-off see identical AllData whether the user went one-shot
 * or step-by-step.
 *
 * It deliberately does NOT trigger the video render — that is metered per
 * finished ad and gated downstream (Slice 3). This hook produces the *plan*.
 */

export type OneShotStageId = 'script' | 'avatar' | 'storyboard' | 'scenes' | 'thumbnail' | 'videoPrompts';
export type StageStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';

export interface OneShotStage {
  id: OneShotStageId;
  label: string;
  status: StageStatus;
  detail?: string;
}

export interface OneShotParams {
  clientDetails: ClientDetails;
  businessInfo: BusinessInfo;
  language: 'English' | 'Taglish';
  aspectRatio: '9:16' | '16:9';
  /**
   * Presenter chosen at intake (One-Shot Ad: uploaded or generated+accepted).
   * When present, the avatar stage reuses it instead of generating a fresh one,
   * so the user's pick is honored. Omitted by the Director one-shot, which
   * auto-casts a spokesperson — behavior there is unchanged.
   */
  presetAvatar?: Avatar | null;
  /** AUTO-cast hints — when no presetAvatar is supplied, AI Director casts the
   * spokesperson from the research persona, constrained by these (Director one-shot
   * passes none and stays fully auto). */
  castHints?: { gender: 'Male' | 'Female' | 'Any'; ageRange: string; ethnicity: string } | null;
}

/** Setters into App.tsx's central wizard state — keeps both paths in sync. */
export interface OneShotSinks {
  setScript: (s: Script | null) => void;
  setFinalScript: (s: string[]) => void;
  setAvatar: (a: Avatar | null) => void;
  setStoryboard: (s: Scene[]) => void;
  setThumbnailUrl: (url: string | null) => void;
  setVideoPrompts: (vp: VideoPrompt[]) => void;
  setLanguage: (l: 'English' | 'Taglish') => void;
  /** Free-tier scene trim (see capScenesToBudget) — `null` when the whole
   * storyboard was rendered. Optional: only the review surface consumes it. */
  setSceneTrim?: (t: SceneTrim | null) => void;
}

/** How many scenes were actually rendered out of the storyboard the AI wrote. */
export interface SceneTrim {
  shown: number;
  full: number;
}

// Execution order — the thumbnail runs BEFORE the storyboard/scene stages so a
// budget-limited run always ends up with a cover frame (the scene loop used to
// eat the whole image allowance first and leave the ad thumbnail-less).
const INITIAL_STAGES: OneShotStage[] = [
  { id: 'script', label: 'Writing your script', status: 'pending' },
  { id: 'avatar', label: 'Casting your spokesperson', status: 'pending' },
  { id: 'thumbnail', label: 'Designing the thumbnail', status: 'pending' },
  { id: 'storyboard', label: 'Building the storyboard', status: 'pending' },
  { id: 'scenes', label: 'Rendering scene visuals', status: 'pending' },
  { id: 'videoPrompts', label: 'Prepping the video shots', status: 'pending' },
];

/** One thumbnail = one metered image. */
const THUMBNAIL_IMAGE_COST = 1;

/**
 * Image-generation cost of ONE storyboard scene. Mirrors the two call sites in
 * utils/sceneRender.ts: a main frame (override / start / imagePrompt) plus an
 * end frame when the scene is a hook morph.
 */
export const sceneImageCost = (scene: Scene): number =>
  (scene.userImagePromptOverride || scene.startFramePrompt || scene.imagePrompt ? 1 : 0)
  + (scene.endFramePrompt ? 1 : 0);

/**
 * The ethnicity the run casts with. An explicit intake pick always wins; "Auto"
 * (blank) used to travel as '' all the way to the storyboard, which reads it as
 * 'Global/Neutral' — that is how a Taglish ad ended up with a non-Filipino
 * presenter. Blank + Taglish now means the market it's actually for.
 */
export const castEthnicityFor = (
  hinted: string | undefined,
  language: 'English' | 'Taglish',
): string => hinted?.trim() || (language === 'Taglish' ? 'Filipino' : '');

/**
 * Trim a storyboard to what the remaining image budget can actually render.
 *
 * Every /api/gemini/image call meters one 'images' unit (free limit 5), and one
 * run spends avatar + thumbnail + one-or-two per scene — so an untrimmed free run
 * exhausts the allowance mid-storyboard and the tail scenes come back empty.
 * Keeps scenes in narrative order and stops at the first one that doesn't fit.
 * Free tier only; paid plans render the full storyboard.
 */
export const capScenesToBudget = (scenes: Scene[], budget: number, reserved: number): Scene[] => {
  const sceneBudget = budget - reserved;
  const kept: Scene[] = [];
  let spent = 0;
  for (const scene of scenes) {
    const cost = sceneImageCost(scene);
    if (spent + cost > sceneBudget) break;
    spent += cost;
    kept.push(scene);
  }
  return kept;
};

export interface UseOneShotGeneration {
  stages: OneShotStage[];
  running: boolean;
  done: boolean;
  error: string | null;
  run: (params: OneShotParams, sinks: OneShotSinks) => Promise<boolean>;
  reset: () => void;
}

const SCENE_RENDER_DELAY_MS = 2500; // mirrors Step5's "RENDER ALL" pacing

export const useOneShotGeneration = (): UseOneShotGeneration => {
  const [stages, setStages] = useState<OneShotStage[]>(INITIAL_STAGES);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runningRef = useRef(false);
  // Live image allowance, read through a ref so `run` keeps a stable identity.
  const quota = useQuota();
  const quotaRef = useRef(quota);
  quotaRef.current = quota;

  const patch = useCallback((id: OneShotStageId, status: StageStatus, detail?: string) => {
    setStages(prev => prev.map(s => (s.id === id ? { ...s, status, detail } : s)));
  }, []);

  const reset = useCallback(() => {
    setStages(INITIAL_STAGES.map(s => ({ ...s, status: 'pending', detail: undefined })));
    setRunning(false);
    setDone(false);
    setError(null);
  }, []);

  const run = useCallback(async (params: OneShotParams, sinks: OneShotSinks): Promise<boolean> => {
    if (runningRef.current) return false;
    runningRef.current = true;

    const { clientDetails, businessInfo, language, aspectRatio, presetAvatar, castHints } = params;
    setStages(INITIAL_STAGES.map(s => ({ ...s, status: 'pending', detail: undefined })));
    setRunning(true);
    setDone(false);
    setError(null);
    sinks.setLanguage(language);
    sinks.setSceneTrim?.(null);
    // A fresh run must not show the previous run's tiles in RunningScreen.
    sinks.setStoryboard([]);

    // Snapshot the image allowance BEFORE the first spend. Trim ONLY on
    // positive evidence of a free plan with real numbers (loaded) — an
    // unresolved or failed quota read must never trim a paying user's run,
    // and must never zero-out a free one (critic 2026-07-30). When evidence
    // is missing we fall back to pre-feature behavior: no client trim, the
    // server's per-call metering degrades scenes as before, and the
    // thumbnail-first ordering still protects the key asset.
    const { plan, images, loading: quotaLoading, loaded: quotaLoaded } = quotaRef.current;
    const isFreePlan = quotaLoaded && !quotaLoading && plan === 'free';
    const imageBudget = isFreePlan ? images.remaining : PLAN_LIMITS.free.images;
    // An intake-supplied presenter costs no image; an auto-cast one does.
    const avatarImageCost = presetAvatar?.url ? 0 : 1;
    const castEthnicity = castEthnicityFor(castHints?.ethnicity, language);

    try {
      // 1 — Script (critical)
      patch('script', 'running');
      const script = await generateAdScript(businessInfo, clientDetails.brandName, language, clientDetails.offer, '', '');
      // UGC Pro: back-fill the resolved sub-format so the downstream storyboard (which reads
      // businessInfo.ugcProFormat) is populated even on the 'Auto' path. Nullish — an explicit
      // user pick is never overwritten. businessInfo is the same object the storyboard call
      // below consumes, so the mutation is visible where it matters.
      if (businessInfo.scriptType === 'UGCPro' && script.ugcProFormatResolved) {
        businessInfo.ugcProFormat = businessInfo.ugcProFormat ?? script.ugcProFormatResolved;
      }
      // Default to hook1 + body (mirrors Step3's default selection).
      const finalScript = [...script.hook1, ...script.body];
      sinks.setScript(script);
      sinks.setFinalScript(finalScript);
      patch('script', 'done');

      // 2 — Avatar (critical). Honor an intake-supplied presenter (One-Shot Ad);
      // otherwise auto-cast one (Director one-shot).
      patch('avatar', 'running');
      let avatar: Avatar;
      if (presetAvatar?.url) {
        avatar = presetAvatar;
      } else {
        // AI Director casts the spokesperson from the full research persona,
        // constrained by the user's optional intake hints (gender/age/ethnicity).
        const { url, description } = await generateAvatarImage(
          businessInfo.audience,
          castHints?.gender ?? 'Any',
          castHints?.ageRange ?? '',
          castEthnicity,
          aspectRatio,
          '1K',
          [],
          businessInfo.scriptType,
        );
        avatar = {
          prompt: `An avatar for an ad targeting ${businessInfo.audience}`,
          url,
          description,
          ethnicity: castEthnicity,
          gender: castHints?.gender ?? 'Any',
        };
      }
      sinks.setAvatar(avatar);
      patch('avatar', 'done');

      // 3 — Thumbnail (best-effort). Runs BEFORE the storyboard so the scene loop
      // can never spend the image allowance the cover frame needs.
      patch('thumbnail', 'running');
      try {
        const brandColors = businessInfo.brandColors ? businessInfo.brandColors.split(',').map(c => c.trim()) : [];
        const thumbnailUrl = await generateThumbnail(finalScript, avatar.description, businessInfo, aspectRatio, avatar.url, '1K', brandColors);
        sinks.setThumbnailUrl(thumbnailUrl);
        patch('thumbnail', 'done');
      } catch (err) {
        console.error('One-shot thumbnail failed:', err);
        patch('thumbnail', 'error', 'Regenerate in review');
      }

      // 4 — Storyboard scenes (critical)
      patch('storyboard', 'running');
      const storyboardResponse = await generateStoryboard(
        finalScript,
        avatar.description,
        businessInfo,
        avatar.ethnicity || 'Global/Neutral',
        language,
      );
      const fullScenes = storyboardResponse.scenes;
      // Free tier only: the 5-image monthly allowance has to cover the presenter,
      // the thumbnail AND every scene frame, so keep the scenes that fit instead
      // of letting the tail 429 out into empty tiles. Paid plans render it all.
      const scenes = isFreePlan
        ? capScenesToBudget(fullScenes, imageBudget, avatarImageCost + THUMBNAIL_IMAGE_COST)
        : fullScenes;
      sinks.setStoryboard(scenes);
      sinks.setSceneTrim?.(scenes.length < fullScenes.length ? { shown: scenes.length, full: fullScenes.length } : null);
      patch('storyboard', 'done', `${scenes.length} scenes`);

      // 5 — Scene visuals (best-effort; one failure must not sink the plan)
      patch('scenes', 'running', `0 / ${scenes.length}`);
      let rendered = 0;
      let sceneFailures = 0;
      for (let i = 0; i < scenes.length; i++) {
        try {
          await renderSceneImages(scenes[i], i, { aspectRatio, avatar, businessInfo });
          rendered += 1;
        } catch (err) {
          sceneFailures += 1;
          console.error(`One-shot scene ${i} render failed:`, err);
        }
        sinks.setStoryboard([...scenes]);
        patch('scenes', 'running', `${rendered} / ${scenes.length}`);
        if (i < scenes.length - 1) await new Promise(r => setTimeout(r, SCENE_RENDER_DELAY_MS));
      }
      patch(
        'scenes',
        sceneFailures === scenes.length && scenes.length > 0 ? 'error' : 'done',
        sceneFailures > 0 ? `${rendered} / ${scenes.length} (retry ${sceneFailures} in editor)` : `${rendered} / ${scenes.length}`,
      );

      // 6 — Video prompts (best-effort)
      patch('videoPrompts', 'running');
      try {
        const videoPrompts = await generateVideoPrompts(scenes, businessInfo);
        sinks.setVideoPrompts(videoPrompts);
        patch('videoPrompts', 'done');
      } catch (err) {
        console.error('One-shot video prompts failed:', err);
        patch('videoPrompts', 'error', 'Regenerate in review');
      }

      setDone(true);
      return true;
    } catch (err: any) {
      // A critical stage (script / avatar / storyboard) threw — surface it and
      // mark the in-flight stage failed; remaining pending stages are skipped.
      const message = err?.message || 'Generation failed. Please try again.';
      setError(message);
      setStages(prev => prev.map(s => {
        if (s.status === 'running') return { ...s, status: 'error', detail: message };
        if (s.status === 'pending') return { ...s, status: 'skipped' };
        return s;
      }));
      return false;
    } finally {
      // Refresh the allowance for the NEXT run — a retry from the error screen
      // reuses this mounted hook, and a stale snapshot would over-plan by the
      // images this run already spent (critic 2026-07-30 bug 3).
      void quotaRef.current.refetch();
      setRunning(false);
      runningRef.current = false;
    }
  }, [patch]);

  return { stages, running, done, error, run, reset };
};

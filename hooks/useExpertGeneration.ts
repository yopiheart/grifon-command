import { useCallback, useRef, useState } from 'react';
import type { Avatar, VideoPrompt, BusinessInfo, ClientDetails } from '../types';
import {
  generateAvatarImage,
  generateStoryboard,
  generateThumbnail,
  generateVideoPrompts,
  optimizeImagePrompt,
} from '../services/geminiService';
import { renderSceneImages } from '../utils/sceneRender';
import {
  applyShotIntents, reconcileSceneCount, overrideVideoPromptTypes, type AssetAvailability,
} from '../utils/expertScenePostProcess';
import type { OneShotSinks } from './useOneShotGeneration';
import type { ExpertIntake, SceneDirection } from '../components/ExpertMode/types';
import type { ExpertFormatId } from '../utils/scriptGuardrails';

/**
 * Expert Mode (Director's Cut) orchestrator. Mirrors useOneShotGeneration's chain but the expert
 * BRINGS the script — so it skips script generation AND Market Research. It additionally applies the
 * expert's per-scene direction deterministically (NON-TUNED post-process):
 *   reconcileSceneCount (F4) → merge shotIntent/anchor → applyShotIntents (F1) →
 *   optimizeImagePrompt for directed scenes (F2) → render (skipping anchored scenes) →
 *   generateVideoPrompts → overrideVideoPromptTypes.
 * Writes through App's wizard state via `sinks`, so Step 8 review + GenerateVideo see identical
 * AllData. Does NOT trigger the metered video render — it produces the plan.
 */

export type ExpertStageId = 'avatar' | 'storyboard' | 'direction' | 'scenes' | 'thumbnail' | 'videoPrompts';
export type StageStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';

export interface ExpertStage {
  id: ExpertStageId;
  label: string;
  status: StageStatus;
  detail?: string;
}

export interface ExpertGenParams {
  clientDetails: ClientDetails;
  businessInfo: BusinessInfo;
  intake: ExpertIntake;
  /** The expert's script lines (one per scene, order preserved). */
  lines: string[];
  /** Per-scene direction, 1:1 with lines. */
  directions: SceneDirection[];
  formatId: ExpertFormatId;
}

const INITIAL_STAGES: ExpertStage[] = [
  { id: 'avatar', label: 'Casting your presenter', status: 'pending' },
  { id: 'storyboard', label: 'Building the storyboard', status: 'pending' },
  { id: 'direction', label: 'Applying your scene direction', status: 'pending' },
  { id: 'scenes', label: 'Rendering scene visuals', status: 'pending' },
  { id: 'thumbnail', label: 'Designing the thumbnail', status: 'pending' },
  { id: 'videoPrompts', label: 'Prepping the video shots', status: 'pending' },
];

const SCENE_RENDER_DELAY_MS = 2500;

export interface UseExpertGeneration {
  stages: ExpertStage[];
  running: boolean;
  done: boolean;
  error: string | null;
  run: (params: ExpertGenParams, sinks: OneShotSinks) => Promise<boolean>;
  reset: () => void;
}

export const useExpertGeneration = (): UseExpertGeneration => {
  const [stages, setStages] = useState<ExpertStage[]>(INITIAL_STAGES);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runningRef = useRef(false);

  const patch = useCallback((id: ExpertStageId, status: StageStatus, detail?: string) => {
    setStages(prev => prev.map(s => (s.id === id ? { ...s, status, detail } : s)));
  }, []);

  const reset = useCallback(() => {
    setStages(INITIAL_STAGES.map(s => ({ ...s, status: 'pending', detail: undefined })));
    setRunning(false);
    setDone(false);
    setError(null);
  }, []);

  const run = useCallback(async (params: ExpertGenParams, sinks: OneShotSinks): Promise<boolean> => {
    if (runningRef.current) return false;
    runningRef.current = true;

    const { clientDetails, businessInfo, intake, lines, directions } = params;
    const language: 'English' | 'Taglish' = intake.language;
    const aspectRatio = intake.aspectRatio;
    setStages(INITIAL_STAGES.map(s => ({ ...s, status: 'pending', detail: undefined })));
    setRunning(true);
    setDone(false);
    setError(null);
    sinks.setLanguage(language);

    try {
      // The expert's lines ARE the script — no generation. Surface them as the script too.
      const finalScript = [...lines];
      sinks.setScript({ hook1: lines.slice(0, 1), hook2: [], body: lines.slice(1) });
      sinks.setFinalScript(finalScript);

      // 1 — Presenter: honor the uploaded avatar, else auto-cast (mirrors One-Shot).
      patch('avatar', 'running');
      let avatar: Avatar;
      if (intake.presenterMode === 'upload' && intake.avatarUrl) {
        avatar = {
          url: intake.avatarUrl,
          description: intake.castEthnicity?.trim() ? `A ${intake.castEthnicity.trim()} presenter` : 'An uploaded presenter',
          ethnicity: intake.castEthnicity ?? '',
          gender: intake.castGender,
          prompt: '',
        };
      } else {
        const { url, description } = await generateAvatarImage(
          businessInfo.audience, intake.castGender, intake.castAge ?? '', intake.castEthnicity ?? '',
          aspectRatio, '1K', [], businessInfo.scriptType,
        );
        avatar = { prompt: `Presenter for ${clientDetails.brandName}`, url, description, ethnicity: intake.castEthnicity ?? '', gender: intake.castGender };
      }
      sinks.setAvatar(avatar);
      patch('avatar', 'done');

      const avail: AssetAvailability = {
        hasAvatar: !!avatar.url,
        hasProduct: (businessInfo.productImageUrls?.length ?? 0) > 0,
      };

      // 2 — Storyboard from the expert's lines (critical).
      patch('storyboard', 'running');
      const storyboardResponse = await generateStoryboard(
        finalScript, avatar.description, businessInfo, avatar.ethnicity || 'Global/Neutral', language,
      );
      // F4 — force exactly N scenes = the expert's lines, in order.
      let scenes = reconcileSceneCount(storyboardResponse.scenes, finalScript);
      patch('storyboard', 'done', `${scenes.length} scenes`);

      // 3 — Apply the expert's per-scene direction (deterministic, no tuned edits).
      patch('direction', 'running');
      // Merge shot intent + anchor photo onto each scene by index.
      scenes = scenes.map((s, i) => ({
        ...s,
        shotIntent: directions[i]?.shotIntent ?? 'auto',
        manualUploadUrl: directions[i]?.manualUploadUrl ?? s.manualUploadUrl,
      }));
      // F1 — force referenceImage from shot intent (never dropping a needed reference).
      scenes = applyShotIntents(scenes, avail);
      // F2 — a directed scene's plain-language note becomes its optimized image prompt. These are
      // independent text calls (no ordering dependency), so run them concurrently. A directed scene
      // also DROPS any AI hook-morph frames so it renders as one image the expert controls (otherwise
      // only the start frame would honor the direction and the AI would author a divergent reveal).
      await Promise.all(scenes.map(async (s, i) => {
        const note = directions[i]?.description?.trim();
        if (!note || s.manualUploadUrl) return;
        try {
          const optimized = await optimizeImagePrompt(note, []);
          scenes[i] = {
            ...scenes[i],
            userImagePromptOverride: optimized.finalPrompt,
            startFramePrompt: undefined,
            endFramePrompt: undefined,
            transitionEffect: undefined,
          };
        } catch (err) {
          console.error(`Expert scene ${i} prompt optimize failed:`, err);
        }
      }));
      sinks.setStoryboard([...scenes]);
      patch('direction', 'done');

      // 4 — Scene visuals (best-effort). Skip scenes the expert anchored to their own photo.
      patch('scenes', 'running', `0 / ${scenes.length}`);
      let rendered = 0;
      let sceneFailures = 0;
      for (let i = 0; i < scenes.length; i++) {
        if (scenes[i].manualUploadUrl) {
          scenes[i] = { ...scenes[i], imageUrl: scenes[i].manualUploadUrl };
          rendered += 1;
        } else {
          try {
            await renderSceneImages(scenes[i], i, { aspectRatio, avatar, businessInfo });
            rendered += 1;
          } catch (err) {
            sceneFailures += 1;
            console.error(`Expert scene ${i} render failed:`, err);
          }
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

      // 5 — Thumbnail (best-effort).
      patch('thumbnail', 'running');
      try {
        const brandColors = businessInfo.brandColors ? businessInfo.brandColors.split(',').map(c => c.trim()) : [];
        const thumbnailUrl = await generateThumbnail(finalScript, avatar.description, businessInfo, aspectRatio, avatar.url, '1K', brandColors);
        sinks.setThumbnailUrl(thumbnailUrl);
        patch('thumbnail', 'done');
      } catch (err) {
        console.error('Expert thumbnail failed:', err);
        patch('thumbnail', 'error', 'Regenerate in review');
      }

      // 6 — Video prompts (best-effort), then force types from the expert's shot intents.
      patch('videoPrompts', 'running');
      try {
        const vp: VideoPrompt[] = await generateVideoPrompts(scenes, businessInfo);
        sinks.setVideoPrompts(overrideVideoPromptTypes(vp, scenes, avail));
        patch('videoPrompts', 'done');
      } catch (err) {
        console.error('Expert video prompts failed:', err);
        patch('videoPrompts', 'error', 'Regenerate in review');
      }

      setDone(true);
      return true;
    } catch (err: any) {
      const message = err?.message || 'Generation failed. Please try again.';
      setError(message);
      setStages(prev => prev.map(s => {
        if (s.status === 'running') return { ...s, status: 'error', detail: message };
        if (s.status === 'pending') return { ...s, status: 'skipped' };
        return s;
      }));
      return false;
    } finally {
      setRunning(false);
      runningRef.current = false;
    }
  }, [patch]);

  return { stages, running, done, error, run, reset };
};

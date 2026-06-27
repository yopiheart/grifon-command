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
}

const INITIAL_STAGES: OneShotStage[] = [
  { id: 'script', label: 'Writing your script', status: 'pending' },
  { id: 'avatar', label: 'Casting your spokesperson', status: 'pending' },
  { id: 'storyboard', label: 'Building the storyboard', status: 'pending' },
  { id: 'scenes', label: 'Rendering scene visuals', status: 'pending' },
  { id: 'thumbnail', label: 'Designing the thumbnail', status: 'pending' },
  { id: 'videoPrompts', label: 'Prepping the video shots', status: 'pending' },
];

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

    try {
      // 1 — Script (critical)
      patch('script', 'running');
      const script = await generateAdScript(businessInfo, clientDetails.brandName, language, clientDetails.offer, '', '');
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
          castHints?.ethnicity ?? '',
          aspectRatio,
          '1K',
          [],
          businessInfo.scriptType,
        );
        avatar = {
          prompt: `An avatar for an ad targeting ${businessInfo.audience}`,
          url,
          description,
          ethnicity: castHints?.ethnicity ?? '',
          gender: castHints?.gender ?? 'Any',
        };
      }
      sinks.setAvatar(avatar);
      patch('avatar', 'done');

      // 3 — Storyboard scenes (critical)
      patch('storyboard', 'running');
      const storyboardResponse = await generateStoryboard(
        finalScript,
        avatar.description,
        businessInfo,
        avatar.ethnicity || 'Global/Neutral',
        language,
      );
      const scenes = storyboardResponse.scenes;
      sinks.setStoryboard(scenes);
      patch('storyboard', 'done', `${scenes.length} scenes`);

      // 4 — Scene visuals (best-effort; one failure must not sink the plan)
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

      // 5 — Thumbnail (best-effort)
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
      setRunning(false);
      runningRef.current = false;
    }
  }, [patch]);

  return { stages, running, done, error, run, reset };
};

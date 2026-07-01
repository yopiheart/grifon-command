import type { AutopilotDeps } from './autopilotOrchestrator';
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
import { saveAutopilotRun, getCachedResearch, putCachedResearch } from './autopilotRunStore';

/**
 * The app's concrete Autopilot dependency set — binds the real tuned services to
 * the orchestrator's injected surface. Kept in a SEPARATE module from
 * autopilotOrchestrator.ts so that importing the orchestrator (e.g. in unit
 * tests) never eagerly pulls in geminiService/RenderAllRunner. The component
 * imports `realAutopilotDeps` and passes it to `runAutopilot`.
 */
export const realAutopilotDeps: AutopilotDeps = {
  generateMarketResearch,
  generateAdScript,
  generateStoryboard,
  generateSceneImage,
  generateVideoPrompts,
  generateEditDecisionList,
  consolidateVoices,
  renderFinalVideo,
  runQueue,
  persist: saveAutopilotRun,
  getCachedResearch,
  putCachedResearch,
  now: () => Date.now(),
};

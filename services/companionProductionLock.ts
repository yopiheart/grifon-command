import type { ProductionRun } from './producerOrchestrator';
import { slimCheckpointArtifacts } from './producerRunService';

export interface CompanionOperationReceipt { begin: () => void; settle: () => void }
const uncertain = 'An earlier production request could not be confirmed. Open saved history to view any finished output, or contact support before trying again. More production is blocked to avoid charging twice.';
const storageUnavailable = 'This browser cannot safely save a production receipt. Enable browser storage before starting production.';
const resumeArtifacts = (run: ProductionRun) => JSON.stringify(slimCheckpointArtifacts({ report: run.report, clientDetails: run.clientDetails, businessInfo: run.businessInfo, script: run.script, finalScript: run.finalScript, storyboard: run.storyboard, videoPrompts: run.videoPrompts, edl: run.edl }), (_key, value) => value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) : value);

/** Browser-local exclusion only; unresolved submissions survive a closed tab. */
export async function withCompanionProductionLock<T>(userId: string, identity: string, action: (receipt: CompanionOperationReceipt) => Promise<T>): Promise<T> {
  if (!navigator.locks) throw new Error('This browser cannot safely coordinate production between tabs. Open Grifon in an updated browser to continue.');
  return navigator.locks.request(`grifon-production:${userId}:${identity}`, { ifAvailable: true }, async lock => {
    if (!lock) throw new Error('This ad is already being updated in another tab. Wait for it to finish, then retry.');
    const key = `grifon-production-receipt:${userId}:${identity}`;
    let existing: string | null;
    try { existing = localStorage.getItem(key); } catch { throw new Error(storageUnavailable); }
    if (existing !== null) throw new Error(uncertain);
    let token: string | null = null;
    return action({
      begin: () => {
        if (token !== null) return;
        token = crypto.randomUUID();
        try {
          localStorage.setItem(key, token);
          if (localStorage.getItem(key) !== token) throw new Error(storageUnavailable);
        } catch { throw new Error(storageUnavailable); }
      },
      settle: () => {
        if (token === null) return;
        try {
          if (localStorage.getItem(key) !== token) throw new Error(uncertain);
          localStorage.removeItem(key);
          if (localStorage.getItem(key) !== null) throw new Error(uncertain);
        } catch { throw new Error(uncertain); }
      },
    });
  });
}

/** A fulfilled promise is insufficient: best-effort checkpoints can silently fail. */
export function canSettleCompanionRun(local: ProductionRun, saved: ProductionRun): boolean {
  if (local.error || local.busy || local.status === 'error' || local.runId !== saved.runId || local.userId !== saved.userId
    || local.status !== saved.status || local.gate !== saved.gate || !!local.storyboardApproved !== !!saved.storyboardApproved
    || local.presetId !== saved.presetId || (local.takesUsed ?? 0) !== (saved.takesUsed ?? 0)
    || local.finalVideoUrl !== saved.finalVideoUrl || local.finalDownloadUrl !== saved.finalDownloadUrl
    || local.thumbnailUrl !== saved.thumbnailUrl || local.input.avatar?.url !== saved.input.avatar?.url
    || local.input.heroImageBase64 !== saved.input.heroImageBase64 || resumeArtifacts(local) !== resumeArtifacts(saved)) return false;
  if (local.scenes.some(scene => (scene.status === 'flagged' && !(local.gate === 'storyboard' && !!scene.imageUrl
      && scene.flaggedReason?.startsWith('image_check:') && local.stages.find(stage => stage.id === 'scene_images')?.status === 'done')) || scene.status === 'rendering'
    || !saved.scenes.some(other => other.sceneIdx === scene.sceneIdx && other.imageUrl === scene.imageUrl
      && other.status === scene.status && other.flaggedReason === scene.flaggedReason
      && other.videoUrl === scene.videoUrl && other.audioUrl === scene.audioUrl))) return false;
  if (local.storyboard?.some((scene, index) => scene.endFrameImageUrl !== saved.storyboard?.[index]?.endFrameImageUrl)) return false;
  return local.stages.every(stage => {
    const durable = saved.stages.find(other => other.id === stage.id);
    if ((stage.error && stage.status !== 'done') || stage.status === 'failed' || stage.status !== durable?.status || stage.error !== durable?.error) return false;
    if (stage.status !== 'running') return true;
    // Stopping an image pool can leave its stage running after every image was saved.
    return stage.id === 'scene_images' && local.scenes.length > 0 && local.scenes.every(scene => !!scene.imageUrl)
      && !!local.storyboard?.every(scene => !scene.endFramePrompt || !!scene.endFrameImageUrl);
  });
}

import { getSupabaseAdmin } from './supabaseAdmin.js';
import { resolveSelectedReference, validateReferenceBrief } from '../../services/adReconBrief.js';
import type { FinalRenderLineage, FinalRenderRequest, FinalRenderScene } from '../../types.js';

export class RenderLineageError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Bind submitted clips and selected references to an authenticated owner's durable run. */
export async function resolveRenderLineage(
  userId: string,
  producerRunId: string,
  scenes: ReadonlyArray<Pick<FinalRenderScene, 'sceneIdx' | 'videoUrl'>>,
  expectedReference?: FinalRenderRequest['expectedReference'],
): Promise<FinalRenderLineage> {
  const admin = getSupabaseAdmin();
  const { data: run, error } = await admin.from('producer_runs')
    .select('run_id,user_id,input,revision').eq('run_id', producerRunId).eq('user_id', userId).maybeSingle();
  if (error) throw new RenderLineageError(500, 'producer_read_failed');
  if (!run || run.user_id !== userId) throw new RenderLineageError(404, 'producer_run_not_found');
  if (!Number.isInteger(run.revision) || run.revision < 0 || !run.input || typeof run.input !== 'object' || Array.isArray(run.input)) {
    throw new RenderLineageError(409, 'producer_input_invalid');
  }

  const lineage: FinalRenderLineage = { version: 1, producerRunId: run.run_id, runRevision: run.revision };
  try {
    const input = run.input as Record<string, unknown>;
    if (input.referenceBrief !== undefined && input.referenceBrief !== null) {
      const brief = validateReferenceBrief(input.referenceBrief);
      if (brief.selectedConceptId) {
        for (const key of ['brandName', 'productName', 'offer']) {
          if (typeof input[key] !== 'string' || !(input[key] as string).trim()) throw new Error('Missing stored subject');
        }
        const concept = resolveSelectedReference(brief, {
          brandName: input.brandName as string, productName: input.productName as string, offer: input.offer as string,
        });
        if (concept) lineage.reference = { packetId: brief.packet.id, conceptId: concept.id,
          sourceIds: [...concept.sourceIds], observationIds: [...concept.observationIds], evidence: 'owner-recorded',
          sources: concept.sourceIds.map(id => {
            const source = brief.packet.sources.find(item => item.id === id)!;
            const competitor = brief.packet.competitors.find(item => item.id === source.competitorId)!;
            return { id: source.id, libraryId: source.libraryId, pageId: competitor.pageId,
              sourceUrl: source.sourceUrl, observedAt: source.observedAt };
          }) };
      }
    }
  } catch {
    throw new RenderLineageError(409, 'producer_reference_invalid');
  }
  if (expectedReference && (expectedReference.packetId !== lineage.reference?.packetId || expectedReference.conceptId !== lineage.reference?.conceptId)) {
    throw new RenderLineageError(409, 'producer_reference_mismatch');
  }

  const { data: storedScenes, error: sceneError } = await admin.from('producer_scenes')
    .select('scene_idx,status,video_url').eq('run_id', producerRunId);
  if (sceneError) throw new RenderLineageError(500, 'producer_read_failed');
  if (!Array.isArray(storedScenes) || scenes.some(scene => !storedScenes.some(stored =>
    stored.scene_idx === scene.sceneIdx && stored.status === 'done' && stored.video_url === scene.videoUrl))) {
    throw new RenderLineageError(409, 'producer_scene_mismatch');
  }
  return lineage;
}

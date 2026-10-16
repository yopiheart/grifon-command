import { isReferenceDraft } from './companionReferenceDraft.js';
import type { CompanionReferenceDraft } from './companionReferenceDraft.js';
import { createSampleReview } from './companionReferenceReview.js';
import type { ReferenceReview } from './companionReferenceReview.js';
import { isCreativeSource, selectFixtureCreativeRecipe } from './companionCreativeLibrary.js';
import type { CreativeSource, CreativeShot } from './companionCreativeLibrary.js';
import { CREATIVE_MESSAGING_NOTICE, CREATIVE_MISSING_OBJECTIVE, createCreativeDependencyNodes, isCreativePlan } from './companionCreativePlan.js';
import type { CreativePlan } from './companionCreativePlan.js';

type CreativeDraft = CompanionReferenceDraft & { creativeSource?: CreativeSource };
export type CreativeSampleReview = ReferenceReview & { creativePlan?: CreativePlan };

function sampleSpeech(shot: CreativeShot): string {
  if (shot.role === 'presenter') return 'Sample opening: take a closer look.';
  if (shot.role === 'detail') return 'Sample detail: show one visible feature clearly.';
  if (shot.role === 'cta') return 'Sample next step: explore the details before you decide.';
  return 'Sample introduction: show the product identity clearly.';
}

export function createCreativeSampleReview(draft: CreativeDraft, inputHash: string, inputRevision: number, previousRevision = 0): CreativeSampleReview {
  if (draft.creativeSource === undefined) return createSampleReview(draft, inputHash, inputRevision, previousRevision);
  if (!isReferenceDraft(draft) || !isCreativeSource(draft.creativeSource)) throw new Error('Use a valid fixture creative source and saved brief.');
  if (!/^[a-f0-9]{64}$/.test(inputHash) || !Number.isSafeInteger(inputRevision) || inputRevision < 0 || !Number.isSafeInteger(previousRevision) || previousRevision < 0) throw new Error('Use the exact current input hash and revision.');
  const selection = selectFixtureCreativeRecipe(draft.creativeSource, draft);
  if (selection.status !== 'selected') throw new Error(selection.reasons.join(' '));
  const recipe = selection.recipe;
  const review = createSampleReview(draft, inputHash, inputRevision, previousRevision);
  const spoken = review.speechMode === 'spoken';
  const missing = review.missing.filter(item => item !== 'Reference video or link');
  const creativePlan: CreativePlan = {
    version: 1, fixture: true, productionEligible: false, inputHash, inputRevision,
    adaptationMode: review.adaptationMode, speechMode: review.speechMode,
    source: { mode: draft.creativeSource.mode, category: recipe.category, recipeId: recipe.id, recipeVersion: recipe.version, provenance: recipe.provenance, referenceAnalysis: 'not-run' },
    selection: { reasons: [...selection.reasons], productionAutoEligible: false }, sampleLanguage: 'English',
    editDNA: {
      basis: 'illustrative-recipe', durationSeconds: recipe.shots[recipe.shots.length - 1].endSeconds,
      signatureTraits: [...recipe.signatureTraits],
      preserve: ['Recipe shot order, base durations and closing hold are illustrative edit guidance.', 'Keep the selected recipe signature traits recognizable in the editable visual plan.'],
      adapt: review.adaptationMode === 'close'
        ? ['Match the illustrative recipe structure closely; substitute the user product and identity.', 'All messaging and the call to action still require brand-specific review.']
        : ['Adapt the script, on-screen text and visual emphasis to the supplied brand facts.', 'Keep the recipe shot order and signature traits as the recognizable starting point.'],
      shots: recipe.shots.map(shot => ({ ...shot, cues: [...shot.cues] })),
    },
    brandStrategy: {
      facts: review.facts.map(fact => ({ ...fact })), missing, researchStatus: 'not-run',
      objective: draft.callToAction.trim() ? draft.callToAction : CREATIVE_MISSING_OBJECTIVE,
      messaging: CREATIVE_MESSAGING_NOTICE,
    },
    bindings: draft.photos.map(photo => ({
      photoId: photo.id, role: photo.role, identityAnchor: true,
      preserve: photo.role === 'character' ? ['Preserve the supplied character identity; no face analysis has run.']
        : photo.role === 'clothing' ? ['Preserve the supplied garment shape, pattern and visible identity; no image analysis has run.']
          : ['Preserve the supplied product shape, label and visible identity; no image analysis has run.'],
    })),
    audio: {
      selectedVoice: draft.voice ? { ...draft.voice } : null, voiceUsed: spoken && draft.voice !== null,
      routes: recipe.shots.map(shot => ({ shotId: shot.id, route: !spoken ? 'none' : shot.role === 'presenter' ? 'voice-conversion' : 'text-to-speech', voiceId: spoken ? draft.voice?.id ?? null : null })),
      music: 'planned-original-instrumental', sfx: 'planned-cues-not-generated',
    },
    execution: { mode: 'metadata-only', providerCalls: 0, actualCents: 0, nodes: createCreativeDependencyNodes(recipe.shots, spoken) },
  };
  if (!isCreativePlan(creativePlan)) throw new Error('The fixture creative plan could not be validated.');
  return {
    ...review, creativePlan, missing,
    direction: `Sample direction: ${recipe.name}. The original synthetic recipe supplies illustrative shot order, timing, typography and cues. Uploaded references and photos were not analyzed. The editable scenes below are the current review timeline; the recipe blueprint remains base guidance.`,
    scenes: recipe.shots.map(shot => ({ id: shot.id, start: String(shot.startSeconds), end: String(shot.endSeconds), script: spoken ? sampleSpeech(shot) : '', visual: `Sample: ${shot.framing} ${shot.camera} ${shot.cut} ${shot.typography}` })),
  };
}

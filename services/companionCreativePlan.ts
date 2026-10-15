import { getFixtureCreativeRecipe } from './companionCreativeLibrary.js';
import type { CreativeCategory, CreativeShot } from './companionCreativeLibrary.js';
import type { ReferenceVoice } from './companionReferenceDraft.js';

export interface CreativeDependencyNode {
  id: string;
  kind: 'source' | 'strategy' | 'identity' | 'script' | 'visual' | 'voice' | 'music' | 'sfx' | 'assembly' | 'qa';
  dependsOn: string[];
  inputs: string[];
}
export interface CreativePlan {
  version: 1;
  fixture: true;
  productionEligible: false;
  inputHash: string;
  inputRevision: number;
  adaptationMode: 'adapt' | 'close';
  speechMode: 'spoken' | 'silent';
  source: { mode: 'fixture-recipe' | 'fixture-auto'; category: CreativeCategory; recipeId: string; recipeVersion: 1; provenance: 'original-synthetic-fixture'; referenceAnalysis: 'not-run' };
  selection: { reasons: string[]; productionAutoEligible: false };
  sampleLanguage: 'English';
  // The recipe blueprint is immutable guidance. review.scenes is the editable timeline.
  editDNA: { basis: 'illustrative-recipe'; durationSeconds: number; signatureTraits: string[]; preserve: string[]; adapt: string[]; shots: CreativeShot[] };
  brandStrategy: { facts: { label: string; value: string }[]; missing: string[]; researchStatus: 'not-run'; objective: string; messaging: string };
  bindings: { photoId: string; role: 'product' | 'character' | 'clothing'; identityAnchor: true; preserve: string[] }[];
  audio: {
    selectedVoice: ReferenceVoice | null;
    voiceUsed: boolean;
    routes: { shotId: string; route: 'voice-conversion' | 'text-to-speech' | 'none'; voiceId: string | null }[];
    music: 'planned-original-instrumental';
    sfx: 'planned-cues-not-generated';
  };
  execution: { mode: 'metadata-only'; providerCalls: 0; actualCents: 0; nodes: CreativeDependencyNode[] };
}

export const CREATIVE_FACT_LABELS = ['Brief', 'Brand', 'Product or service', 'Audience', 'Offer', 'Call to action', 'Instructions'] as const;
export const CREATIVE_MISSING_OBJECTIVE = 'Missing call to action; choose the next step during review.';
export const CREATIVE_MESSAGING_NOTICE = 'Only the seven user-supplied facts are recorded here. No market research, claim verification, conversion prediction or reference analysis has run. English sample speech is illustrative, even when another output language is selected.';
export function createCreativeDependencyNodes(shots: readonly Pick<CreativeShot, 'id'>[], spoken: boolean): CreativeDependencyNode[] {
  const nodes: CreativeDependencyNode[] = [
    { id: 'source', kind: 'source', dependsOn: [], inputs: ['source'] },
    { id: 'strategy', kind: 'strategy', dependsOn: ['source'], inputs: ['brand'] },
    { id: 'identity', kind: 'identity', dependsOn: [], inputs: ['photos'] },
  ];
  for (const shot of shots) {
    nodes.push({ id: `script:${shot.id}`, kind: 'script', dependsOn: ['strategy'], inputs: [`shot:${shot.id}:script`, 'speech'] });
    nodes.push({ id: `visual:${shot.id}`, kind: 'visual', dependsOn: ['source', 'identity'], inputs: [`shot:${shot.id}:visual`, 'timing'] });
    if (spoken) nodes.push({ id: `voice:${shot.id}`, kind: 'voice', dependsOn: [`script:${shot.id}`], inputs: ['voice', 'speech', 'timing'] });
  }
  nodes.push(
    { id: 'music', kind: 'music', dependsOn: ['source'], inputs: ['music', 'timing'] },
    { id: 'sfx', kind: 'sfx', dependsOn: ['source'], inputs: ['sfx', 'timing'] },
    { id: 'assembly', kind: 'assembly', dependsOn: [...shots.map(shot => `visual:${shot.id}`), ...(spoken ? shots.map(shot => `voice:${shot.id}`) : []), 'music', 'sfx'], inputs: ['typography', 'timing', 'speech'] },
    { id: 'qa', kind: 'qa', dependsOn: ['assembly'], inputs: [] },
  );
  return nodes;
}

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const keys = (value: Record<string, unknown>, allowed: string[]) => Object.keys(value).length === allowed.length && allowed.every(key => Object.prototype.hasOwnProperty.call(value, key));
const text = (value: unknown, max = 4000): value is string => typeof value === 'string' && value.length <= max;
const nonempty = (value: unknown, max = 4000): value is string => text(value, max) && !!value.trim();
const strings = (value: unknown, limit: number, max = 4000): value is string[] => Array.isArray(value) && value.length <= limit && value.every(item => nonempty(item, max));
function same(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (Array.isArray(right)) return Array.isArray(left) && left.length === right.length && right.every((item, index) => same(left[index], item));
  if (record(right)) return record(left) && keys(left, Object.keys(right)) && Object.keys(right).every(key => same(left[key], right[key]));
  return false;
}
const validVoice = (value: unknown): value is ReferenceVoice => record(value) && keys(value, ['id', 'name', 'source']) && nonempty(value.id, 200) && nonempty(value.name, 200) && ['curated', 'private'].includes(value.source as string);

export function isCreativePlan(value: unknown): value is CreativePlan {
  if (!record(value) || !keys(value, ['version', 'fixture', 'productionEligible', 'inputHash', 'inputRevision', 'adaptationMode', 'speechMode', 'source', 'selection', 'sampleLanguage', 'editDNA', 'brandStrategy', 'bindings', 'audio', 'execution'])
    || value.version !== 1 || value.fixture !== true || value.productionEligible !== false || value.sampleLanguage !== 'English'
    || typeof value.inputHash !== 'string' || !/^[a-f0-9]{64}$/.test(value.inputHash) || !Number.isSafeInteger(value.inputRevision) || (value.inputRevision as number) < 0
    || !['adapt', 'close'].includes(value.adaptationMode as string) || !['spoken', 'silent'].includes(value.speechMode as string)) return false;
  const source = value.source;
  if (!record(source) || !keys(source, ['mode', 'category', 'recipeId', 'recipeVersion', 'provenance', 'referenceAnalysis'])
    || !['fixture-recipe', 'fixture-auto'].includes(source.mode as string) || !nonempty(source.recipeId, 100) || source.recipeVersion !== 1
    || source.provenance !== 'original-synthetic-fixture' || source.referenceAnalysis !== 'not-run') return false;
  const recipe = getFixtureCreativeRecipe(source.recipeId, source.recipeVersion);
  if (!recipe || source.category !== recipe.category) return false;
  const selection = value.selection;
  if (!record(selection) || !keys(selection, ['reasons', 'productionAutoEligible']) || !strings(selection.reasons, 8, 1000) || !selection.reasons.length || selection.productionAutoEligible !== false) return false;
  const dna = value.editDNA;
  if (!record(dna) || !keys(dna, ['basis', 'durationSeconds', 'signatureTraits', 'preserve', 'adapt', 'shots']) || dna.basis !== 'illustrative-recipe'
    || !Number.isFinite(dna.durationSeconds) || (dna.durationSeconds as number) <= 0 || (dna.durationSeconds as number) > 60
    || !strings(dna.signatureTraits, 12, 500) || !strings(dna.preserve, 12, 1000) || !strings(dna.adapt, 12, 1000)
    || !dna.preserve.length || !dna.adapt.length || !Array.isArray(dna.shots) || dna.shots.length < 1 || dna.shots.length > 12) return false;
  if (!same(dna.shots, recipe.shots) || !same(dna.signatureTraits, recipe.signatureTraits) || dna.durationSeconds !== recipe.shots[recipe.shots.length - 1].endSeconds) return false;
  const strategy = value.brandStrategy;
  if (!record(strategy) || !keys(strategy, ['facts', 'missing', 'researchStatus', 'objective', 'messaging']) || strategy.researchStatus !== 'not-run'
    || !nonempty(strategy.objective) || !nonempty(strategy.messaging) || !strings(strategy.missing, 10, 100)
    || !Array.isArray(strategy.facts) || strategy.facts.length !== CREATIVE_FACT_LABELS.length
    || !strategy.facts.every((fact, index) => record(fact) && keys(fact, ['label', 'value']) && fact.label === CREATIVE_FACT_LABELS[index] && text(fact.value))) return false;
  const callToAction = strategy.facts[5].value as string;
  if (strategy.objective !== (callToAction.trim() ? callToAction : CREATIVE_MISSING_OBJECTIVE) || strategy.messaging !== CREATIVE_MESSAGING_NOTICE) return false;
  if (!Array.isArray(value.bindings) || value.bindings.length < 1 || value.bindings.length > 5
    || !value.bindings.every(binding => record(binding) && keys(binding, ['photoId', 'role', 'identityAnchor', 'preserve']) && nonempty(binding.photoId, 200)
      && ['product', 'character', 'clothing'].includes(binding.role as string) && binding.identityAnchor === true && strings(binding.preserve, 8, 1000) && binding.preserve.length)
    || new Set(value.bindings.map(binding => binding.photoId)).size !== value.bindings.length
    || !recipe.requiredRoles.every(role => (value.bindings as CreativePlan['bindings']).some(binding => binding.role === role))) return false;
  const audio = value.audio;
  if (!record(audio) || !keys(audio, ['selectedVoice', 'voiceUsed', 'routes', 'music', 'sfx']) || (audio.selectedVoice !== null && !validVoice(audio.selectedVoice))
    || typeof audio.voiceUsed !== 'boolean' || audio.music !== 'planned-original-instrumental' || audio.sfx !== 'planned-cues-not-generated'
    || !Array.isArray(audio.routes) || audio.routes.length !== recipe.shots.length) return false;
  const spoken = value.speechMode === 'spoken';
  const selectedVoice = audio.selectedVoice as ReferenceVoice | null;
  if (audio.voiceUsed !== (spoken && selectedVoice !== null)) return false;
  if (!audio.routes.every((route, index) => {
    if (!record(route) || !keys(route, ['shotId', 'route', 'voiceId']) || route.shotId !== recipe.shots[index].id) return false;
    const expectedRoute = !spoken ? 'none' : recipe.shots[index].role === 'presenter' ? 'voice-conversion' : 'text-to-speech';
    return route.route === expectedRoute && route.voiceId === (spoken ? selectedVoice?.id ?? null : null);
  })) return false;
  const execution = value.execution;
  return record(execution) && keys(execution, ['mode', 'providerCalls', 'actualCents', 'nodes']) && execution.mode === 'metadata-only'
    && execution.providerCalls === 0 && execution.actualCents === 0 && same(execution.nodes, createCreativeDependencyNodes(recipe.shots, spoken));
}

export function revisionImpact(plan: unknown, changedInputs: string[]): { invalidated: string[]; reused: string[] } {
  if (!isCreativePlan(plan)) throw new Error('Use a valid fixture creative plan for revision impact.');
  const allowed = new Set(['source', 'brand', 'photos', 'voice', 'speech', 'timing', 'music', 'sfx', 'typography', ...plan.editDNA.shots.flatMap(shot => [`shot:${shot.id}:script`, `shot:${shot.id}:visual`])]);
  if (!Array.isArray(changedInputs) || changedInputs.length > 40 || changedInputs.some(input => !allowed.has(input))) throw new Error('Unknown fixture revision input.');
  const changes = new Set(changedInputs);
  const invalidated = new Set<string>();
  // Nodes are topologically ordered; this computes impact only and executes nothing.
  for (const node of plan.execution.nodes) if (node.inputs.some(input => changes.has(input)) || node.dependsOn.some(id => invalidated.has(id))) invalidated.add(node.id);
  return { invalidated: plan.execution.nodes.filter(node => invalidated.has(node.id)).map(node => node.id), reused: plan.execution.nodes.filter(node => !invalidated.has(node.id)).map(node => node.id) };
}

import type { CompanionReferenceDraft } from './companionReferenceDraft.js';

export type CreativeCategory = 'ugc' | 'motion-launch' | 'cinematic-spec';
export type CreativeSource =
  | { version: 1; mode: 'fixture-recipe'; category: CreativeCategory; recipeId: string; recipeVersion: 1 }
  | { version: 1; mode: 'fixture-auto'; category: CreativeCategory };
export interface CreativeShot {
  id: string;
  startSeconds: number;
  endSeconds: number;
  role: 'presenter' | 'product' | 'detail' | 'cta';
  framing: string;
  camera: string;
  cut: string;
  typography: string;
  cues: readonly string[];
}
export interface FixtureCreativeRecipe {
  id: string;
  version: 1;
  category: CreativeCategory;
  name: string;
  description: string;
  provenance: 'original-synthetic-fixture';
  fixtureSelectable: true;
  productionAutoEligible: false;
  requiredRoles: readonly ('product' | 'character' | 'clothing')[];
  signatureTraits: readonly string[];
  shots: readonly CreativeShot[];
}

function freezeRecipe(recipe: FixtureCreativeRecipe): FixtureCreativeRecipe {
  recipe.shots.forEach(shot => { Object.freeze(shot.cues); Object.freeze(shot); });
  Object.freeze(recipe.shots); Object.freeze(recipe.requiredRoles); Object.freeze(recipe.signatureTraits);
  return Object.freeze(recipe);
}

// Original synthetic examples, not creator-derived evidence or production presets.
export const FIXTURE_CREATIVE_RECIPES: readonly FixtureCreativeRecipe[] = Object.freeze([
  freezeRecipe({
    id: 'fixture-ugc-detail-v1', version: 1, category: 'ugc', name: 'UGC detail sequence',
    description: 'Illustrative presenter opening, product detail and clear next step. No rendered recipe sample is available.',
    provenance: 'original-synthetic-fixture', fixtureSelectable: true, productionAutoEligible: false, requiredRoles: ['character', 'product'],
    signatureTraits: ['Presenter first', 'Deliberate detail hold', 'Simple closing product frame'],
    shots: [
      { id: 'intro', startSeconds: 0, endSeconds: 4, role: 'presenter', framing: 'Medium presenter framing with the product visible.', camera: 'Mostly static handheld framing.', cut: 'Direct opening cut.', typography: 'Short opening label inside safe margins.', cues: ['Opening accent'] },
      { id: 'detail', startSeconds: 4, endSeconds: 12, role: 'detail', framing: 'Close detail selected from the supplied product photo.', camera: 'Restrained forward move.', cut: 'Hard cut from presenter to detail.', typography: 'One brief factual label, pending approval.', cues: ['Detail cut accent'] },
      { id: 'close', startSeconds: 12, endSeconds: 20, role: 'cta', framing: 'Product identity with space for the approved call to action.', camera: 'Static closing hold.', cut: 'Clean cut into a closing hold.', typography: 'Approved next step and brand identity.', cues: ['Closing resolution'] },
    ],
  }),
  freezeRecipe({
    id: 'fixture-motion-launch-v1', version: 1, category: 'motion-launch', name: 'Motion launch sequence',
    description: 'Illustrative type entrance, product reveal, detail card and end card. No rendered recipe sample is available.',
    provenance: 'original-synthetic-fixture', fixtureSelectable: true, productionAutoEligible: false, requiredRoles: ['product'],
    signatureTraits: ['Type leads the opening', 'Centered product reveal', 'One detail card', 'Quiet end card'],
    shots: [
      { id: 'intro', startSeconds: 0, endSeconds: 3, role: 'product', framing: 'Simple graphic field with room for a product title.', camera: 'Flat graphic composition.', cut: 'Type entrance into the first hold.', typography: 'One short title with a measured entrance.', cues: ['Title accent'] },
      { id: 'reveal', startSeconds: 3, endSeconds: 7, role: 'product', framing: 'Centered product identity from its supplied photo.', camera: 'Subtle scale change without distorting the product.', cut: 'Reveal on the illustrative music cue.', typography: 'Product name remains readable.', cues: ['Reveal accent'] },
      { id: 'detail', startSeconds: 7, endSeconds: 12, role: 'detail', framing: 'One product detail beside a compact factual label.', camera: 'Small lateral graphic move.', cut: 'Clean cut to the detail card.', typography: 'One approved factual detail.', cues: ['Card transition'] },
      { id: 'close', startSeconds: 12, endSeconds: 15, role: 'cta', framing: 'Simple brand and product end card.', camera: 'Static hold.', cut: 'Resolve to the final card.', typography: 'Approved call to action.', cues: ['Closing resolution'] },
    ],
  }),
  freezeRecipe({
    id: 'fixture-cinematic-spec-v1', version: 1, category: 'cinematic-spec', name: 'Cinematic product sequence',
    description: 'Illustrative atmosphere, product anchor, macro detail and hero finale. No rendered recipe sample is available.',
    provenance: 'original-synthetic-fixture', fixtureSelectable: true, productionAutoEligible: false, requiredRoles: ['product'],
    signatureTraits: ['Atmospheric opening', 'Recognizable product anchor', 'Macro detail', 'Hero finale'],
    shots: [
      { id: 'intro', startSeconds: 0, endSeconds: 3, role: 'product', framing: 'Restrained atmospheric product silhouette.', camera: 'Slow lateral movement.', cut: 'Open on a deliberate hold.', typography: 'Minimal opening identity.', cues: ['Atmosphere rise'] },
      { id: 'anchor', startSeconds: 3, endSeconds: 6, role: 'product', framing: 'Clear product silhouette, label and proportions.', camera: 'Small orbit, pending real asset feasibility.', cut: 'Direct cut to the recognizable product anchor.', typography: 'Product identity only.', cues: ['Anchor accent'] },
      { id: 'detail', startSeconds: 6, endSeconds: 11, role: 'detail', framing: 'Macro detail visible in the supplied product photo.', camera: 'Slow push toward the selected detail.', cut: 'Measured detail cut.', typography: 'Optional approved factual detail.', cues: ['Detail accent'] },
      { id: 'close', startSeconds: 11, endSeconds: 15, role: 'cta', framing: 'Hero product finale with unobstructed identity.', camera: 'Static finale hold.', cut: 'Resolve into the hero frame.', typography: 'Brand identity and approved next step.', cues: ['Closing resolution'] },
    ],
  }),
]);

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(value, key));
export function getFixtureCreativeRecipe(id: string, version: number): FixtureCreativeRecipe | null {
  return FIXTURE_CREATIVE_RECIPES.find(recipe => recipe.id === id && recipe.version === version) ?? null;
}
export function isCreativeSource(value: unknown): value is CreativeSource {
  if (!record(value) || value.version !== 1 || !['ugc', 'motion-launch', 'cinematic-spec'].includes(value.category as string)) return false;
  if (value.mode === 'fixture-auto') return exactKeys(value, ['version', 'mode', 'category']);
  if (value.mode !== 'fixture-recipe' || !exactKeys(value, ['version', 'mode', 'category', 'recipeId', 'recipeVersion']) || typeof value.recipeId !== 'string' || value.recipeVersion !== 1) return false;
  return getFixtureCreativeRecipe(value.recipeId, value.recipeVersion)?.category === value.category;
}

export type FixtureCreativeSelection =
  | { status: 'selected'; recipe: FixtureCreativeRecipe; reasons: string[] }
  | { status: 'no-eligible'; reasons: string[] };

export function selectFixtureCreativeRecipe(source: CreativeSource, draft: Pick<CompanionReferenceDraft, 'photos'>, purpose: 'fixture' | 'production-auto' = 'fixture'): FixtureCreativeSelection {
  if (!isCreativeSource(source)) return { status: 'no-eligible', reasons: ['The fixture recipe source or version is unknown.'] };
  if (purpose !== 'fixture') return { status: 'no-eligible', reasons: ['Original fixture recipes are excluded from production Auto. No production eligibility or sales performance has been established.'] };
  const roles = new Set(draft.photos.map(photo => photo.role));
  const candidates = FIXTURE_CREATIVE_RECIPES.filter(recipe => recipe.category === source.category && (source.mode === 'fixture-auto' || (recipe.id === source.recipeId && recipe.version === source.recipeVersion)));
  const eligible = candidates.filter(recipe => recipe.requiredRoles.every(role => roles.has(role)))
    .sort((left, right) => right.requiredRoles.length - left.requiredRoles.length || left.id.localeCompare(right.id, 'en') || left.version - right.version);
  if (!eligible.length) {
    const missing = [...new Set(candidates.flatMap(recipe => recipe.requiredRoles.filter(role => !roles.has(role))))];
    return { status: 'no-eligible', reasons: [`No eligible ${source.category} fixture recipe. Add ${missing.join(' and ') || 'the required'} photo roles before preparing this sample.`] };
  }
  return { status: 'selected', recipe: eligible[0], reasons: [
    `Selected an original ${source.category} fixture example with the required ${eligible[0].requiredRoles.join(' and ')} photo roles.`,
    source.mode === 'fixture-auto' ? 'Fixture Auto uses declared photo roles and stable recipe ID/version ordering. It does not predict sales or use production Auto.' : 'The exact fixture recipe ID and version were selected manually.',
  ] };
}

import { describe, expect, it } from 'vitest';
import { createReferenceDraft } from '../../services/companionReferenceDraft.js';
import { FIXTURE_CREATIVE_RECIPES, getFixtureCreativeRecipe, isCreativeSource, selectFixtureCreativeRecipe } from '../../services/companionCreativeLibrary.js';

const photo = (id: string, role: 'product' | 'character' | 'clothing') => ({ id, role, name: `${id}.png`, blob: new Blob(['fixture'], { type: 'image/png' }), width: 1, height: 1 });
const draft = () => ({ ...createReferenceDraft(), photos: [photo('product', 'product'), photo('person', 'character')] });

describe('original fixture creative library', () => {
  it('contains one versioned original synthetic recipe per category without production or creator claims', () => {
    expect(FIXTURE_CREATIVE_RECIPES).toHaveLength(3);
    expect(new Set(FIXTURE_CREATIVE_RECIPES.map(recipe => recipe.category))).toEqual(new Set(['ugc', 'motion-launch', 'cinematic-spec']));
    for (const recipe of FIXTURE_CREATIVE_RECIPES) {
      expect(recipe.version).toBe(1);
      expect(recipe.provenance).toBe('original-synthetic-fixture');
      expect(recipe.fixtureSelectable).toBe(true);
      expect(recipe.productionAutoEligible).toBe(false);
      expect(getFixtureCreativeRecipe(recipe.id, recipe.version)).toBe(recipe);
    }
    expect(getFixtureCreativeRecipe('unknown', 1)).toBeNull();
    expect(getFixtureCreativeRecipe(FIXTURE_CREATIVE_RECIPES[0].id, 2)).toBeNull();
  });

  it('validates a narrow source contract and never treats extra recipe fields as authority', () => {
    const manual = { version: 1, mode: 'fixture-recipe', category: 'ugc', recipeId: FIXTURE_CREATIVE_RECIPES[0].id, recipeVersion: 1 };
    expect(isCreativeSource(manual)).toBe(true);
    expect(isCreativeSource({ version: 1, mode: 'fixture-auto', category: 'ugc' })).toBe(true);
    for (const value of [{ ...manual, recipeVersion: 2 }, { ...manual, recipeId: 'unknown' }, { ...manual, category: 'motion-launch' }, { ...manual, modelId: 'unapproved' }, { version: 1, mode: 'production-auto', category: 'ugc' }, { version: 1, mode: 'fixture-auto', category: 'ugc', recipeId: manual.recipeId }]) expect(isCreativeSource(value)).toBe(false);
  });

  it('selects deterministically, gives eligibility reasons, and handles missing photo roles without substitution', () => {
    const source = { version: 1 as const, mode: 'fixture-auto' as const, category: 'ugc' as const };
    const selected = selectFixtureCreativeRecipe(source, draft());
    expect(selected.status).toBe('selected');
    expect(selectFixtureCreativeRecipe(source, draft())).toEqual(selected);
    expect(selected.reasons.join(' ')).toContain('fixture');
    const absent = selectFixtureCreativeRecipe(source, { ...draft(), photos: [photo('product', 'product')] });
    expect(absent.status).toBe('no-eligible');
    expect(absent.reasons.join(' ')).toContain('character');
    const none = selectFixtureCreativeRecipe({ ...source, category: 'motion-launch' }, { ...draft(), photos: [] });
    expect(none.status).toBe('no-eligible');
  });

  it('excludes every fixture recipe from production Auto even when inputs fit', () => {
    for (const category of ['ugc', 'motion-launch', 'cinematic-spec'] as const) {
      const result = selectFixtureCreativeRecipe({ version: 1, mode: 'fixture-auto', category }, draft(), 'production-auto');
      expect(result.status).toBe('no-eligible');
      expect(result.reasons.join(' ')).toContain('production Auto');
    }
  });
});

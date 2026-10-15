import { GlassPanel } from '../ui/GlassPanel';
import { FIXTURE_CREATIVE_RECIPES, getFixtureCreativeRecipe, type CreativeCategory, type CreativeSource } from '../../services/companionCreativeLibrary.js';

const selectStyle = 'mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]';
const categories: { id: CreativeCategory; name: string }[] = [{ id: 'ugc', name: 'UGC' }, { id: 'motion-launch', name: 'Motion launch' }, { id: 'cinematic-spec', name: 'Cinematic spec ad' }];

export function CompanionCreativeSource({ source, disabled, onChange }: { source?: CreativeSource; disabled: boolean; onChange: (source?: CreativeSource) => void }) {
  const category = source?.category ?? 'ugc';
  const recipes = FIXTURE_CREATIVE_RECIPES.filter(recipe => recipe.category === category);
  const recipe = source?.mode === 'fixture-recipe' ? getFixtureCreativeRecipe(source.recipeId, source.recipeVersion) : null;
  const select = (mode: 'uploaded-reference' | CreativeSource['mode'], nextCategory = category) => {
    if (mode === 'uploaded-reference') { onChange(); return; }
    if (mode === 'fixture-auto') { onChange({ version: 1, mode, category: nextCategory }); return; }
    const nextRecipe = FIXTURE_CREATIVE_RECIPES.find(item => item.category === nextCategory);
    if (nextRecipe) onChange({ version: 1, mode, category: nextCategory, recipeId: nextRecipe.id, recipeVersion: nextRecipe.version });
  };
  return <GlassPanel className="space-y-4 p-4 sm:p-5" aria-label="Creative source choices">
    <h2 className="!text-base !font-semibold !normal-case !tracking-normal">Creative source</h2>
    <label className="block text-sm text-zinc-400">Creative source<select aria-label="Creative source" className={selectStyle} disabled={disabled} value={source?.mode ?? 'uploaded-reference'} onChange={event => select(event.target.value as 'uploaded-reference' | CreativeSource['mode'])}><option value="uploaded-reference">My uploaded reference</option><option value="fixture-recipe">Choose a fixture recipe</option><option value="fixture-auto">Fixture Auto</option></select></label>
    <p className="text-xs leading-relaxed text-zinc-400">Production Auto is unavailable. Fixture Auto does not predict sales.</p>
    {source ? <>
      <label className="block text-sm text-zinc-400">Creative category<select aria-label="Creative category" className={selectStyle} disabled={disabled} value={category} onChange={event => select(source.mode, event.target.value as CreativeCategory)}>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      {source.mode === 'fixture-recipe' && <label className="block text-sm text-zinc-400">Fixture recipe<select aria-label="Fixture recipe" className={selectStyle} disabled={disabled} value={source.recipeId} onChange={event => onChange({ ...source, recipeId: event.target.value, recipeVersion: 1 })}>{recipes.map(item => <option key={item.id} value={item.id}>{item.name} · synthetic fixture</option>)}</select></label>}
      <p className="text-sm leading-relaxed text-zinc-300">{recipe?.description ?? 'Grifon chooses an eligible synthetic example using the category and photo roles you supply. It does not inspect the photos or analyze the uploaded reference.'}</p>
      <p className="text-xs leading-relaxed text-zinc-400">{recipe ? `Needed photo roles: ${recipe.requiredRoles.join(' and ')}. ` : ''}Original fixture examples only. No rendered recipe preview is available. Your uploaded files and selected voice stay saved when you change this choice.</p>
    </> : <p className="text-sm leading-relaxed text-zinc-300">Keep your uploaded reference as the intended edit guide. This fixture build saves it but does not analyze or reproduce its edit.</p>}
  </GlassPanel>;
}

import { describe, expect, it } from 'vitest';
import { createReferenceDraft } from '../../services/companionReferenceDraft.js';
import { createSampleReview } from '../../services/companionReferenceReview.js';
import { createCreativeSampleReview } from '../../services/companionCreativePlanner.js';
import { isCreativePlan, revisionImpact } from '../../services/companionCreativePlan.js';

const hash = 'a'.repeat(64);
const draft = () => ({
  ...createReferenceDraft(), brief: 'A sample direction', brandName: 'Example brand', productName: 'Example product', audience: 'Example audience', offer: 'User supplied offer', callToAction: 'See the details', instructions: 'Keep the printed label unchanged',
  voice: { id: 'voice-1', name: 'Saved voice', source: 'private' as const },
  photos: [
    { id: 'product', role: 'product' as const, name: 'product.png', blob: new Blob(['product'], { type: 'image/png' }), width: 1, height: 1 },
    { id: 'character', role: 'character' as const, name: 'person.png', blob: new Blob(['person'], { type: 'image/png' }), width: 1, height: 1 },
  ],
  creativeSource: { version: 1 as const, mode: 'fixture-auto' as const, category: 'ugc' as const },
});

describe('honest fixture creative plan', () => {
  it('preserves exact legacy defaults and output when there is no new creative source', () => {
    const legacy = createReferenceDraft();
    expect(createCreativeSampleReview(legacy, hash, 4, 2)).toEqual(createSampleReview(legacy, hash, 4, 2));
  });

  it('binds exact input identity, seven facts, photo role anchors and one saved voice without claiming analysis or research', () => {
    const input = draft();
    const review = createCreativeSampleReview(input, hash, 7, 2);
    const plan = review.creativePlan!;
    expect(isCreativePlan(plan)).toBe(true);
    expect(review.inputHash).toBe(hash);
    expect(review.inputRevision).toBe(7);
    expect(review.revision).toBe(3);
    expect(plan.inputHash).toBe(hash);
    expect(plan.inputRevision).toBe(7);
    expect(plan.brandStrategy.facts).toEqual(createSampleReview(input, hash, 7).facts);
    expect(plan.brandStrategy.researchStatus).toBe('not-run');
    expect(plan.source.referenceAnalysis).toBe('not-run');
    expect(plan.bindings.map(binding => [binding.photoId, binding.role])).toEqual([['product', 'product'], ['character', 'character']]);
    expect(plan.bindings.every(binding => binding.identityAnchor)).toBe(true);
    expect(plan.audio.selectedVoice).toEqual(input.voice);
    expect(new Set(plan.audio.routes.map(route => route.voiceId))).toEqual(new Set(['voice-1']));
    expect(plan.audio.routes.some(route => route.route === 'voice-conversion')).toBe(true);
    expect(plan.audio.routes.some(route => route.route === 'text-to-speech')).toBe(true);
    expect(plan.execution.providerCalls).toBe(0);
    expect(plan.execution.actualCents).toBe(0);
    expect(plan.sampleLanguage).toBe('English');
    expect(review.outputLanguage).toBe('Taglish');
    expect(review.direction).toContain('Sample');
    expect(review.confirmation).toBeNull();
  });

  it('keeps unsupported claims in input facts only and flags missing facts instead of inventing research', () => {
    const input = { ...draft(), productName: '', audience: '', callToAction: '', offer: 'Unverified cure for PHP999', referenceLink: 'https://example.com/ref' };
    const review = createCreativeSampleReview(input, hash, 0);
    expect(review.scenes.map(scene => scene.script).join(' ')).not.toMatch(/999|cure/);
    expect(review.missing).toEqual(expect.arrayContaining(['Product or service', 'Audience', 'Call to action']));
    expect(review.missing).not.toContain('Reference video or link');
    expect(review.creativePlan!.brandStrategy.missing).toEqual(review.missing);
    expect(review.direction).toContain('not analyzed');
  });

  it('keeps a silent saved voice for reopening but creates no voice work or spoken copy', () => {
    const input = { ...draft(), speechMode: 'silent' as const };
    const review = createCreativeSampleReview(input, hash, 0);
    const plan = review.creativePlan!;
    expect(review.voice).toEqual(input.voice);
    expect(plan.audio.selectedVoice).toEqual(input.voice);
    expect(plan.audio.voiceUsed).toBe(false);
    expect(plan.audio.routes.every(route => route.route === 'none' && route.voiceId === null)).toBe(true);
    expect(plan.execution.nodes.every(node => node.kind !== 'voice')).toBe(true);
    expect(review.scenes.every(scene => scene.script === '')).toBe(true);
    expect(review.quote.items.find(item => item.id === 'voice')?.highPesos).toBe('0.00');
    expect(isCreativePlan(plan)).toBe(true);
  });

  it('supports three contiguous timing structures and records adapt versus close differences', () => {
    for (const category of ['ugc', 'motion-launch', 'cinematic-spec'] as const) {
      const input = { ...draft(), creativeSource: { version: 1 as const, mode: 'fixture-auto' as const, category } };
      const review = createCreativeSampleReview(input, hash, 1);
      const plan = review.creativePlan!;
      expect(plan.source.category).toBe(category);
      expect(plan.editDNA.shots[0].startSeconds).toBe(0);
      plan.editDNA.shots.forEach((shot, index, shots) => expect(shot.startSeconds).toBe(index ? shots[index - 1].endSeconds : 0));
      expect(plan.editDNA.shots.at(-1)!.endSeconds).toBe(plan.editDNA.durationSeconds);
      expect(plan.editDNA.preserve.length).toBeGreaterThan(0);
      const close = createCreativeSampleReview({ ...input, adaptationMode: 'close' }, hash, 1).creativePlan!;
      expect(close.editDNA.adapt).not.toEqual(plan.editDNA.adapt);
      expect(close.editDNA.shots).toEqual(plan.editDNA.shots);
      expect(isCreativePlan(plan)).toBe(true);
    }
  });

  it('rejects unknown/mismatched sources, unavailable roles and malformed plan boundaries', () => {
    expect(() => createCreativeSampleReview({ ...draft(), creativeSource: { version: 1, mode: 'fixture-recipe', category: 'ugc', recipeId: 'unknown', recipeVersion: 1 } }, hash, 0)).toThrow();
    expect(() => createCreativeSampleReview({ ...draft(), photos: [] }, hash, 0)).toThrow(/eligible/);
    const plan = createCreativeSampleReview(draft(), hash, 0).creativePlan!;
    const cases = [
      { ...plan, productionEligible: true }, { ...plan, modelId: 'new-model' }, { ...plan, inputHash: 'bad' },
      { ...plan, source: { ...plan.source, recipeVersion: 9 } },
      { ...plan, editDNA: { ...plan.editDNA, shots: plan.editDNA.shots.map((shot, index) => index === 1 ? { ...shot, startSeconds: 0 } : shot) } },
      { ...plan, audio: { ...plan.audio, routes: plan.audio.routes.map(route => ({ ...route, voiceId: 'other-voice' })) } },
      { ...plan, execution: { ...plan.execution, providerCalls: 1 } },
      { ...plan, brandStrategy: { ...plan.brandStrategy, objective: 'Invented sales outcome' } },
      { ...plan, brandStrategy: { ...plan.brandStrategy, messaging: 'Research proves it converts.' } },
      { ...plan, execution: { ...plan.execution, nodes: plan.execution.nodes.map((node, index) => index === 0 ? { ...node, dependsOn: ['qa'] } : node) } },
    ];
    for (const invalid of cases) expect(isCreativePlan(invalid)).toBe(false);
    expect(isCreativePlan(null)).toBe(false);
  });

  it('accepts object-key reordering after JSON storage while rejecting extra nested fields without throwing', () => {
    const plan = createCreativeSampleReview(draft(), hash, 0).creativePlan!;
    const reordered = (value: unknown): unknown => Array.isArray(value) ? value.map(reordered)
      : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).reverse().map(([key, child]) => [key, reordered(child)])) : value;
    expect(isCreativePlan(reordered(plan))).toBe(true);
    expect(isCreativePlan({ ...plan, editDNA: { ...plan.editDNA, shots: plan.editDNA.shots.map(shot => ({ ...shot, modelId: 'extra' })) } })).toBe(false);
    const cyclic: Record<string, unknown> = {};
    cyclic.cycle = cyclic;
    expect(isCreativePlan({ ...plan, execution: { ...plan.execution, nodes: cyclic } })).toBe(false);
  });

  it('invalidates only dependent work for targeted script, voice, photo and music revisions', () => {
    const plan = createCreativeSampleReview(draft(), hash, 0).creativePlan!;
    const shot = plan.editDNA.shots[0].id;
    const script = revisionImpact(plan, [`shot:${shot}:script`]);
    expect(script.invalidated).toEqual(expect.arrayContaining([`script:${shot}`, `voice:${shot}`, 'assembly', 'qa']));
    expect(script.reused).toContain(`visual:${shot}`);
    expect(script.reused).toContain(`voice:${plan.editDNA.shots[1].id}`);
    const voice = revisionImpact(plan, ['voice']);
    expect(voice.invalidated).toContain(`voice:${shot}`);
    expect(voice.reused).toContain(`visual:${shot}`);
    const photos = revisionImpact(plan, ['photos']);
    expect(photos.invalidated).toEqual(expect.arrayContaining(['identity', `visual:${shot}`, 'assembly', 'qa']));
    expect(photos.reused).toContain(`voice:${shot}`);
    const music = revisionImpact(plan, ['music']);
    expect(music.invalidated).toEqual(['music', 'assembly', 'qa']);
    expect(revisionImpact(plan, ['timing']).invalidated).toEqual(expect.arrayContaining([`visual:${shot}`, `voice:${shot}`, 'music', 'sfx', 'assembly', 'qa']));
    expect(revisionImpact(plan, []).reused).toHaveLength(plan.execution.nodes.length);
    expect(revisionImpact(plan, ['source']).invalidated).toContain('qa');
    expect(() => revisionImpact(plan, ['shot:unknown:script'])).toThrow();
    expect(() => revisionImpact({ ...plan, fixture: false }, ['voice'])).toThrow();
  });

  it('invalidates assembly and quality checks when a silent plan is changed to spoken', () => {
    const plan = createCreativeSampleReview({ ...draft(), speechMode: 'silent' }, hash, 0).creativePlan!;
    const impact = revisionImpact(plan, ['speech']);
    expect(impact.invalidated).toEqual(expect.arrayContaining(['assembly', 'qa']));
    expect(impact.reused).toContain('identity');
    expect(impact.reused).toContain('visual:intro');
  });
});

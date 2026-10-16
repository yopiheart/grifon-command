import { describe, expect, it } from 'vitest';
import { createReferenceDraft, isReferenceDraft } from '../../services/companionReferenceDraft.js';
import { createSampleReview, isReferenceReview } from '../../services/companionReferenceReview.js';
import { createCreativeSampleReview } from '../../services/companionCreativePlanner.js';

const creativeReview = () => createCreativeSampleReview({ ...createReferenceDraft(),
  productName: 'Fixture product', voice: { id: 'fixture-voice', name: 'Fixture voice', source: 'curated' },
  photos: [{ id: 'product', name: 'product.png', blob: new Blob(['fixture'], { type: 'image/png' }), width: 1, height: 1, role: 'product' }],
  creativeSource: { version: 1, mode: 'fixture-recipe', category: 'motion-launch', recipeId: 'fixture-motion-launch-v1', recipeVersion: 1 },
}, 'a'.repeat(64), 2);

describe('reference creative fixture persistence boundary', () => {
  it('rejects malformed creative source data instead of reopening it as a valid legacy draft', () => {
    const draft = createReferenceDraft();
    expect(isReferenceDraft({ ...draft, creativeSource: { version: 1, mode: 'production-auto' } })).toBe(false);
    expect(isReferenceDraft({ ...draft, creativeSource: null })).toBe(false);
  });

  it('rejects an invalid creative block rather than confirming opaque unknown fixture data', () => {
    const review = createSampleReview(createReferenceDraft(), 'a'.repeat(64), 0);
    expect(isReferenceReview({ ...review, creativePlan: { version: 1, fixture: false } })).toBe(false);
    expect(isReferenceReview({ ...review, creativePlan: null })).toBe(false);
  });

  it('reopens equivalent reordered stored fact and voice keys without discarding saved chats', () => {
    const review = creativeReview();
    const reordered = { ...review, facts: review.facts.map(fact => ({ value: fact.value, label: fact.label })),
      voice: { source: review.voice!.source, name: review.voice!.name, id: review.voice!.id } };
    expect(isReferenceReview(reordered)).toBe(true);
  });

  it('keeps stale guidance readable but rejects mismatched input, facts, voice and scene identities', () => {
    const review = creativeReview();
    expect(isReferenceReview({ ...review, stale: true, confirmation: null })).toBe(true);
    expect(isReferenceReview({ ...review, inputHash: 'b'.repeat(64) })).toBe(false);
    expect(isReferenceReview({ ...review, inputRevision: 3 })).toBe(false);
    expect(isReferenceReview({ ...review, voice: { ...review.voice!, id: 'other-voice' } })).toBe(false);
    expect(isReferenceReview({ ...review, facts: review.facts.map((fact, index) => index ? fact : { ...fact, value: 'changed' }) })).toBe(false);
    expect(isReferenceReview({ ...review, scenes: [...review.scenes].reverse() })).toBe(false);
  });
});
